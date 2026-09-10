"""
NEXUS-NER Phase 5 Automated Test Suite: AI/NLP Incident Intelligence
Covers:
1. Valid landslide report extraction
2. Flood report extraction
3. Road blockage report
4. Missing location handling (coordinates set to None, preserves location_text)
5. Missing severity handling (conservative fallback)
6. Ambiguous location handling
7. Empty text rejection
8. Very short text rejection
9. Provider unavailable handling
10. Gemini API failure handling (graceful fallback degradation)
11. Invalid AI response / malformed JSON handling
12. Schema validation & enum bounds
13. Confidence bounds [0.0, 1.0]
14. RBAC enforcement (ADMIN, CONTROL_OPERATOR, FIELD_OFFICER allowed; DRIVER forbidden; unauth rejected)
15. Extraction creates NO database records (read-only advisory endpoint)
16. Creation of reported incident from extraction payload
17. Verification of pending incident via PATCH /incidents/{id}/status
18. Rejection of pending incident & zero automatic verification
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app
from app.database import SessionLocal
from app.models.incident import Incident
from app.models.road import Road
from app.schemas.nlp_incident import (
    IncidentTypeEnum,
    SeverityEnum,
    ExtractionStatusEnum,
    IncidentExtractionResponse,
)
from app.services.nlp_extraction_service import (
    get_nlp_extraction_service,
    set_nlp_extraction_provider,
    DeterministicFallbackProvider,
    GeminiExtractionProvider,
    ExtractionError,
)


class Phase5NLPExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Login tokens
        cls.tokens = {}
        for role, creds in [
            ("admin", ("admin", "Admin@Nexus2026")),
            ("operator", ("operator", "Operator@Nexus2026")),
            ("field", ("field_officer", "Field@Nexus2026")),
            ("driver", ("driver", "Driver@Nexus2026")),
        ]:
            res = cls.client.post("/auth/login", json={"username": creds[0], "password": creds[1]})
            if res.status_code == 200:
                cls.tokens[role] = res.json()["access_token"]

        # Ensure deterministic fallback provider is baseline for tests
        cls.fallback_provider = DeterministicFallbackProvider()
        set_nlp_extraction_provider(cls.fallback_provider)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        # Reset provider to fallback
        set_nlp_extraction_provider(DeterministicFallbackProvider())

    def get_auth_headers(self, role="operator"):
        token = self.tokens.get(role)
        return {"Authorization": f"Bearer {token}"} if token else {}

    # -----------------------------------------------------------------------
    # 1. Valid Landslide Report Extraction
    # -----------------------------------------------------------------------
    def test_01_valid_landslide_extraction(self):
        text = "Heavy landslide reported near NH-15 between Guwahati and Tezpur. Road completely blocked."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn(data["provider"], ["fallback", "gemini"])
        ext = data["extraction"]
        self.assertEqual(ext["incident_type"], "landslide")
        self.assertIn(ext["severity"], ["high", "critical"])
        self.assertIn("NH-15", ext["road_corridor"] or ext["location_text"])
        self.assertGreaterEqual(ext["confidence"], 0.60)

    # -----------------------------------------------------------------------
    # 2. Flood Report Extraction
    # -----------------------------------------------------------------------
    def test_02_valid_flood_extraction(self):
        text = "Flash flood inundating national highway NH-29 near Dimapur. Water level rising fast."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("field"),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        ext = data["extraction"]
        self.assertEqual(ext["incident_type"], "flood")
        self.assertIn("Dimapur", ext["location_text"])
        self.assertEqual(ext["road_corridor"], "NH-29")

    # -----------------------------------------------------------------------
    # 3. Road Blockage Report Extraction
    # -----------------------------------------------------------------------
    def test_03_valid_road_blockage_extraction(self):
        text = "Traffic stopped due to massive road blockage on NH-10 near Gangtok. Trucks stranded."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("admin"),
        )
        self.assertEqual(res.status_code, 200)
        ext = res.json()["extraction"]
        self.assertIn(ext["incident_type"], ["blockage", "traffic_congestion"])
        self.assertEqual(ext["road_corridor"], "NH-10")
        self.assertIn("Gangtok", ext["location_text"])

    # -----------------------------------------------------------------------
    # 4. Missing Location Handling (Preserves text, sets coords to None)
    # -----------------------------------------------------------------------
    def test_04_missing_location_handling(self):
        text = "Severe vehicle collision with oil spill on the mountain highway. Ambulance requested."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res.status_code, 200)
        ext = res.json()["extraction"]
        self.assertEqual(ext["incident_type"], "accident")
        self.assertIsNone(ext["latitude"])
        self.assertIsNone(ext["longitude"])
        # Does NOT fabricate coordinates!
        self.assertTrue(ext["confidence"] >= 0.40)

    # -----------------------------------------------------------------------
    # 5. Missing Severity Handling (Defaults conservatively)
    # -----------------------------------------------------------------------
    def test_05_missing_severity_handling(self):
        text = "Mudslide observed on the slopes near Shillong bypass."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("field"),
        )
        self.assertEqual(res.status_code, 200)
        ext = res.json()["extraction"]
        # Defaults to high for mudslide/landslide even without explicit adjective
        self.assertIn(ext["severity"], ["medium", "high", "critical"])

    # -----------------------------------------------------------------------
    # 6. Ambiguous Location Handling
    # -----------------------------------------------------------------------
    def test_06_ambiguous_location_handling(self):
        text = "Some debris fell on a road somewhere in the hill section."
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": text},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res.status_code, 200)
        ext = res.json()["extraction"]
        self.assertIsNone(ext["latitude"])
        self.assertIsNone(ext["longitude"])
        self.assertIsNone(ext["road_corridor"])

    # -----------------------------------------------------------------------
    # 7. Empty Text Rejection
    # -----------------------------------------------------------------------
    def test_07_empty_text_rejection(self):
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": ""},
            headers=self.get_auth_headers("operator"),
        )
        # Validation error (HTTP 422)
        self.assertEqual(res.status_code, 422)

    # -----------------------------------------------------------------------
    # 8. Very Short / Whitespace Text Rejection
    # -----------------------------------------------------------------------
    def test_08_very_short_text_rejection(self):
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "   "},
            headers=self.get_auth_headers("operator"),
        )
        self.assertIn(res.status_code, [400, 422])

    # -----------------------------------------------------------------------
    # 9. Fallback Provider Deterministic Output
    # -----------------------------------------------------------------------
    def test_09_fallback_provider_deterministic(self):
        provider = DeterministicFallbackProvider()
        res1 = provider.extract("Rockfall on NH-415 near Itanagar.")
        res2 = provider.extract("Rockfall on NH-415 near Itanagar.")
        self.assertEqual(res1.incident_type, res2.incident_type)
        self.assertEqual(res1.road_corridor, res2.road_corridor)
        self.assertEqual(res1.confidence, res2.confidence)
        self.assertEqual(res1.severity, res2.severity)

    # -----------------------------------------------------------------------
    # 10. Gemini API Failure (Graceful degradation to fallback)
    # -----------------------------------------------------------------------
    def test_10_gemini_api_failure_graceful_degradation(self):
        mock_gemini = GeminiExtractionProvider(api_key="fake-key-for-test", model="gemini-test")

        # Mock requests.post to simulate network failure / 500 error
        with patch("requests.post") as mock_post:
            mock_post.side_effect = Exception("Simulated connection timeout to Google API")

            service = get_nlp_extraction_service()
            service.set_provider(mock_gemini)

            result = service.extract_incident("Landslide blocking NH-15 near Tezpur")
            self.assertTrue(result.success)
            self.assertEqual(result.provider, "fallback")
            self.assertIsNotNone(result.warning)
            self.assertIn("unavailable", result.warning.lower())
            self.assertEqual(result.extraction.incident_type, IncidentTypeEnum.LANDSLIDE)

        # Restore fallback
        set_nlp_extraction_provider(self.fallback_provider)

    # -----------------------------------------------------------------------
    # 11. Invalid AI Response / Malformed JSON Handling
    # -----------------------------------------------------------------------
    def test_11_invalid_ai_response_handling(self):
        mock_gemini = GeminiExtractionProvider(api_key="fake-key", model="gemini-test")

        with patch("requests.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "candidates": [{
                    "content": {"parts": [{"text": "NOT A JSON OBJECT >>> ERROR"}]}
                }]
            }
            mock_post.return_value = mock_resp

            service = get_nlp_extraction_service()
            service.set_provider(mock_gemini)

            # Service should degrade to fallback rather than crash
            result = service.extract_incident("Road damage near Jorhat on NH-37")
            self.assertTrue(result.success)
            self.assertEqual(result.provider, "fallback")
            self.assertEqual(result.extraction.incident_type, IncidentTypeEnum.ROAD_DAMAGE)

        # Restore fallback
        set_nlp_extraction_provider(self.fallback_provider)

    # -----------------------------------------------------------------------
    # 12. Schema Validation & Enum Bounds
    # -----------------------------------------------------------------------
    def test_12_schema_validation_and_enums(self):
        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Heavy rain and waterlogging near Silchar."},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res.status_code, 200)
        # Parse through Pydantic to ensure schema integrity
        model = IncidentExtractionResponse.model_validate(res.json())
        self.assertIn(model.extraction.incident_type, IncidentTypeEnum)
        self.assertIn(model.extraction.severity, SeverityEnum)
        self.assertIn(model.extraction.extraction_status, ExtractionStatusEnum)

    # -----------------------------------------------------------------------
    # 13. Confidence Bounds [0.0, 1.0]
    # -----------------------------------------------------------------------
    def test_13_confidence_bounds(self):
        for sample in [
            "Emergency catastrophic bridge collapse on NH-10 near Gangtok with complete destruction",
            "maybe some rocks",
            "traffic moving slow near Guwahati",
        ]:
            res = self.client.post(
                "/incidents/extract-from-text",
                json={"text": sample},
                headers=self.get_auth_headers("operator"),
            )
            self.assertEqual(res.status_code, 200)
            conf = res.json()["extraction"]["confidence"]
            self.assertGreaterEqual(conf, 0.0)
            self.assertLessEqual(conf, 1.0)

    # -----------------------------------------------------------------------
    # 14. RBAC Enforcement
    # -----------------------------------------------------------------------
    def test_14_rbac_enforcement(self):
        # 1. Unauthenticated -> 401
        res_unauth = self.client.post("/incidents/extract-from-text", json={"text": "Landslide on NH-15"})
        self.assertEqual(res_unauth.status_code, 401)

        # 2. DRIVER role -> 403 Forbidden
        res_driver = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Landslide on NH-15"},
            headers=self.get_auth_headers("driver"),
        )
        self.assertEqual(res_driver.status_code, 403)

        # 3. FIELD_OFFICER -> 200 OK
        res_field = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Landslide on NH-15"},
            headers=self.get_auth_headers("field"),
        )
        self.assertEqual(res_field.status_code, 200)

        # 4. CONTROL_OPERATOR -> 200 OK
        res_op = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Landslide on NH-15"},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res_op.status_code, 200)

        # 5. ADMIN -> 200 OK
        res_admin = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Landslide on NH-15"},
            headers=self.get_auth_headers("admin"),
        )
        self.assertEqual(res_admin.status_code, 200)

    # -----------------------------------------------------------------------
    # 15. Zero Database Mutation on Extraction
    # -----------------------------------------------------------------------
    def test_15_extraction_creates_no_database_records(self):
        count_before = self.db.query(Incident).count()

        res = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Major rockfall blocking NH-27 near Guwahati."},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res.status_code, 200)

        count_after = self.db.query(Incident).count()
        self.assertEqual(count_before, count_after, "AI extraction must be strictly read-only and create zero database rows!")

    # -----------------------------------------------------------------------
    # 16. Creation of Reported Incident from Extraction
    # -----------------------------------------------------------------------
    def test_16_create_reported_incident_from_extraction(self):
        # 1. Extract
        res_ext = self.client.post(
            "/incidents/extract-from-text",
            json={"text": "Landslide near NH-29 with lat: 25.85, lon: 93.75"},
            headers=self.get_auth_headers("field"),
        )
        self.assertEqual(res_ext.status_code, 200)
        ext = res_ext.json()["extraction"]

        # 2. Create unverified incident using extracted fields
        create_payload = {
            "incident_type": ext["incident_type"],
            "severity": ext["severity"],
            "description": f"[AI Draft] {ext['description']}",
            "latitude": ext["latitude"] or 25.85,
            "longitude": ext["longitude"] or 93.75,
            "road_status": "blocked",
        }
        res_create = self.client.post(
            "/incidents/",
            json=create_payload,
            headers=self.get_auth_headers("field"),
        )
        self.assertEqual(res_create.status_code, 200)
        inc_data = res_create.json()
        self.assertEqual(inc_data["status"], "reported")  # MUST be reported/unverified!
        self.assertIn("AI Draft", inc_data["description"])

    # -----------------------------------------------------------------------
    # 17. Verification of Pending Incident via PATCH /incidents/{id}/status
    # -----------------------------------------------------------------------
    def test_17_operator_verifies_incident(self):
        # Create reported incident
        res_create = self.client.post(
            "/incidents/",
            json={
                "incident_type": "landslide",
                "severity": "high",
                "description": "Unverified citizen note about mud on road",
                "latitude": 26.15,
                "longitude": 91.75,
            },
            headers=self.get_auth_headers("operator"),
        )
        inc_id = res_create.json()["id"]

        # Operator verifies it
        res_patch = self.client.patch(
            f"/incidents/{inc_id}/status",
            json={"status": "verified"},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["status"], "verified")

    # -----------------------------------------------------------------------
    # 18. Rejection of Pending Incident & Invariance of Rejection
    # -----------------------------------------------------------------------
    def test_18_operator_rejects_incident(self):
        # Create reported incident
        res_create = self.client.post(
            "/incidents/",
            json={
                "incident_type": "flood",
                "severity": "medium",
                "description": "False alarm water puddle",
                "latitude": 26.20,
                "longitude": 91.80,
            },
            headers=self.get_auth_headers("operator"),
        )
        inc_id = res_create.json()["id"]

        # Operator rejects it
        res_patch = self.client.patch(
            f"/incidents/{inc_id}/status",
            json={"status": "rejected"},
            headers=self.get_auth_headers("operator"),
        )
        self.assertEqual(res_patch.status_code, 200)
        self.assertEqual(res_patch.json()["status"], "rejected")


if __name__ == "__main__":
    unittest.main()
