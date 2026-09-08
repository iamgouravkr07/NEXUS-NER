"""
NEXUS-NER Authentication & RBAC Automated Test Suite
Verifies:
- Scenario A: User creation & database persistence
- Scenario B: Argon2id password hashing (no plaintext stored)
- Scenario C: Successful login returning signed JWT
- Scenario D: Invalid credentials rejection (HTTP 401)
- Scenario E: GET /auth/me with valid JWT
- Scenario F: Missing JWT rejection (HTTP 401)
- Scenario G: Invalid/malformed JWT rejection (HTTP 401)
- Scenario H: Inactive user rejection (HTTP 403)
- Scenario I: ADMIN can create and update users
- Scenario J: CONTROL_OPERATOR cannot manage users (HTTP 403)
- Scenario K: FIELD_OFFICER cannot manage users (HTTP 403)
- Scenario L: DRIVER cannot manage users (HTTP 403)
- Scenario M: DRIVER can submit permitted vehicle GPS update
- Scenario N: Unauthorized roles (DRIVER, FIELD_OFFICER) cannot acknowledge/resolve alerts (HTTP 403)
- Scenario O: Authorized operator/admin can acknowledge and resolve alerts (HTTP 200)
- Scenario P: password_hash is never exposed through any API response
"""

import os
import sys
import unittest
from datetime import datetime
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.alert import Alert
from app.services import auth_service, alert_service


class AuthRBACTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Seed or ensure bootstrap users exist
        auth_service.seed_initial_users_if_empty(cls.db)

        # Retrieve or create test tokens for each role
        cls.admin_token = cls._get_token_for_user("admin", "Admin@Nexus2026")
        cls.operator_token = cls._get_token_for_user("operator", "Operator@Nexus2026")
        cls.field_token = cls._get_token_for_user("field_officer", "Field@Nexus2026")
        cls.driver_token = cls._get_token_for_user("driver", "Driver@Nexus2026")

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.query(User).filter(User.username.like("test_%")).delete()
            cls.db.commit()
        except Exception:
            pass
        cls.db.close()

    @classmethod
    def _get_token_for_user(cls, username: str, password: str) -> str:
        resp = cls.client.post("/auth/login", json={"username": username, "password": password})
        if resp.status_code != 200:
            raise RuntimeError(f"Could not login bootstrap user '{username}': {resp.text}")
        return resp.json()["access_token"]

    def test_scenario_a_user_creation(self):
        """Scenario A: Test direct user creation and DB persistence."""
        ts = int(datetime.now().timestamp())
        user_in = auth_service.UserCreate(
            username=f"test_user_{ts}",
            email=f"test_{ts}@nexusner.gov.in",
            password="SecurePassword123!",
            role="FIELD_OFFICER",
            is_active=True
        )
        user = auth_service.create_user(self.db, user_in)
        self.assertIsNotNone(user.id)
        self.assertEqual(user.username, f"test_user_{ts}")
        self.assertEqual(user.role, "FIELD_OFFICER")
        print("PASS: Scenario A - User creation and database persistence verified.")

    def test_scenario_b_password_hashing(self):
        """Scenario B: Verify password is encrypted with Argon2id and never stored in plaintext."""
        ts = int(datetime.now().timestamp())
        plaintext = "PlaintextSecret987$"
        user_in = auth_service.UserCreate(
            username=f"test_hash_{ts}",
            email=f"testhash_{ts}@nexusner.gov.in",
            password=plaintext,
            role="DRIVER",
            is_active=True
        )
        user = auth_service.create_user(self.db, user_in)
        self.assertNotEqual(user.password_hash, plaintext)
        self.assertTrue(user.password_hash.startswith("$argon2id$"))
        self.assertTrue(auth_service.verify_password(plaintext, user.password_hash))
        self.assertFalse(auth_service.verify_password("WrongPassword!", user.password_hash))
        print("PASS: Scenario B - Argon2id password hashing verified.")

    def test_scenario_c_successful_login(self):
        """Scenario C: Test login with valid credentials returning access token."""
        resp = self.client.post("/auth/login", json={"username": "operator", "password": "Operator@Nexus2026"})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")
        self.assertEqual(data["user"]["role"], "CONTROL_OPERATOR")
        self.assertNotIn("password_hash", data["user"])
        print("PASS: Scenario C - Successful login returning signed JWT verified.")

    def test_scenario_d_invalid_password(self):
        """Scenario D: Test invalid password rejected with 401."""
        resp = self.client.post("/auth/login", json={"username": "operator", "password": "WrongPassword123!"})
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Invalid credentials", resp.json()["detail"])
        print("PASS: Scenario D - Invalid credentials rejected with 401.")

    def test_scenario_e_get_auth_me(self):
        """Scenario E: Test GET /auth/me with valid JWT."""
        resp = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["username"], "operator")
        self.assertEqual(data["role"], "CONTROL_OPERATOR")
        self.assertNotIn("password_hash", data)
        print("PASS: Scenario E - GET /auth/me verified.")

    def test_scenario_f_missing_jwt(self):
        """Scenario F: Test missing JWT rejected with 401."""
        resp = self.client.get("/auth/me")
        self.assertEqual(resp.status_code, 401)
        print("PASS: Scenario F - Missing JWT rejected with 401.")

    def test_scenario_g_invalid_jwt(self):
        """Scenario G: Test malformed/invalid JWT rejected with 401."""
        resp = self.client.get(
            "/auth/me",
            headers={"Authorization": "Bearer malformed.invalid.token"}
        )
        self.assertEqual(resp.status_code, 401)
        print("PASS: Scenario G - Invalid JWT rejected with 401.")

    def test_scenario_h_inactive_user(self):
        """Scenario H: Test inactive user rejected with 403 on login and auth."""
        ts = int(datetime.now().timestamp())
        inactive_user = auth_service.UserCreate(
            username=f"test_inactive_{ts}",
            email=f"inactive_{ts}@nexusner.gov.in",
            password="Password123!",
            role="FIELD_OFFICER",
            is_active=False
        )
        auth_service.create_user(self.db, inactive_user)

        # Login attempt
        resp = self.client.post(
            "/auth/login",
            json={"username": f"test_inactive_{ts}", "password": "Password123!"}
        )
        self.assertEqual(resp.status_code, 403)
        print("PASS: Scenario H - Inactive user properly rejected with 403.")

    def test_scenario_i_admin_user_management(self):
        """Scenario I: Test ADMIN can create and modify users via API."""
        ts = int(datetime.now().timestamp())
        new_payload = {
            "username": f"test_officer_{ts}",
            "email": f"officer_{ts}@nexusner.gov.in",
            "password": "InitialPass123!",
            "role": "FIELD_OFFICER",
            "is_active": True
        }

        # Create user
        create_resp = self.client.post(
            "/auth/users",
            json=new_payload,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(create_resp.status_code, 201)
        created_data = create_resp.json()
        self.assertEqual(created_data["username"], f"test_officer_{ts}")
        new_id = created_data["id"]

        # Update user (promote role)
        patch_resp = self.client.patch(
            f"/auth/users/{new_id}",
            json={"role": "CONTROL_OPERATOR"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.json()["role"], "CONTROL_OPERATOR")
        print("PASS: Scenario I - ADMIN user management (create/update) verified.")

    def test_scenario_j_operator_cannot_manage_users(self):
        """Scenario J: Test CONTROL_OPERATOR receives 403 on user management."""
        resp = self.client.post(
            "/auth/users",
            json={"username": "hacker1", "email": "h1@mail.com", "password": "pass", "role": "ADMIN"},
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        self.assertEqual(resp.status_code, 403)
        print("PASS: Scenario J - CONTROL_OPERATOR forbidden from managing users (403).")

    def test_scenario_k_field_officer_cannot_manage_users(self):
        """Scenario K: Test FIELD_OFFICER receives 403 on user management."""
        resp = self.client.get(
            "/auth/users",
            headers={"Authorization": f"Bearer {self.field_token}"}
        )
        self.assertEqual(resp.status_code, 403)
        print("PASS: Scenario K - FIELD_OFFICER forbidden from managing users (403).")

    def test_scenario_l_driver_cannot_manage_users(self):
        """Scenario L: Test DRIVER receives 403 on user management."""
        resp = self.client.get(
            "/auth/users",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        self.assertEqual(resp.status_code, 403)
        print("PASS: Scenario L - DRIVER forbidden from managing users (403).")

    def test_scenario_m_driver_can_submit_gps(self):
        """Scenario M: Test DRIVER can submit permitted vehicle GPS update."""
        # Create a test vehicle
        veh = Vehicle(
            vehicle_number=f"TEST_GPS_{int(datetime.now().timestamp())}",
            vehicle_type="Truck",
            cargo_type="Medical Supplies",
            cargo_priority="critical",
            latitude=26.14,
            longitude=91.73
        )
        self.db.add(veh)
        self.db.commit()
        self.db.refresh(veh)

        gps_payload = {"latitude": 26.1550, "longitude": 91.7450}
        resp = self.client.patch(
            f"/vehicles/{veh.id}/location",
            json=gps_payload,
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["latitude"], 26.1550)

        # Unauthenticated GPS update must receive 401
        unauth_resp = self.client.patch(f"/vehicles/{veh.id}/location", json=gps_payload)
        self.assertEqual(unauth_resp.status_code, 401)
        print("PASS: Scenario M - DRIVER can submit GPS updates; anonymous rejected with 401.")

    def test_scenario_n_unauthorized_role_cannot_manage_alerts(self):
        """Scenario N: Test DRIVER and FIELD_OFFICER cannot acknowledge/resolve alerts."""
        alert = alert_service.create_alert(
            db=self.db,
            title="RBAC Alert Test",
            description="Testing alert resolution authorization",
            severity="high",
            alert_type="weather",
            dedup_key=f"rbac_alert_{int(datetime.now().timestamp())}"
        )

        # DRIVER -> 403
        driver_ack = self.client.patch(
            f"/alerts/{alert.id}/acknowledge",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        self.assertEqual(driver_ack.status_code, 403)

        # FIELD_OFFICER -> 403
        field_res = self.client.patch(
            f"/alerts/{alert.id}/resolve",
            headers={"Authorization": f"Bearer {self.field_token}"}
        )
        self.assertEqual(field_res.status_code, 403)
        print("PASS: Scenario N - Unauthorized roles (DRIVER, FIELD_OFFICER) forbidden from alert actions (403).")

    def test_scenario_o_authorized_roles_can_manage_alerts(self):
        """Scenario O: Test CONTROL_OPERATOR and ADMIN can acknowledge and resolve alerts."""
        alert = alert_service.create_alert(
            db=self.db,
            title="Operator Alert Test",
            description="Testing operator resolution authorization",
            severity="medium",
            alert_type="vehicle",
            dedup_key=f"operator_alert_{int(datetime.now().timestamp())}"
        )

        # CONTROL_OPERATOR acknowledges
        op_ack = self.client.patch(
            f"/alerts/{alert.id}/acknowledge",
            headers={"Authorization": f"Bearer {self.operator_token}"}
        )
        self.assertEqual(op_ack.status_code, 200)
        self.assertEqual(op_ack.json()["status"], "acknowledged")

        # ADMIN resolves
        admin_res = self.client.patch(
            f"/alerts/{alert.id}/resolve",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(admin_res.status_code, 200)
        self.assertEqual(admin_res.json()["status"], "resolved")
        print("PASS: Scenario O - CONTROL_OPERATOR and ADMIN authorized to manage alerts (200).")

    def test_scenario_p_password_hash_never_exposed(self):
        """Scenario P: Test password_hash is never exposed in any user response schema."""
        # 1. /auth/me
        me_resp = self.client.get("/auth/me", headers={"Authorization": f"Bearer {self.admin_token}"}).json()
        self.assertNotIn("password_hash", me_resp)
        self.assertNotIn("password", me_resp)

        # 2. /auth/users
        users_resp = self.client.get("/auth/users", headers={"Authorization": f"Bearer {self.admin_token}"}).json()
        for u in users_resp:
            self.assertNotIn("password_hash", u)
            self.assertNotIn("password", u)
        print("PASS: Scenario P - password_hash strictly excluded from all API response schemas.")


if __name__ == "__main__":
    unittest.main()
