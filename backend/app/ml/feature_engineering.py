"""
NEXUS-NER Feature Engineering Pipeline.
Transforms raw atmospheric, topographic, corridor, and antecedent variables
into model-ready numerical feature matrices with strict temporal anti-leakage safeguards.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.ml import config


class TemporalLeakageError(ValueError):
    """Raised when forbidden future or target-derived columns are detected in feature matrix."""
    pass


class DisruptionFeaturePipeline:
    """
    Production-structured feature engineering pipeline for corridor disruption prediction.
    Performs:
    1. Anti-leakage validation
    2. Numerical feature extraction and physical domain imputation
    3. Categorical one-hot encoding for terrain and road classes
    4. Optional numerical standardization
    5. Preserves consistent feature column order between training and inference
    """

    def __init__(self, scale_numerical: bool = False):
        self.scale_numerical = scale_numerical
        self.numerical_features = list(config.NUMERICAL_FEATURES)
        self.categorical_features = list(config.CATEGORICAL_FEATURES)
        self.binary_features = list(config.BINARY_FEATURES)
        self.temporal_features = list(config.TEMPORAL_CYCLE_FEATURES)

        self.encoder = OneHotEncoder(
            handle_unknown="ignore",
            sparse_output=False,
        )
        self.scaler = StandardScaler() if scale_numerical else None
        self.is_fitted: bool = False
        self.feature_names_out: List[str] = []

        # Domain-specific physical default imputations
        self.imputation_defaults: Dict[str, float] = {
            "curr_precip_mm": 0.0,
            "forecast_rain_6h_sum_mm": 0.0,
            "forecast_rain_max_intensity_mm": 0.0,
            "forecast_precip_prob_max": 0.0,
            "wind_speed_kmh": 10.0,
            "wind_gust_kmh": 15.0,
            "visibility_km": 10.0,
            "antecedent_rain_24h_mm": 0.0,
            "antecedent_rain_72h_mm": 0.0,
            "elevation_m": 500.0,
            "slope_angle_deg": 10.0,
            "historical_vulnerability_score": 0.5,
            "active_incidents_nearby_15km": 0,
            "severe_weather_flag": 0,
            "is_monsoon_season": 0,
            "month_of_year": 6,
            "hour_of_day": 12,
        }

    @staticmethod
    def validate_no_leakage(df: pd.DataFrame) -> None:
        """
        Inspect input DataFrame for forbidden columns that cause data leakage.
        """
        detected_leaks = [
            col for col in config.FORBIDDEN_LEAKAGE_COLUMNS
            if col in df.columns
        ]
        if detected_leaks:
            raise TemporalLeakageError(
                f"CRITICAL LEAKAGE DETECTED: The following forbidden columns were found in input: {detected_leaks}. "
                "These columns contain target or post-event information not available at prediction time t."
            )

    def fit(self, df: pd.DataFrame) -> "DisruptionFeaturePipeline":
        """Fit categorical encoders and optional scalers on training data."""
        self.validate_no_leakage(df)

        # 1. Fit categorical one-hot encoder
        cat_subset = df[self.categorical_features].fillna("unknown").astype(str)
        self.encoder.fit(cat_subset)
        cat_feature_names = list(self.encoder.get_feature_names_out(self.categorical_features))

        # 2. Fit scaler if enabled
        if self.scaler is not None:
            num_subset = df[self.numerical_features].fillna(self.imputation_defaults)
            self.scaler.fit(num_subset.to_numpy(dtype=float))

        # 3. Assemble complete feature names list
        self.feature_names_out = (
            self.numerical_features
            + self.binary_features
            + self.temporal_features
            + cat_feature_names
        )
        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transform raw DataFrame into processed feature matrix X."""
        if not self.is_fitted:
            raise RuntimeError("DisruptionFeaturePipeline must be fitted before calling transform().")

        self.validate_no_leakage(df)

        # A. Numerical features with domain-specific imputation
        num_cols = []
        for col in self.numerical_features:
            default_val = self.imputation_defaults.get(col, 0.0)
            val = df[col].fillna(default_val).to_numpy(dtype=float) if col in df.columns else np.full(len(df), default_val)
            num_cols.append(val)
        num_arr = np.column_stack(num_cols)

        if self.scaler is not None:
            num_arr = self.scaler.transform(num_arr)

        # B. Binary features
        bin_cols = []
        for col in self.binary_features:
            default_val = self.imputation_defaults.get(col, 0)
            val = df[col].fillna(default_val).to_numpy(dtype=int) if col in df.columns else np.full(len(df), default_val)
            bin_cols.append(val)
        bin_arr = np.column_stack(bin_cols)

        # C. Temporal features
        temp_cols = []
        for col in self.temporal_features:
            default_val = self.imputation_defaults.get(col, 1)
            val = df[col].fillna(default_val).to_numpy(dtype=float) if col in df.columns else np.full(len(df), default_val)
            temp_cols.append(val)
        temp_arr = np.column_stack(temp_cols)

        # D. Categorical features via fitted OneHotEncoder
        cat_df = pd.DataFrame(index=df.index)
        for col in self.categorical_features:
            cat_df[col] = df[col].fillna("unknown").astype(str) if col in df.columns else "unknown"
        cat_arr = self.encoder.transform(cat_df)

        # E. Combine all into contiguous 2D float array
        X = np.hstack([num_arr, bin_arr, temp_arr, cat_arr]).astype(np.float32)
        return X

    def fit_transform(self, df: pd.DataFrame) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Fit pipeline on df and return (X, y) tuple if target column is present."""
        self.fit(df)
        X = self.transform(df)
        y = None
        if config.TARGET_COLUMN in df.columns:
            y = df[config.TARGET_COLUMN].to_numpy(dtype=int)
        return X, y

    def transform_single_dict(self, observation: Dict[str, Any]) -> np.ndarray:
        """Helper to transform a single dictionary observation for real-time inference."""
        df = pd.DataFrame([observation])
        return self.transform(df)
