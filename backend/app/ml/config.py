"""
Centralized Configuration for NEXUS-NER ML Disruption Prediction Subsystem.
Defines parameters, feature schemas, dataset provenance, and operational boundaries.
"""

from pathlib import Path
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Provenance & Data Honesty Declarations
# ---------------------------------------------------------------------------
DATASET_PROVENANCE: str = "prototype_training_augmentation"
IS_SYNTHETIC: bool = True
DATASET_VERSION: str = "prototype-v1.0"

DATASET_HONESTY_NOTE: str = (
    "CRITICAL DATA HONESTY: This dataset is a physics-informed prototype training/augmentation "
    "dataset constructed for SIH 2026 algorithmic demonstration. It must NEVER be represented "
    "as real historical government agency or field telemetry data."
)

# ---------------------------------------------------------------------------
# Prediction Task Definition
# ---------------------------------------------------------------------------
PREDICTION_HORIZON_HOURS: int = 6
RANDOM_SEED: int = 42
TARGET_COLUMN: str = "disruption_within_6h"

TARGET_DESCRIPTION: str = (
    "Binary indicator (1/0) indicating whether a logistics-halting disruption event "
    "(landslide, severe flash flood, mudslide, or structural road blockage) "
    "occurs within the 6-hour forward-looking horizon [t, t + 6h]."
)

# ---------------------------------------------------------------------------
# Feature Schema Definitions
# ---------------------------------------------------------------------------
NUMERICAL_FEATURES: List[str] = [
    "curr_precip_mm",                  # Observed precipitation at t (preceding 1h sum in mm)
    "forecast_rain_6h_sum_mm",         # Cumulative forecasted rain over [t, t+6h] (mm)
    "forecast_rain_max_intensity_mm",  # Peak 1h forecast rain intensity in [t, t+6h] (mm)
    "forecast_precip_prob_max",        # Maximum forecast rain probability in [t, t+6h] (%)
    "wind_speed_kmh",                  # Instantaneous surface wind speed at t (km/h)
    "wind_gust_kmh",                   # Instantaneous surface wind gust at t (km/h)
    "visibility_km",                   # Surface horizontal visibility at t (km)
    "antecedent_rain_24h_mm",          # Antecedent soil moisture saturation proxy (mm strictly < t)
    "antecedent_rain_72h_mm",          # Deep pore-pressure geotechnical saturation proxy (mm strictly < t)
    "elevation_m",                     # Altitude above sea level (meters)
    "slope_angle_deg",                 # Roadside cut slope gradient (degrees)
    "historical_vulnerability_score",  # Historic incident frequency per corridor km (strictly < t)
    "active_incidents_nearby_15km",    # Verified active incidents within 15km at t (strictly < t)
]

CATEGORICAL_FEATURES: List[str] = [
    "terrain_type",                    # Plain, Foothill, Steep Ghat, High Mountain Ridge
    "road_class",                      # national_highway, state_highway, arterial
]

BINARY_FEATURES: List[str] = [
    "severe_weather_flag",             # 1 if WMO code indicates storm/violent rain at t, else 0
    "is_monsoon_season",               # 1 if observation is during SW monsoon (June-Sept), else 0
]

TEMPORAL_CYCLE_FEATURES: List[str] = [
    "month_of_year",                   # Calendar month (1-12)
    "hour_of_day",                     # Diurnal hour (0-23)
]

ALL_FEATURE_COLUMNS: List[str] = (
    NUMERICAL_FEATURES
    + CATEGORICAL_FEATURES
    + BINARY_FEATURES
    + TEMPORAL_CYCLE_FEATURES
)

# ---------------------------------------------------------------------------
# Data Leakage Safeguards (Forbidden Features)
# ---------------------------------------------------------------------------
FORBIDDEN_LEAKAGE_COLUMNS: List[str] = [
    "status",                          # Incident resolution status occurs after disruption
    "road_status",                     # Road blockage outcome occurs after disruption
    "risk_score",                      # Heuristic risk score computed after event occurs
    "actual_rain_next_6h",             # Ground truth future rain is NOT available at time t
    "actual_weather_next_6h",          # Ground truth future weather is NOT available at time t
    "incident_id",                     # Target identifier
    "disruption_duration_hours",       # Consequence variable
    "is_disrupted_now",                # Present state cannot directly equal future prediction
]

# ---------------------------------------------------------------------------
# Operational Thresholds & Calibration
# ---------------------------------------------------------------------------
DEFAULT_DECISION_THRESHOLD: float = 0.40  # Optimized for recall on imbalanced disruption class
HIGH_RISK_THRESHOLD: float = 0.65
CRITICAL_RISK_THRESHOLD: float = 0.80

# ---------------------------------------------------------------------------
# Artifact Directory Paths
# ---------------------------------------------------------------------------
ML_DIR: Path = Path(__file__).resolve().parent
ARTIFACTS_DIR: Path = ML_DIR / "artifacts"
DEFAULT_DATASET_FILE: Path = ARTIFACTS_DIR / f"dataset_{DATASET_VERSION}.csv"
DEFAULT_METADATA_FILE: Path = ARTIFACTS_DIR / f"metadata_{DATASET_VERSION}.json"
DEFAULT_RF_MODEL_FILE: Path = ARTIFACTS_DIR / "disruption_rf_v1.joblib"
DEFAULT_LR_MODEL_FILE: Path = ARTIFACTS_DIR / "logistic_regression_v1.joblib"
DEFAULT_TRAINING_METRICS_FILE: Path = ARTIFACTS_DIR / "training_metrics_v1.json"
DEFAULT_FEATURE_IMPORTANCE_FILE: Path = ARTIFACTS_DIR / "feature_importance_v1.json"
DEFAULT_MODEL_METADATA_FILE: Path = ARTIFACTS_DIR / "model_metadata_v1.json"
DEFAULT_SHAP_GLOBAL_IMPORTANCE_FILE: Path = ARTIFACTS_DIR / "shap_global_importance_v1.json"
DEFAULT_FEATURE_COMPARISON_FILE: Path = ARTIFACTS_DIR / "feature_importance_comparison_v1.json"
DEFAULT_SHAP_LOCAL_EXAMPLES_FILE: Path = ARTIFACTS_DIR / "shap_local_examples_v1.json"
