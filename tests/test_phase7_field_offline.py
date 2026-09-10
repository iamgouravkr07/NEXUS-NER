"""
NEXUS-NER Phase 7 Automated Integration Test Suite:
Field Offline Sync, RBAC, and Deterministic Multilingual/Enum Invariants

Verifies:
1. Field Officer authenticated submission of offline incident batch via /sync/batch
2. Canonical enum preservation (machine-readable contracts remain English/enum-based)
3. Batch idempotency with duplicate client_id (returns already_synced, zero duplicate rows)
4. Out-of-bounds NER coordinates safely caught with error status without crashing batch
5. RBAC: FIELD_OFFICER forbidden from verifying incidents (requires CONTROL_OPERATOR/ADMIN)
6. RBAC: CONTROL_OPERATOR authorized to verify reported incidents
7. RBAC: FIELD_OFFICER forbidden from user administration
"""

import os
import sys
import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from geoalchemy2.elements import WKTElement

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.database import SessionLocal
from app.models.incident import Incident
from app.models.sync_event import SyncEvent
from app.services import auth_service


class TestPhase7FieldOffline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        auth_service.seed_initial_users_if_empty(cls.db)

        # Login tokens
        field_res = cls.client.post("/auth/login", json={"username": "field_officer", "password": "Field@Nexus2026"})
        if field_res.status_code != 200:
            raise RuntimeError(f"Could not login field officer: {field_res.text}")
        cls.field_token = field_res.json()["access_token"]
        cls.field_headers = {"Authorization": f"Bearer {cls.field_token}"}

        operator_res = cls.client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
        if operator_res.status_code != 200:
            raise RuntimeError(f"Could not login operator: {operator_res.text}")
        cls.operator_token = operator_res.json()["access_token"]
        cls.operator_headers = {"Authorization": f"Bearer {cls.operator_token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        self.created_incident_ids = []
        self.test_client_ids = []

    def tearDown(self):
        self.db.rollback()
        if self.created_incident_ids:
            self.db.query(Incident).filter(Incident.id.in_(self.created_incident_ids)).delete(synchronize_session=False)
        if self.test_client_ids:
            self.db.query(SyncEvent).filter(SyncEvent.client_id.in_(self.test_client_ids)).delete(synchronize_session=False)
        self.db.commit()

    def test_field_officer_offline_sync_creates_pending_incident(self):
        """
        Field Officer sends an offline incident batch.
        Must succeed with status 'success' and create a reported/unverified incident.
        """
        test_client_id = f"test-p7-{uuid.uuid4()}"
        self.test_client_ids.append(test_client_id)

        batch_payload = {
            "batch_id": f"batch-{uuid.uuid4()}",
            "device_id": "field-device-ner-01",
            "events": [
                {
                    "client_id": test_client_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.1445,
                    "longitude": 91.7362,
                    "payload": {
                        "incident_type": "landslide",
                        "severity": "high",
                        "description": "Observed landslide along NH-27 near Jorabat",
                        "location_name": "NH-27 KM 42",
                    },
                }
            ],
        }

        res = self.client.post("/sync/batch", json=batch_payload, headers=self.field_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["processed_count"], 1)
        self.assertEqual(data["success_count"], 1)

        result_item = data["results"][0]
        self.assertEqual(result_item["client_id"], test_client_id)
        self.assertEqual(result_item["status"], "success")
        self.assertEqual(result_item["server_entity_type"], "incident")
        self.assertIsNotNone(result_item.get("server_entity_id"))

        server_inc_id = result_item["server_entity_id"]
        self.created_incident_ids.append(server_inc_id)

        # Invariant: Created incident must be in 'reported' status, NOT auto-verified
        inc = self.db.query(Incident).filter(Incident.id == server_inc_id).first()
        self.assertIsNotNone(inc)
        self.assertEqual(inc.incident_type, "landslide")
        self.assertEqual(inc.severity.lower(), "high")
        self.assertEqual(inc.status, "reported")

    def test_sync_batch_idempotency_duplicate_client_id(self):
        """
        Duplicate client_id must be recognized and return 'already_synced' without duplicating DB rows.
        """
        test_client_id = f"test-p7-dedup-{uuid.uuid4()}"
        self.test_client_ids.append(test_client_id)

        single_event = {
            "client_id": test_client_id,
            "event_type": "incident_report",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 26.6528,
            "longitude": 92.7926,
            "payload": {
                "incident_type": "flooding",
                "severity": "medium",
                "description": "Water accumulation at Tezpur bypass",
            },
        }

        batch_1 = {
            "batch_id": f"batch-{uuid.uuid4()}",
            "device_id": "field-device-02",
            "events": [single_event],
        }

        # First sync
        res1 = self.client.post("/sync/batch", json=batch_1, headers=self.field_headers)
        self.assertEqual(res1.status_code, 200)
        server_id_1 = res1.json()["results"][0]["server_entity_id"]
        self.created_incident_ids.append(server_id_1)

        # Retry sync with same client_id
        batch_2 = {
            "batch_id": f"batch-{uuid.uuid4()}",
            "device_id": "field-device-02",
            "events": [single_event],
        }
        res2 = self.client.post("/sync/batch", json=batch_2, headers=self.field_headers)
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2["duplicate_count"], 1)
        item2 = data2["results"][0]
        self.assertEqual(item2["status"], "already_synced")
        self.assertEqual(item2["server_entity_id"], server_id_1)

        # Count in DB must be exactly 1
        count = self.db.query(SyncEvent).filter(SyncEvent.client_id == test_client_id).count()
        self.assertEqual(count, 1)

    def test_out_of_bounds_ner_coordinates_safely_failed(self):
        """
        Coordinates outside the North Eastern Region [20-30°N, 88-98°E] must fail gracefully
        with per-item 'error' status and not crash the batch transaction.
        """
        test_client_id = f"test-p7-oob-{uuid.uuid4()}"
        self.test_client_ids.append(test_client_id)

        batch_payload = {
            "batch_id": f"batch-{uuid.uuid4()}",
            "device_id": "field-device-03",
            "events": [
                {
                    "client_id": test_client_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 12.9716,  # Bengaluru (outside NER)
                    "longitude": 77.5946,
                    "payload": {
                        "incident_type": "road_blockage",
                        "severity": "medium",
                        "description": "Invalid test outside bounds",
                    },
                }
            ],
        }

        res = self.client.post("/sync/batch", json=batch_payload, headers=self.field_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["error_count"], 1)
        result_item = data["results"][0]
        self.assertEqual(result_item["status"], "error")
        self.assertIn("outside North Eastern Region", result_item.get("error", ""))

    def test_field_officer_cannot_verify_incident(self):
        """
        FIELD_OFFICER cannot update incident status to 'verified'.
        Must return 403 Forbidden.
        """
        inc = Incident(
            incident_type="landslide",
            severity="medium",
            description="Pending field observation",
            latitude=26.1445,
            longitude=91.7362,
            location=WKTElement("POINT(91.7362 26.1445)", srid=4326),
            status="reported",
            risk_score=50,
        )
        self.db.add(inc)
        self.db.commit()
        self.db.refresh(inc)
        self.created_incident_ids.append(inc.id)

        # Field officer tries to verify
        res = self.client.patch(
            f"/incidents/{inc.id}/status",
            json={"status": "verified"},
            headers=self.field_headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_control_operator_can_verify_incident(self):
        """
        CONTROL_OPERATOR is authorized to verify reported incidents.
        Must return 200 OK and update status to 'verified'.
        """
        inc = Incident(
            incident_type="road_damage",
            severity="medium",
            description="Pending field observation for review",
            latitude=26.1445,
            longitude=91.7362,
            location=WKTElement("POINT(91.7362 26.1445)", srid=4326),
            status="reported",
            risk_score=50,
        )
        self.db.add(inc)
        self.db.commit()
        self.db.refresh(inc)
        self.created_incident_ids.append(inc.id)

        # Operator verifies
        res = self.client.patch(
            f"/incidents/{inc.id}/status",
            json={"status": "verified"},
            headers=self.operator_headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "verified")

    def test_field_officer_forbidden_from_admin_user_management(self):
        """
        FIELD_OFFICER cannot access /auth/users.
        Must return 403 Forbidden.
        """
        res = self.client.get("/auth/users", headers=self.field_headers)
        self.assertEqual(res.status_code, 403)


if __name__ == "__main__":
    unittest.main()
