"""
NEXUS-NER Prototype Dataset Generation & Validation Engine.
Constructs a physics-informed, deterministic prototype training dataset
for logistics corridor disruption prediction in the North Eastern Region.

DATASET PROVENANCE: prototype_training_augmentation
Strictly adheres to data honesty: This is prototype/synthetic augmentation data
designed for algorithmic training and validation, NOT real historical telemetry.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

import numpy as np
import pandas as pd

from app.ml import config

logger = logging.getLogger("nexus_ner.ml.dataset")

# Key Logistics Corridors across North Eastern Region
PRIMARY_NER_CORRIDORS = [
    {"id": "NH-2", "name": "Guwahati-Shillong-Imphal", "terrain": "Steep Ghat", "base_elev": 1450.0, "base_slope": 32.0, "vuln": 0.75, "class": "national_highway"},
    {"id": "NH-6", "name": "Shillong-Jowai-Silchar", "terrain": "Steep Ghat", "base_elev": 1380.0, "base_slope": 35.0, "vuln": 0.85, "class": "national_highway"},
    {"id": "NH-27", "name": "Guwahati-Nagaon-Lumding", "terrain": "Plain", "base_elev": 75.0, "base_slope": 4.0, "vuln": 0.35, "class": "national_highway"},
    {"id": "NH-29", "name": "Dimapur-Kohima Corridor", "terrain": "Steep Ghat", "base_elev": 1400.0, "base_slope": 36.0, "vuln": 0.90, "class": "national_highway"},
    {"id": "NH-10", "name": "Siliguri-Gangtok Highway", "terrain": "High Mountain Ridge", "base_elev": 1650.0, "base_slope": 40.0, "vuln": 0.92, "class": "national_highway"},
    {"id": "NH-37", "name": "Kaziranga Flood Bypass", "terrain": "Plain", "base_elev": 65.0, "base_slope": 3.0, "vuln": 0.50, "class": "national_highway"},
    {"id": "SH-12", "name": "Mawkyrwat-Nongstoin Link", "terrain": "Foothill", "base_elev": 950.0, "base_slope": 22.0, "vuln": 0.60, "class": "state_highway"},
    {"id": "SH-4", "name": "Haflong Hill Cut Route", "terrain": "Steep Ghat", "base_elev": 850.0, "base_slope": 30.0, "vuln": 0.80, "class": "state_highway"},
    {"id": "RD-NER-01", "name": "Tawang Border Access", "terrain": "High Mountain Ridge", "base_elev": 2800.0, "base_slope": 42.0, "vuln": 0.70, "class": "arterial"},
    {"id": "RD-NER-02", "name": "Aizawl-Lunglei Ridge Pass", "terrain": "Steep Ghat", "base_elev": 1150.0, "base_slope": 33.0, "vuln": 0.65, "class": "arterial"},
]


def generate_prototype_dataset(
    n_samples: int = 10000,
    random_seed: int = config.RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generate a deterministic, physics-informed synthetic prototype dataset.

    Physical relationships modeled:
    - Monsoon seasonality drives prolonged precipitation and high antecedent soil saturation.
    - Landslide probability follows geotechnical empirical thresholding:
      High slope angle + high antecedent saturation (24h/72h) + high burst precipitation intensity.
    - Flash flood probability in alluvial plains triggers when 6h cumulative rain exceeds surface drainage.
    - Low visibility (<1.5 km) and gale-force wind gusts (>65 km/h) independently escalate disruption probability.
    """
    rng = np.random.RandomState(random_seed)

    # 1. Temporal anchors (simulating multi-season hourly observations over 2 full annual cycles: 730 days)
    base_time = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    hour_offsets = rng.randint(0, 24 * 730, size=n_samples)
    hour_offsets.sort()  # Maintain chronological progression

    timestamps = [base_time + timedelta(hours=int(h)) for h in hour_offsets]
    months = np.array([dt.month for dt in timestamps])
    hours = np.array([dt.hour for dt in timestamps])

    # Monsoon in North Eastern Region typically spans June (6) to September (9)
    is_monsoon = np.isin(months, [6, 7, 8, 9]).astype(int)

    # 2. Corridor selection
    corridor_indices = rng.choice(len(PRIMARY_NER_CORRIDORS), size=n_samples)
    corridors = [PRIMARY_NER_CORRIDORS[i] for i in corridor_indices]

    terrain_types = [c["terrain"] for c in corridors]
    road_classes = [c["class"] for c in corridors]
    corridor_ids = [c["id"] for c in corridors]
    corridor_names = [c["name"] for c in corridors]

    # 3. Terrain & Topographic features with localized variance
    base_slopes = np.array([c["base_slope"] for c in corridors])
    slope_angles = np.clip(base_slopes + rng.normal(0.0, 3.5, size=n_samples), 1.0, 60.0).round(1)

    base_elevs = np.array([c["base_elev"] for c in corridors])
    elevations = np.clip(base_elevs + rng.normal(0.0, 50.0, size=n_samples), 40.0, 3800.0).round(1)

    base_vulns = np.array([c["vuln"] for c in corridors])
    hist_vuln_scores = np.clip(base_vulns + rng.normal(0.0, 0.05, size=n_samples), 0.1, 1.0).round(3)

    # 4. Weather variables (monsoon vs dry season modulation)
    # Precipitation generation
    rain_prob_base = np.where(is_monsoon == 1, 0.45, 0.12)
    is_raining = (rng.uniform(0.0, 1.0, size=n_samples) < rain_prob_base).astype(int)

    # Current 1h precipitation sum (mm)
    curr_precip = np.where(
        is_raining == 1,
        np.where(is_monsoon == 1, rng.exponential(scale=12.0, size=n_samples), rng.exponential(scale=4.0, size=n_samples)),
        0.0
    ).round(1)

    # 6-hour forecast cumulative precipitation (mm)
    forecast_rain_6h = np.where(
        is_raining == 1,
        curr_precip * rng.uniform(2.5, 5.0, size=n_samples) + rng.uniform(0.0, 15.0, size=n_samples),
        np.where(rng.uniform(0.0, 1.0, size=n_samples) < (rain_prob_base * 0.7), rng.exponential(scale=8.0, size=n_samples), 0.0)
    ).round(1)

    # Peak 1h forecast rain intensity (mm)
    forecast_max_intensity = np.clip(forecast_rain_6h * rng.uniform(0.25, 0.65, size=n_samples), 0.0, 120.0).round(1)

    # Forecast precipitation probability (%)
    forecast_precip_prob = np.where(
        forecast_rain_6h > 0.0,
        np.clip(45.0 + (forecast_rain_6h * 1.5) + rng.normal(0, 8, size=n_samples), 30.0, 100.0),
        np.clip(rng.uniform(5.0, 25.0, size=n_samples), 0.0, 30.0)
    ).round(1)

    # Antecedent rainfall: 24h and 72h accumulation (mm) strictly preceding t
    antecedent_24h = np.where(
        is_monsoon == 1,
        np.clip(rng.gamma(shape=2.5, scale=18.0, size=n_samples) + (curr_precip * 1.5), 0.0, 280.0),
        np.clip(rng.gamma(shape=1.2, scale=6.0, size=n_samples), 0.0, 80.0)
    ).round(1)

    antecedent_72h = np.clip(
        antecedent_24h * rng.uniform(1.8, 3.2, size=n_samples) + rng.uniform(0.0, 30.0, size=n_samples),
        0.0,
        600.0
    ).round(1)

    # Wind and Visibility
    wind_speed = np.clip(
        12.0 + (is_monsoon * 8.0) + (curr_precip * 0.4) + rng.normal(0.0, 6.0, size=n_samples),
        2.0,
        95.0
    ).round(1)

    wind_gust = np.clip(wind_speed * rng.uniform(1.3, 1.8, size=n_samples), 5.0, 130.0).round(1)

    visibility = np.where(
        curr_precip > 20.0,
        np.clip(rng.uniform(0.3, 1.8, size=n_samples), 0.2, 3.0),
        np.where(
            is_monsoon == 1,
            np.clip(10.0 - (curr_precip * 0.2) + rng.normal(0, 1.5, size=n_samples), 0.8, 12.0),
            np.clip(12.0 + rng.normal(0, 2.0, size=n_samples), 2.0, 15.0)
        )
    ).round(1)

    severe_weather = (
        ((curr_precip >= 25.0) | (wind_gust >= 65.0) | ((is_monsoon == 1) & (hours >= 14) & (hours <= 19) & (curr_precip > 10.0)))
    ).astype(int)

    # Nearby active incidents (proxy for antecedent instability in corridor, strictly < t)
    active_incidents = np.where(
        (antecedent_24h > 60.0) | (hist_vuln_scores > 0.75),
        rng.poisson(lam=1.5, size=n_samples),
        rng.poisson(lam=0.2, size=n_samples)
    )
    active_incidents = np.clip(active_incidents, 0, 8).astype(int)

    # 5. Physics-Informed Ground Truth Target Formulation: disruption_within_6h
    # Geotechnical factor: (antecedent saturation + forecast burst) on steep slope
    slope_norm = slope_angles / 45.0  # Normalized slope factor
    rain_trigger = (forecast_rain_6h * 0.035) + (forecast_max_intensity * 0.05) + (antecedent_24h * 0.02) + (antecedent_72h * 0.008)
    geotech_risk = slope_norm * rain_trigger

    # Hydrological plain flooding factor: heavy cumulative rain on low-slope plain
    plain_flood_risk = np.where(
        np.array(terrain_types) == "Plain",
        (forecast_rain_6h / 75.0) * 1.5,
        0.0
    )

    # Wind / Visibility blockage factor (tree fall, impassable pass)
    storm_block_risk = np.where(wind_gust >= 75.0, 0.8, 0.0) + np.where(visibility <= 0.6, 0.6, 0.0)

    # Vulnerability scalar
    vuln_multiplier = hist_vuln_scores * 1.2

    # Latent logit score with physical noise
    latent_score = (
        -3.5  # Base log-odds (disruptions are rare in benign weather)
        + (geotech_risk * 1.8)
        + (plain_flood_risk * 1.4)
        + storm_block_risk
        + (active_incidents * 0.35)
        + (severe_weather * 0.5)
        + (vuln_multiplier * 0.6)
        + rng.logistic(loc=0.0, scale=0.45, size=n_samples)  # Unobserved environmental noise
    )

    # Sigmoid probability of disruption within 6h
    prob_disruption = 1.0 / (1.0 + np.exp(-latent_score))

    # Binary disruption outcome
    disruption_within_6h = (prob_disruption >= 0.5).astype(int)

    # Build DataFrame
    df = pd.DataFrame({
        "timestamp": [dt.isoformat() for dt in timestamps],
        "corridor_id": corridor_ids,
        "corridor_name": corridor_names,
        "curr_precip_mm": curr_precip,
        "forecast_rain_6h_sum_mm": forecast_rain_6h,
        "forecast_rain_max_intensity_mm": forecast_max_intensity,
        "forecast_precip_prob_max": forecast_precip_prob,
        "wind_speed_kmh": wind_speed,
        "wind_gust_kmh": wind_gust,
        "visibility_km": visibility,
        "severe_weather_flag": severe_weather,
        "antecedent_rain_24h_mm": antecedent_24h,
        "antecedent_rain_72h_mm": antecedent_72h,
        "elevation_m": elevations,
        "slope_angle_deg": slope_angles,
        "terrain_type": terrain_types,
        "road_class": road_classes,
        "historical_vulnerability_score": hist_vuln_scores,
        "is_monsoon_season": is_monsoon,
        "month_of_year": months,
        "hour_of_day": hours,
        "active_incidents_nearby_15km": active_incidents,
        config.TARGET_COLUMN: disruption_within_6h,
    })

    return df


def validate_dataset(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Rigorously validate dataset schema, missing values, class distribution,
    and temporal leakage constraints.
    """
    report: Dict[str, Any] = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "num_samples": len(df),
        "columns_present": list(df.columns),
    }

    # 1. Target existence
    if config.TARGET_COLUMN not in df.columns:
        report["valid"] = False
        report["errors"].append(f"Target column '{config.TARGET_COLUMN}' is missing.")
        return False, report

    # 2. Required features check
    missing_feats = [col for col in config.ALL_FEATURE_COLUMNS if col not in df.columns]
    if missing_feats:
        report["valid"] = False
        report["errors"].append(f"Missing required feature columns: {missing_feats}")

    # 3. Forbidden leakage columns check
    leaked_cols = [col for col in config.FORBIDDEN_LEAKAGE_COLUMNS if col in df.columns]
    if leaked_cols:
        report["valid"] = False
        report["errors"].append(f"TEMPORAL LEAKAGE DETECTED: Dataset contains forbidden columns: {leaked_cols}")

    # 4. Missing / NaN values check
    nan_counts = df[config.ALL_FEATURE_COLUMNS + [config.TARGET_COLUMN]].isna().sum().to_dict()
    nan_total = sum(nan_counts.values())
    if nan_total > 0:
        report["valid"] = False
        report["errors"].append(f"Dataset contains NaN values: {nan_counts}")

    # 5. Target class distribution check
    y = df[config.TARGET_COLUMN]
    unique_classes = set(y.unique())
    if unique_classes != {0, 1}:
        report["valid"] = False
        report["errors"].append(f"Target must contain both 0 and 1 classes. Found: {unique_classes}")

    pos_count = int((y == 1).sum())
    neg_count = int((y == 0).sum())
    pos_ratio = round(pos_count / len(df), 4)

    report["class_distribution"] = {
        "positive_disruptions": pos_count,
        "negative_passable": neg_count,
        "positive_ratio": pos_ratio,
    }

    # Operational validity: positive class must be a realistic minority class (5% to 35%)
    if not (0.05 <= pos_ratio <= 0.35):
        report["warnings"].append(
            f"Class balance is atypical for logistics disruptions ({pos_ratio * 100:.1f}%). Expected 5% to 35%."
        )

    # 6. Value domain checks
    if (df["curr_precip_mm"] < 0).any():
        report["valid"] = False
        report["errors"].append("Negative precipitation values detected.")
    if (df["slope_angle_deg"] < 0).any() or (df["slope_angle_deg"] > 90).any():
        report["valid"] = False
        report["errors"].append("Slope angle out of physical bounds [0, 90].")
    if (df["visibility_km"] < 0).any():
        report["valid"] = False
        report["errors"].append("Negative visibility values detected.")

    return report["valid"], report


def build_and_save_prototype_dataset(
    n_samples: int = 10000,
    output_dir: Optional[Path] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Generate, validate, and persist prototype dataset with metadata artifact.
    """
    target_dir = output_dir or config.ARTIFACTS_DIR
    target_dir.mkdir(parents=True, exist_ok=True)

    csv_path = target_dir / f"dataset_{config.DATASET_VERSION}.csv"
    meta_path = target_dir / f"metadata_{config.DATASET_VERSION}.json"

    logger.info("Generating %d prototype corridor-hour observations...", n_samples)
    df = generate_prototype_dataset(n_samples=n_samples, random_seed=config.RANDOM_SEED)

    is_valid, validation_report = validate_dataset(df)
    if not is_valid:
        raise ValueError(f"Dataset validation failed: {validation_report['errors']}")

    # Save CSV
    df.to_csv(csv_path, index=False)
    logger.info("Saved prototype dataset to %s", csv_path)

    # Construct complete metadata object
    metadata = {
        "dataset_version": config.DATASET_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "random_seed": config.RANDOM_SEED,
        "simulation_window_days": 730,
        "simulation_window_description": "730 calendar days (2025-01-01 to 2026-12-31, 2 full annual cycles)",
        "provenance": config.DATASET_PROVENANCE,
        "is_synthetic": config.IS_SYNTHETIC,
        "data_honesty_notice": config.DATASET_HONESTY_NOTE,
        "prediction_task": {
            "target_column": config.TARGET_COLUMN,
            "prediction_horizon_hours": config.PREDICTION_HORIZON_HOURS,
            "target_description": config.TARGET_DESCRIPTION,
        },
        "statistics": {
            "total_samples": len(df),
            "total_features": len(config.ALL_FEATURE_COLUMNS),
            "positive_samples": validation_report["class_distribution"]["positive_disruptions"],
            "negative_samples": validation_report["class_distribution"]["negative_passable"],
            "positive_class_ratio": validation_report["class_distribution"]["positive_ratio"],
        },
        "feature_schema": {
            "all_features": config.ALL_FEATURE_COLUMNS,
            "numerical_features": config.NUMERICAL_FEATURES,
            "categorical_features": config.CATEGORICAL_FEATURES,
            "binary_features": config.BINARY_FEATURES,
            "temporal_features": config.TEMPORAL_CYCLE_FEATURES,
        },
        "leakage_safeguards": {
            "forbidden_columns": config.FORBIDDEN_LEAKAGE_COLUMNS,
            "status": "enforced_and_validated",
        },
        "files": {
            "dataset_csv": str(csv_path.name),
            "metadata_json": str(meta_path.name),
        }
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved dataset metadata to %s", meta_path)

    return df, metadata


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print("=" * 60)
    print("NEXUS-NER Phase 6A: Prototype Dataset Generator")
    print("=" * 60)
    dataset_df, meta = build_and_save_prototype_dataset(n_samples=10000)
    print("\nGeneration & Validation Complete!")
    print(f"Total Observations: {meta['statistics']['total_samples']}")
    print(f"Positive Disruption Events: {meta['statistics']['positive_samples']} ({meta['statistics']['positive_class_ratio'] * 100:.2f}%)")
    print(f"Negative Passable Events:   {meta['statistics']['negative_samples']} ({(1 - meta['statistics']['positive_class_ratio']) * 100:.2f}%)")
    print(f"Total Features:             {meta['statistics']['total_features']}")
    print(f"Dataset Provenance:         {meta['provenance']}")
    print(f"Is Synthetic / Prototype:   {meta['is_synthetic']}")
    print("=" * 60)
