"""
Unit and Integration Test Suite for Phase 6B: Baseline ML Model Training & Validation.
Validates:
1. Strict chronological train (70%) / val (15%) / test (15%) split integrity.
2. Absence of temporal overlap and data leakage.
3. Model fitting, probability outputs in [0, 1], absence of NaN/Inf.
4. Validation threshold tuning without test set contamination.
5. Random Forest Gini feature importances and domain sanity.
6. Model bundle serialization and deserialization via joblib.
7. Data honesty tags, prototype provenance, and synthetic labeling.
8. Deterministic reproducibility.
"""

import json
import math
from pathlib import Path
import sys
import unittest

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml import config
from app.ml.feature_engineering import DisruptionFeaturePipeline
from app.ml.train import (
    split_chronological,
    compute_metrics,
    sweep_and_select_threshold,
    train_and_evaluate,
)


class MLTrainingAndValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset_file = config.DEFAULT_DATASET_FILE
        if not cls.dataset_file.exists():
            raise FileNotFoundError(f"Required test dataset not found: {cls.dataset_file}")
        cls.df = pd.read_csv(cls.dataset_file)

        # Artifacts directory
        cls.artifacts_dir = config.ARTIFACTS_DIR
        cls.rf_joblib_file = cls.artifacts_dir / config.DEFAULT_RF_MODEL_FILE.name
        cls.lr_joblib_file = cls.artifacts_dir / config.DEFAULT_LR_MODEL_FILE.name
        cls.metrics_file = cls.artifacts_dir / config.DEFAULT_TRAINING_METRICS_FILE.name
        cls.importance_file = cls.artifacts_dir / config.DEFAULT_FEATURE_IMPORTANCE_FILE.name
        cls.metadata_file = cls.artifacts_dir / config.DEFAULT_MODEL_METADATA_FILE.name

    # -----------------------------------------------------------------------
    # 1. Chronological Split Proportions and Ordering
    # -----------------------------------------------------------------------
    def test_01_chronological_split_integrity(self):
        splits = split_chronological(self.df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
        train_df = splits["train"]
        val_df = splits["validation"]
        test_df = splits["test"]

        # Sample count assertions
        self.assertEqual(len(train_df), 7000)
        self.assertEqual(len(val_df), 1500)
        self.assertEqual(len(test_df), 1500)
        self.assertEqual(len(train_df) + len(val_df) + len(test_df), len(self.df))

        # Strict chronological ordering without temporal overlap
        train_max = train_df["timestamp"].max()
        val_min = val_df["timestamp"].min()
        val_max = val_df["timestamp"].max()
        test_min = test_df["timestamp"].min()

        self.assertLessEqual(train_max, val_min, "Train split leaks into validation time window.")
        self.assertLessEqual(val_max, test_min, "Validation split leaks into test time window.")

    # -----------------------------------------------------------------------
    # 2. Split Input Validation & Error Handling
    # -----------------------------------------------------------------------
    def test_02_split_rejection_of_invalid_input(self):
        # Case A: split ratios do not sum to 1.0
        with self.assertRaises(ValueError):
            split_chronological(self.df, train_ratio=0.6, val_ratio=0.2, test_ratio=0.1)

        # Case B: missing timestamp column
        no_time_df = self.df.drop(columns=["timestamp"])
        with self.assertRaises(ValueError):
            split_chronological(no_time_df)

    # -----------------------------------------------------------------------
    # 3. Pipeline Anti-Leakage Execution
    # -----------------------------------------------------------------------
    def test_03_pipeline_fitted_strictly_on_train(self):
        splits = split_chronological(self.df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
        pipeline = DisruptionFeaturePipeline(scale_numerical=True)
        X_train, y_train = pipeline.fit_transform(splits["train"])

        self.assertTrue(pipeline.is_fitted)
        self.assertEqual(X_train.shape[0], len(splits["train"]))
        self.assertEqual(X_train.shape[1], 24)

        # Transform val and test splits
        X_val = pipeline.transform(splits["validation"])
        X_test = pipeline.transform(splits["test"])

        self.assertEqual(X_val.shape, (len(splits["validation"]), 24))
        self.assertEqual(X_test.shape, (len(splits["test"]), 24))
        self.assertFalse(np.isnan(X_val).any())
        self.assertFalse(np.isnan(X_test).any())

    # -----------------------------------------------------------------------
    # 4. Model Artifacts Exist and Are Deserializable
    # -----------------------------------------------------------------------
    def test_04_model_bundles_deserialization(self):
        self.assertTrue(self.rf_joblib_file.exists(), "Random Forest bundle missing.")
        self.assertTrue(self.lr_joblib_file.exists(), "Logistic Regression bundle missing.")

        rf_bundle = joblib.load(self.rf_joblib_file)
        self.assertIn("model", rf_bundle)
        self.assertIn("pipeline", rf_bundle)
        self.assertIn("operational_threshold", rf_bundle)
        self.assertIn("feature_names", rf_bundle)
        self.assertIsInstance(rf_bundle["model"], RandomForestClassifier)
        self.assertIsInstance(rf_bundle["pipeline"], DisruptionFeaturePipeline)

        lr_bundle = joblib.load(self.lr_joblib_file)
        self.assertIn("model", lr_bundle)
        self.assertIn("pipeline", lr_bundle)
        self.assertIn("operational_threshold", lr_bundle)
        self.assertIsInstance(lr_bundle["model"], LogisticRegression)

    # -----------------------------------------------------------------------
    # 5. Prediction Probabilities Sanity
    # -----------------------------------------------------------------------
    def test_05_prediction_probabilities_sanity(self):
        rf_bundle = joblib.load(self.rf_joblib_file)
        model = rf_bundle["model"]
        pipeline = rf_bundle["pipeline"]

        sample_subset = self.df.iloc[8000:8050].copy()
        X_sample = pipeline.transform(sample_subset)
        probs = model.predict_proba(X_sample)

        self.assertEqual(probs.shape, (len(sample_subset), 2))
        self.assertTrue((probs >= 0.0).all())
        self.assertTrue((probs <= 1.0).all())
        self.assertFalse(np.isnan(probs).any())
        self.assertFalse(np.isinf(probs).any())
        # Probabilities sum to 1.0
        np.testing.assert_allclose(probs.sum(axis=1), np.ones(len(sample_subset)), atol=1e-5)

    # -----------------------------------------------------------------------
    # 6. Metrics Calculation Correctness
    # -----------------------------------------------------------------------
    def test_06_compute_metrics_correctness(self):
        y_true = np.array([0, 0, 1, 1, 0, 1, 0, 0, 1, 0])
        y_prob = np.array([0.1, 0.2, 0.8, 0.7, 0.3, 0.9, 0.4, 0.2, 0.85, 0.15])

        metrics = compute_metrics(y_true, y_prob, threshold=0.5)
        self.assertIn("roc_auc", metrics)
        self.assertIn("pr_auc", metrics)
        self.assertIn("precision", metrics)
        self.assertIn("recall", metrics)
        self.assertIn("f1", metrics)
        self.assertIn("f2", metrics)
        self.assertIn("confusion_matrix", metrics)

        # Perfect separation above 0.5 in this synthetic case
        self.assertEqual(metrics["precision"], 1.0)
        self.assertEqual(metrics["recall"], 1.0)
        self.assertEqual(metrics["confusion_matrix"]["tp"], 4)
        self.assertEqual(metrics["confusion_matrix"]["tn"], 6)
        self.assertEqual(metrics["confusion_matrix"]["fp"], 0)
        self.assertEqual(metrics["confusion_matrix"]["fn"], 0)

    # -----------------------------------------------------------------------
    # 7. Threshold Tuning Logic
    # -----------------------------------------------------------------------
    def test_07_threshold_tuning_sweep(self):
        y_true = np.array([0] * 90 + [1] * 10)
        # Moderate probabilities
        y_prob = np.linspace(0.05, 0.95, 100)

        best_tau, best_eval, all_evals = sweep_and_select_threshold(
            y_true, y_prob, candidate_thresholds=[0.3, 0.4, 0.5, 0.6], min_precision=0.40
        )
        self.assertIn(best_tau, [0.3, 0.4, 0.5, 0.6])
        self.assertEqual(len(all_evals), 4)
        self.assertIn("f2", best_eval)

    # -----------------------------------------------------------------------
    # 8. Feature Importance Domain Sanity
    # -----------------------------------------------------------------------
    def test_08_feature_importance_domain_sanity(self):
        self.assertTrue(self.importance_file.exists())
        with open(self.importance_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(data["total_features"], 24)
        ranked = data["ranked_features"]
        self.assertEqual(len(ranked), 24)

        # Sum of importances must be ~1.0
        total_importance = sum(item["importance"] for item in ranked)
        self.assertAlmostEqual(total_importance, 1.0, places=2)

        # Domain check: Top 5 features must contain antecedent rain or rainfall intensity
        top_5_names = [item["feature"] for item in ranked[:5]]
        has_hydrological_proxy = any(
            "rain" in name or "precip" in name for name in top_5_names
        )
        self.assertTrue(
            has_hydrological_proxy,
            f"Top 5 features {top_5_names} expected to contain rainfall/antecedent moisture proxies.",
        )

    # -----------------------------------------------------------------------
    # 9. Model Metadata & Training Metrics Data Honesty
    # -----------------------------------------------------------------------
    def test_09_metadata_and_provenance_honesty(self):
        self.assertTrue(self.metadata_file.exists())
        self.assertTrue(self.metrics_file.exists())

        with open(self.metadata_file, "r", encoding="utf-8") as f:
            meta = json.load(f)

        with open(self.metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)

        for doc in [meta, metrics]:
            self.assertEqual(doc["provenance"], "prototype_training_augmentation")
            self.assertTrue(doc["is_synthetic"])
            self.assertIn("CRITICAL DATA HONESTY", doc["data_honesty_notice"])
            self.assertIn("prototype", doc["data_honesty_notice"].lower())

    # -----------------------------------------------------------------------
    # 10. Deterministic Reproducibility
    # -----------------------------------------------------------------------
    def test_10_deterministic_reproducibility(self):
        splits = split_chronological(self.df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
        pipeline = DisruptionFeaturePipeline(scale_numerical=True)
        X_train, y_train = pipeline.fit_transform(splits["train"])
        X_val = pipeline.transform(splits["validation"])

        # Train two models with same random seed
        rf1 = RandomForestClassifier(
            n_estimators=30, max_depth=6, random_state=config.RANDOM_SEED
        )
        rf2 = RandomForestClassifier(
            n_estimators=30, max_depth=6, random_state=config.RANDOM_SEED
        )

        rf1.fit(X_train, y_train)
        rf2.fit(X_train, y_train)

        prob1 = rf1.predict_proba(X_val[:50])
        prob2 = rf2.predict_proba(X_val[:50])

        np.testing.assert_array_almost_equal(prob1, prob2)

    # -----------------------------------------------------------------------
    # 11. Bundle End-to-End Single Observation Inference
    # -----------------------------------------------------------------------
    def test_11_bundle_end_to_end_single_observation_inference(self):
        rf_bundle = joblib.load(self.rf_joblib_file)
        pipeline = rf_bundle["pipeline"]
        model = rf_bundle["model"]
        tau = rf_bundle["operational_threshold"]

        obs = {
            "curr_precip_mm": 25.0,
            "forecast_rain_6h_sum_mm": 55.0,
            "forecast_rain_max_intensity_mm": 28.0,
            "forecast_precip_prob_max": 95.0,
            "wind_speed_kmh": 35.0,
            "wind_gust_kmh": 50.0,
            "visibility_km": 2.5,
            "severe_weather_flag": 1,
            "antecedent_rain_24h_mm": 80.0,
            "antecedent_rain_72h_mm": 160.0,
            "elevation_m": 1450.0,
            "slope_angle_deg": 38.0,
            "terrain_type": "Steep Ghat",
            "road_class": "national_highway",
            "historical_vulnerability_score": 0.85,
            "is_monsoon_season": 1,
            "month_of_year": 7,
            "hour_of_day": 14,
            "active_incidents_nearby_15km": 2,
        }
        X_vec = pipeline.transform_single_dict(obs)
        probs = model.predict_proba(X_vec)[0]
        pos_prob = float(probs[1])

        self.assertGreaterEqual(pos_prob, 0.0)
        self.assertLessEqual(pos_prob, 1.0)
        # In this severe landslide risk condition, disruption probability should exceed operational threshold
        self.assertGreater(pos_prob, tau)
        is_disrupted = bool(pos_prob >= tau)
        self.assertTrue(is_disrupted)

    # -----------------------------------------------------------------------
    # 12. Bundle Rejects Forbidden Leakage
    # -----------------------------------------------------------------------
    def test_12_bundle_rejects_leakage(self):
        from app.ml.feature_engineering import TemporalLeakageError
        rf_bundle = joblib.load(self.rf_joblib_file)
        pipeline = rf_bundle["pipeline"]

        leaked_df = self.df.iloc[:5].copy()
        leaked_df["actual_rain_next_6h"] = 30.0
        with self.assertRaises(TemporalLeakageError):
            pipeline.transform(leaked_df)

    # -----------------------------------------------------------------------
    # 13. Metrics Confusion Matrix Sums Match Split Counts
    # -----------------------------------------------------------------------
    def test_13_metrics_confusion_matrix_sums_match_split_counts(self):
        with open(self.metrics_file, "r", encoding="utf-8") as f:
            metrics = json.load(f)

        rf_val_cm = metrics["random_forest"]["validation"]["metrics_at_selected_threshold"]["confusion_matrix"]
        val_total = rf_val_cm["tn"] + rf_val_cm["fp"] + rf_val_cm["fn"] + rf_val_cm["tp"]
        self.assertEqual(val_total, 1500)

        rf_test_cm = metrics["random_forest"]["test"]["metrics"]["confusion_matrix"]
        test_total = rf_test_cm["tn"] + rf_test_cm["fp"] + rf_test_cm["fn"] + rf_test_cm["tp"]
        self.assertEqual(test_total, 1500)

    # -----------------------------------------------------------------------
    # 14. Split Chronological Positive Class Representation
    # -----------------------------------------------------------------------
    def test_14_split_chronological_positive_class_representation(self):
        splits = split_chronological(self.df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
        for split_name in ["train", "validation", "test"]:
            pos_samples = (splits[split_name][config.TARGET_COLUMN] == 1).sum()
            self.assertGreater(
                pos_samples, 20, f"Split '{split_name}' lacks sufficient positive disruption samples."
            )

    # -----------------------------------------------------------------------
    # 15. Dataset Spans 730 Days & Both Annual Cycles
    # -----------------------------------------------------------------------
    def test_15_dataset_spans_730_days_multi_annual_coverage(self):
        dt_series = pd.to_datetime(self.df["timestamp"], utc=True)
        time_span_days = (dt_series.max() - dt_series.min()).days
        self.assertGreaterEqual(time_span_days, 720, f"Expected ~730 day span, got {time_span_days}")

        # Both 2025 and 2026 annual cycles must contain monsoon samples
        monsoon_2025 = int(((dt_series.dt.year == 2025) & (self.df["is_monsoon_season"] == 1)).sum())
        monsoon_2026 = int(((dt_series.dt.year == 2026) & (self.df["is_monsoon_season"] == 1)).sum())

        self.assertGreater(monsoon_2025, 500, "2025 monsoon samples insufficient.")
        self.assertGreater(monsoon_2026, 500, "2026 monsoon samples insufficient.")

    # -----------------------------------------------------------------------
    # 16. Validation and Test Splits Not Devoid of Monsoon
    # -----------------------------------------------------------------------
    def test_16_validation_and_test_contain_monsoon(self):
        splits = split_chronological(self.df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)
        val_monsoon = int(splits["validation"]["is_monsoon_season"].sum())
        test_monsoon = int(splits["test"]["is_monsoon_season"].sum())

        self.assertGreater(val_monsoon, 0, "Validation split must not be devoid of monsoon samples.")
        self.assertGreater(test_monsoon, 0, "Test split must not be devoid of monsoon samples.")

    # -----------------------------------------------------------------------
    # 17. 730-Day Metadata & Provenance Preservation
    # -----------------------------------------------------------------------
    def test_17_730_day_metadata_and_provenance(self):
        dataset_meta_path = config.DEFAULT_METADATA_FILE
        self.assertTrue(dataset_meta_path.exists())
        with open(dataset_meta_path, "r", encoding="utf-8") as f:
            d_meta = json.load(f)

        self.assertEqual(d_meta.get("simulation_window_days"), 730)
        self.assertEqual(d_meta["provenance"], "prototype_training_augmentation")
        self.assertTrue(d_meta["is_synthetic"])


if __name__ == "__main__":
    unittest.main()
