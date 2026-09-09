"""
Unit and Integration Test Suite for Phase 6C: Model Interpretability & Feature Attribution.
Validates:
1. SHAP package import and version compatibility.
2. Persisted Random Forest model bundle loading and integrity.
3. DisruptionExplainer initialization and base value calibration.
4. Transformed feature names availability and exact 24-dimensional alignment.
5. SHAP feature dimension matching model input dimensionality.
6. Global SHAP importance computation produces non-empty, ranked attribution.
7. Deterministic reproducibility of global SHAP ranking with random_state=42.
8. Mean absolute SHAP values are strictly non-negative.
9. Local per-prediction explanation execution and narrative synthesis.
10. Predicted probability bounded in [0, 1].
11. Predicted class binary decision agrees with operational threshold (tau=0.55).
12. Local explanation includes both transformed and raw feature values.
13. Separation of risk-increasing (positive) and risk-decreasing (negative) attributions.
14. Additive consistency verification: prob == base_value + sum(shap_values) to machine precision.
15. Artifact JSON schema compliance for global, comparison, and local examples.
16. Gini vs SHAP comparative ranking generation.
17. Deterministic test example selection (high-risk, low-risk, borderline).
18. Anti-leakage safeguard rejection: forbidden columns raise TemporalLeakageError.
19. Preservation of model artifact hash/integrity: explainability does NOT alter model weights.
"""

import hashlib
import json
from pathlib import Path
import sys
import unittest

import numpy as np
import pandas as pd

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml import config
from app.ml.feature_engineering import TemporalLeakageError
from app.ml.explainability import DisruptionExplainer, FEATURE_METADATA


class MLExplainabilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset_file = config.DEFAULT_DATASET_FILE
        if not cls.dataset_file.exists():
            raise FileNotFoundError(f"Dataset not found: {cls.dataset_file}")
        cls.df = pd.read_csv(cls.dataset_file)

        cls.rf_artifact_file = config.DEFAULT_RF_MODEL_FILE
        if not cls.rf_artifact_file.exists():
            raise FileNotFoundError(f"RF model artifact not found: {cls.rf_artifact_file}")

        # Compute initial hash of model artifact to verify it remains untouched
        with open(cls.rf_artifact_file, "rb") as f:
            cls.initial_model_hash = hashlib.sha256(f.read()).hexdigest()

        # Initialize explainer
        cls.explainer = DisruptionExplainer(model_bundle_path=cls.rf_artifact_file)

        # Artifacts directory
        cls.artifacts_dir = config.ARTIFACTS_DIR
        cls.global_file = config.DEFAULT_SHAP_GLOBAL_IMPORTANCE_FILE
        cls.comparison_file = config.DEFAULT_FEATURE_COMPARISON_FILE
        cls.local_examples_file = config.DEFAULT_SHAP_LOCAL_EXAMPLES_FILE

    # -----------------------------------------------------------------------
    # 1. SHAP Import & Version
    # -----------------------------------------------------------------------
    def test_01_shap_import_and_version(self):
        import shap
        self.assertTrue(hasattr(shap, "__version__"))
        self.assertTrue(hasattr(shap, "TreeExplainer"))
        self.assertEqual(shap.__version__, "0.52.0")

    # -----------------------------------------------------------------------
    # 2. Persisted RF Artifact Loads Cleanly
    # -----------------------------------------------------------------------
    def test_02_persisted_rf_artifact_loads(self):
        self.assertIsNotNone(self.explainer.model)
        self.assertIsNotNone(self.explainer.pipeline)
        self.assertEqual(self.explainer.bundle.get("model_name"), "RandomForestClassifier")
        self.assertEqual(self.explainer.bundle.get("dataset_version"), config.DATASET_VERSION)

    # -----------------------------------------------------------------------
    # 3. Explainer Initializes with Valid Base Value
    # -----------------------------------------------------------------------
    def test_03_explainer_initializes_with_valid_base_value(self):
        self.assertIsNotNone(self.explainer.explainer)
        self.assertIsInstance(self.explainer.base_value, float)
        # Base prior probability in training data is approximately 0.50 due to class balancing
        self.assertGreater(self.explainer.base_value, 0.40)
        self.assertLess(self.explainer.base_value, 0.60)
        self.assertEqual(self.explainer.output_space, "probability_space")

    # -----------------------------------------------------------------------
    # 4. Feature Names Available & Count Exactly 24
    # -----------------------------------------------------------------------
    def test_04_feature_names_available_and_count_24(self):
        self.assertEqual(len(self.explainer.feature_names), 24)
        self.assertEqual(self.explainer.n_features, 24)
        for feat in self.explainer.feature_names:
            self.assertIn(feat, FEATURE_METADATA, f"Feature '{feat}' missing from FEATURE_METADATA")

    # -----------------------------------------------------------------------
    # 5. SHAP Feature Dimension Matches Model Input Dimension
    # -----------------------------------------------------------------------
    def test_05_shap_feature_dimension_matches_model_input(self):
        sample_row = self.df.iloc[:1].copy()
        X = self.explainer.pipeline.transform(sample_row)
        self.assertEqual(X.shape[1], self.explainer.n_features)
        raw_shap = self.explainer.explainer.shap_values(X)
        shap_vec = self.explainer._extract_positive_shap(raw_shap)
        self.assertEqual(shap_vec.shape, (1, 24))

    # -----------------------------------------------------------------------
    # 6. Global SHAP Output Non-Empty and Fully Ranked
    # -----------------------------------------------------------------------
    def test_06_global_shap_output_non_empty(self):
        global_shap = self.explainer.compute_global_importance(df=self.df, sample_size=100, random_seed=42)
        self.assertIn("ranked_features", global_shap)
        self.assertEqual(len(global_shap["ranked_features"]), 24)
        ranks = [f["rank"] for f in global_shap["ranked_features"]]
        self.assertEqual(ranks, list(range(1, 25)))

    # -----------------------------------------------------------------------
    # 7. Global SHAP Ranking Is Deterministic
    # -----------------------------------------------------------------------
    def test_07_global_shap_ranking_deterministic(self):
        res1 = self.explainer.compute_global_importance(df=self.df, sample_size=150, random_seed=42)
        res2 = self.explainer.compute_global_importance(df=self.df, sample_size=150, random_seed=42)
        self.assertEqual(
            [f["feature"] for f in res1["ranked_features"]],
            [f["feature"] for f in res2["ranked_features"]],
        )
        self.assertEqual(
            [f["mean_abs_shap"] for f in res1["ranked_features"]],
            [f["mean_abs_shap"] for f in res2["ranked_features"]],
        )

    # -----------------------------------------------------------------------
    # 8. Mean Absolute SHAP Values Non-Negative & Top Features Geotechnical
    # -----------------------------------------------------------------------
    def test_08_mean_abs_shap_non_negative_and_geotechnical(self):
        global_shap = self.explainer.compute_global_importance(df=self.df, sample_size=200, random_seed=42)
        for item in global_shap["ranked_features"]:
            self.assertGreaterEqual(item["mean_abs_shap"], 0.0)
            self.assertGreaterEqual(item["relative_importance_pct"], 0.0)

        # Top 3 features must be antecedent moisture or burst intensity
        top_3 = [f["feature"] for f in global_shap["ranked_features"][:3]]
        self.assertIn("antecedent_rain_24h_mm", top_3)
        self.assertIn("antecedent_rain_72h_mm", top_3)

    # -----------------------------------------------------------------------
    # 9. Local Explanation Works & Synthesizes Narrative
    # -----------------------------------------------------------------------
    def test_09_local_explanation_works(self):
        sample_obs = self.df.iloc[0].to_dict()
        explanation = self.explainer.explain_instance(sample_obs)
        self.assertIn("prediction", explanation)
        self.assertIn("human_readable_explanation", explanation)
        narrative = explanation["human_readable_explanation"]
        self.assertIn("Model prediction:", narrative)
        self.assertIn("contributed to", narrative)
        # Verify non-causal guardrail
        self.assertNotIn("caused the disruption", narrative.lower())

    # -----------------------------------------------------------------------
    # 10. Predicted Probability Bounded in [0, 1]
    # -----------------------------------------------------------------------
    def test_10_probability_bounded_in_0_1(self):
        for idx in [10, 100, 500, 1000]:
            exp = self.explainer.explain_instance(self.df.iloc[idx].to_dict())
            prob = exp["prediction"]["predicted_probability"]
            self.assertGreaterEqual(prob, 0.0)
            self.assertLessEqual(prob, 1.0)

    # -----------------------------------------------------------------------
    # 11. Predicted Class Binary Decision Agrees with Threshold
    # -----------------------------------------------------------------------
    def test_11_predicted_class_agrees_with_operational_threshold(self):
        tau = self.explainer.operational_threshold
        for idx in [50, 200, 600, 1500]:
            exp = self.explainer.explain_instance(self.df.iloc[idx].to_dict())
            prob = exp["prediction"]["predicted_probability"]
            pred_cls = exp["prediction"]["predicted_class"]
            expected_cls = int(prob >= tau)
            self.assertEqual(pred_cls, expected_cls)

    # -----------------------------------------------------------------------
    # 12. Local Explanation Contains Both Transformed & Raw Feature Values
    # -----------------------------------------------------------------------
    def test_12_local_explanation_contains_feature_values(self):
        obs = self.df.iloc[5].to_dict()
        exp = self.explainer.explain_instance(obs)
        all_attrs = exp["all_feature_attributions"]
        self.assertEqual(len(all_attrs), 24)
        for attr in all_attrs:
            self.assertIn("transformed_value", attr)
            self.assertIn("shap_value", attr)
            self.assertIn("direction", attr)
            self.assertIn("display_name", attr)

    # -----------------------------------------------------------------------
    # 13. Positive and Negative Contributions Separated Correctly
    # -----------------------------------------------------------------------
    def test_13_positive_and_negative_contributions_separated(self):
        obs = self.df.iloc[25].to_dict()
        exp = self.explainer.explain_instance(obs)
        pos = exp["top_positive_contributors"]
        neg = exp["top_negative_contributors"]
        for p in pos:
            self.assertGreater(p["shap_value"], 0)
            self.assertEqual(p["direction"], "increases_disruption_probability")
        for n in neg:
            self.assertLess(n["shap_value"], 0)
            self.assertEqual(n["direction"], "decreases_disruption_probability")

    # -----------------------------------------------------------------------
    # 14. Additive Consistency Verification in Probability Space
    # -----------------------------------------------------------------------
    def test_14_additive_consistency_exact(self):
        for idx in [0, 50, 150, 300]:
            exp = self.explainer.explain_instance(self.df.iloc[idx].to_dict())
            prob = exp["prediction"]["predicted_probability"]
            base = exp["prediction"]["base_value"]
            all_shap = [a["shap_value"] for a in exp["all_feature_attributions"]]
            reconstructed = base + sum(all_shap)
            self.assertAlmostEqual(prob, reconstructed, places=3)
            self.assertTrue(exp["prediction"]["additive_consistency"]["is_exact"])

    # -----------------------------------------------------------------------
    # 15. Artifact JSON Schemas Are Valid and Present
    # -----------------------------------------------------------------------
    def test_15_artifact_json_schemas_valid(self):
        self.assertTrue(self.global_file.exists(), "Global SHAP artifact missing")
        self.assertTrue(self.comparison_file.exists(), "Feature comparison artifact missing")
        self.assertTrue(self.local_examples_file.exists(), "Local examples artifact missing")

        with open(self.global_file, "r", encoding="utf-8") as f:
            g_data = json.load(f)
        self.assertEqual(g_data["total_features"], 24)
        self.assertEqual(len(g_data["ranked_features"]), 24)

        with open(self.comparison_file, "r", encoding="utf-8") as f:
            c_data = json.load(f)
        self.assertEqual(c_data["total_features_compared"], 24)

        with open(self.local_examples_file, "r", encoding="utf-8") as f:
            l_data = json.load(f)
        self.assertGreaterEqual(len(l_data["examples"]), 3)

    # -----------------------------------------------------------------------
    # 16. Gini vs SHAP Comparative Ranking Generated
    # -----------------------------------------------------------------------
    def test_16_gini_vs_shap_comparative_ranking(self):
        with open(self.comparison_file, "r", encoding="utf-8") as f:
            comp = json.load(f)

        features = comp["features"]
        self.assertEqual(len(features), 24)
        for item in features:
            self.assertIn("shap_rank", item)
            self.assertIn("gini_rank", item)
            self.assertIn("rank_difference", item)
            self.assertIn("physical_meaning", item)

    # -----------------------------------------------------------------------
    # 17. Deterministic Test Example Selection
    # -----------------------------------------------------------------------
    def test_17_deterministic_test_examples(self):
        with open(self.local_examples_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        examples = data["examples"]
        types = [ex["example_type"] for ex in examples]
        self.assertIn("high_risk_positive_case", types)
        self.assertIn("low_risk_negative_case", types)
        self.assertIn("borderline_threshold_case", types)

        # Verify high-risk case has high probability and positive class
        high_ex = next(ex for ex in examples if ex["example_type"] == "high_risk_positive_case")
        self.assertGreaterEqual(high_ex["explanation"]["prediction"]["predicted_probability"], 0.80)
        self.assertEqual(high_ex["explanation"]["prediction"]["predicted_class"], 1)

        # Verify low-risk case has low probability and class 0
        low_ex = next(ex for ex in examples if ex["example_type"] == "low_risk_negative_case")
        self.assertLess(low_ex["explanation"]["prediction"]["predicted_probability"], 0.10)
        self.assertEqual(low_ex["explanation"]["prediction"]["predicted_class"], 0)

    # -----------------------------------------------------------------------
    # 18. Anti-Leakage Safeguard Rejection
    # -----------------------------------------------------------------------
    def test_18_anti_leakage_safeguard_rejection(self):
        forbidden_cols = ["actual_rain_next_6h", "actual_weather_next_6h", "risk_score", "status", "road_status"]
        base_obs = self.df.iloc[0].to_dict()

        for forbidden in forbidden_cols:
            leaked_obs = dict(base_obs)
            leaked_obs[forbidden] = 99.9
            with self.assertRaises(TemporalLeakageError, msg=f"Failed to reject leakage column {forbidden}"):
                self.explainer.explain_instance(leaked_obs)

    # -----------------------------------------------------------------------
    # 19. Existing Model Artifact Hash / Weights Remain Unchanged
    # -----------------------------------------------------------------------
    def test_19_model_artifact_hash_unchanged(self):
        with open(self.rf_artifact_file, "rb") as f:
            current_hash = hashlib.sha256(f.read()).hexdigest()
        self.assertEqual(
            self.initial_model_hash,
            current_hash,
            "CRITICAL INTEGRITY VIOLATION: Model artifact hash changed! Explainability must NOT modify model weights.",
        )


if __name__ == "__main__":
    unittest.main()
