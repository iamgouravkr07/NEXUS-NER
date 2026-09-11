"""
NEXUS-NER Phase 3 Automated Test Suite: Alert & Notification Engine
Verifies:
- Scenario A: Alert model creation & database persistence
- Scenario B: Automatic alert generation on incident creation & verification
- Scenario C: Dynamic reroute alert generation on trip rerouting
- Scenario D: No-safe-route / trip-delay alert generation
- Scenario E: Duplicate alert suppression within window
- Scenario F: REST API multi-criteria filtering (severity, status, alert_type, search)
- Scenario G: Operator lifecycle workflow (acknowledge & resolve)
"""

import os
import sys
import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from geoalchemy2.elements import WKTElement

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.database import SessionLocal
from app.models.alert import Alert
from app.models.incident import Incident
from app.models.road import Road
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.services import alert_service


class Phase3AlertTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        # Authenticate client as CONTROL_OPERATOR for operational alert and reroute permissions
        login_resp = cls.client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
        if login_resp.status_code == 200:
            cls.client.headers["Authorization"] = f"Bearer {login_resp.json()['access_token']}"

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.query(Incident).filter(Incident.description.like("%Terminal road collapse%")).delete()
            cls.db.query(Road).filter(Road.road_name.like("%TEST_RD_P3%")).delete()
            cls.db.commit()
        except Exception:
            pass
        cls.db.close()

    def test_scenario_a_persistence(self):
        """Scenario A: Test direct alert creation, schema serialization, and DB persistence."""
        alert = alert_service.create_alert(
            db=self.db,
            title="Test Scenario A Bridge Inspection",
            description="Structural integrity check required on Brahmaputra crossing",
            severity="medium",
            alert_type="road_risk",
            location="Saraighat Bridge, Guwahati",
            latitude=26.129,
            longitude=91.691,
            dedup_key=f"test:scenario_a:{datetime.now().timestamp()}"
        )
        self.assertIsNotNone(alert.id)
        self.assertEqual(alert.status, "active")
        self.assertEqual(alert.severity, "medium")

        # Verify via REST API
        resp = self.client.get(f"/alerts/{alert.id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["title"], "Test Scenario A Bridge Inspection")
        self.assertEqual(data["severity"], "medium")
        print("PASS: Scenario A - Alert model persistence and schema serialization verified.")

    def test_scenario_b_incident_alert_generation(self):
        """Scenario B: Test automatic alert generation on high/critical incident creation & verification."""
        # 1. Create critical incident
        inc_payload = {
            "incident_type": "flash_flood",
            "severity": "critical",
            "description": "Flash flood submerging NH-37 approach road near Kaziranga",
            "latitude": 26.58,
            "longitude": 93.17,
            "road_status": "flooded"
        }
        inc_resp = self.client.post("/incidents/", json=inc_payload)
        self.assertEqual(inc_resp.status_code, 200)
        inc_data = inc_resp.json()
        inc_id = inc_data["id"]

        # Verify alert was automatically generated
        alerts = self.client.get(f"/alerts/?search=Kaziranga").json()
        self.assertTrue(len(alerts) > 0)
        flood_alert = next((a for a in alerts if f"incident:{inc_id}" in (a.get("dedup_key") or "")), None)
        self.assertIsNotNone(flood_alert)
        self.assertEqual(flood_alert["severity"], "critical")
        self.assertEqual(flood_alert["alert_type"], "road_incident")

        # 2. Verify incident status update triggers road blockage alert
        road = Road(
            road_name=f"TEST_RD_P3_Kaziranga_{inc_id}",
            road_type="primary",
            status="open",
            risk_score=20.0,
            latitude=26.58,
            longitude=93.17,
            location=WKTElement("POINT(93.17 26.58)", srid=4326)
        )
        self.db.add(road)
        self.db.commit()
        self.db.refresh(road)

        inc_obj = self.db.query(Incident).filter(Incident.id == inc_id).first()
        inc_obj.affected_road_id = road.id
        self.db.commit()

        status_resp = self.client.patch(f"/incidents/{inc_id}/status", json={"status": "verified"})
        self.assertEqual(status_resp.status_code, 200)

        # Check road risk escalation alert
        road_alerts = self.client.get(f"/alerts/?search={road.road_name}").json()
        self.assertTrue(len(road_alerts) > 0)
        self.assertEqual(road_alerts[0]["alert_type"], "road_risk")
        print("PASS: Scenario B - Alert generation on incident creation and verification verified.")

    def test_scenario_c_reroute_alert_generation(self):
        """Scenario C: Test dynamic reroute alert generation when safe detour is selected."""
        # Create test verified incident on path
        inc = Incident(
            incident_type="landslide",
            severity="critical",
            description=f"TEST_P3_REROUTE_INC_{int(datetime.now().timestamp())}",
            latitude=26.40463,
            longitude=91.925314,
            location=WKTElement("POINT(91.925314 26.40463)", srid=4326),
            road_status="blocked",
            status="verified",
            risk_score=95.0,
        )
        self.db.add(inc)
        self.db.commit()
        self.db.refresh(inc)

        # Create test vehicle and trip with verified incident on path
        veh = Vehicle(
            vehicle_number=f"P3_REROUTE_{int(datetime.now().timestamp())}",
            vehicle_type="truck",
            cargo_type="medical_kits",
            cargo_priority="critical",
            latitude=26.1445,
            longitude=91.7362,
            status="in_transit"
        )
        self.db.add(veh)
        self.db.commit()
        self.db.refresh(veh)

        trip = Trip(
            vehicle_id=veh.id,
            origin="Guwahati, Assam",
            destination="Tezpur, Assam",
            origin_lat=26.1445,
            origin_lon=91.7362,
            destination_lat=26.6528,
            destination_lon=92.7926,
            cargo_type="medical_kits",
            priority="critical",
            status="active",
            eta_minutes=140
        )
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)

        # Trigger dynamic reroute
        reroute_resp = self.client.post(f"/trips/{trip.id}/reroute")
        self.assertEqual(reroute_resp.status_code, 200)

        # Check reroute alert
        alerts = self.client.get("/alerts/", params={"alert_type": "reroute", "search": f"Trip #{trip.id}"}).json()
        self.assertEqual(len(alerts), 1, "Expected exactly 1 reroute alert for trip")
        reroute_alert = alerts[0]
        self.assertIn("Safe Detour Active", reroute_alert["title"])
        self.assertEqual(reroute_alert["source_entity_id"], trip.id)
        self.assertEqual(reroute_alert["dedup_key"], f"reroute:trip:{trip.id}")

        # Trigger second dynamic reroute on same trip to verify dedup suppression
        reroute_resp2 = self.client.post(f"/trips/{trip.id}/reroute")
        self.assertEqual(reroute_resp2.status_code, 200)
        alerts2 = self.client.get("/alerts/", params={"alert_type": "reroute", "search": f"Trip #{trip.id}"}).json()
        self.assertEqual(len(alerts2), 1, "Duplicate reroute alert was not suppressed")
        print("PASS: Scenario C - Dynamic reroute alert generation & deduplication verified.")

    def test_scenario_d_trip_delay_alert(self):
        """Scenario D: Test trip delay alert generation when no safe route is available."""
        # Create road directly on destination access so all candidates are blocked
        blocked_road = Road(
            road_name=f"TEST_RD_P3_DEST_{int(datetime.now().timestamp())}",
            road_type="primary",
            status="blocked",
            risk_score=95.0,
            latitude=25.5788,
            longitude=91.8933,
            location=WKTElement("POINT(91.8933 25.5788)", srid=4326)
        )
        self.db.add(blocked_road)
        self.db.commit()
        self.db.refresh(blocked_road)

        dest_inc = Incident(
            incident_type="landslide",
            severity="critical",
            description="Terminal road collapse at destination",
            latitude=25.5788,
            longitude=91.8933,
            road_status="blocked",
            status="verified",
            affected_road_id=blocked_road.id,
            location=WKTElement("POINT(91.8933 25.5788)", srid=4326)
        )
        self.db.add(dest_inc)

        veh = Vehicle(
            vehicle_number=f"P3_DELAY_{int(datetime.now().timestamp())}",
            vehicle_type="truck",
            cargo_type="emergency_rations",
            cargo_priority="critical",
            latitude=25.5780,
            longitude=91.8920,
            status="in_transit"
        )
        self.db.add(veh)
        self.db.commit()
        self.db.refresh(veh)

        trip = Trip(
            vehicle_id=veh.id,
            origin="Shillong Point A",
            destination="Shillong Point B",
            origin_lat=25.5780,
            origin_lon=91.8920,
            destination_lat=25.5788,
            destination_lon=91.8933,
            cargo_type="emergency_rations",
            priority="critical",
            status="active",
            eta_minutes=10
        )
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)

        # Trigger reroute -> will find no safe alternative
        reroute_resp = self.client.post(f"/trips/{trip.id}/reroute")
        self.assertEqual(reroute_resp.status_code, 200)

        # Check trip_delay alert
        delay_alerts = self.client.get("/alerts/", params={"alert_type": "trip_delay", "search": f"Trip #{trip.id}"}).json()
        self.assertTrue(len(delay_alerts) > 0, "Expected trip delay alert")
        self.assertEqual(delay_alerts[0]["severity"], "critical")
        print("PASS: Scenario D - Trip delay alert when no safe detour exists verified.")

    def test_scenario_e_duplicate_suppression(self):
        """Scenario E: Verify duplicate alert suppression within the suppression window."""
        dedup_tag = f"test_dedup_{int(datetime.now().timestamp())}"

        alert1 = alert_service.create_alert(
            db=self.db,
            title="Duplicate Test Warning",
            description="First instance of alert",
            severity="high",
            alert_type="vehicle",
            dedup_key=dedup_tag,
            suppress_window_minutes=60
        )

        alert2 = alert_service.create_alert(
            db=self.db,
            title="Duplicate Test Warning",
            description="Second instance of identical alert",
            severity="high",
            alert_type="vehicle",
            dedup_key=dedup_tag,
            suppress_window_minutes=60
        )

        self.assertEqual(alert1.id, alert2.id, "Duplicate alert was not suppressed")
        print("PASS: Scenario E - Duplicate alert suppression verified.")

    def test_scenario_f_rest_api_filters(self):
        """Scenario F: Test REST API filtering across severity, status, type, and search."""
        # Query with severity filter
        crit_resp = self.client.get("/alerts/?severity=critical")
        self.assertEqual(crit_resp.status_code, 200)
        crit_list = crit_resp.json()
        for a in crit_list:
            self.assertEqual(a["severity"], "critical")

        # Query with status filter
        act_resp = self.client.get("/alerts/?status=active")
        self.assertEqual(act_resp.status_code, 200)
        act_list = act_resp.json()
        for a in act_list:
            self.assertEqual(a["status"], "active")

        # Query summary
        sum_resp = self.client.get("/alerts/summary")
        self.assertEqual(sum_resp.status_code, 200)
        summary = sum_resp.json()
        self.assertIn("total", summary)
        self.assertIn("critical", summary)
        self.assertIn("active", summary)
        print("PASS: Scenario F - REST API multi-criteria filtering verified.")

    def test_scenario_g_lifecycle_workflow(self):
        """Scenario G: Test acknowledge and resolve lifecycle endpoints."""
        alert = alert_service.create_alert(
            db=self.db,
            title="Lifecycle Test Alert",
            description="Testing acknowledge and resolve transitions",
            severity="low",
            alert_type="weather",
            dedup_key=f"lifecycle:{datetime.now().timestamp()}"
        )
        self.assertEqual(alert.status, "active")

        # 1. Acknowledge
        ack_resp = self.client.patch(f"/alerts/{alert.id}/acknowledge")
        self.assertEqual(ack_resp.status_code, 200)
        ack_data = ack_resp.json()
        self.assertEqual(ack_data["status"], "acknowledged")
        self.assertIsNotNone(ack_data["acknowledged_at"])

        # 2. Resolve
        res_resp = self.client.patch(f"/alerts/{alert.id}/resolve")
        self.assertEqual(res_resp.status_code, 200)
        res_data = res_resp.json()
        self.assertEqual(res_data["status"], "resolved")
        self.assertIsNotNone(res_data["resolved_at"])

        # Verify not found 404
        bad_resp = self.client.patch("/alerts/99999999/acknowledge")
        self.assertEqual(bad_resp.status_code, 404)
        print("PASS: Scenario G - Operator acknowledge/resolve lifecycle verified.")


if __name__ == "__main__":
    print("==================================================")
    print("RUNNING PHASE 3 ALERT ENGINE AUTOMATED TEST SUITE")
    print("==================================================")
    suite = unittest.TestLoader().loadTestsFromTestCase(Phase3AlertTests)
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    print("==================================================")
    if result.wasSuccessful():
        print("ALL 7 PHASE 3 SCENARIO TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
        sys.exit(0)
    else:
        print("PHASE 3 TESTS FAILED!")
        print("==================================================")
        sys.exit(1)
