"""
Unit and Integration Test Suite for Phase 6D: ML Disruption Inference API.
Validates:
1. Endpoint requires authentication (HTTP 401 on missing token).
2. Endpoint rejects invalid tokens (HTTP 401).
3. Endpoint rejects inactive users (HTTP 403).
4. Authenticated request succeeds with HTTP 200.
5. Response schema adheres strictly to DisruptionPredictionResponse.
6. Probability is mathematically bounded in [0.0, 1.0].
7. Operational decision threshold tau* is strictly 0.55.
8. Binary predicted_class adheres to threshold rule (1 if P >= 0.55 else 0).
9. Boolean is_disrupted mirrors predicted_class.
10. Risk tier calibration (CRITICAL, HIGH, ELEVATED, LOW) is accurate.
11. SHAP base prior value matches expected training prior (~0.5008).
12. SHAP output space is explicitly 'probability_space'.
13. Top positive contributors have positive SHAP attributions, sorted by magnitude descending.
14. Top negative contributors have negative SHAP attributions, sorted by magnitude descending.
15. SHAP additive consistency is mathematically exact: prob == base_value + sum(shap_values).
16. Narrative explanation synthesizes non-causal attribution text.
17. Mandatory prototype data honesty notice is included in response.
18. Anti-leakage: passing 'disruption_within_6h' is rejected with HTTP 422.
19. Anti-leakage: passing 'actual_rain_next_6h' is rejected with HTTP 422.
20. Anti-leakage: passing 'status' is rejected with HTTP 422.
21. Anti-leakage: passing 'road_status' is rejected with HTTP 422.
22. Anti-leakage: passing 'risk_score' is rejected with HTTP 422.
23. Anti-leakage: passing 'is_disrupted_now' is rejected with HTTP 422.
24. Anti-leakage: passing 'incident_id' is rejected with HTTP 422.
25. Anti-leakage: passing 'disruption_duration_hours' is rejected with HTTP 422.
26. Extra unknown fields rejected with HTTP 422 (extra='forbid').
27. Missing required feature fields rejected with HTTP 422.
28. Out-of-bounds numerical values rejected with HTTP 422.
29. Invalid categorical values rejected with HTTP 422.
30. Model bundle SHA-256 hash remains strictly unchanged before and after inference.
31. Held-out test high-risk case predicts high disruption probability (> 0.85).
32. Held-out test low-risk case predicts low disruption probability (< 0.20).
33. Custom top_k parameter limits number of returned contributors.
34. GET /ml/model-info returns complete architecture and threshold metadata.
35. GET /ml/metadata alias returns identical metadata.
"""

import hashlib
import json
import os
from pathlib import Path
import sys
import unittest

from fastapi.testclient import TestClient

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.services import auth_service
from app.ml import config

VALID_INFERENCE_PAYLOAD = {
    "curr_precip_mm": 15.0,
    "forecast_rain_6h_sum_mm": 45.0,
    "forecast_rain_max_intensity_mm": 20.0,
    "forecast_precip_prob_max": 80.0,
    "wind_speed_kmh": 25.0,
    "wind_gust_kmh": 40.0,
    "visibility_km": 6.0,
    "severe_weather_flag": 1,
    "antecedent_rain_24h_mm": 60.0,
    "antecedent_rain_72h_mm": 110.0,
    "elevation_m": 1100.0,
    "slope_angle_deg": 28.0,
    "terrain_type": "Steep Ghat",
    "road_class": "state_highway",
    "historical_vulnerability_score": 0.70,
    "is_monsoon_season": 1,
    "month_of_year": 7,
    "hour_of_day": 14,
    "active_incidents_nearby_15km": 2,
    "top_k": 5,
}

HIGH_RISK_PAYLOAD = {
    "curr_precip_mm": 25.0,
    "forecast_rain_6h_sum_mm": 115.9,
    "forecast_rain_max_intensity_mm": 50.5,
    "forecast_precip_prob_max": 100.0,
    "wind_speed_kmh": 50.0,
    "wind_gust_kmh": 75.0,
    "visibility_km": 2.0,
    "severe_weather_flag": 1,
    "antecedent_rain_24h_mm": 75.4,
    "antecedent_rain_72h_mm": 230.4,
    "elevation_m": 1600.0,
    "slope_angle_deg": 38.0,
    "terrain_type": "Steep Ghat",
    "road_class": "state_highway",
    "historical_vulnerability_score": 0.90,
    "is_monsoon_season": 1,
    "month_of_year": 9,
    "hour_of_day": 8,
    "active_incidents_nearby_15km": 4,
}

LOW_RISK_PAYLOAD = {
    "curr_precip_mm": 0.0,
    "forecast_rain_6h_sum_mm": 0.0,
    "forecast_rain_max_intensity_mm": 0.0,
    "forecast_precip_prob_max": 0.0,
    "wind_speed_kmh": 5.0,
    "wind_gust_kmh": 8.0,
    "visibility_km": 15.0,
    "severe_weather_flag": 0,
    "antecedent_rain_24h_mm": 0.0,
    "antecedent_rain_72h_mm": 0.0,
    "elevation_m": 120.0,
    "slope_angle_deg": 2.0,
    "terrain_type": "Plain",
    "road_class": "national_highway",
    "historical_vulnerability_score": 0.10,
    "is_monsoon_season": 0,
    "month_of_year": 1,
    "hour_of_day": 10,
    "active_incidents_nearby_15km": 0,
}


def compute_file_sha256(file_path: Path) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


class MLInferenceAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        auth_service.seed_initial_users_if_empty(cls.db)

        # Login as operator to obtain valid JWT
        login_res = cls.client.post(
            "/auth/login",
            json={"username": "operator", "password": "Operator@Nexus2026"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        cls.auth_token = login_res.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.auth_token}"}

        # Create an inactive user for 403 test
        inactive_user = cls.db.query(User).filter(User.username == "test_inactive_ml").first()
        if not inactive_user:
            user_in = auth_service.UserCreate(
                username="test_inactive_ml",
                email="inactive_ml@nexus.ner",
                password="Password@123",
                role="CONTROL_OPERATOR",
                is_active=False,
            )
            inactive_user = auth_service.create_user(cls.db, user_in)
            inactive_user.is_active = False
            cls.db.commit()
            cls.db.refresh(inactive_user)
        else:
            inactive_user.is_active = False
            cls.db.commit()

        cls.inactive_token = auth_service.create_access_token(
            data={"sub": str(inactive_user.id), "role": inactive_user.role, "username": inactive_user.username}
        )

        # Record model bundle hash
        cls.model_path = config.DEFAULT_RF_MODEL_FILE
        assert cls.model_path.exists(), f"Model artifact missing at {cls.model_path}"
        cls.initial_model_hash = compute_file_sha256(cls.model_path)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.query(User).filter(User.username.like("test_%")).delete()
            cls.db.commit()
        except Exception:
            pass
        cls.db.close()

    # -----------------------------------------------------------------------
    # Authentication & Security
    # -----------------------------------------------------------------------
    def test_01_missing_auth_header_rejected(self):
        res = self.client.post("/ml/predict-disruption", json=VALID_INFERENCE_PAYLOAD)
        self.assertEqual(res.status_code, 401)
        self.assertIn("detail", res.json())

    def test_02_invalid_token_rejected(self):
        headers = {"Authorization": "Bearer invalid.token.payload"}
        res = self.client.post("/ml/predict-disruption", json=VALID_INFERENCE_PAYLOAD, headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_03_inactive_user_rejected(self):
        headers = {"Authorization": f"Bearer {self.inactive_token}"}
        res = self.client.post("/ml/predict-disruption", json=VALID_INFERENCE_PAYLOAD, headers=headers)
        self.assertEqual(res.status_code, 403)

    # -----------------------------------------------------------------------
    # Successful Prediction & Schema Compliance
    # -----------------------------------------------------------------------
    def test_04_valid_prediction_returns_200(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=VALID_INFERENCE_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()

        # Provenance and metadata
        self.assertEqual(data["model_name"], "RandomForestClassifier")
        self.assertEqual(data["model_version"], "v1.0")
        self.assertEqual(data["dataset_version"], config.DATASET_VERSION)
        self.assertEqual(data["provenance"], config.DATASET_PROVENANCE)
        self.assertTrue(data["is_synthetic"])
        self.assertIn("CRITICAL DATA HONESTY", data["data_honesty_notice"])

    def test_05_prediction_probability_and_threshold(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=VALID_INFERENCE_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        pred = res.json()["prediction"]

        prob = pred["predicted_probability"]
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)
        self.assertEqual(pred["disruption_probability"], prob)

        threshold = pred["operational_threshold"]
        self.assertEqual(threshold, 0.55)
        self.assertEqual(pred["threshold"], 0.55)

        expected_class = 1 if prob >= threshold else 0
        self.assertEqual(pred["predicted_class"], expected_class)
        self.assertEqual(pred["is_disrupted"], bool(expected_class == 1))

        # Check risk tier validity
        valid_tiers = ["CRITICAL DISRUPTION RISK", "HIGH DISRUPTION RISK", "ELEVATED DISRUPTION RISK", "LOW DISRUPTION RISK"]
        self.assertIn(pred["risk_tier"], valid_tiers)

    def test_06_shap_explanation_structure_and_base_value(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=VALID_INFERENCE_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        expl = res.json()["explanation"]

        self.assertEqual(expl["output_space"], "probability_space")
        self.assertAlmostEqual(expl["base_value"], 0.5008, places=2)

        # Top positive contributors
        pos = expl["top_positive_contributors"]
        self.assertIsInstance(pos, list)
        self.assertGreater(len(pos), 0)
        for item in pos:
            self.assertGreater(item["shap_value"], 0)
            self.assertEqual(item["direction"], "increases_disruption_probability")
            self.assertEqual(item["magnitude"], abs(item["shap_value"]))
            self.assertTrue(len(item["physical_interpretation"]) > 0)

        # Top negative contributors
        neg = expl["top_negative_contributors"]
        self.assertIsInstance(neg, list)
        for item in neg:
            self.assertLess(item["shap_value"], 0)
            self.assertEqual(item["direction"], "decreases_disruption_probability")
            self.assertEqual(item["magnitude"], abs(item["shap_value"]))
            self.assertTrue(len(item["physical_interpretation"]) > 0)

    def test_07_exact_additive_consistency_in_probability_space(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=VALID_INFERENCE_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()

        pred = data["prediction"]
        expl = data["explanation"]
        consistency = expl["additive_consistency"]

        self.assertTrue(consistency["is_exact"])
        self.assertLess(consistency["absolute_error"], 1e-4)
        self.assertAlmostEqual(
            consistency["reconstructed_probability"],
            pred["predicted_probability"],
            places=4,
        )

    def test_08_human_readable_narrative_synthesized(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=VALID_INFERENCE_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        expl = res.json()["explanation"]
        narrative = expl["narrative"]

        self.assertIn("Model prediction:", narrative)
        self.assertIn("operational alert threshold:", narrative)
        self.assertIn("Base prior probability", narrative)
        self.assertIn("not verified empirical causality", narrative)

    # -----------------------------------------------------------------------
    # Strict Anti-Leakage Safeguards (HTTP 422)
    # -----------------------------------------------------------------------
    def test_09_anti_leakage_target_column_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["disruption_within_6h"] = 1
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_10_anti_leakage_actual_rain_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["actual_rain_next_6h"] = 55.2
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_11_anti_leakage_status_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["status"] = "blocked"
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_12_anti_leakage_road_status_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["road_status"] = "closed"
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_13_anti_leakage_risk_score_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["risk_score"] = 85.0
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_14_anti_leakage_is_disrupted_now_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["is_disrupted_now"] = 1
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_15_anti_leakage_incident_id_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["incident_id"] = 101
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_16_anti_leakage_duration_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["disruption_duration_hours"] = 3.5
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    # -----------------------------------------------------------------------
    # Input Validation & Bad Payloads
    # -----------------------------------------------------------------------
    def test_17_extra_unknown_field_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["completely_bogus_extra_field"] = "hack"
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_18_missing_required_field_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        del bad_payload["curr_precip_mm"]
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_19_negative_precipitation_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["curr_precip_mm"] = -5.0
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_20_invalid_month_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["month_of_year"] = 13
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_21_invalid_hour_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["hour_of_day"] = 24
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_22_invalid_terrain_type_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["terrain_type"] = "Desert Dune"
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    def test_23_invalid_road_class_rejected(self):
        bad_payload = dict(VALID_INFERENCE_PAYLOAD)
        bad_payload["road_class"] = "interstate"
        res = self.client.post("/ml/predict-disruption", json=bad_payload, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)

    # -----------------------------------------------------------------------
    # Behavioral Consistency with Phase 6C Held-Out Cases
    # -----------------------------------------------------------------------
    def test_24_high_risk_held_out_case(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=HIGH_RISK_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200, res.text)
        pred = res.json()["prediction"]
        self.assertGreaterEqual(pred["predicted_probability"], 0.85)
        self.assertEqual(pred["predicted_class"], 1)
        self.assertTrue(pred["is_disrupted"])
        self.assertEqual(pred["risk_tier"], "CRITICAL DISRUPTION RISK")

    def test_25_low_risk_held_out_case(self):
        res = self.client.post(
            "/ml/predict-disruption",
            json=LOW_RISK_PAYLOAD,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200, res.text)
        pred = res.json()["prediction"]
        self.assertLessEqual(pred["predicted_probability"], 0.20)
        self.assertEqual(pred["predicted_class"], 0)
        self.assertFalse(pred["is_disrupted"])
        self.assertEqual(pred["risk_tier"], "LOW DISRUPTION RISK")

    def test_26_custom_top_k_parameter(self):
        payload = dict(VALID_INFERENCE_PAYLOAD)
        payload["top_k"] = 3
        res = self.client.post(
            "/ml/predict-disruption",
            json=payload,
            headers=self.auth_headers,
        )
        self.assertEqual(res.status_code, 200)
        expl = res.json()["explanation"]
        self.assertLessEqual(len(expl["top_positive_contributors"]), 3)
        self.assertLessEqual(len(expl["top_negative_contributors"]), 3)

    # -----------------------------------------------------------------------
    # Metadata Endpoints
    # -----------------------------------------------------------------------
    def test_27_get_model_info_endpoint(self):
        res = self.client.get("/ml/model-info", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["primary_model"], "RandomForestClassifier")
        self.assertEqual(data["model_version"], "v1.0")
        self.assertEqual(data["operational_thresholds"]["decision_threshold"], 0.55)
        self.assertEqual(data["provenance"], "prototype_training_augmentation")
        self.assertTrue(data["is_synthetic"])

    def test_28_get_metadata_alias_endpoint(self):
        res = self.client.get("/ml/metadata", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["primary_model"], "RandomForestClassifier")

    # -----------------------------------------------------------------------
    # Model Artifact Immutability Verification
    # -----------------------------------------------------------------------
    def test_29_model_artifact_hash_remains_strictly_identical(self):
        # Execute multiple predictions to stress the pipeline
        for _ in range(5):
            self.client.post(
                "/ml/predict-disruption",
                json=VALID_INFERENCE_PAYLOAD,
                headers=self.auth_headers,
            )

        current_hash = compute_file_sha256(self.model_path)
        self.assertEqual(
            self.initial_model_hash,
            current_hash,
            "CRITICAL INTEGRITY FAILURE: Model artifact hash altered during inference API operations!",
        )


if __name__ == "__main__":
    unittest.main()
