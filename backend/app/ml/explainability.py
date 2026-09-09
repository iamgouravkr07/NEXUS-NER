"""
NEXUS-NER ML Interpretability & Feature Attribution Engine (Phase 6C).
Provides transparent, technically rigorous SHAP (SHapley Additive exPlanations)
attributions for the trained Random Forest corridor disruption prediction model.

Guarantees:
1. Exact additive consistency in model probability space:
   predicted_probability == base_value + sum(shap_values)
2. Strict 1-to-1 mapping with model's 24 transformed feature dimensions.
3. Separation of positive (risk-increasing) and negative (risk-decreasing) contributions.
4. Human-readable, non-causal attribution narratives.
5. Deterministic global and local explanation artifact generation.
6. Zero temporal leakage: operates strictly on pre-prediction features.
7. Explicit data honesty tagging: prototype model attribution.
"""

import argparse
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union

import joblib
import numpy as np
import pandas as pd
import shap

from app.ml import config
from app.ml.feature_engineering import DisruptionFeaturePipeline, TemporalLeakageError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nexus_ml_explainability")

# Domain-specific physical metadata for all 24 transformed features
FEATURE_METADATA: Dict[str, Dict[str, str]] = {
    "curr_precip_mm": {
        "display_name": "Current 1h Precipitation",
        "unit": "mm",
        "physical_meaning": "Surface rainfall accumulated over the preceding 1 hour at observation time t.",
        "high_interpretation": "Intense immediate surface rain elevating surface washout and flash-ponding potential.",
        "low_interpretation": "Dry immediate surface conditions reducing surface washout trigger.",
    },
    "forecast_rain_6h_sum_mm": {
        "display_name": "6-Hour Cumulative Forecast Rain",
        "unit": "mm",
        "physical_meaning": "Projected cumulative rainfall volume over the 6-hour forward-looking horizon [t, t+6h].",
        "high_interpretation": "Substantial forecasted rainfall volume expected to overwhelm regional corridor drainage.",
        "low_interpretation": "Negligible forecasted rainfall volume over the upcoming 6-hour window.",
    },
    "forecast_rain_max_intensity_mm": {
        "display_name": "Peak 1h Forecast Rain Intensity",
        "unit": "mm/h",
        "physical_meaning": "Maximum 1-hour projected rainfall intensity within the 6-hour forward-looking horizon.",
        "high_interpretation": "Extreme burst intensity capable of triggering sudden debris flows and culvert overflows.",
        "low_interpretation": "No intense burst rain events projected across the forecast horizon.",
    },
    "forecast_precip_prob_max": {
        "display_name": "Peak Forecast Precipitation Probability",
        "unit": "%",
        "physical_meaning": "Maximum meteorological precipitation probability across the 6-hour window.",
        "high_interpretation": "High meteorological confidence of impending rain events along the corridor.",
        "low_interpretation": "Low meteorological likelihood of precipitation.",
    },
    "wind_speed_kmh": {
        "display_name": "Surface Wind Speed",
        "unit": "km/h",
        "physical_meaning": "Sustained horizontal surface wind velocity at observation time t.",
        "high_interpretation": "Elevated sustained winds contributing to roadside debris and vehicle transit instability.",
        "low_interpretation": "Calm surface wind conditions.",
    },
    "wind_gust_kmh": {
        "display_name": "Peak Wind Gust",
        "unit": "km/h",
        "physical_meaning": "Maximum instantaneous surface wind gust velocity at observation time t.",
        "high_interpretation": "Gale-force gusts posing significant tree-fall and high-profile vehicle rollover risks.",
        "low_interpretation": "Light wind gusts within normal transit safety margins.",
    },
    "visibility_km": {
        "display_name": "Horizontal Visibility",
        "unit": "km",
        "physical_meaning": "Surface horizontal atmospheric visibility distance at observation time t.",
        "high_interpretation": "Clear atmospheric sightlines supporting safe mountain transit.",
        "low_interpretation": "Severe fog, mist, or torrential downpour blinding drivers and reducing safe speed.",
    },
    "antecedent_rain_24h_mm": {
        "display_name": "Antecedent 24h Rainfall",
        "unit": "mm",
        "physical_meaning": "Cumulative precipitation over the 24 hours strictly preceding time t (soil moisture saturation proxy).",
        "high_interpretation": "Topsoil near field capacity, dramatically reducing roadside cut-slope shear resistance.",
        "low_interpretation": "Dry antecedent soil providing high infiltration capacity and stable shear strength.",
    },
    "antecedent_rain_72h_mm": {
        "display_name": "Antecedent 72h Rainfall",
        "unit": "mm",
        "physical_meaning": "Cumulative precipitation over the 72 hours strictly preceding time t (deep pore-water pressure proxy).",
        "high_interpretation": "Substantial deep pore-water pressure accumulation in hillside strata promoting deep-seated slides.",
        "low_interpretation": "Low deep pore-water pressure maintaining slope stability.",
    },
    "elevation_m": {
        "display_name": "Corridor Elevation",
        "unit": "m",
        "physical_meaning": "Altitude above sea level along corridor segment.",
        "high_interpretation": "High mountain elevation characterized by extreme weather gradients and steep rock faces.",
        "low_interpretation": "Lowland valley or plain elevation.",
    },
    "slope_angle_deg": {
        "display_name": "Cut-Slope Angle",
        "unit": "degrees",
        "physical_meaning": "Roadside cut-slope gradient along highway alignment.",
        "high_interpretation": "Steep hillside gradient (>30°) where gravity induces high shear stress on saturated soil.",
        "low_interpretation": "Gentle or flat roadside topography resistant to gravitational slide failure.",
    },
    "historical_vulnerability_score": {
        "display_name": "Historical Vulnerability Rating",
        "unit": "score (0-1)",
        "physical_meaning": "Baseline structural susceptibility derived from historical geotechnical failure frequency.",
        "high_interpretation": "Corridor segment historically prone to chronic rockfalls, slides, or road washouts.",
        "low_interpretation": "Corridor segment with historically resilient engineering and low failure frequency.",
    },
    "active_incidents_nearby_15km": {
        "display_name": "Active Incidents within 15km",
        "unit": "count",
        "physical_meaning": "Verified active hazard or obstruction reports within 15km strictly prior to time t.",
        "high_interpretation": "Cluster of nearby active hazards indicating regional geotechnical or hydrological distress.",
        "low_interpretation": "No nearby active disruptions reported.",
    },
    "severe_weather_flag": {
        "display_name": "Severe Weather Flag",
        "unit": "binary (0/1)",
        "physical_meaning": "Meteorological indicator for active storm, cloudburst, or severe convective cell.",
        "high_interpretation": "Active severe thunderstorm or violent rain cell warning in effect.",
        "low_interpretation": "No severe convective weather warning active.",
    },
    "is_monsoon_season": {
        "display_name": "Monsoon Season Indicator",
        "unit": "binary (0/1)",
        "physical_meaning": "Calendar indicator for South-West monsoon season (June to September).",
        "high_interpretation": "Observation falls during peak regional monsoon hydrometeorological stress.",
        "low_interpretation": "Observation falls outside monsoon season during dry or post-monsoon periods.",
    },
    "month_of_year": {
        "display_name": "Month of Year",
        "unit": "month (1-12)",
        "physical_meaning": "Annual temporal cyclical anchor representing broader seasonal weather patterns.",
        "high_interpretation": "Annual calendar timing aligned with historically high disruption months.",
        "low_interpretation": "Annual calendar timing aligned with historically stable dry months.",
    },
    "hour_of_day": {
        "display_name": "Hour of Day",
        "unit": "hour (0-23)",
        "physical_meaning": "Diurnal cyclical anchor representing daily heating and convective storm cycles.",
        "high_interpretation": "Diurnal window coinciding with peak solar heating and mountain convection.",
        "low_interpretation": "Diurnal window of relative atmospheric and thermal stability.",
    },
    "terrain_type_Foothill": {
        "display_name": "Terrain: Foothill",
        "unit": "binary",
        "physical_meaning": "Corridor traverses undulating foothill topography with moderate cut-slopes.",
        "high_interpretation": "Foothill terrain associated with intermediate erosion and drainage complexity.",
        "low_interpretation": "Non-foothill terrain classification.",
    },
    "terrain_type_High Mountain Ridge": {
        "display_name": "Terrain: High Mountain Ridge",
        "unit": "binary",
        "physical_meaning": "Corridor traverses alpine mountain ridge terrain with extreme slopes and rockfall hazards.",
        "high_interpretation": "High ridge terrain associated with severe elevation gradients and acute landslide risks.",
        "low_interpretation": "Non-high-mountain terrain classification.",
    },
    "terrain_type_Plain": {
        "display_name": "Terrain: Alluvial Plain",
        "unit": "binary",
        "physical_meaning": "Corridor traverses low-lying alluvial plains susceptible to waterlogging and riverine flooding.",
        "high_interpretation": "Plain terrain where disruptions are predominantly water accumulation and flash flooding.",
        "low_interpretation": "Elevated hill or ghat terrain classification.",
    },
    "terrain_type_Steep Ghat": {
        "display_name": "Terrain: Steep Ghat",
        "unit": "binary",
        "physical_meaning": "Corridor traverses precipitous ghat mountain passes with deep roadside valley cuts.",
        "high_interpretation": "Steep ghat geometry characterized by severe mudslide, landslide, and road subsidence risks.",
        "low_interpretation": "Non-ghat terrain classification.",
    },
    "road_class_arterial": {
        "display_name": "Road Class: Arterial Road",
        "unit": "binary",
        "physical_meaning": "Corridor is classified as a secondary or arterial feeder road.",
        "high_interpretation": "Arterial road typically featuring narrower shoulders and lower retaining-wall reinforcement.",
        "low_interpretation": "Non-arterial road classification.",
    },
    "road_class_national_highway": {
        "display_name": "Road Class: National Highway",
        "unit": "binary",
        "physical_meaning": "Corridor is classified as a primary National Highway (NH).",
        "high_interpretation": "National Highway with higher engineering standards and wider clearing margins.",
        "low_interpretation": "State Highway or arterial feeder road classification.",
    },
    "road_class_state_highway": {
        "display_name": "Road Class: State Highway",
        "unit": "binary",
        "physical_meaning": "Corridor is classified as a State Highway (SH).",
        "high_interpretation": "State Highway with intermediate drainage and stabilization infrastructure.",
        "low_interpretation": "National Highway or arterial road classification.",
    },
}


class DisruptionExplainer:
    """
    SHAP-based model interpretability and feature attribution engine for NEXUS-NER.
    Explains predictions from the trained Random Forest classifier.
    """

    def __init__(self, model_bundle_path: Optional[Path] = None):
        self.bundle_path = model_bundle_path or config.DEFAULT_RF_MODEL_FILE
        if not self.bundle_path.exists():
            raise FileNotFoundError(f"Trained Random Forest artifact not found at: {self.bundle_path}")

        logger.info("Loading Random Forest model bundle from %s...", self.bundle_path)
        self.bundle = joblib.load(self.bundle_path)

        # Validate bundle completeness
        required_keys = ["model", "pipeline", "operational_threshold", "feature_names"]
        for key in required_keys:
            if key not in self.bundle:
                raise KeyError(f"Corrupted model bundle: missing key '{key}'")

        self.model = self.bundle["model"]
        self.pipeline: DisruptionFeaturePipeline = self.bundle["pipeline"]
        self.operational_threshold: float = float(self.bundle["operational_threshold"])
        self.feature_names: List[str] = list(self.bundle["feature_names"])
        self.n_features: int = len(self.feature_names)

        if self.n_features != 24:
            raise ValueError(f"Expected exactly 24 model features, found {self.n_features}")

        # Initialize SHAP TreeExplainer
        logger.info("Initializing SHAP TreeExplainer on Random Forest model...")
        self.explainer = shap.TreeExplainer(self.model)

        # Base value (expected probability for positive disruption class: class 1)
        if isinstance(self.explainer.expected_value, (list, np.ndarray)):
            self.base_value = float(self.explainer.expected_value[1])
        else:
            self.base_value = float(self.explainer.expected_value)

        self.output_space = "probability_space"
        logger.info(
            "DisruptionExplainer initialized. Base probability value (E[f(x)]): %.4f, Threshold: %.2f",
            self.base_value,
            self.operational_threshold,
        )

    def _extract_positive_shap(self, raw_shap: Union[np.ndarray, List[np.ndarray]]) -> np.ndarray:
        """
        Normalize SHAP return format to guarantee 2D array (N, n_features)
        specifically for the positive class (disruption_within_6h = 1).
        """
        if isinstance(raw_shap, list):
            # List of [class_0_array, class_1_array]
            return np.array(raw_shap[1], dtype=np.float32)
        elif isinstance(raw_shap, np.ndarray):
            if raw_shap.ndim == 3:
                # Shape: (N, n_features, 2) -> extract index 1
                return raw_shap[:, :, 1].astype(np.float32)
            elif raw_shap.ndim == 2:
                return raw_shap.astype(np.float32)
            else:
                raise ValueError(f"Unexpected SHAP array dimension: {raw_shap.ndim}")
        else:
            raise TypeError(f"Unsupported SHAP output type: {type(raw_shap)}")

    def explain_instance(
        self,
        observation: Union[Dict[str, Any], pd.DataFrame, pd.Series],
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """
        Compute per-prediction local feature attribution for a single observation.
        Verifies exact additive consistency: prob == base_value + sum(shap_values).
        """
        if isinstance(observation, dict):
            df_obs = pd.DataFrame([observation])
        elif isinstance(observation, pd.Series):
            df_obs = pd.DataFrame([observation.to_dict()])
        elif isinstance(observation, pd.DataFrame):
            df_obs = observation.iloc[:1].copy()
        else:
            raise TypeError(f"Unsupported observation format: {type(observation)}")

        # Transform using frozen pipeline (also verifies anti-leakage)
        X_vec = self.pipeline.transform(df_obs)
        if X_vec.shape[1] != self.n_features:
            raise ValueError(
                f"Dimension mismatch: Model expects {self.n_features} features, got {X_vec.shape[1]}"
            )

        # Predict probability
        predicted_prob = float(self.model.predict_proba(X_vec)[0, 1])
        predicted_class = int(predicted_prob >= self.operational_threshold)

        # Assign operational risk tier
        if predicted_prob >= config.CRITICAL_RISK_THRESHOLD:
            risk_tier = "CRITICAL DISRUPTION RISK"
        elif predicted_prob >= config.HIGH_RISK_THRESHOLD:
            risk_tier = "HIGH DISRUPTION RISK"
        elif predicted_prob >= self.operational_threshold:
            risk_tier = "ELEVATED DISRUPTION RISK"
        else:
            risk_tier = "LOW DISRUPTION RISK"

        # Compute SHAP values
        raw_shap = self.explainer.shap_values(X_vec)
        shap_vector = self._extract_positive_shap(raw_shap)[0]

        if len(shap_vector) != self.n_features:
            raise ValueError(
                f"SHAP feature count ({len(shap_vector)}) does not match expected ({self.n_features})"
            )

        # Verify Additive Consistency in Probability Space
        reconstructed_prob = float(self.base_value + np.sum(shap_vector))
        consistency_error = abs(reconstructed_prob - predicted_prob)
        is_consistent = bool(consistency_error < 1e-4)

        # Assemble per-feature details
        feature_attributions: List[Dict[str, Any]] = []
        for i, feat_name in enumerate(self.feature_names):
            meta = FEATURE_METADATA.get(feat_name, {})
            shap_val = float(shap_vector[i])
            feat_val = float(X_vec[0, i])

            # Raw value extraction if available in input
            raw_val: Optional[Any] = None
            if feat_name in df_obs.columns:
                raw_val = df_obs[feat_name].iloc[0]
                if hasattr(raw_val, "item"):
                    raw_val = raw_val.item()
                elif isinstance(raw_val, (np.integer, int)):
                    raw_val = int(raw_val)
                elif isinstance(raw_val, (np.floating, float)):
                    raw_val = float(raw_val)

            direction = "increases_disruption_probability" if shap_val > 0 else "decreases_disruption_probability"
            interpretation = meta.get("high_interpretation" if feat_val > 0 else "low_interpretation", meta.get("physical_meaning", ""))

            feature_attributions.append({
                "feature": feat_name,
                "display_name": meta.get("display_name", feat_name),
                "unit": meta.get("unit", ""),
                "transformed_value": round(feat_val, 4),
                "raw_value": raw_val,
                "shap_value": round(shap_val, 4),
                "direction": direction,
                "magnitude": round(abs(shap_val), 4),
                "physical_interpretation": interpretation,
            })

        # Separate positive (risk-increasing) and negative (risk-decreasing) contributors
        positive_contributors = [
            f for f in feature_attributions if f["shap_value"] > 0
        ]
        positive_contributors.sort(key=lambda x: x["magnitude"], reverse=True)

        negative_contributors = [
            f for f in feature_attributions if f["shap_value"] < 0
        ]
        negative_contributors.sort(key=lambda x: x["magnitude"], reverse=True)

        # Build structured human-readable narrative template
        top_pos = positive_contributors[:3]
        top_neg = negative_contributors[:3]

        pos_factors_text = "; ".join(
            f"{f['display_name']} (+{f['shap_value']:.3f})" for f in top_pos
        ) if top_pos else "No significant risk-elevating factors"

        neg_factors_text = "; ".join(
            f"{f['display_name']} ({f['shap_value']:.3f})" for f in top_neg
        ) if top_neg else "No significant mitigating factors"

        narrative = (
            f"Model prediction: {risk_tier} (predicted probability: {predicted_prob:.1%}, "
            f"operational alert threshold: {self.operational_threshold:.1%}). "
            f"Base prior probability across training distribution is {self.base_value:.1%}. "
            f"Primary factors that contributed to increasing the disruption prediction: {pos_factors_text}. "
            f"Primary factors that contributed to lowering the disruption prediction: {neg_factors_text}. "
            "Note: SHAP attributions reflect statistical model contribution for this corridor condition, "
            "not verified empirical causality."
        )

        return {
            "prediction": {
                "predicted_probability": round(predicted_prob, 4),
                "operational_threshold": round(self.operational_threshold, 4),
                "predicted_class": predicted_class,
                "risk_tier": risk_tier,
                "base_value": round(self.base_value, 4),
                "explained_output_space": self.output_space,
                "additive_consistency": {
                    "reconstructed_probability": round(reconstructed_prob, 4),
                    "absolute_error": round(consistency_error, 8),
                    "is_exact": is_consistent,
                },
            },
            "top_positive_contributors": positive_contributors[:top_k],
            "top_negative_contributors": negative_contributors[:top_k],
            "all_feature_attributions": feature_attributions,
            "human_readable_explanation": narrative,
            "data_honesty_notice": config.DATASET_HONESTY_NOTE,
        }

    def compute_global_importance(
        self,
        df: Optional[pd.DataFrame] = None,
        sample_size: int = 1000,
        random_seed: int = config.RANDOM_SEED,
    ) -> Dict[str, Any]:
        """
        Compute global SHAP feature importance over a deterministic representative sample.
        Calculates mean absolute SHAP value across observations.
        """
        if df is None:
            data_file = config.DEFAULT_DATASET_FILE
            if not data_file.exists():
                raise FileNotFoundError(f"Dataset not found at {data_file}")
            df = pd.read_csv(data_file)

        # Deterministic representative sampling
        n_available = len(df)
        actual_sample_size = min(sample_size, n_available)
        sample_df = df.sample(n=actual_sample_size, random_state=random_seed).reset_index(drop=True)

        logger.info(
            "Computing global SHAP feature importance on %d representative samples (random_seed=%d)...",
            actual_sample_size,
            random_seed,
        )

        X_sample = self.pipeline.transform(sample_df)
        raw_shap = self.explainer.shap_values(X_sample)
        shap_matrix = self._extract_positive_shap(raw_shap)

        # Mean absolute SHAP value per feature
        mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)
        total_abs_shap = float(np.sum(mean_abs_shap))

        sorted_indices = np.argsort(mean_abs_shap)[::-1]

        ranked_features: List[Dict[str, Any]] = []
        shap_importance_dict: Dict[str, float] = {}

        for rank, idx in enumerate(sorted_indices, 1):
            feat_name = self.feature_names[idx]
            abs_val = float(mean_abs_shap[idx])
            rel_pct = (abs_val / total_abs_shap * 100.0) if total_abs_shap > 0 else 0.0
            meta = FEATURE_METADATA.get(feat_name, {})

            shap_importance_dict[feat_name] = round(abs_val, 4)
            ranked_features.append({
                "rank": rank,
                "feature": feat_name,
                "display_name": meta.get("display_name", feat_name),
                "mean_abs_shap": round(abs_val, 4),
                "relative_importance_pct": round(rel_pct, 2),
                "unit": meta.get("unit", ""),
                "physical_meaning": meta.get("physical_meaning", ""),
            })

        return {
            "model": "RandomForestClassifier",
            "model_version": "v1.0",
            "dataset_version": config.DATASET_VERSION,
            "provenance": config.DATASET_PROVENANCE,
            "is_synthetic": config.IS_SYNTHETIC,
            "data_honesty_notice": config.DATASET_HONESTY_NOTE,
            "shap_version": shap.__version__,
            "explained_class": "disruption_within_6h = 1",
            "explained_output_space": self.output_space,
            "base_value": round(self.base_value, 4),
            "sample_size": actual_sample_size,
            "random_seed": random_seed,
            "total_features": self.n_features,
            "ranked_features": ranked_features,
            "feature_importances": shap_importance_dict,
            "methodology_note": (
                "Global SHAP feature importance is computed as the mean absolute SHAP value "
                "across the representative sample in model probability output space. "
                "Higher values indicate features that exert stronger marginal influence on the "
                "predicted disruption probability. This indicates predictive statistical association, "
                "not confirmed physical causality."
            ),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def compare_gini_vs_shap(
        self,
        global_shap_result: Dict[str, Any],
        gini_file_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Compare Gini impurity feature importance from Phase 6B with SHAP marginal attribution.
        Analyzes rank differences and structural methodological divergences.
        """
        g_path = gini_file_path or config.DEFAULT_FEATURE_IMPORTANCE_FILE
        if not g_path.exists():
            raise FileNotFoundError(f"Gini feature importance artifact not found: {g_path}")

        with open(g_path, "r", encoding="utf-8") as f:
            gini_data = json.load(f)

        # Build Gini lookup {feature_name: {"rank": int, "importance": float}}
        gini_lookup: Dict[str, Dict[str, Any]] = {}
        for item in gini_data.get("ranked_features", []):
            gini_lookup[item["feature"]] = {
                "rank": item["rank"],
                "gini_importance": item["importance"],
            }

        comparison_list: List[Dict[str, Any]] = []
        for shap_item in global_shap_result["ranked_features"]:
            feat = shap_item["feature"]
            gini_info = gini_lookup.get(feat, {"rank": 999, "gini_importance": 0.0})

            shap_rank = shap_item["rank"]
            gini_rank = gini_info["rank"]
            rank_diff = gini_rank - shap_rank  # Positive if SHAP ranks it higher than Gini

            meta = FEATURE_METADATA.get(feat, {})

            comparison_list.append({
                "feature": feat,
                "display_name": meta.get("display_name", feat),
                "shap_rank": shap_rank,
                "gini_rank": gini_rank,
                "rank_difference": rank_diff,
                "shap_mean_abs_importance": shap_item["mean_abs_shap"],
                "shap_relative_pct": shap_item["relative_importance_pct"],
                "gini_importance": gini_info["gini_importance"],
                "physical_meaning": meta.get("physical_meaning", ""),
            })

        return {
            "model": "RandomForestClassifier",
            "comparison_scope": "Gini Impurity Importance vs SHAP Marginal Attribution",
            "dataset_version": config.DATASET_VERSION,
            "provenance": config.DATASET_PROVENANCE,
            "is_synthetic": config.IS_SYNTHETIC,
            "total_features_compared": len(comparison_list),
            "methodological_distinction": {
                "gini_importance": (
                    "Impurity-based feature importance calculated during training as the total "
                    "reduction of Gini impurity brought by that feature over all trees. Can be biased "
                    "toward features with high cardinality or continuous numerical splits."
                ),
                "shap_importance": (
                    "Game-theoretic Shapley attribution calculated post-hoc as the mean absolute "
                    "marginal contribution of the feature to the model's predicted disruption probability. "
                    "Reflects the actual magnitude by which the feature alters prediction outputs."
                ),
                "causal_safeguard": (
                    "Both metrics measure statistical predictive utility within the trained prototype model. "
                    "Neither metric should be construed as proof of physical or empirical causality."
                ),
            },
            "features": comparison_list,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def generate_and_save_artifacts(
        self,
        dataset_path: Optional[Path] = None,
        output_dir: Optional[Path] = None,
    ) -> Dict[str, Path]:
        """
        Generate and persist all Phase 6C interpretability artifacts:
        1. shap_global_importance_v1.json
        2. feature_importance_comparison_v1.json
        3. shap_local_examples_v1.json
        """
        out_dir = output_dir or config.ARTIFACTS_DIR
        out_dir.mkdir(parents=True, exist_ok=True)

        data_file = dataset_path or config.DEFAULT_DATASET_FILE
        raw_df = pd.read_csv(data_file)

        # 1. Global SHAP Importance
        global_shap = self.compute_global_importance(df=raw_df, sample_size=1000)
        global_path = out_dir / config.DEFAULT_SHAP_GLOBAL_IMPORTANCE_FILE.name
        with open(global_path, "w", encoding="utf-8") as f:
            json.dump(global_shap, f, indent=2, default=str)
        logger.info("Saved global SHAP importance artifact: %s", global_path)

        # 2. Gini vs SHAP Comparison
        comparison = self.compare_gini_vs_shap(global_shap)
        comp_path = out_dir / config.DEFAULT_FEATURE_COMPARISON_FILE.name
        with open(comp_path, "w", encoding="utf-8") as f:
            json.dump(comparison, f, indent=2, default=str)
        logger.info("Saved feature importance comparison artifact: %s", comp_path)

        # 3. Local Examples Artifact (Deterministic Selection from Held-Out Test Set)
        # Slicing test set (indices 8500 to 10000)
        sorted_df = raw_df.sort_values("timestamp").reset_index(drop=True)
        test_df = sorted_df.iloc[8500:].copy().reset_index(drop=True)

        # Compute probabilities across test set for deterministic selection
        X_test = self.pipeline.transform(test_df)
        test_probs = self.model.predict_proba(X_test)[:, 1]

        # Selection rules:
        # A: High-risk positive prediction (highest predicted probability in test set)
        idx_high = int(np.argmax(test_probs))

        # B: Low-risk negative prediction (lowest predicted probability in test set)
        idx_low = int(np.argmin(test_probs))

        # C: Borderline threshold case (closest probability to operational threshold 0.55)
        idx_border = int(np.argmin(np.abs(test_probs - self.operational_threshold)))

        selected_cases = [
            {"label": "high_risk_positive_case", "index": idx_high},
            {"label": "low_risk_negative_case", "index": idx_low},
            {"label": "borderline_threshold_case", "index": idx_border},
        ]

        examples_list: List[Dict[str, Any]] = []
        for case in selected_cases:
            row = test_df.iloc[case["index"]]
            explanation = self.explain_instance(row, top_k=5)
            examples_list.append({
                "example_type": case["label"],
                "test_split_index": int(case["index"]),
                "timestamp": str(row.get("timestamp")),
                "corridor_id": str(row.get("corridor_id")),
                "corridor_name": str(row.get("corridor_name")),
                "ground_truth_disruption": int(row.get(config.TARGET_COLUMN, 0)),
                "explanation": explanation,
            })

        local_examples_artifact = {
            "model": "RandomForestClassifier",
            "model_version": "v1.0",
            "dataset_version": config.DATASET_VERSION,
            "provenance": config.DATASET_PROVENANCE,
            "is_synthetic": config.IS_SYNTHETIC,
            "data_honesty_notice": config.DATASET_HONESTY_NOTE,
            "selection_strategy": (
                "Deterministic selection from held-out test split: "
                "1. Highest predicted probability (high-risk case); "
                "2. Lowest predicted probability (low-risk case); "
                "3. Closest probability to operational threshold tau=0.55 (borderline case)."
            ),
            "examples": examples_list,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        local_path = out_dir / config.DEFAULT_SHAP_LOCAL_EXAMPLES_FILE.name
        with open(local_path, "w", encoding="utf-8") as f:
            json.dump(local_examples_artifact, f, indent=2, default=str)

        logger.info("Saved local SHAP examples artifact: %s", local_path)

        return {
            "shap_global_importance": global_path,
            "feature_importance_comparison": comp_path,
            "shap_local_examples": local_path,
        }


def main():
    parser = argparse.ArgumentParser(description="Generate NEXUS-NER ML Interpretability Artifacts")
    parser.add_argument("--dataset", type=Path, default=None, help="Path to prototype dataset CSV")
    parser.add_argument("--output-dir", type=Path, default=None, help="Directory to save artifacts")
    args = parser.parse_args()

    print("=" * 70)
    print("NEXUS-NER ML INTERPRETABILITY & FEATURE ATTRIBUTION (PHASE 6C)")
    print(f"PROVENANCE: {config.DATASET_PROVENANCE} (is_synthetic={config.IS_SYNTHETIC})")
    print("=" * 70)

    explainer = DisruptionExplainer()
    artifact_paths = explainer.generate_and_save_artifacts(
        dataset_path=args.dataset,
        output_dir=args.output_dir,
    )

    print("\n--- Interpretability Artifacts Generated Successfully ---")
    for name, path in artifact_paths.items():
        print(f" - {name:32s}: {path}")
    print("=" * 70)


if __name__ == "__main__":
    main()
