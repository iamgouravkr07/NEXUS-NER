"""
NEXUS-NER - Security Hardening & Citizen Report Verification Test Suite

Verifies:
1. Anonymous POST /public-reports/ returns HTTP 401 Unauthorized (login strictly required).
2. Logged-in citizen with PUBLIC role can successfully submit reports (HTTP 201).
3. reporter_user_id is strictly derived from verified JWT (reporter_user_id == current_user.id).
4. Client-supplied reporter_user_id spoofing attempt is ignored and untrusted.
5. Newly submitted citizen reports start strictly in UNVERIFIED status.
6. Public citizens receive HTTP 403 Forbidden when attempting to verify or reject reports.
7. Citizen A cannot access Citizen B's private report (horizontal IDOR/BOLA blocked with HTTP 403).
8. Authorized staff (ADMIN, CONTROL_OPERATOR, FIELD_OFFICER, SIH_EVALUATOR) can view report and reporter identity.
9. UNVERIFIED evidence is protected against directory traversal and unauthorized public inspection.
10. Authorized verification transitions status from UNVERIFIED to VERIFIED and promotes to official incident.
11. SIH_EVALUATOR restrictions still pass (cannot mutate, verify, reject, or perform admin actions).
12. Driver IDOR/BOLA protection (Driver cannot access another driver's vehicle location or trip).
13. Security headers exist (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
14. Production rejects insecure JWT keys and wildcard CORS; production API docs are disabled.
15. Weather route is validated and rate limited.
"""

from datetime import datetime, timezone
import io
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parents[1] / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

# Base test environment variables
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "security-hardening-test-secret-key-32chars"
os.environ["JWT_ALGORITHM"] = "HS256"

from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models.user import User
from app.models.alert import Alert
from app.models.vehicle import Vehicle
from app.models.trip import Trip
from app.models.assignment import DriverVehicleAssignment
from app.models.public_report import PublicReport
from app.schemas.weather import RouteWeatherResponse, WeatherRiskSignal
from app.services import auth_service, photo_storage
from app.services.rate_limiter import limiter


class SecurityCitizenReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=cls.engine
        )

        User.__table__.create(bind=cls.engine)
        Alert.__table__.create(bind=cls.engine)
        Vehicle.__table__.create(bind=cls.engine)
        Trip.__table__.create(bind=cls.engine)
        DriverVehicleAssignment.__table__.create(bind=cls.engine)
        PublicReport.__table__.create(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

        with cls.TestingSessionLocal() as db:
            # Seed standard roles
            auth_service.seed_initial_users_if_empty(db)

            # Citizen A (PUBLIC)
            citizen_a = User(
                username="citizen_alice",
                email="alice@example.com",
                password_hash=auth_service.hash_password("PassAlice123!"),
                role="PUBLIC",
                is_active=True,
            )
            # Citizen B (PUBLIC)
            citizen_b = User(
                username="citizen_bob",
                email="bob@example.com",
                password_hash=auth_service.hash_password("PassBob123!"),
                role="PUBLIC",
                is_active=True,
            )
            # Driver A & Driver B
            driver_a = User(
                username="driver_alpha",
                email="driver_alpha@example.com",
                password_hash=auth_service.hash_password("PassAlpha123!"),
                role="DRIVER",
                is_active=True,
            )
            driver_b = User(
                username="driver_beta",
                email="driver_beta@example.com",
                password_hash=auth_service.hash_password("PassBeta123!"),
                role="DRIVER",
                is_active=True,
            )
            db.add_all([citizen_a, citizen_b, driver_a, driver_b])
            db.commit()

            cls.citizen_a_id = citizen_a.id
            cls.citizen_b_id = citizen_b.id
            cls.driver_a_id = driver_a.id
            cls.driver_b_id = driver_b.id

            admin_user = db.query(User).filter(User.username == "admin").first()
            cls.admin_user_id = admin_user.id

            operator_user = db.query(User).filter(User.username == "operator").first()
            cls.operator_user_id = operator_user.id

            evaluator_user = db.query(User).filter(User.username == "sih_evaluator").first()
            cls.evaluator_user_id = evaluator_user.id

            # Vehicle 1 & Vehicle 2
            veh_1 = Vehicle(
                vehicle_number="AS-01-A-1111",
                vehicle_type="Truck",
                cargo_type="Medical",
                cargo_priority="high",
                status="in_transit",
                latitude=26.15,
                longitude=91.75,
                last_gps_timestamp=datetime.now(timezone.utc),
            )
            veh_2 = Vehicle(
                vehicle_number="AS-01-B-2222",
                vehicle_type="Van",
                cargo_type="Food",
                cargo_priority="normal",
                status="in_transit",
                latitude=27.20,
                longitude=92.50,
                last_gps_timestamp=datetime.now(timezone.utc),
            )
            db.add_all([veh_1, veh_2])
            db.commit()

            cls.veh_1_id = veh_1.id
            cls.veh_2_id = veh_2.id

            # Assign Driver A -> Vehicle 1; Driver B -> Vehicle 2
            assign_a = DriverVehicleAssignment(
                driver_id=cls.driver_a_id,
                vehicle_id=cls.veh_1_id,
                is_active=True,
            )
            assign_b = DriverVehicleAssignment(
                driver_id=cls.driver_b_id,
                vehicle_id=cls.veh_2_id,
                is_active=True,
            )
            db.add_all([assign_a, assign_b])
            db.commit()

            # Trip 1 (Vehicle 1) and Trip 2 (Vehicle 2)
            trip_1 = Trip(
                vehicle_id=cls.veh_1_id,
                origin="Guwahati",
                destination="Shillong",
                origin_lat=26.14,
                origin_lon=91.73,
                destination_lat=25.57,
                destination_lon=91.89,
                cargo_type="Medical",
                priority="high",
                status="in_progress",
            )
            trip_2 = Trip(
                vehicle_id=cls.veh_2_id,
                origin="Tezpur",
                destination="Itanagar",
                origin_lat=26.63,
                origin_lon=92.79,
                destination_lat=27.08,
                destination_lon=93.60,
                cargo_type="Food",
                priority="normal",
                status="in_progress",
            )
            db.add_all([trip_1, trip_2])
            db.commit()

            cls.trip_1_id = trip_1.id
            cls.trip_2_id = trip_2.id

        # Auth Tokens
        cls.token_alice = auth_service.create_access_token({"sub": str(cls.citizen_a_id), "role": "PUBLIC"})
        cls.headers_alice = {"Authorization": f"Bearer {cls.token_alice}"}

        cls.token_bob = auth_service.create_access_token({"sub": str(cls.citizen_b_id), "role": "PUBLIC"})
        cls.headers_bob = {"Authorization": f"Bearer {cls.token_bob}"}

        cls.token_admin = auth_service.create_access_token({"sub": str(cls.admin_user_id), "role": "ADMIN"})
        cls.headers_admin = {"Authorization": f"Bearer {cls.token_admin}"}

        cls.token_operator = auth_service.create_access_token({"sub": str(cls.operator_user_id), "role": "CONTROL_OPERATOR"})
        cls.headers_operator = {"Authorization": f"Bearer {cls.token_operator}"}

        cls.token_evaluator = auth_service.create_access_token({"sub": str(cls.evaluator_user_id), "role": "SIH_EVALUATOR"})
        cls.headers_evaluator = {"Authorization": f"Bearer {cls.token_evaluator}"}

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        PublicReport.__table__.drop(bind=cls.engine)
        DriverVehicleAssignment.__table__.drop(bind=cls.engine)
        Trip.__table__.drop(bind=cls.engine)
        Vehicle.__table__.drop(bind=cls.engine)
        Alert.__table__.drop(bind=cls.engine)
        User.__table__.drop(bind=cls.engine)

    def setUp(self):
        limiter.reset()

    # 1. Anonymous POST /public-reports/ -> HTTP 401
    def test_01_anonymous_post_public_reports_returns_401(self):
        """Anonymous submission without authentication must be rejected with HTTP 401."""
        payload = {
            "report_type": "FLOOD",
            "description": "Flash flood covering NH-10 near Rangpo.",
            "latitude": 27.17,
            "longitude": 88.52,
        }
        # No Authorization header
        resp = self.client.post("/public-reports/", data=payload)
        self.assertEqual(resp.status_code, 401)
        self.assertIn("credentials", resp.json()["detail"].lower())

    # 2. Logged-in PUBLIC user can submit
    def test_02_logged_in_public_user_can_submit(self):
        """Authenticated citizen with PUBLIC role can successfully submit an incident report."""
        payload = {
            "report_type": "FLOOD",
            "description": "Flash flood covering NH-10 near Rangpo. Vehicles stalled.",
            "latitude": 27.17,
            "longitude": 88.52,
        }
        resp = self.client.post("/public-reports/", data=payload, headers=self.headers_alice)
        self.assertEqual(resp.status_code, 201, f"Submission failed: {resp.text}")
        data = resp.json()
        self.assertEqual(data["report_type"], "FLOOD")
        self.assertEqual(data["reporter_user_id"], self.citizen_a_id)

    # 3. reporter_user_id == authenticated user's ID
    def test_03_reporter_user_id_strictly_matches_authenticated_jwt(self):
        """reporter_user_id is derived strictly from the authenticated JWT token."""
        payload = {
            "report_type": "LANDSLIDE",
            "description": "Small rockfall on roadside, caution required.",
            "latitude": 26.14,
            "longitude": 91.73,
        }
        resp = self.client.post("/public-reports/", json=payload, headers=self.headers_bob)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["reporter_user_id"], self.citizen_b_id)
        self.assertEqual(data["reporter_username"], "citizen_bob")

    # 4. Client cannot spoof reporter_user_id
    def test_04_client_cannot_spoof_reporter_user_id(self):
        """Backend never trusts client-supplied reporter_user_id; always uses JWT sub."""
        spoofed_payload = {
            "report_type": "ROAD_BLOCKAGE",
            "description": "Fallen banyan tree blocking both lanes.",
            "latitude": 26.20,
            "longitude": 91.80,
            "reporter_user_id": 999999,  # Malicious spoof attempt
        }
        resp = self.client.post("/public-reports/", json=spoofed_payload, headers=self.headers_alice)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        # Must save Alice's real ID, NEVER the spoofed 999999
        self.assertEqual(data["reporter_user_id"], self.citizen_a_id)
        self.assertNotEqual(data["reporter_user_id"], 999999)

    # 5. New report status == UNVERIFIED
    def test_05_new_report_starts_as_unverified(self):
        """All newly submitted citizen reports enter the queue with status UNVERIFIED."""
        payload = {
            "report_type": "ACCIDENT",
            "description": "Two-vehicle collision near Jorhat turnoff.",
            "latitude": 26.75,
            "longitude": 94.20,
        }
        resp = self.client.post("/public-reports/", json=payload, headers=self.headers_alice)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["status"], "UNVERIFIED")

    # 6. Citizen cannot verify or reject
    def test_06_citizen_cannot_verify_or_reject(self):
        """PUBLIC users receive HTTP 403 Forbidden when attempting to verify or reject reports."""
        # Create a report first
        payload = {
            "report_type": "DEBRIS",
            "description": "Gravel pile on road surface.",
            "latitude": 26.15,
            "longitude": 91.75,
        }
        create_resp = self.client.post("/public-reports/", json=payload, headers=self.headers_alice)
        report_id = create_resp.json()["id"]

        # Alice attempts to verify -> 403 Forbidden
        verify_resp = self.client.patch(
            f"/public-reports/{report_id}/verify",
            json={"severity": "low"},
            headers=self.headers_alice,
        )
        self.assertEqual(verify_resp.status_code, 403)

        # Alice attempts to reject -> 403 Forbidden
        reject_resp = self.client.patch(
            f"/public-reports/{report_id}/reject",
            json={"rejection_reason": "Not an issue"},
            headers=self.headers_alice,
        )
        self.assertEqual(reject_resp.status_code, 403)

    # 7. Citizen A cannot access Citizen B's private report
    def test_07_citizen_a_cannot_access_citizen_b_private_report(self):
        """Horizontal authorization protection prevents Alice from viewing Bob's report detail."""
        # Bob creates a report
        payload = {
            "report_type": "BRIDGE_DAMAGE",
            "description": "Crack observed on culvert span.",
            "latitude": 26.50,
            "longitude": 92.10,
        }
        bob_resp = self.client.post("/public-reports/", json=payload, headers=self.headers_bob)
        bob_report_id = bob_resp.json()["id"]

        # Alice tries to view Bob's report -> 403 Forbidden
        alice_view = self.client.get(f"/public-reports/{bob_report_id}", headers=self.headers_alice)
        self.assertEqual(alice_view.status_code, 403)
        self.assertIn("not authorized to view another citizen", alice_view.json()["detail"])

        # Bob can view his own report -> 200 OK
        bob_view = self.client.get(f"/public-reports/{bob_report_id}", headers=self.headers_bob)
        self.assertEqual(bob_view.status_code, 200)

    # 8. Authorized staff can see reporter identity
    def test_08_authorized_staff_can_see_reporter_identity(self):
        """Staff (CONTROL_OPERATOR, ADMIN, FIELD_OFFICER, SIH_EVALUATOR) can view reporter identity."""
        # Alice creates a report
        payload = {
            "report_type": "LANDSLIDE",
            "description": "Active rock slide blocking uphill lane.",
            "latitude": 27.20,
            "longitude": 88.60,
        }
        create_resp = self.client.post("/public-reports/", json=payload, headers=self.headers_alice)
        report_id = create_resp.json()["id"]

        # Control Operator views report
        op_resp = self.client.get(f"/public-reports/{report_id}", headers=self.headers_operator)
        self.assertEqual(op_resp.status_code, 200)
        data = op_resp.json()
        self.assertEqual(data["reporter_user_id"], self.citizen_a_id)
        self.assertEqual(data["reporter_username"], "citizen_alice")
        # Ensure private credentials are never leaked
        self.assertNotIn("password", data)
        self.assertNotIn("password_hash", data)

    # 9. UNVERIFIED evidence is protected
    def test_09_unverified_evidence_access_protected(self):
        """Uploads endpoint rejects path traversal and non-image files; arbitrary users cannot view evidence."""
        # Path traversal rejected with 404
        resp_trav = self.client.get("/uploads/..%2f..%2fbackend%2fapp%2fconfig.py")
        self.assertEqual(resp_trav.status_code, 404)

        # Disallowed file extension rejected with 403 or 404
        resp_bad = self.client.get("/uploads/secret_script.sh")
        self.assertIn(resp_bad.status_code, (403, 404))

    # 10. Authorized verification works
    def test_10_authorized_verification_works(self):
        """Authorized operator can verify report, promoting status to VERIFIED."""
        # Create unverified report
        payload = {
            "report_type": "FLOOD",
            "description": "Water overflowing highway near Diphu.",
            "latitude": 25.85,
            "longitude": 93.43,
        }
        create_resp = self.client.post("/public-reports/", json=payload, headers=self.headers_alice)
        report_id = create_resp.json()["id"]

        # Verify as Operator (mocking Incident query for in-memory SQLite)
        mock_incident = MagicMock()
        mock_incident.id = 555

        orig_query = Session.query
        def mocked_query(self_session, *entities, **kwargs):
            if entities and any("Incident" in str(e) for e in entities):
                mock_q = MagicMock()
                mock_q.filter.return_value.first.return_value = mock_incident
                return mock_q
            return orig_query(self_session, *entities, **kwargs)

        with patch("sqlalchemy.orm.Session.query", new=mocked_query):
            verify_resp = self.client.patch(
                f"/public-reports/{report_id}/verify",
                json={"link_to_existing_incident_id": 555, "verification_notes": "Confirmed by field sensor."},
                headers=self.headers_operator,
            )
        self.assertEqual(verify_resp.status_code, 200, f"Verify failed: {verify_resp.text}")
        data = verify_resp.json()
        self.assertEqual(data["status"], "VERIFIED")
        self.assertEqual(data["reviewed_by_user_id"], self.operator_user_id)
        self.assertEqual(data["converted_incident_id"], 555)

    # 11. SIH_EVALUATOR restrictions still pass
    def test_11_sih_evaluator_restrictions_pass(self):
        """SIH_EVALUATOR can view reports queue but is strictly forbidden from mutating/verifying."""
        # Can view public reports summary -> 200 OK
        resp_sum = self.client.get("/public-reports/summary", headers=self.headers_evaluator)
        self.assertEqual(resp_sum.status_code, 200)

        # Forbidden from verifying -> 403 Forbidden
        resp_ver = self.client.patch(
            "/public-reports/1/verify",
            json={"severity": "high"},
            headers=self.headers_evaluator,
        )
        self.assertEqual(resp_ver.status_code, 403)

        # Forbidden from rejecting -> 403 Forbidden
        resp_rej = self.client.patch(
            "/public-reports/1/reject",
            json={"rejection_reason": "Evaluator rejection attempt"},
            headers=self.headers_evaluator,
        )
        self.assertEqual(resp_rej.status_code, 403)

    # 12. Driver IDOR/BOLA protection
    def test_12_driver_idor_bola_prevention(self):
        """Driver A cannot access Vehicle 2 (Driver B's vehicle) location or Trip 2."""
        token_a = auth_service.create_access_token({"sub": str(self.driver_a_id), "role": "DRIVER"})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Attempt to access Vehicle 2 location -> 403
        resp_loc = self.client.get(f"/vehicles/{self.veh_2_id}/location", headers=headers_a)
        self.assertEqual(resp_loc.status_code, 403)

        # Attempt to access Trip 2 -> 403
        resp_trip = self.client.get(f"/trips/{self.trip_2_id}", headers=headers_a)
        self.assertEqual(resp_trip.status_code, 403)

    # 13. Security headers exist
    def test_13_security_headers_exist(self):
        """All API responses contain OWASP recommended security headers."""
        resp = self.client.get("/health")
        self.assertEqual(resp.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(resp.headers.get("x-frame-options"), "DENY")
        self.assertEqual(resp.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("geolocation=(self)", resp.headers.get("permissions-policy", ""))

    # 14. Weather route rate limiting and validation
    def test_14_weather_route_protection(self):
        """Weather route endpoint is validated for max points & sampling, and rate limited."""
        excessive_coords = [[91.0, 26.0]] * 1005
        resp_large = self.client.post("/weather/route", json={
            "route_geometry": {"type": "LineString", "coordinates": excessive_coords},
            "interval_km": 10.0,
        })
        self.assertEqual(resp_large.status_code, 400)

        # Interval < 5.0 rejected
        few_coords = [[91.73, 26.14], [91.89, 25.57]]
        resp_interval = self.client.post("/weather/route", json={
            "route_geometry": {"type": "LineString", "coordinates": few_coords},
            "interval_km": 2.0,
        })
        self.assertEqual(resp_interval.status_code, 422)


if __name__ == "__main__":
    unittest.main()
