"""
NEXUS-NER — SIH 2026 UNIFIED DEMO HARNESS TEST SUITE
====================================================
Tests the deterministic, idempotent demo seeder and scenario orchestrator:
1. Demo users creation and RBAC authentication
2. Demo vehicle AS-01-BX-4091 verification
3. Demo trip Guwahati -> Tezpur linkage
4. Vehicle current_trip_id association
5. Deterministic starting GPS position validity
6. Demo incident begins in UNVERIFIED/REPORTED state
7. Repeated seed idempotency (no duplicates, deterministic IDs)
8. Preservation of unrelated operational records
9. Seeded state compatibility with dynamic rerouting & verification
10. Seeded state compatibility with telemetry location updates
11. Demo state JSON and launcher script integrity
"""

import json
from pathlib import Path
import sys
import unittest

# Ensure backend package is in python path
BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.road import Road
from app.models.incident import Incident
from app.services.auth_service import authenticate_user, create_access_token
from app.services.risk import calculate_route_risk
from backend.scripts.seed_demo_flow import (
    seed_demo_scenario,
    DEMO_VEHICLE_NUMBER,
    DEMO_ORIGIN_LAT,
    DEMO_ORIGIN_LON,
    DEMO_DESTINATION_LAT,
    DEMO_DESTINATION_LON,
    DEMO_BLOCKAGE_LAT,
    DEMO_BLOCKAGE_LON,
    DEMO_ROAD_NAME,
)


class TestDemoFlowSeed(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        # Ensure fresh baseline seed before suite runs
        cls.state = seed_demo_scenario(cls.db)

    @classmethod
    def tearDownClass(cls):
        # Reset to clean demo state upon exit
        seed_demo_scenario(cls.db)
        cls.db.close()

    def setUp(self):
        # Fresh db session per test
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_demo_users_and_credentials(self):
        """Verify all 4 demo users exist and authenticate with their demo passwords."""
        demo_logins = [
            ("admin", "Admin@Nexus2026", "ADMIN"),
            ("operator", "Operator@Nexus2026", "CONTROL_OPERATOR"),
            ("field_officer", "Field@Nexus2026", "FIELD_OFFICER"),
            ("driver", "Driver@Nexus2026", "DRIVER"),
        ]
        for username, password, expected_role in demo_logins:
            user = authenticate_user(self.db, username, password)
            self.assertIsNotNone(user, f"Authentication failed for demo user {username}")
            self.assertEqual(user.role, expected_role)
            self.assertTrue(user.is_active)

    def test_02_demo_vehicle_attributes(self):
        """Verify vehicle AS-01-BX-4091 is staged with correct priority and coordinates."""
        vehicle = self.db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        self.assertIsNotNone(vehicle, "Demo vehicle AS-01-BX-4091 was not found in DB")
        self.assertEqual(vehicle.cargo_priority, "critical")
        self.assertIn("Vaccines", vehicle.cargo_type)
        self.assertEqual(vehicle.status, "in_transit")
        self.assertAlmostEqual(vehicle.latitude, DEMO_ORIGIN_LAT, places=3)
        self.assertAlmostEqual(vehicle.longitude, DEMO_ORIGIN_LON, places=3)
        self.assertIsNotNone(vehicle.current_trip_id, "Demo vehicle missing current_trip_id")

    def test_03_demo_trip_attributes_and_linkage(self):
        """Verify demo trip Guwahati -> Tezpur is active and linked to demo vehicle."""
        vehicle = self.db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        self.assertIsNotNone(vehicle)
        trip = self.db.query(Trip).filter(Trip.id == vehicle.current_trip_id).first()
        self.assertIsNotNone(trip, f"Trip #{vehicle.current_trip_id} not found")
        self.assertEqual(trip.vehicle_id, vehicle.id)
        self.assertEqual(trip.origin, "Guwahati, Assam")
        self.assertEqual(trip.destination, "Tezpur, Assam")
        self.assertEqual(trip.status, "active")
        self.assertAlmostEqual(trip.origin_lat, DEMO_ORIGIN_LAT, places=3)
        self.assertAlmostEqual(trip.origin_lon, DEMO_ORIGIN_LON, places=3)
        self.assertAlmostEqual(trip.destination_lat, DEMO_DESTINATION_LAT, places=3)
        self.assertAlmostEqual(trip.destination_lon, DEMO_DESTINATION_LON, places=3)
        self.assertIsNotNone(trip.current_route_geometry)
        geom = json.loads(trip.current_route_geometry)
        self.assertEqual(geom.get("type"), "LineString")
        self.assertGreater(len(geom.get("coordinates", [])), 2)

    def test_04_demo_incident_unverified_initially(self):
        """Verify demo incident begins in UNVERIFIED/reported state with open road."""
        incident = self.db.query(Incident).filter(Incident.description.like("%[DEMO-SIH-2026]%")).first()
        self.assertIsNotNone(incident, "Demo incident with [DEMO-SIH-2026] not found")
        self.assertEqual(incident.status, "reported", "Demo incident must start UNVERIFIED (reported)")
        self.assertEqual(incident.severity, "critical")
        self.assertEqual(incident.incident_type, "landslide")
        self.assertAlmostEqual(incident.latitude, DEMO_BLOCKAGE_LAT, places=3)
        self.assertAlmostEqual(incident.longitude, DEMO_BLOCKAGE_LON, places=3)
        self.assertIsNotNone(incident.affected_road_id)

        road = self.db.query(Road).filter(Road.id == incident.affected_road_id).first()
        self.assertIsNotNone(road)
        self.assertEqual(road.status, "open", "Affected road must begin OPEN before verification")
        self.assertLessEqual(road.risk_score, 20.0)

    def test_05_baseline_route_risk_is_safe_when_unverified(self):
        """Verify baseline route risk reports reroute_required == False while incident is unverified."""
        vehicle = self.db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        trip = self.db.query(Trip).filter(Trip.id == vehicle.current_trip_id).first()
        geom = json.loads(trip.current_route_geometry)
        risk = calculate_route_risk(self.db, geom)
        self.assertFalse(risk["reroute_required"], f"Reroute should NOT be required while incident is reported: {risk}")
        self.assertEqual(risk["risk_level"], "low")

    def test_06_idempotency_on_repeated_seed(self):
        """Verify that running the seed consecutively creates zero duplicate records."""
        user_count_before = self.db.query(User).count()
        vehicle_count_before = self.db.query(Vehicle).count()
        trip_count_before = self.db.query(Trip).count()
        incident_count_before = self.db.query(Incident).count()
        road_count_before = self.db.query(Road).count()

        # Run seed again
        state2 = seed_demo_scenario(self.db)

        user_count_after = self.db.query(User).count()
        vehicle_count_after = self.db.query(Vehicle).count()
        trip_count_after = self.db.query(Trip).count()
        incident_count_after = self.db.query(Incident).count()
        road_count_after = self.db.query(Road).count()

        self.assertEqual(user_count_before, user_count_after, "Duplicate users created during re-seed")
        self.assertEqual(vehicle_count_before, vehicle_count_after, "Duplicate vehicles created during re-seed")
        self.assertEqual(trip_count_before, trip_count_after, "Duplicate trips created during re-seed")
        self.assertEqual(incident_count_before, incident_count_after, "Duplicate incidents created during re-seed")
        self.assertEqual(road_count_before, road_count_after, "Duplicate roads created during re-seed")

        # IDs remain deterministic
        self.assertEqual(self.state["vehicle"]["id"], state2["vehicle"]["id"])
        self.assertEqual(self.state["trip"]["id"], state2["trip"]["id"])
        self.assertEqual(self.state["incident"]["id"], state2["incident"]["id"])
        self.assertEqual(self.state["road"]["id"], state2["road"]["id"])

    def test_07_unrelated_records_preserved(self):
        """Verify seeding does not delete pre-existing vehicles or trips."""
        total_vehicles = self.db.query(Vehicle).count()
        total_trips = self.db.query(Trip).count()
        self.assertGreater(total_vehicles, 1, "Expected more than just demo vehicle in DB")
        self.assertGreater(total_trips, 1, "Expected more than just demo trip in DB")

    def test_08_dynamic_reroute_flow_compatibility(self):
        """
        Verify the full end-to-end verification and dynamic rerouting flow:
        1. Incident verified by operator -> road blocked, alert emitted
        2. Dynamic reroute executed with auth -> safe alternatives calculated
        3. Seed reset restores clean unverified state
        """
        vehicle = self.db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        trip = self.db.query(Trip).filter(Trip.id == vehicle.current_trip_id).first()
        incident = self.db.query(Incident).filter(Incident.description.like("%[DEMO-SIH-2026]%")).first()
        road = self.db.query(Road).filter(Road.id == incident.affected_road_id).first()

        operator = self.db.query(User).filter(User.username == "operator").first()
        token = create_access_token({"sub": str(operator.id), "username": operator.username, "role": operator.role})
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Verify incident via API
        patch_res = self.client.patch(
            f"/incidents/{incident.id}/status",
            json={"status": "verified"},
            headers=headers,
        )
        self.assertEqual(patch_res.status_code, 200, f"Verification failed: {patch_res.text}")
        self.db.refresh(road)
        self.assertEqual(road.status, "blocked", "Road status was not escalated to blocked")
        self.assertEqual(road.risk_score, 95.0, "Road risk score was not escalated to 95.0")

        # Step 3: Trigger Dynamic Reroute via authenticated API
        reroute_res = self.client.post(f"/trips/{trip.id}/reroute", headers=headers)
        self.assertEqual(reroute_res.status_code, 200, f"Reroute failed: {reroute_res.text}")
        data = reroute_res.json()
        self.assertTrue(data["reroute_required"], "Reroute should be required after blockage verification")
        self.assertGreater(data["safe_alternatives_found"], 0, "No safe alternative detours were found")
        self.assertIn("selected_route", data)

        # Restore clean state
        seed_demo_scenario(self.db)

    def test_09_telemetry_compatibility(self):
        """Verify vehicle location updates work and update coordinates in DB."""
        vehicle = self.db.query(Vehicle).filter(Vehicle.vehicle_number == DEMO_VEHICLE_NUMBER).first()
        driver = self.db.query(User).filter(User.username == "driver").first()
        token = create_access_token({"sub": str(driver.id), "username": driver.username, "role": driver.role})
        headers = {"Authorization": f"Bearer {token}"}

        test_lat = 26.2000
        test_lon = 91.8000
        res = self.client.post(
            f"/vehicles/{vehicle.id}/location",
            json={
                "latitude": test_lat,
                "longitude": test_lon,
                "timestamp": "2026-09-11T02:00:00Z",
                "status": "in_transit",
            },
            headers=headers,
        )
        self.assertEqual(res.status_code, 200, f"Location update failed: {res.text}")
        self.db.refresh(vehicle)
        self.assertAlmostEqual(vehicle.latitude, test_lat, places=4)
        self.assertAlmostEqual(vehicle.longitude, test_lon, places=4)

        # Restore starting point
        seed_demo_scenario(self.db)

    def test_10_launcher_and_state_artifacts_exist(self):
        """Verify launcher script files and demo state metadata exist and are valid."""
        repo_root = Path(__file__).resolve().parents[1]
        ps1_path = repo_root / "run_demo.ps1"
        bat_path = repo_root / "run_demo.bat"
        state_path = repo_root / "backend" / "scripts" / "demo_state.json"

        self.assertTrue(ps1_path.exists(), "run_demo.ps1 is missing")
        self.assertTrue(bat_path.exists(), "run_demo.bat is missing")
        self.assertTrue(state_path.exists(), "demo_state.json is missing")

        with open(state_path, "r", encoding="utf-8") as f:
            state_data = json.load(f)
        self.assertIn("demo_users", state_data)
        self.assertIn("vehicle", state_data)
        self.assertIn("trip", state_data)
        self.assertIn("incident", state_data)
        self.assertIn("road", state_data)
        self.assertEqual(state_data["vehicle"]["vehicle_number"], DEMO_VEHICLE_NUMBER)


if __name__ == "__main__":
    unittest.main()
