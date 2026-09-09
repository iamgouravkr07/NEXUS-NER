"""
Unit and Integration Test Suite for Phase 6A: Dataset & Feature Engineering.
Validates deterministic generation, schema compliance, anti-leakage safeguards,
categorical encodings, and metadata honesty.
"""

import sys
import unittest
from pathlib import Path

# Ensure backend package is in python path
backend_dir = Path(__file__).resolve().parents[1] / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import numpy as np
import pandas as pd

from app.ml import config
from app.ml.dataset import (
    generate_prototype_dataset,
    validate_dataset,
    build_and_save_prototype_dataset,
)
from app.ml.feature_engineering import (
    DisruptionFeaturePipeline,
    TemporalLeakageError,
)


class MLDatasetAndFeatureEngineeringTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Generate a small deterministic test dataset
        cls.df = generate_prototype_dataset(n_samples=600, random_seed=config.RANDOM_SEED)
        cls.pipeline = DisruptionFeaturePipeline()
        cls.pipeline.fit(cls.df)

    # -----------------------------------------------------------------------
    # 1. Deterministic Generation
    # -----------------------------------------------------------------------
    def test_01_deterministic_generation(self):
        df_a = generate_prototype_dataset(n_samples=300, random_seed=42)
        df_b = generate_prototype_dataset(n_samples=300, random_seed=42)
        pd.testing.assert_frame_equal(df_a, df_b)

    # -----------------------------------------------------------------------
    # 2. Expected Feature Columns
    # -----------------------------------------------------------------------
    def test_02_expected_feature_columns(self):
        for col in config.ALL_FEATURE_COLUMNS:
            self.assertIn(col, self.df.columns, f"Expected feature column '{col}' missing from dataset.")

    # -----------------------------------------------------------------------
    # 3. Target Exists
    # -----------------------------------------------------------------------
    def test_03_target_exists(self):
        self.assertIn(config.TARGET_COLUMN, self.df.columns)
        target = self.df[config.TARGET_COLUMN]
        self.assertTrue(issubclass(target.dtype.type, (np.integer, int)))

    # -----------------------------------------------------------------------
    # 4. Both Target Classes Exist
    # -----------------------------------------------------------------------
    def test_04_both_target_classes_exist(self):
        y = self.df[config.TARGET_COLUMN]
        unique_classes = set(y.unique())
        self.assertEqual(unique_classes, {0, 1})
        pos_count = int((y == 1).sum())
        neg_count = int((y == 0).sum())
        self.assertGreater(pos_count, 0)
        self.assertGreater(neg_count, 0)
        # Verify realistic minority class ratio (between 5% and 35%)
        ratio = pos_count / len(y)
        self.assertGreaterEqual(ratio, 0.05)
        self.assertLessEqual(ratio, 0.35)

    # -----------------------------------------------------------------------
    # 5. No NaN Values After Feature Engineering
    # -----------------------------------------------------------------------
    def test_05_no_nan_values_after_feature_engineering(self):
        X = self.pipeline.transform(self.df)
        self.assertFalse(np.isnan(X).any(), "Processed feature matrix contains NaN values.")
        self.assertFalse(np.isinf(X).any(), "Processed feature matrix contains infinite values.")
        self.assertEqual(len(X), len(self.df))

    # -----------------------------------------------------------------------
    # 6. Categorical Encoding Works
    # -----------------------------------------------------------------------
    def test_06_categorical_encoding_works(self):
        # Verify that categorical columns terrain_type and road_class were one-hot encoded
        out_features = self.pipeline.feature_names_out
        terrain_encoded = [f for f in out_features if f.startswith("terrain_type_")]
        road_encoded = [f for f in out_features if f.startswith("road_class_")]

        self.assertGreaterEqual(len(terrain_encoded), 2)
        self.assertGreaterEqual(len(road_encoded), 2)
        self.assertEqual(self.pipeline.transform(self.df).shape[1], len(out_features))

    # -----------------------------------------------------------------------
    # 7. Physical Bounds and Coordinates
    # -----------------------------------------------------------------------
    def test_07_physical_bounds_and_coordinates(self):
        self.assertTrue((self.df["curr_precip_mm"] >= 0.0).all())
        self.assertTrue((self.df["forecast_rain_6h_sum_mm"] >= 0.0).all())
        self.assertTrue((self.df["slope_angle_deg"] >= 0.0).all())
        self.assertTrue((self.df["slope_angle_deg"] <= 90.0).all())
        self.assertTrue((self.df["visibility_km"] >= 0.0).all())
        self.assertTrue((self.df["month_of_year"].between(1, 12)).all())
        self.assertTrue((self.df["hour_of_day"].between(0, 23)).all())

    # -----------------------------------------------------------------------
    # 8. Anti-Leakage Safeguard: Rejection of Target-Derived Columns
    # -----------------------------------------------------------------------
    def test_08_no_target_leakage(self):
        leaked_columns = ["risk_score", "status", "road_status", "incident_id"]
        for leak_col in leaked_columns:
            leaked_df = self.df.copy()
            leaked_df[leak_col] = "test_leak"
            with self.assertRaises(TemporalLeakageError):
                self.pipeline.transform(leaked_df)

    # -----------------------------------------------------------------------
    # 9. Anti-Leakage Safeguard: Rejection of Future-Observation Columns
    # -----------------------------------------------------------------------
    def test_09_no_future_observation_leakage(self):
        future_columns = ["actual_rain_next_6h", "actual_weather_next_6h"]
        for fut_col in future_columns:
            leaked_df = self.df.copy()
            leaked_df[fut_col] = 45.0
            with self.assertRaises(TemporalLeakageError):
                self.pipeline.transform(leaked_df)

    # -----------------------------------------------------------------------
    # 10. Metadata Provenance & Data Honesty
    # -----------------------------------------------------------------------
    def test_10_metadata_provenance_is_correct(self):
        tmp_dir = Path(__file__).resolve().parent / "scratch_ml_test"
        try:
            _, metadata = build_and_save_prototype_dataset(n_samples=200, output_dir=tmp_dir)
            self.assertEqual(metadata["provenance"], "prototype_training_augmentation")
            self.assertTrue(metadata["is_synthetic"])
            self.assertIn("CRITICAL DATA HONESTY", metadata["data_honesty_notice"])
            self.assertEqual(metadata["prediction_task"]["prediction_horizon_hours"], 6)
            self.assertEqual(metadata["statistics"]["total_samples"], 200)
            self.assertGreater(metadata["statistics"]["positive_samples"], 0)
        finally:
            import shutil
            if tmp_dir.exists():
                shutil.rmtree(tmp_dir, ignore_errors=True)

    # -----------------------------------------------------------------------
    # 11. Random Seed Reproducibility
    # -----------------------------------------------------------------------
    def test_11_random_seed_reproducibility(self):
        df_seed42 = generate_prototype_dataset(n_samples=250, random_seed=42)
        df_seed99 = generate_prototype_dataset(n_samples=250, random_seed=99)
        self.assertFalse(df_seed42["curr_precip_mm"].equals(df_seed99["curr_precip_mm"]))

    # -----------------------------------------------------------------------
    # 12. Dataset Validation Rejects Malformed Data
    # -----------------------------------------------------------------------
    def test_12_dataset_validation_rejects_malformed_data(self):
        # Case A: Missing target column
        bad_df1 = self.df.drop(columns=[config.TARGET_COLUMN])
        valid, report = validate_dataset(bad_df1)
        self.assertFalse(valid)
        self.assertTrue(any("missing" in err.lower() for err in report["errors"]))

        # Case B: NaN in required features
        bad_df2 = self.df.copy()
        bad_df2.loc[0, "forecast_rain_6h_sum_mm"] = np.nan
        valid, report = validate_dataset(bad_df2)
        self.assertFalse(valid)
        self.assertTrue(any("nan" in err.lower() for err in report["errors"]))

        # Case C: Physical bound violation
        bad_df3 = self.df.copy()
        bad_df3.loc[0, "slope_angle_deg"] = 120.0
        valid, report = validate_dataset(bad_df3)
        self.assertFalse(valid)
        self.assertTrue(any("slope" in err.lower() for err in report["errors"]))

    # -----------------------------------------------------------------------
    # 13. Single Observation Transformation
    # -----------------------------------------------------------------------
    def test_13_single_observation_transformation(self):
        obs = {
            "curr_precip_mm": 15.0,
            "forecast_rain_6h_sum_mm": 35.0,
            "forecast_rain_max_intensity_mm": 18.0,
            "forecast_precip_prob_max": 85.0,
            "wind_speed_kmh": 22.0,
            "wind_gust_kmh": 35.0,
            "visibility_km": 4.5,
            "severe_weather_flag": 1,
            "antecedent_rain_24h_mm": 50.0,
            "antecedent_rain_72h_mm": 110.0,
            "elevation_m": 1200.0,
            "slope_angle_deg": 30.0,
            "terrain_type": "Steep Ghat",
            "road_class": "national_highway",
            "historical_vulnerability_score": 0.8,
            "is_monsoon_season": 1,
            "month_of_year": 7,
            "hour_of_day": 15,
            "active_incidents_nearby_15km": 1,
        }
        x_vec = self.pipeline.transform_single_dict(obs)
        self.assertEqual(x_vec.shape, (1, len(self.pipeline.feature_names_out)))
        self.assertFalse(np.isnan(x_vec).any())

    # -----------------------------------------------------------------------
    # 14. Scaling Support
    # -----------------------------------------------------------------------
    def test_14_scaling_support(self):
        pipeline_scaled = DisruptionFeaturePipeline(scale_numerical=True)
        X_scaled, _ = pipeline_scaled.fit_transform(self.df)
        self.assertEqual(X_scaled.shape[0], len(self.df))
        # First numerical column mean should be approximately 0
        self.assertAlmostEqual(float(np.mean(X_scaled[:, 0])), 0.0, places=2)


if __name__ == "__main__":
    unittest.main()
