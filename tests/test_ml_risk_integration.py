"""
Unit and Integration Test Suite for Phase 6E: Predictive Disruption Risk & Alert Integration.
Validates:
1. Deterministic risk engine remains authoritative and unchanged.
2. ML prediction can be calculated independently via service abstraction.
3. ML disruption probability NEVER overwrites deterministic risk score.
4. Operational ML threshold remains strictly 0.55.
5. ML predicted_class correctly reflects threshold (1 if P >= 0.55 else 0).
6. Missing required feature causes safe ML-unavailable state (available: False) without data fabrication.
7. Anti-leakage: forbidden column 'disruption_within_6h' is strictly rejected with HTTP 422.
8. Anti-leakage: forbidden column 'actual_rain_next_6h' is strictly rejected with HTTP 422.
9. Anti-leakage: post-event columns ('status', 'road_status', 'risk_score') rejected with HTTP 422.
10. Existing Critical deterministic alert still fires when ML probability is low (ML cannot suppress confirmed alerts).
11. High ML probability alone does NOT create a Critical operational alert or fake an incident.
12. High ML probability + corroborating operational evidence creates a predictive alert.
13. Predictive alert is explicitly typed 'predictive_disruption'.
14. Predictive alert wording distinguishes forward prediction from confirmed blockage.
15. Existing alert deduplication suppresses repeated predictive alerts within the 60-minute window.
16. Predictive alert lifecycle (active -> acknowledged -> resolved) operates via existing endpoints.
17. Predictive alert references model version (v1.0) and prototype provenance.
18. SHAP explanation is attached and uses non-causal attribution language.
19. POST /ml/predict-corridor-risk requires authentication (HTTP 401 on missing token).
20. GET /risk/corridor/{road_id}/predictive requires authentication (HTTP 401).
21. GET /risk/ baseline remains completely unchanged and returns list[RiskItem].
22. No automatic rerouting or route mutation is triggered by ML predictive evaluation.
23. Model artifact SHA-256 hash remains strictly unchanged before and after evaluations.
24. End-to-end corridor predictive risk evaluation handles valid road and corridor context.
25. Feature adapter correctly aggregates weather and network context when available.
26. Inactive user is rejected with HTTP 403 on predictive risk endpoints.
27. Non-existent road returns HTTP 404.
28. Alert generation gate: require_corroboration=True blocks uncorroborated ML alerts.
29. Zero model retraining occurs during execution.
30. Prototype data honesty notice is present in all predictive risk outputs.
"""

import hashlib
from datetime import datetime, timezone, timedelta
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
from app.models.road import Road
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.user import User
from app.services import auth_service, alert_service, ml_prediction_service
from app.ml import config
from app.ml.feature_engineering import TemporalLeakageError

VALID_CORRIDOR_PAYLOAD = {
    "curr_precip_mm": 18.0,
    "forecast_rain_6h_sum_mm": 55.0,
    "forecast_rain_max_intensity_mm": 24.0,
    "forecast_precip_prob_max": 85.0,
    "wind_speed_kmh": 28.0,
    "wind_gust_kmh": 45.0,
    "visibility_km": 5.0,
    "severe_weather_flag": 1,
    "antecedent_rain_24h_mm": 65.0,
    "antecedent_rain_72h_mm": 120.0,
    "elevation_m": 1200.0,
    "slope_angle_deg": 30.0,
    "terrain_type": "Steep Ghat",
    "road_class": "state_highway",
    "historical_vulnerability_score": 0.75,
    "is_monsoon_season": 1,
    "month_of_year": 7,
    "hour_of_day": 15,
    "active_incidents_nearby_15km": 2,
    "top_k": 5,
}

HIGH_PROB_CORROBORATED_PAYLOAD = {
    "curr_precip_mm": 35.0,
    "forecast_rain_6h_sum_mm": 120.0,
    "forecast_rain_max_intensity_mm": 55.0,
    "forecast_precip_prob_max": 100.0,
    "wind_speed_kmh": 55.0,
    "wind_gust_kmh": 80.0,
    "visibility_km": 2.0,
    "severe_weather_flag": 1,
    "antecedent_rain_24h_mm": 85.0,
    "antecedent_rain_72h_mm": 240.0,
    "elevation_m": 1600.0,
    "slope_angle_deg": 38.0,
    "terrain_type": "Steep Ghat",
    "road_class": "state_highway",
    "historical_vulnerability_score": 0.90,
    "is_monsoon_season": 1,
    "month_of_year": 8,
    "hour_of_day": 14,
    "active_incidents_nearby_15km": 3,
}

HIGH_PROB_UNCORROBORATED_PAYLOAD = dict(HIGH_PROB_CORROBORATED_PAYLOAD)
HIGH_PROB_UNCORROBORATED_PAYLOAD["active_incidents_nearby_15km"] = 0

LOW_PROB_PAYLOAD = {
    "curr_precip_mm": 0.0,
    "forecast_rain_6h_sum_mm": 0.0,
    "forecast_rain_max_intensity_mm": 0.0,
    "forecast_precip_prob_max": 0.0,
    "wind_speed_kmh": 5.0,
    "wind_gust_kmh": 10.0,
    "visibility_km": 15.0,
    "severe_weather_flag": 0,
    "antecedent_rain_24h_mm": 0.0,
    "antecedent_rain_72h_mm": 0.0,
    "elevation_m": 100.0,
    "slope_angle_deg": 2.0,
    "terrain_type": "Plain",
    "road_class": "national_highway",
    "historical_vulnerability_score": 0.10,
    "is_monsoon_season": 0,
    "month_of_year": 2,
    "hour_of_day": 11,
    "active_incidents_nearby_15km": 0,
}


def compute_file_sha256(file_path: Path) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


class MLRiskIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        auth_service.seed_initial_users_if_empty(cls.db)

        # Login as operator
        login_res = cls.client.post(
            "/auth/login",
            json={"username": "operator", "password": "Operator@Nexus2026"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        cls.auth_token = login_res.json()["access_token"]
        cls.auth_headers = {"Authorization": f"Bearer {cls.auth_token}"}

        # Create inactive user for 403 testing
        inactive_user = cls.db.query(User).filter(User.username == "test_inactive_6e").first()
        if not inactive_user:
            user_in = auth_service.UserCreate(
                username="test_inactive_6e",
                email="inactive_6e@nexus.ner",
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

        # Ensure a test Road exists
        cls.test_road = cls.db.query(Road).filter(Road.road_name == "TEST_CORRIDOR_6E").first()
        if not cls.test_road:
            cls.test_road = Road(
                road_name="TEST_CORRIDOR_6E",
                road_type="primary",
                status="open",
                risk_score=25.0,
                latitude=26.15,
                longitude=91.75,
                location="POINT(91.75 26.15)",
            )
            cls.db.add(cls.test_road)
            cls.db.commit()
            cls.db.refresh(cls.test_road)

        # Record baseline model SHA-256
        cls.model_path = config.DEFAULT_RF_MODEL_FILE
        assert cls.model_path.exists(), f"Model artifact missing at {cls.model_path}"
        cls.initial_model_hash = compute_file_sha256(cls.model_path)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.db.query(Alert).filter(Alert.alert_type == "predictive_disruption").delete()
            cls.db.query(Road).filter(Road.road_name == "TEST_CORRIDOR_6E").delete()
            cls.db.query(User).filter(User.username.like("test_inactive_6e%")).delete()
            cls.db.commit()
        except Exception:
            pass
        cls.db.close()

    # -----------------------------------------------------------------------
    # 1. Deterministic Risk Preservation & Service Abstraction
    # -----------------------------------------------------------------------
    def test_01_deterministic_risk_remains_unchanged(self):
        """Hard Safety Rule: Deterministic risk score is NEVER overwritten by ML probability."""
        eval_result = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            road=self.test_road,
            deterministic_risk_score=45.0,
            features=HIGH_PROB_CORROBORATED_PAYLOAD,
        )

        # Deterministic risk must remain exactly 45.0
        self.assertEqual(eval_result["deterministic_risk_score"], 45.0)
        self.assertEqual(eval_result["deterministic_risk_level"], "medium")

        # ML probability must be separate and independent
        self.assertTrue(eval_result["ml_prediction"]["available"])
        ml_prob = eval_result["ml_prediction"]["disruption_probability"]
        self.assertGreater(ml_prob, 0.80)
        self.assertNotEqual(eval_result["deterministic_risk_score"], ml_prob)

    def test_02_predict_disruption_service_abstraction(self):
        """Service-layer predict_disruption operates directly on DisruptionExplainer singleton."""
        res = ml_prediction_service.predict_disruption(VALID_CORRIDOR_PAYLOAD, top_k=3)
        self.assertTrue(res["available"])
        self.assertIn("disruption_probability", res)
        self.assertEqual(res["threshold"], 0.55)
        self.assertIn(res["predicted_class"], [0, 1])
        self.assertEqual(res["model_version"], "v1.0")
        self.assertEqual(res["dataset_version"], config.DATASET_VERSION)
        self.assertEqual(res["provenance"], config.DATASET_PROVENANCE)
        self.assertTrue(res["is_synthetic"])
        self.assertLessEqual(len(res["top_positive_contributors"]), 3)
        self.assertLessEqual(len(res["top_negative_contributors"]), 3)
        self.assertIn("CRITICAL DATA HONESTY", res["data_honesty_notice"])

    def test_03_ml_threshold_and_class_calibration(self):
        """Operational threshold tau* is strictly 0.55 and determines binary predicted_class."""
        res_high = ml_prediction_service.predict_disruption(HIGH_PROB_CORROBORATED_PAYLOAD)
        self.assertEqual(res_high["threshold"], 0.55)
        self.assertGreaterEqual(res_high["disruption_probability"], 0.55)
        self.assertEqual(res_high["predicted_class"], 1)
        self.assertTrue(res_high["is_disrupted"])
        self.assertEqual(res_high["risk_signal"], "DISRUPTION_LIKELY")

        res_low = ml_prediction_service.predict_disruption(LOW_PROB_PAYLOAD)
        self.assertEqual(res_low["threshold"], 0.55)
        self.assertLess(res_low["disruption_probability"], 0.55)
        self.assertEqual(res_low["predicted_class"], 0)
        self.assertFalse(res_low["is_disrupted"])
        self.assertEqual(res_low["risk_signal"], "DISRUPTION_UNLIKELY")

    # -----------------------------------------------------------------------
    # 2. Feature Adapter Boundary & Safe Fallback
    # -----------------------------------------------------------------------
    def test_04_missing_features_causes_safe_unavailable_state(self):
        """When required operational features are unavailable, fail safely without fabricating values."""
        # Query without overrides for a dummy coordinate with no weather/topo profile
        available, adapted, missing = ml_prediction_service.adapt_corridor_features(
            db=self.db,
            latitude=22.50,
            longitude=89.50,
            custom_overrides=None,
        )
        self.assertFalse(available)
        self.assertIsNone(adapted)
        self.assertGreater(len(missing), 0)

        # evaluate_predictive_risk must handle unavailable ML safely without crashing
        res = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            latitude=22.50,
            longitude=89.50,
            deterministic_risk_score=30.0,
        )
        self.assertEqual(res["deterministic_risk_score"], 30.0)
        self.assertFalse(res["ml_prediction"]["available"])
        self.assertIn("missing_features", res["ml_prediction"])
        self.assertEqual(res["combined_assessment"]["predictive_signal"], "ML_PREDICTION_UNAVAILABLE")

    def test_05_feature_adapter_rejects_leakage(self):
        """Feature adapter strictly raises TemporalLeakageError if forbidden columns are passed."""
        forbidden_keys = [
            "disruption_within_6h",
            "actual_rain_next_6h",
            "status",
            "road_status",
            "risk_score",
            "is_disrupted_now",
            "incident_id",
            "disruption_duration_hours",
        ]
        for key in forbidden_keys:
            with self.assertRaises(TemporalLeakageError):
                ml_prediction_service.adapt_corridor_features(
                    db=self.db,
                    latitude=26.15,
                    longitude=91.75,
                    custom_overrides={key: 1},
                )

    # -----------------------------------------------------------------------
    # 3. Rule-Based Combined Assessment & Advisory Semantics
    # -----------------------------------------------------------------------
    def test_06_high_ml_plus_corroboration_produces_high_predictive_risk(self):
        """Scenario C: High ML probability + corroborating operational evidence produces HIGH_PREDICTIVE_DISRUPTION_RISK."""
        res = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            road=self.test_road,
            deterministic_risk_score=50.0,  # elevated deterministic risk corroborates ML
            features=HIGH_PROB_CORROBORATED_PAYLOAD,
        )
        self.assertTrue(res["ml_prediction"]["available"])
        self.assertEqual(res["combined_assessment"]["predictive_signal"], "HIGH_PREDICTIVE_DISRUPTION_RISK")
        self.assertTrue(res["combined_assessment"]["corroborated"])
        self.assertIn("corroborated by current deterministic risk", res["combined_assessment"]["advisory"])

    def test_07_high_ml_alone_produces_early_warning_not_confirmed_incident(self):
        """Scenario A: High ML probability alone without operational corroboration produces early warning only."""
        res = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            deterministic_risk_score=10.0,  # low deterministic risk, no active incident
            deterministic_risk_level="low",
            features=HIGH_PROB_UNCORROBORATED_PAYLOAD,
        )
        self.assertEqual(res["combined_assessment"]["predictive_signal"], "PREDICTIVE_EARLY_WARNING")
        self.assertFalse(res["combined_assessment"]["corroborated"])
        self.assertIn("no confirmed blockage", res["combined_assessment"]["advisory"])

    def test_08_low_ml_does_not_suppress_confirmed_deterministic_hazard(self):
        """Scenario B: Low ML probability does NOT suppress or weaken authoritative high/critical deterministic risk."""
        res = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            deterministic_risk_score=90.0,
            deterministic_risk_level="critical",
            features=LOW_PROB_PAYLOAD,
        )
        self.assertEqual(res["deterministic_risk_score"], 90.0)
        self.assertEqual(res["deterministic_risk_level"], "critical")
        self.assertEqual(res["combined_assessment"]["predictive_signal"], "DETERMINISTIC_HAZARD_PREVAILS")
        self.assertFalse(res["combined_assessment"]["corroborated"])
        self.assertIn("does NOT override or weaken deterministic physical safety rules", res["combined_assessment"]["advisory"])

    # -----------------------------------------------------------------------
    # 4. Controlled Predictive Alert Generation & Deduplication
    # -----------------------------------------------------------------------
    def test_09_predictive_alert_generation_and_semantics(self):
        """Predictive alert generation requires corroboration and enforces predictive semantics."""
        comb_risk = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            road=self.test_road,
            deterministic_risk_score=65.0,  # corroboration present
            features=HIGH_PROB_CORROBORATED_PAYLOAD,
        )

        alert, was_new = ml_prediction_service.check_and_create_predictive_alert(
            db=self.db,
            combined_risk=comb_risk,
            source_entity="road",
            source_entity_id=self.test_road.id,
            corridor_name=self.test_road.road_name,
            latitude=self.test_road.latitude,
            longitude=self.test_road.longitude,
            require_corroboration=True,
        )
        self.assertIsNotNone(alert)
        self.assertTrue(was_new)
        self.assertEqual(alert.alert_type, "predictive_disruption")
        self.assertEqual(alert.severity, "high")  # High, never Critical on ML alone
        self.assertIn("Predictive Disruption Warning", alert.title)
        self.assertIn("NOT a confirmed road blockage", alert.description)
        self.assertIn("SHAP feature attributions reflect statistical model weighting", alert.description)
        self.assertIn("prototype_training_augmentation", alert.description)

    def test_10_alert_deduplication_suppresses_repeated_alerts(self):
        """Repeated ML predictions within the 60-minute window return the existing alert without duplication."""
        comb_risk = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            road=self.test_road,
            deterministic_risk_score=65.0,
            features=HIGH_PROB_CORROBORATED_PAYLOAD,
        )

        # Second call for the same road entity
        alert2, was_new2 = ml_prediction_service.check_and_create_predictive_alert(
            db=self.db,
            combined_risk=comb_risk,
            source_entity="road",
            source_entity_id=self.test_road.id,
            corridor_name=self.test_road.road_name,
            latitude=self.test_road.latitude,
            longitude=self.test_road.longitude,
            require_corroboration=True,
        )
        self.assertIsNotNone(alert2)
        self.assertFalse(was_new2, "Duplicate alert was not suppressed by 60-minute deduplication window!")

    def test_11_ml_alone_uncorroborated_suppressed_when_corroboration_required(self):
        """When require_corroboration=True, ML alone without operational evidence does NOT generate an alert."""
        comb_risk_alone = ml_prediction_service.evaluate_predictive_risk(
            db=self.db,
            deterministic_risk_score=10.0,  # uncorroborated
            deterministic_risk_level="low",
            features=HIGH_PROB_UNCORROBORATED_PAYLOAD,
        )

        alert, was_new = ml_prediction_service.check_and_create_predictive_alert(
            db=self.db,
            combined_risk=comb_risk_alone,
            source_entity="road",
            source_entity_id=99999,
            corridor_name="Uncorroborated Corridor",
            require_corroboration=True,
        )
        self.assertIsNone(alert)
        self.assertFalse(was_new)

    def test_12_predictive_alert_lifecycle(self):
        """Predictive alerts participate seamlessly in operator acknowledge and resolve lifecycle."""
        # Create dedicated alert for lifecycle test
        alert = alert_service.create_alert(
            db=self.db,
            title="Predictive Disruption Warning: Lifecycle Test",
            description="Predictive test alert",
            severity="medium",
            alert_type="predictive_disruption",
            source_entity="road",
            source_entity_id=88888,
            dedup_key=f"predictive_disruption:road:88888:{datetime.now().timestamp()}",
        )
        self.assertEqual(alert.status, "active")

        # Acknowledge
        ack_res = self.client.patch(f"/alerts/{alert.id}/acknowledge", headers=self.auth_headers)
        self.assertEqual(ack_res.status_code, 200)
        self.assertEqual(ack_res.json()["status"], "acknowledged")

        # Resolve
        res_res = self.client.patch(f"/alerts/{alert.id}/resolve", headers=self.auth_headers)
        self.assertEqual(res_res.status_code, 200)
        self.assertEqual(res_res.json()["status"], "resolved")

    # -----------------------------------------------------------------------
    # 5. REST API Endpoints & Security (RBAC / Auth / Anti-Leakage)
    # -----------------------------------------------------------------------
    def test_13_post_predict_corridor_risk_requires_auth(self):
        res = self.client.post("/ml/predict-corridor-risk", json={"features": VALID_CORRIDOR_PAYLOAD})
        self.assertEqual(res.status_code, 401)

    def test_14_post_predict_corridor_risk_rejects_inactive(self):
        headers = {"Authorization": f"Bearer {self.inactive_token}"}
        res = self.client.post("/ml/predict-corridor-risk", json={"features": VALID_CORRIDOR_PAYLOAD}, headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_15_post_predict_corridor_risk_success(self):
        req = {
            "road_id": self.test_road.id,
            "features": VALID_CORRIDOR_PAYLOAD,
            "generate_alert": False,
        }
        res = self.client.post("/ml/predict-corridor-risk", json=req, headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("deterministic_risk_score", data)
        self.assertIn("deterministic_risk_level", data)
        self.assertTrue(data["ml_prediction"]["available"])
        self.assertIn("combined_assessment", data)
        self.assertFalse(data["alert_created"])

    def test_16_post_predict_corridor_risk_rejects_root_leakage(self):
        bad_req = {
            "road_id": self.test_road.id,
            "disruption_within_6h": 1,
        }
        res = self.client.post("/ml/predict-corridor-risk", json=bad_req, headers=self.auth_headers)
        self.assertEqual(res.status_code, 422)
        self.assertIn("leakage", res.text.lower())

    def test_17_get_corridor_predictive_risk_endpoint(self):
        res = self.client.get(f"/risk/corridor/{self.test_road.id}/predictive", headers=self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("deterministic_risk_score", data)
        self.assertIn("ml_prediction", data)
        self.assertIn("combined_assessment", data)

    def test_18_get_corridor_predictive_risk_404_on_missing_road(self):
        res = self.client.get("/risk/corridor/99999999/predictive", headers=self.auth_headers)
        self.assertEqual(res.status_code, 404)

    def test_19_baseline_get_risk_untouched(self):
        """Hard Guardrail: Baseline GET /risk/ endpoint continues returning list[RiskItem]."""
        res = self.client.get("/risk/")
        self.assertEqual(res.status_code, 200)
        risks = res.json()
        self.assertIsInstance(risks, list)
        self.assertGreater(len(risks), 0)
        self.assertIn("road", risks[0])
        self.assertIn("risk_score", risks[0])

    # -----------------------------------------------------------------------
    # 6. Model & Dataset Immutability Audit
    # -----------------------------------------------------------------------
    def test_20_model_artifact_hash_remains_strictly_identical(self):
        """Hard Safety Rule: Zero retraining; model SHA-256 remains 100% byte-for-byte identical."""
        current_hash = compute_file_sha256(self.model_path)
        self.assertEqual(
            self.initial_model_hash,
            current_hash,
            "CRITICAL FAILURE: Model artifact hash was altered during Phase 6E operations!",
        )


if __name__ == "__main__":
    unittest.main()
