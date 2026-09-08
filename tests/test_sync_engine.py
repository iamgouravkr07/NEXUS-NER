import unittest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from geoalchemy2.elements import WKTElement

from app.main import app
from app.database import SessionLocal
from app.models.incident import Incident
from app.models.vehicle import Vehicle
from app.models.alert import Alert
from app.models.sync_event import SyncEvent
from app.models.user import User
from app.services import auth_service


class SyncEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Login tokens for various roles
        cls.tokens = {}
        for role_name, username, password in [
            ("admin", "admin", "Admin@Nexus2026"),
            ("operator", "operator", "Operator@Nexus2026"),
            ("field_officer", "field_officer", "Field@Nexus2026"),
            ("driver", "driver", "Driver@Nexus2026"),
        ]:
            res = cls.client.post("/auth/login", json={"username": username, "password": password})
            if res.status_code == 200:
                cls.tokens[role_name] = res.json()["access_token"]

        # Ensure an inactive user exists for testing
        inactive_user = cls.db.query(User).filter(User.username == "test_sync_inactive").first()
        if not inactive_user:
            from app.schemas.user import UserCreate
            inactive_user = auth_service.create_user(
                cls.db,
                UserCreate(
                    username="test_sync_inactive",
                    email="sync_inactive@nexus.ner",
                    password="Inactive@Nexus2026",
                    role="FIELD_OFFICER",
                    is_active=False
                )
            )
        cls.inactive_token = auth_service.create_access_token(
            data={"sub": str(inactive_user.id), "role": inactive_user.role}
        )

        # Create or fetch a test vehicle for GPS sync tests
        cls.test_vehicle = cls.db.query(Vehicle).filter(Vehicle.vehicle_number == "TEST-SYNC-01").first()
        if not cls.test_vehicle:
            cls.test_vehicle = Vehicle(
                vehicle_number="TEST-SYNC-01",
                vehicle_type="Truck",
                cargo_type="Medical Supplies",
                cargo_priority="high",
                status="idle",
                latitude=26.1500,
                longitude=91.7300,
                last_gps_timestamp=datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
            )
            cls.db.add(cls.test_vehicle)
            cls.db.commit()
            cls.db.refresh(cls.test_vehicle)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def auth_header(self, role="field_officer"):
        return {"Authorization": f"Bearer {self.tokens[role]}"}

    # -------------------------------------------------------------------------
    # Scenario A: SyncEvent model persistence & table verification
    # -------------------------------------------------------------------------
    def test_scenario_a_model_persistence(self):
        uid = f"evt-model-test-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        record = SyncEvent(
            client_id=uid,
            batch_id="batch-model-test",
            event_type="incident_report",
            client_timestamp=now,
            latitude=26.1542,
            longitude=91.7482,
            payload={"test": "data"},
            status="processed",
            server_entity_type="incident",
            server_entity_id=9999
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        self.assertIsNotNone(record.id)
        self.assertEqual(record.client_id, uid)
        self.assertEqual(record.status, "processed")
        print(f"PASS: Scenario A - SyncEvent persistence verified (ID #{record.id}).")

    # -------------------------------------------------------------------------
    # Scenario B: Missing JWT -> 401 Unauthorized
    # -------------------------------------------------------------------------
    def test_scenario_b_missing_jwt_rejected(self):
        batch = {
            "batch_id": str(uuid.uuid4()),
            "events": [
                {
                    "client_id": f"evt-{uuid.uuid4().hex[:10]}",
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.15,
                    "longitude": 91.75,
                    "payload": {"incident_type": "landslide", "severity": "medium"}
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch)
        self.assertEqual(res.status_code, 401)
        self.assertIn("detail", res.json())
        print("PASS: Scenario B - Missing JWT rejected with 401.")

    # -------------------------------------------------------------------------
    # Scenario C: Invalid JWT -> 401 Unauthorized
    # -------------------------------------------------------------------------
    def test_scenario_c_invalid_jwt_rejected(self):
        res = self.client.post(
            "/sync/batch",
            json={"batch_id": "b1", "events": []},
            headers={"Authorization": "Bearer invalid_garbage_token_123"}
        )
        self.assertEqual(res.status_code, 401)
        print("PASS: Scenario C - Invalid JWT rejected with 401.")

    # -------------------------------------------------------------------------
    # Scenario D: Inactive user -> rejected (403)
    # -------------------------------------------------------------------------
    def test_scenario_d_inactive_user_rejected(self):
        res = self.client.post(
            "/sync/batch",
            json={
                "batch_id": "b-inactive",
                "events": [
                    {
                        "client_id": f"evt-{uuid.uuid4().hex[:10]}",
                        "event_type": "incident_report",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "latitude": 26.15,
                        "longitude": 91.75,
                        "payload": {"incident_type": "landslide", "severity": "medium"}
                    }
                ]
            },
            headers={"Authorization": f"Bearer {self.inactive_token}"}
        )
        self.assertEqual(res.status_code, 403)
        print("PASS: Scenario D - Inactive user rejected with 403.")

    # -------------------------------------------------------------------------
    # Scenario E: Empty/malformed batch -> 400/422
    # -------------------------------------------------------------------------
    def test_scenario_e_empty_malformed_batch(self):
        # Empty events array -> 400/422
        res_empty = self.client.post(
            "/sync/batch",
            json={"batch_id": "b-empty", "events": []},
            headers=self.auth_header("field_officer")
        )
        self.assertIn(res_empty.status_code, [400, 422])

        # Unsupported event_type -> 422
        res_bad_type = self.client.post(
            "/sync/batch",
            json={
                "batch_id": "b-bad",
                "events": [
                    {
                        "client_id": "evt-unknown",
                        "event_type": "unknown_type_xxx",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "payload": {}
                    }
                ]
            },
            headers=self.auth_header("field_officer")
        )
        self.assertEqual(res_bad_type.status_code, 422)
        print("PASS: Scenario E - Empty and malformed batches rejected properly.")

    # -------------------------------------------------------------------------
    # Scenario F: incident_report creates Incident
    # -------------------------------------------------------------------------
    def test_scenario_f_incident_report_creates_incident(self):
        client_evt_id = f"evt-inc-{uuid.uuid4().hex[:12]}"
        client_ts = datetime(2026, 9, 8, 14, 30, 0, tzinfo=timezone.utc)
        batch = {
            "batch_id": f"batch-{uuid.uuid4().hex[:8]}",
            "events": [
                {
                    "client_id": client_evt_id,
                    "event_type": "incident_report",
                    "timestamp": client_ts.isoformat(),
                    "latitude": 26.2050,
                    "longitude": 91.8150,
                    "payload": {
                        "incident_type": "landslide",
                        "severity": "medium",
                        "description": "Medium landslide cleared partially by locals",
                        "road_status": "partially_blocked"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["processed_count"], 1)
        self.assertEqual(data["success_count"], 1)
        self.assertEqual(data["error_count"], 0)

        result_item = data["results"][0]
        self.assertEqual(result_item["status"], "success")
        self.assertEqual(result_item["server_entity_type"], "incident")
        inc_id = result_item["server_entity_id"]
        self.assertIsNotNone(inc_id)

        # Verify in DB
        db_inc = self.db.query(Incident).filter(Incident.id == inc_id).first()
        self.assertIsNotNone(db_inc)
        self.assertEqual(db_inc.incident_type, "landslide")
        self.assertEqual(db_inc.severity, "medium")
        self.assertAlmostEqual(db_inc.latitude, 26.2050, places=4)
        self.assertAlmostEqual(db_inc.longitude, 91.8150, places=4)
        print(f"PASS: Scenario F - incident_report created Incident #{inc_id}.")

    # -------------------------------------------------------------------------
    # Scenario G: incident_report triggers existing alert/risk behavior
    # -------------------------------------------------------------------------
    def test_scenario_g_critical_incident_triggers_alert(self):
        client_evt_id = f"evt-crit-{uuid.uuid4().hex[:12]}"
        batch = {
            "batch_id": f"batch-{uuid.uuid4().hex[:8]}",
            "events": [
                {
                    "client_id": client_evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.3500,
                    "longitude": 91.9500,
                    "payload": {
                        "incident_type": "flash_flood",
                        "severity": "critical",
                        "description": "Flash flood submerging highway section",
                        "road_status": "blocked"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("operator"))
        self.assertEqual(res.status_code, 200)
        inc_id = res.json()["results"][0]["server_entity_id"]

        # Verify Alert auto-created
        alert = self.db.query(Alert).filter(
            Alert.source_entity == "incident",
            Alert.source_entity_id == inc_id
        ).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.severity, "critical")
        self.assertEqual(alert.status, "active")
        print(f"PASS: Scenario G - Critical incident triggered Alert #{alert.id}.")

    # -------------------------------------------------------------------------
    # Scenario H: vehicle_gps updates vehicle
    # -------------------------------------------------------------------------
    def test_scenario_h_vehicle_gps_updates_vehicle(self):
        v = self.test_vehicle
        v.last_gps_timestamp = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
        self.db.commit()
        new_ts = datetime(2026, 9, 8, 12, 0, 0, tzinfo=timezone.utc)
        client_evt_id = f"evt-gps-{uuid.uuid4().hex[:12]}"

        batch = {
            "batch_id": f"batch-gps-{uuid.uuid4().hex[:8]}",
            "events": [
                {
                    "client_id": client_evt_id,
                    "event_type": "vehicle_gps",
                    "timestamp": new_ts.isoformat(),
                    "latitude": 26.1950,
                    "longitude": 91.7750,
                    "payload": {
                        "vehicle_id": v.id,
                        "status": "moving"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("driver"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["results"][0]["status"], "success")
        self.assertEqual(data["results"][0]["server_entity_type"], "vehicle")
        self.assertEqual(data["results"][0]["server_entity_id"], v.id)

        # Refresh vehicle from DB
        self.db.refresh(v)
        self.assertAlmostEqual(v.latitude, 26.1950, places=4)
        self.assertAlmostEqual(v.longitude, 91.7750, places=4)
        self.assertEqual(v.status, "moving")
        print(f"PASS: Scenario H - vehicle_gps successfully updated Vehicle #{v.id}.")

    # -------------------------------------------------------------------------
    # Scenario I: Mixed incident + GPS batch
    # -------------------------------------------------------------------------
    def test_scenario_i_mixed_batch(self):
        evt1_id = f"evt-mix-1-{uuid.uuid4().hex[:10]}"
        evt2_id = f"evt-mix-2-{uuid.uuid4().hex[:10]}"
        batch = {
            "batch_id": "batch-mixed",
            "events": [
                {
                    "client_id": evt1_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.1200,
                    "longitude": 91.7100,
                    "payload": {
                        "incident_type": "road_damage",
                        "severity": "low",
                        "description": "Pothole cluster reported on state highway"
                    }
                },
                {
                    "client_id": evt2_id,
                    "event_type": "vehicle_gps",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.2200,
                    "longitude": 91.8800,
                    "payload": {
                        "vehicle_id": self.test_vehicle.id,
                        "status": "in_transit"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["processed_count"], 2)
        self.assertEqual(data["success_count"], 2)
        self.assertEqual(data["error_count"], 0)
        self.assertEqual(data["results"][0]["server_entity_type"], "incident")
        self.assertEqual(data["results"][1]["server_entity_type"], "vehicle")
        print("PASS: Scenario I - Mixed incident and GPS batch processed successfully.")

    # -------------------------------------------------------------------------
    # Scenario J: Duplicate client_id -> already_synced
    # -------------------------------------------------------------------------
    def test_scenario_j_duplicate_client_id_already_synced(self):
        evt_id = f"evt-dup-{uuid.uuid4().hex[:12]}"
        batch = {
            "batch_id": "batch-dup-1",
            "events": [
                {
                    "client_id": evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.2500,
                    "longitude": 91.8500,
                    "payload": {
                        "incident_type": "tree_fall",
                        "severity": "medium",
                        "description": "Fallen tree blocking one lane"
                    }
                }
            ]
        }
        # First submission -> success
        res1 = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()["results"][0]["status"], "success")
        original_inc_id = res1.json()["results"][0]["server_entity_id"]

        # Resubmission with same client_id -> already_synced
        res2 = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(res2.status_code, 200)
        data2 = res2.json()
        self.assertEqual(data2["duplicate_count"], 1)
        self.assertEqual(data2["results"][0]["status"], "already_synced")
        self.assertEqual(data2["results"][0]["server_entity_id"], original_inc_id)
        print(f"PASS: Scenario J - Duplicate client_id returned already_synced with preserved ID #{original_inc_id}.")

    # -------------------------------------------------------------------------
    # Scenario K: Duplicate retry creates zero duplicate side effects
    # -------------------------------------------------------------------------
    def test_scenario_k_duplicate_creates_no_extra_incidents(self):
        evt_id = f"evt-side-effect-{uuid.uuid4().hex[:12]}"
        desc = f"High hazard boulder {uuid.uuid4().hex[:8]}"
        batch = {
            "batch_id": "batch-side-effects",
            "events": [
                {
                    "client_id": evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.2800,
                    "longitude": 91.8900,
                    "payload": {
                        "incident_type": "boulder",
                        "severity": "high",
                        "description": desc
                    }
                }
            ]
        }
        # Submit 3 times
        r1 = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(r2.status_code, 200)
        r3 = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(r3.status_code, 200)

        # Verify only 1 incident exists with this description
        incidents = self.db.query(Incident).filter(
            Incident.description == desc
        ).all()
        self.assertEqual(len(incidents), 1)

        # Verify only 1 sync_event exists
        sync_records = self.db.query(SyncEvent).filter(
            SyncEvent.client_id == evt_id
        ).all()
        self.assertEqual(len(sync_records), 1)
        print("PASS: Scenario K - Multiple retries produced zero duplicate incidents or sync records.")

    # -------------------------------------------------------------------------
    # Scenario L: Partial batch failure isolation
    # -------------------------------------------------------------------------
    def test_scenario_l_partial_batch_failure_isolation(self):
        good_evt_id = f"evt-good-{uuid.uuid4().hex[:10]}"
        bad_evt_id = f"evt-bad-{uuid.uuid4().hex[:10]}"

        batch = {
            "batch_id": "batch-partial-fail",
            "events": [
                {
                    "client_id": good_evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.1500,
                    "longitude": 91.7500,
                    "payload": {
                        "incident_type": "culvert_damage",
                        "severity": "medium",
                        "description": "Valid report"
                    }
                },
                {
                    "client_id": bad_evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 75.0,  # Invalid latitude: outside NER bounds [20, 30]
                    "longitude": 91.7500,
                    "payload": {
                        "incident_type": "landslide",
                        "severity": "medium"
                    }
                }
            ]
        }

        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("field_officer"))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["processed_count"], 2)
        self.assertEqual(data["success_count"], 1)
        self.assertEqual(data["error_count"], 1)

        res_good = next(r for r in data["results"] if r["client_id"] == good_evt_id)
        res_bad = next(r for r in data["results"] if r["client_id"] == bad_evt_id)

        self.assertEqual(res_good["status"], "success")
        self.assertIsNotNone(res_good["server_entity_id"])
        self.assertEqual(res_bad["status"], "error")
        self.assertIn("outside North Eastern Region bounds", res_bad["error"])

        # Confirm the good incident was committed
        db_good = self.db.query(Incident).filter(Incident.id == res_good["server_entity_id"]).first()
        self.assertIsNotNone(db_good)

        # Confirm bad event failure was logged in sync_events
        fail_record = self.db.query(SyncEvent).filter(SyncEvent.client_id == bad_evt_id).first()
        self.assertIsNotNone(fail_record)
        self.assertEqual(fail_record.status, "failed")
        print("PASS: Scenario L - Partial batch failure properly isolated without rolling back valid events.")

    # -------------------------------------------------------------------------
    # Scenario M: DRIVER cannot submit incident_report
    # -------------------------------------------------------------------------
    def test_scenario_m_driver_blocked_from_reporting_incident(self):
        driver_evt_id = f"evt-drv-inc-{uuid.uuid4().hex[:10]}"
        batch = {
            "batch_id": "batch-driver-incident",
            "events": [
                {
                    "client_id": driver_evt_id,
                    "event_type": "incident_report",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.15,
                    "longitude": 91.75,
                    "payload": {
                        "incident_type": "landslide",
                        "severity": "medium"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("driver"))
        self.assertEqual(res.status_code, 200)
        item = res.json()["results"][0]
        self.assertEqual(item["status"], "error")
        self.assertIn("not authorized to submit incident reports", item["error"])
        print("PASS: Scenario M - DRIVER role blocked from reporting incidents in sync batch.")

    # -------------------------------------------------------------------------
    # Scenario N: DRIVER can submit vehicle_gps
    # -------------------------------------------------------------------------
    def test_scenario_n_driver_can_submit_vehicle_gps(self):
        driver_gps_id = f"evt-drv-gps-{uuid.uuid4().hex[:10]}"
        batch = {
            "batch_id": "batch-driver-gps",
            "events": [
                {
                    "client_id": driver_gps_id,
                    "event_type": "vehicle_gps",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.1700,
                    "longitude": 91.7400,
                    "payload": {
                        "vehicle_id": self.test_vehicle.id,
                        "status": "in_transit"
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("driver"))
        self.assertEqual(res.status_code, 200)
        item = res.json()["results"][0]
        self.assertEqual(item["status"], "success")
        self.assertEqual(item["server_entity_type"], "vehicle")
        print("PASS: Scenario N - DRIVER role successfully authorized for vehicle_gps sync.")

    # -------------------------------------------------------------------------
    # Scenario O: synced_by_user_id audit
    # -------------------------------------------------------------------------
    def test_scenario_o_synced_by_user_id_audit(self):
        audit_evt_id = f"evt-audit-{uuid.uuid4().hex[:10]}"
        batch = {
            "batch_id": "batch-audit",
            "events": [
                {
                    "client_id": audit_evt_id,
                    "event_type": "vehicle_gps",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "latitude": 26.1800,
                    "longitude": 91.7600,
                    "payload": {
                        "vehicle_id": self.test_vehicle.id
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("admin"))
        self.assertEqual(res.status_code, 200)

        # Query user admin
        admin_user = self.db.query(User).filter(User.username == "admin").first()
        sync_rec = self.db.query(SyncEvent).filter(SyncEvent.client_id == audit_evt_id).first()
        self.assertIsNotNone(sync_rec)
        self.assertEqual(sync_rec.synced_by_user_id, admin_user.id)
        print(f"PASS: Scenario O - Audit verification: synced_by_user_id ({sync_rec.synced_by_user_id}) matches Admin user ID.")

    # -------------------------------------------------------------------------
    # Scenario P: Old GPS timestamp cannot overwrite newer GPS
    # -------------------------------------------------------------------------
    def test_scenario_p_stale_gps_does_not_overwrite(self):
        v = self.test_vehicle
        # Set vehicle to a very recent known position & timestamp
        latest_time = datetime(2026, 9, 9, 12, 0, 0, tzinfo=timezone.utc)
        v.latitude = 26.5000
        v.longitude = 91.5000
        v.last_gps_timestamp = latest_time
        self.db.commit()

        # Send an older GPS timestamp (e.g. from 2 hours prior)
        stale_time = datetime(2026, 9, 9, 10, 0, 0, tzinfo=timezone.utc)
        stale_evt_id = f"evt-stale-{uuid.uuid4().hex[:10]}"
        batch = {
            "batch_id": "batch-stale-gps",
            "events": [
                {
                    "client_id": stale_evt_id,
                    "event_type": "vehicle_gps",
                    "timestamp": stale_time.isoformat(),
                    "latitude": 25.1111,
                    "longitude": 92.2222,
                    "payload": {
                        "vehicle_id": v.id
                    }
                }
            ]
        }
        res = self.client.post("/sync/batch", json=batch, headers=self.auth_header("driver"))
        self.assertEqual(res.status_code, 200)

        # Verify vehicle still retains the newer position
        self.db.refresh(v)
        self.assertAlmostEqual(v.latitude, 26.5000, places=4)
        self.assertAlmostEqual(v.longitude, 91.5000, places=4)
        print("PASS: Scenario P - Out-of-order stale GPS timestamp protected newer vehicle coordinates.")


if __name__ == "__main__":
    unittest.main()
