"""
Integration test suite for Mobile Field App offline synchronization,
contract compliance, and RBAC enforcement.
"""

import os
import sys
import unittest
import uuid
from datetime import datetime, timezone

# Ensure backend directory is in path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient

# Set testing environment before importing app
os.environ["ENV"] = "development"

from app.main import app
from app.database import get_db, Base
from app.models.user import User
from app.models.sync_event import SyncEvent
from app.models.incident import Incident
from app.models.vehicle import Vehicle
from app.models.alert import Alert
from app.services.auth_service import hash_password, create_access_token


class TestMobileSyncIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = next(get_db())

        # Ensure test database tables exist
        Base.metadata.create_all(bind=cls.db.get_bind())

        # Create or fetch test users for each role
        cls.field_officer = cls._get_or_create_user("field_mobile_officer", "officer@nexus.gov.in", "FIELD_OFFICER")
        cls.driver = cls._get_or_create_user("driver_mobile_user", "driver@nexus.gov.in", "DRIVER")
        cls.operator = cls._get_or_create_user("operator_mobile_user", "operator@nexus.gov.in", "CONTROL_OPERATOR")

        cls.officer_token = create_access_token({"sub": str(cls.field_officer.id), "role": cls.field_officer.role})
        cls.driver_token = create_access_token({"sub": str(cls.driver.id), "role": cls.driver.role})
        cls.operator_token = create_access_token({"sub": str(cls.operator.id), "role": cls.operator.role})

        # Ensure a test vehicle exists for telemetry tests
        cls.vehicle = cls.db.query(Vehicle).filter(Vehicle.vehicle_number == "AS-01-MOB-9999").first()
        if not cls.vehicle:
            cls.vehicle = Vehicle(
                vehicle_number="AS-01-MOB-9999",
                vehicle_type="Heavy 4x4",
                cargo_type="Medical Emergency Supplies",
                cargo_priority="critical",
                status="in_transit",
                latitude=26.1445,
                longitude=91.7362,
                last_gps_timestamp=datetime.now(timezone.utc),
            )
            cls.db.add(cls.vehicle)
            cls.db.commit()
            cls.db.refresh(cls.vehicle)

    @classmethod
    def _get_or_create_user(cls, username: str, email: str, role: str) -> User:
        user = cls.db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                username=username,
                email=email,
                password_hash=hash_password("SecureMobilePass123!"),
                role=role,
                is_active=True,
            )
            cls.db.add(user)
            cls.db.commit()
            cls.db.refresh(user)
        return user

    def test_01_mobile_event_receives_unique_client_id_and_valid_contract(self):
        """Verify each mobile event receives a unique UUID client_id and matches POST /sync/batch contract."""
        client_id_1 = str(uuid.uuid4())
        client_id_2 = str(uuid.uuid4())
        self.assertNotEqual(client_id_1, client_id_2)

        batch_id = str(uuid.uuid4())
        batch_payload = {
            "batch_id": batch_id,
            "client_device_id": "nexus-android-device-001",
            "events": [
                {
                    "client_id": client_id_1,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 27.4705,
                    "longitude": 94.9120,
                    "payload": {
                        "incident_type": "landslide",
                        "severity": "critical",
                        "description": "Mobile test: rockfall on NH-15",
                        "latitude": 27.4705,
                        "longitude": 94.9120,
                    },
                }
            ],
        }

        # Submit with Field Officer credentials
        resp = self.client.post(
            "/sync/batch",
            json=batch_payload,
            headers={"Authorization": f"Bearer {self.officer_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["processed_count"], 1)
        self.assertEqual(data["success_count"], 1)
        self.assertEqual(data["results"][0]["client_id"], client_id_1)
        self.assertEqual(data["results"][0]["status"], "success")
        self.assertEqual(data["results"][0]["server_entity_type"], "incident")
        self.assertIsNotNone(data["results"][0]["server_entity_id"])

    def test_02_idempotency_duplicate_client_id_returns_already_synced(self):
        """Verify that resending an already synced event returns already_synced with zero side effects."""
        client_id = str(uuid.uuid4())
        event = {
            "client_id": client_id,
            "event_type": "incident_report",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 27.3389,
            "longitude": 88.6065,
            "payload": {
                "incident_type": "road_blockage",
                "severity": "high",
                "description": "Mobile test: NH-10 Gangtok roadblock",
                "latitude": 27.3389,
                "longitude": 88.6065,
            },
        }

        # First sync transmission
        resp1 = self.client.post(
            "/sync/batch",
            json={"batch_id": str(uuid.uuid4()), "events": [event]},
            headers={"Authorization": f"Bearer {self.officer_token}"},
        )
        self.assertEqual(resp1.status_code, 200)
        server_id_1 = resp1.json()["results"][0]["server_entity_id"]

        # Count incidents in DB
        count_before = self.db.query(Incident).count()

        # Second sync transmission (e.g. mobile app re-syncs queue after reconnect)
        resp2 = self.client.post(
            "/sync/batch",
            json={"batch_id": str(uuid.uuid4()), "events": [event]},
            headers={"Authorization": f"Bearer {self.officer_token}"},
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertEqual(data2["duplicate_count"], 1)
        self.assertEqual(data2["results"][0]["status"], "already_synced")
        self.assertEqual(data2["results"][0]["server_entity_id"], server_id_1)

        # Confirm no duplicate DB record was inserted
        count_after = self.db.query(Incident).count()
        self.assertEqual(count_before, count_after)

    def test_03_driver_role_cannot_submit_incident_report(self):
        """Verify that DRIVER role is rejected from submitting incident_report (terminal failure)."""
        client_id = str(uuid.uuid4())
        event = {
            "client_id": client_id,
            "event_type": "incident_report",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 26.1445,
            "longitude": 91.7362,
            "payload": {
                "incident_type": "landslide",
                "severity": "high",
                "description": "Driver unauthorized attempt",
                "latitude": 26.1445,
                "longitude": 91.7362,
            },
        }

        resp = self.client.post(
            "/sync/batch",
            json={"events": [event]},
            headers={"Authorization": f"Bearer {self.driver_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["error_count"], 1)
        result = data["results"][0]
        self.assertEqual(result["status"], "error")
        self.assertIn("not authorized", result["error"].lower())

    def test_04_driver_role_can_submit_vehicle_gps_telemetry(self):
        """Verify that DRIVER role is authorized to submit vehicle_gps telemetry."""
        client_id = str(uuid.uuid4())
        now_dt = datetime.now(timezone.utc)
        event = {
            "client_id": client_id,
            "event_type": "vehicle_gps",
            "timestamp": now_dt.isoformat(),
            "latitude": 26.1800,
            "longitude": 91.7500,
            "payload": {
                "vehicle_id": self.vehicle.id,
                "status": "in_transit",
                "latitude": 26.1800,
                "longitude": 91.7500,
            },
        }

        resp = self.client.post(
            "/sync/batch",
            json={"events": [event]},
            headers={"Authorization": f"Bearer {self.driver_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["success_count"], 1)
        self.assertEqual(data["results"][0]["status"], "success")
        self.assertEqual(data["results"][0]["server_entity_type"], "vehicle")

    def test_05_coordinate_bounds_validation_outside_ner(self):
        """Verify that coordinates outside North Eastern Region bounds [20-30, 88-98] are rejected."""
        client_id = str(uuid.uuid4())
        event = {
            "client_id": client_id,
            "event_type": "incident_report",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 12.9716,  # Bengaluru (outside NER)
            "longitude": 77.5946,
            "payload": {
                "incident_type": "landslide",
                "severity": "critical",
                "description": "Out of bounds incident",
                "latitude": 12.9716,
                "longitude": 77.5946,
            },
        }

        resp = self.client.post(
            "/sync/batch",
            json={"events": [event]},
            headers={"Authorization": f"Bearer {self.officer_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["error_count"], 1)
        self.assertIn("outside north eastern region bounds", data["results"][0]["error"].lower())

    def test_06_photo_metadata_without_raw_base64_bloat(self):
        """Verify that mobile incident sync carries photo metadata without raw Base64 payload bloat."""
        client_id = str(uuid.uuid4())
        event = {
            "client_id": client_id,
            "event_type": "incident_report",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": 27.4705,
            "longitude": 94.9120,
            "payload": {
                "incident_type": "flooding",
                "severity": "critical",
                "description": "Submerged section near bridge",
                "latitude": 27.4705,
                "longitude": 94.9120,
                "photo_metadata": {
                    "name": "evidence_sample.jpg",
                    "size_bytes": 245120,
                    "timestamp": 1757360000000,
                },
            },
        }

        # Payload is lightweight JSON (< 1KB)
        import json
        payload_str = json.dumps(event)
        self.assertLess(len(payload_str), 1024)
        self.assertNotIn("data:image", payload_str)
        self.assertNotIn("base64", payload_str.lower())

        resp = self.client.post(
            "/sync/batch",
            json={"events": [event]},
            headers={"Authorization": f"Bearer {self.officer_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["success_count"], 1)


if __name__ == "__main__":
    unittest.main()
