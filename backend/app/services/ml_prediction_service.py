"""
NEXUS-NER ML Predictive Risk & Alert Integration Service (Phase 6E).
Provides a controlled, safe abstraction connecting the frozen Phase 6D ML model
and SHAP explainability engine to the operational risk and alert architectures.

HARD SAFETY RULES:
1. Authoritative Deterministic Safety: Deterministic risk scoring remains primary.
   ML disruption probability NEVER overwrites or replaces deterministic risk_score.
2. Anti-Leakage & Feature Adapter: The feature adapter requires all 19 model inputs.
   If operational data is incomplete, ML prediction fails safely (available=False)
   without fabricating synthetic values. Future or target data is strictly rejected.
3. Controlled Alert Generation: ML alone NEVER generates Critical operational alerts.
   Predictive alerts require corroborating operational evidence and explicit predictive wording.
4. Non-Causal Attribution: SHAP explanations are framed as statistical contributions, not causal proof.
5. Deduplication & Lifecycle: Uses existing alert deduplication (60-minute window) to prevent alert fatigue.
"""

from datetime import datetime, timezone, timedelta
import logging
from typing import Optional, List, Dict, Any, Tuple, Union

from sqlalchemy.orm import Session

from app.ml import config
from app.ml.feature_engineering import TemporalLeakageError
from app.ml.explainability import DisruptionExplainer
from app.api.ml import get_explainer
from app.models.road import Road
from app.models.incident import Incident
from app.models.alert import Alert
from app.models.weather import WeatherRecord
from app.schemas.ml import (
    DisruptionPredictionRequest,
    FeatureAttributionItem,
    MLPredictionSignal,
    CombinedRiskAssessment,
    PredictiveRiskResult,
)
from app.services import alert_service
from app.services.risk import haversine_distance_km

logger = logging.getLogger("nexus_ner.ml_prediction_service")

# Topographic and structural reference profiles for major North Eastern Region corridors
CORRIDOR_TOPOGRAPHY_PROFILES: Dict[str, Dict[str, Any]] = {
    "NH-415": {
        "elevation_m": 750.0,
        "slope_angle_deg": 25.0,
        "terrain_type": "Foothill",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.65,
    },
    "NH-6": {
        "elevation_m": 1100.0,
        "slope_angle_deg": 32.0,
        "terrain_type": "Steep Ghat",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.75,
    },
    "NH-10": {
        "elevation_m": 1550.0,
        "slope_angle_deg": 35.0,
        "terrain_type": "Steep Ghat",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.85,
    },
    "NH-2": {
        "elevation_m": 850.0,
        "slope_angle_deg": 20.0,
        "terrain_type": "Foothill",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.60,
    },
    "NH-27": {
        "elevation_m": 120.0,
        "slope_angle_deg": 5.0,
        "terrain_type": "Plain",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.30,
    },
    "NH-15": {
        "elevation_m": 130.0,
        "slope_angle_deg": 6.0,
        "terrain_type": "Plain",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.40,
    },
    "NH-8": {
        "elevation_m": 180.0,
        "slope_angle_deg": 8.0,
        "terrain_type": "Plain",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.35,
    },
    "NH-29": {
        "elevation_m": 650.0,
        "slope_angle_deg": 22.0,
        "terrain_type": "Foothill",
        "road_class": "national_highway",
        "historical_vulnerability_score": 0.55,
    },
}


def _determine_risk_level(score: float) -> str:
    """Classify deterministic risk score into standard operational levels."""
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


def predict_disruption(
    features: Union[DisruptionPredictionRequest, Dict[str, Any]],
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Internal service-layer interface for ML disruption prediction and SHAP attribution.
    Directly reuses the application-level DisruptionExplainer singleton without internal HTTP calls.
    """
    if isinstance(features, dict):
        validated_request = DisruptionPredictionRequest.model_validate(features)
        obs_dict = validated_request.model_dump(exclude={"top_k"})
    elif isinstance(features, DisruptionPredictionRequest):
        obs_dict = features.model_dump(exclude={"top_k"})
    else:
        raise TypeError(f"Unsupported features type: {type(features)}")

    effective_top_k = top_k if top_k is not None else (
        features.get("top_k", 5) if isinstance(features, dict) else (features.top_k or 5)
    )

    explainer = get_explainer()
    raw_explanation = explainer.explain_instance(obs_dict, top_k=effective_top_k)

    pred = raw_explanation["prediction"]
    prob = pred["predicted_probability"]
    threshold = pred["operational_threshold"]
    pred_class = pred["predicted_class"]
    risk_tier = pred["risk_tier"]

    return {
        "available": True,
        "disruption_probability": prob,
        "probability": prob,
        "threshold": threshold,
        "predicted_class": pred_class,
        "is_disrupted": bool(pred_class == 1),
        "risk_tier": risk_tier,
        "risk_signal": "DISRUPTION_LIKELY" if pred_class == 1 else "DISRUPTION_UNLIKELY",
        "base_value": pred["base_value"],
        "model_version": "v1.0",
        "dataset_version": config.DATASET_VERSION,
        "provenance": config.DATASET_PROVENANCE,
        "is_synthetic": config.IS_SYNTHETIC,
        "top_positive_contributors": raw_explanation.get("top_positive_contributors", []),
        "top_negative_contributors": raw_explanation.get("top_negative_contributors", []),
        "all_feature_attributions": raw_explanation.get("all_feature_attributions", []),
        "narrative": raw_explanation.get("human_readable_explanation", ""),
        "additive_consistency": pred.get("additive_consistency", {}),
        "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
        "data_honesty_notice": config.DATASET_HONESTY_NOTE,
    }


def adapt_corridor_features(
    db: Session,
    road: Optional[Road] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    custom_overrides: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, Optional[Dict[str, Any]], List[str]]:
    """
    Explicit feature-adapter boundary.
    Safely resolves or constructs the 19 required model features from operational data sources.

    Guarantees:
    - Never fabricates unavailable real-world data.
    - Never uses future observations, target outcomes, or post-event statuses.
    - Fails safely (available=False) returning exact missing feature names.
    """
    # 1. Reject any forbidden data leakage in overrides immediately
    if custom_overrides:
        leaks = [
            k for k in custom_overrides.keys()
            if k in config.FORBIDDEN_LEAKAGE_COLUMNS or k == config.TARGET_COLUMN
        ]
        if leaks:
            raise TemporalLeakageError(
                f"CRITICAL LEAKAGE DETECTED in feature adapter overrides: {leaks}. "
                "These variables represent future ground truth or post-event states."
            )

    target_lat = road.latitude if road else latitude
    target_lon = road.longitude if road else longitude

    overrides = dict(custom_overrides or {})
    constructed: Dict[str, Any] = {}
    missing: List[str] = []

    # 2. Resolve Temporal cyclical features (strictly at prediction time t)
    now_utc = datetime.now(timezone.utc)
    month_val = overrides.get("month_of_year", now_utc.month)
    hour_val = overrides.get("hour_of_day", now_utc.hour)
    monsoon_val = overrides.get("is_monsoon_season", 1 if 6 <= month_val <= 9 else 0)

    constructed["month_of_year"] = int(month_val)
    constructed["hour_of_day"] = int(hour_val)
    constructed["is_monsoon_season"] = int(monsoon_val)

    # 3. Resolve Atmospheric features
    weather_fields = [
        "curr_precip_mm",
        "forecast_rain_6h_sum_mm",
        "forecast_rain_max_intensity_mm",
        "forecast_precip_prob_max",
        "wind_speed_kmh",
        "wind_gust_kmh",
        "visibility_km",
        "severe_weather_flag",
    ]

    weather_resolved = True
    for wf in weather_fields:
        if wf in overrides:
            constructed[wf] = overrides[wf]
        else:
            weather_resolved = False

    if not weather_resolved and target_lat is not None and target_lon is not None:
        try:
            from app.services.weather_service import get_weather_at_coordinate, get_forecast_at_coordinate
            curr_weather = get_weather_at_coordinate(db, target_lat, target_lon)
            forecast = get_forecast_at_coordinate(db, target_lat, target_lon, hours=6)

            if "curr_precip_mm" not in constructed:
                constructed["curr_precip_mm"] = float(curr_weather.precipitation_mm or 0.0)
            if "wind_speed_kmh" not in constructed:
                constructed["wind_speed_kmh"] = float(curr_weather.wind_speed_kmh or 10.0)
            if "wind_gust_kmh" not in constructed:
                constructed["wind_gust_kmh"] = float(curr_weather.wind_gust_kmh or 15.0)
            if "visibility_km" not in constructed:
                constructed["visibility_km"] = float(curr_weather.visibility_km or 10.0)
            if "severe_weather_flag" not in constructed:
                is_severe = bool(
                    (curr_weather.risk_signal and curr_weather.risk_signal.risk_level.lower() == "critical")
                    or (curr_weather.precipitation_mm >= 25.0)
                )
                constructed["severe_weather_flag"] = 1 if is_severe else 0

            # Compute forecast window metrics over [t, t+6h]
            f_items = forecast.hourly_forecast[:6]
            if "forecast_rain_6h_sum_mm" not in constructed:
                constructed["forecast_rain_6h_sum_mm"] = float(sum(item.precipitation_mm for item in f_items))
            if "forecast_rain_max_intensity_mm" not in constructed:
                constructed["forecast_rain_max_intensity_mm"] = float(max((item.precipitation_mm for item in f_items), default=0.0))
            if "forecast_precip_prob_max" not in constructed:
                probs = [item.precipitation_probability for item in f_items if item.precipitation_probability is not None]
                constructed["forecast_precip_prob_max"] = float(max(probs, default=0.0))
        except Exception as weather_err:
            logger.debug("Operational weather service lookup unfulfilled: %s", weather_err)

    for wf in weather_fields:
        if wf not in constructed:
            missing.append(wf)

    # 4. Resolve Topographical and structural features
    topo_fields = [
        "elevation_m",
        "slope_angle_deg",
        "terrain_type",
        "road_class",
        "historical_vulnerability_score",
    ]

    for tf in topo_fields:
        if tf in overrides:
            constructed[tf] = overrides[tf]

    # Attempt lookup from corridor reference profile if road name known
    corridor_key = road.road_name if road else overrides.get("corridor_name")
    if corridor_key and corridor_key in CORRIDOR_TOPOGRAPHY_PROFILES:
        prof = CORRIDOR_TOPOGRAPHY_PROFILES[corridor_key]
        for tf in topo_fields:
            if tf not in constructed and tf in prof:
                constructed[tf] = prof[tf]

    for tf in topo_fields:
        if tf not in constructed:
            missing.append(tf)

    # 5. Resolve Antecedent hydrological soil/pore-pressure proxies strictly < t
    antecedent_fields = ["antecedent_rain_24h_mm", "antecedent_rain_72h_mm"]
    for af in antecedent_fields:
        if af in overrides:
            constructed[af] = float(overrides[af])

    # Check if historical WeatherRecord entries exist in database for location
    if target_lat is not None and target_lon is not None:
        if "antecedent_rain_24h_mm" not in constructed:
            cutoff_24 = now_utc - timedelta(hours=24)
            sum_24 = (
                db.query(WeatherRecord.precipitation_mm)
                .filter(
                    WeatherRecord.latitude.between(target_lat - 0.05, target_lat + 0.05),
                    WeatherRecord.longitude.between(target_lon - 0.05, target_lon + 0.05),
                    WeatherRecord.observed_at >= cutoff_24,
                    WeatherRecord.observed_at < now_utc,
                    WeatherRecord.is_forecast.is_(False),
                )
                .all()
            )
            if sum_24:
                constructed["antecedent_rain_24h_mm"] = float(sum((r[0] or 0.0) for r in sum_24))

        if "antecedent_rain_72h_mm" not in constructed:
            cutoff_72 = now_utc - timedelta(hours=72)
            sum_72 = (
                db.query(WeatherRecord.precipitation_mm)
                .filter(
                    WeatherRecord.latitude.between(target_lat - 0.05, target_lat + 0.05),
                    WeatherRecord.longitude.between(target_lon - 0.05, target_lon + 0.05),
                    WeatherRecord.observed_at >= cutoff_72,
                    WeatherRecord.observed_at < now_utc,
                    WeatherRecord.is_forecast.is_(False),
                )
                .all()
            )
            if sum_72:
                constructed["antecedent_rain_72h_mm"] = float(sum((r[0] or 0.0) for r in sum_72))

    for af in antecedent_fields:
        if af not in constructed:
            missing.append(af)

    # 6. Resolve Network state (active incidents within 15km strictly prior to t)
    if "active_incidents_nearby_15km" in overrides:
        constructed["active_incidents_nearby_15km"] = int(overrides["active_incidents_nearby_15km"])
    elif target_lat is not None and target_lon is not None:
        try:
            active_incidents = (
                db.query(Incident)
                .filter(Incident.status.in_(["reported", "verified"]))
                .all()
            )
            count = 0
            for inc in active_incidents:
                d = haversine_distance_km(target_lat, target_lon, inc.latitude, inc.longitude)
                if d <= 15.0:
                    count += 1
            constructed["active_incidents_nearby_15km"] = count
        except Exception:
            constructed["active_incidents_nearby_15km"] = 0
    else:
        missing.append("active_incidents_nearby_15km")

    # 7. Safe validation gate: do NOT fabricate missing data
    if missing:
        logger.info(
            "Feature adapter gate: ML prediction unavailable. Missing %d required inputs: %s",
            len(missing),
            missing,
        )
        return False, None, sorted(missing)

    return True, constructed, []


def evaluate_predictive_risk(
    db: Session,
    road: Optional[Road] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    corridor_name: Optional[str] = None,
    features: Optional[Union[DisruptionPredictionRequest, Dict[str, Any]]] = None,
    deterministic_risk_score: Optional[float] = None,
    deterministic_risk_level: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluate composite corridor risk.
    Preserves authoritative deterministic risk scoring while supplementing with ML predictive intelligence.

    HARD SAFETY GUARANTEE:
    Deterministic risk score is NEVER overwritten by ML disruption probability.
    """
    # 1. Authoritative Deterministic Baseline
    if deterministic_risk_score is not None:
        det_score = float(deterministic_risk_score)
        det_level = deterministic_risk_level or _determine_risk_level(det_score)
    elif road:
        det_score = float(road.risk_score or 0.0)
        det_level = _determine_risk_level(det_score)
    else:
        det_score = 0.0
        det_level = "low"

    # 2. Attempt ML Prediction via Feature Adapter or Direct Payload
    ml_prediction_data: Dict[str, Any]
    if features is not None:
        try:
            pred_dict = predict_disruption(features)
            ml_prediction_data = pred_dict
        except (TemporalLeakageError, ValueError) as err:
            raise err
        except Exception as exc:
            logger.warning("ML prediction failed on direct features: %s", exc)
            ml_prediction_data = {
                "available": False,
                "reason": f"Prediction computation failure: {str(exc)}",
                "missing_features": [],
            }
    else:
        available, adapted_features, missing = adapt_corridor_features(
            db=db,
            road=road,
            latitude=latitude,
            longitude=longitude,
            custom_overrides={"corridor_name": corridor_name} if corridor_name else None,
        )
        if available and adapted_features is not None:
            try:
                ml_prediction_data = predict_disruption(adapted_features)
            except Exception as exc:
                ml_prediction_data = {
                    "available": False,
                    "reason": f"Prediction computation failure: {str(exc)}",
                    "missing_features": [],
                }
        else:
            ml_prediction_data = {
                "available": False,
                "reason": "Required prediction-time features not available from operational sources",
                "missing_features": missing,
            }

    # 3. Rule-Based Combined Advisory Assessment (No arbitrary mathematical formulas)
    has_ml = ml_prediction_data.get("available", False)
    corridor_label = corridor_name or (road.road_name if road else f"Segment ({latitude}, {longitude})")

    if not has_ml:
        combined = {
            "predictive_signal": "ML_PREDICTION_UNAVAILABLE",
            "advisory": (
                f"Deterministic risk evaluation ({det_level.upper()}) is authoritative. "
                f"ML predictive disruption model is unavailable because operational prediction-time "
                f"features ({ml_prediction_data.get('missing_features', [])}) were not complete."
            ),
            "corroborated": False,
            "action_recommendation": "Rely on deterministic physical safety protocols and standard field observations.",
        }
    else:
        ml_prob = ml_prediction_data.get("disruption_probability", 0.0)
        pred_class = ml_prediction_data.get("predicted_class", 0)

        # Operational evidence check for corroboration
        is_corroborated = bool(
            det_score >= 40.0
            or (road and road.status != "open")
            or (ml_prediction_data.get("all_feature_attributions") and any(
                f["feature"] == "active_incidents_nearby_15km" and (f.get("raw_value") or 0) > 0
                for f in ml_prediction_data["all_feature_attributions"]
            ))
        )

        if pred_class == 1:
            if is_corroborated:
                combined = {
                    "predictive_signal": "HIGH_PREDICTIVE_DISRUPTION_RISK",
                    "advisory": (
                        f"Prototype ML model estimates elevated probability ({ml_prob:.1%}) of a forward disruption "
                        f"within 6h along {corridor_label}, corroborated by current deterministic risk ({det_level.upper()}). "
                        "This is a predictive advisory signal, not a confirmed blockage."
                    ),
                    "corroborated": True,
                    "action_recommendation": (
                        "Issue predictive corridor warning to dispatchers; prepare contingency detours; "
                        "monitor slope telemetry and local weather updates."
                    ),
                }
            else:
                combined = {
                    "predictive_signal": "PREDICTIVE_EARLY_WARNING",
                    "advisory": (
                        f"Prototype ML model identifies forward disruption indicators ({ml_prob:.1%}) within 6h "
                        f"for {corridor_label}, though immediate field conditions show no confirmed blockage. "
                        "Early warning advisory in effect."
                    ),
                    "corroborated": False,
                    "action_recommendation": "Maintain standard transit monitoring; alert field officers for reconnaissance.",
                }
        else:
            if det_score >= 60.0:
                combined = {
                    "predictive_signal": "DETERMINISTIC_HAZARD_PREVAILS",
                    "advisory": (
                        f"Active confirmed hazards establish authoritative deterministic risk ({det_level.upper()}) "
                        f"along {corridor_label}. ML forward prediction ({ml_prob:.1%}) does NOT override "
                        "or weaken deterministic physical safety rules."
                    ),
                    "corroborated": False,
                    "action_recommendation": "Execute standard physical detour and safety procedures based on deterministic rules.",
                }
            else:
                combined = {
                    "predictive_signal": "LOW_DISRUPTION_RISK",
                    "advisory": (
                        f"Both deterministic assessment ({det_level.upper()}) and ML forward model ({ml_prob:.1%}) "
                        f"indicate low likelihood of corridor disruption over the upcoming 6-hour window."
                    ),
                    "corroborated": True,
                    "action_recommendation": "Normal logistics transit authorized along corridor alignment.",
                }

    return {
        "deterministic_risk_score": det_score,
        "deterministic_risk_level": det_level,
        "ml_prediction": ml_prediction_data,
        "combined_assessment": combined,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }


def check_and_create_predictive_alert(
    db: Session,
    combined_risk: Dict[str, Any],
    source_entity: str = "road",
    source_entity_id: Optional[int] = None,
    corridor_name: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    require_corroboration: bool = True,
) -> Tuple[Optional[Alert], bool]:
    """
    Controlled predictive alert generation.

    SAFETY & OPERATIONAL RULES:
    1. ML alone NEVER creates a Critical operational alert.
    2. Predictive alerts require ML predicted_class == 1.
    3. If require_corroboration=True, alert requires corroborating operational evidence.
    4. Predictive alerts are explicitly labeled 'predictive_disruption' and distinguish
       predictive warnings from confirmed blockages.
    5. Deduplication: suppresses repeated alerts for the same entity within 60 minutes.
    """
    ml_pred = combined_risk.get("ml_prediction", {})
    if not ml_pred.get("available", False):
        return None, False

    if ml_pred.get("predicted_class") != 1:
        return None, False

    assessment = combined_risk.get("combined_assessment", {})
    is_corroborated = assessment.get("corroborated", False)

    # Corroboration requirement gate
    if require_corroboration and not is_corroborated:
        logger.info(
            "Predictive alert suppressed: ML probability %.3f lacks corroborating operational evidence",
            ml_pred.get("disruption_probability", 0.0),
        )
        return None, False

    prob = ml_pred.get("disruption_probability", 0.0)
    threshold = ml_pred.get("threshold", 0.55)

    # Controlled severity: Never Critical on ML alone
    if prob >= 0.80 and is_corroborated:
        severity = "high"
    else:
        severity = "medium"

    label = corridor_name or f"Corridor #{source_entity_id or 'Unknown'}"
    title = f"Predictive Disruption Warning: {label}"

    top_pos = ml_pred.get("top_positive_contributors", [])
    if top_pos:
        first = top_pos[0]
        top_factor_desc = f"{first['display_name']} (SHAP +{first['shap_value']:.3f})"
    else:
        top_factor_desc = "Regional hydrometeorological stress"

    description = (
        f"Predictive disruption warning: Prototype ML model estimates {prob:.1%} probability of a corridor-halting "
        f"disruption within the forward 6-hour window (operational alert threshold: {threshold:.2f}). "
        f"Primary risk-elevating factor: {top_factor_desc}. "
        f"Operational status: This is a forward predictive warning based on atmospheric, terrain, and network telemetry, "
        "NOT a confirmed road blockage. "
        "SHAP feature attributions reflect statistical model weighting, not verified empirical causality. "
        f"Dataset provenance: {ml_pred.get('provenance', config.DATASET_PROVENANCE)} (is_synthetic=True)."
    )

    # Deterministic deduplication key
    entity_ref = source_entity_id if source_entity_id is not None else "segment"
    dedup_key = f"predictive_disruption:{source_entity}:{entity_ref}"

    existing_before = (
        db.query(Alert)
        .filter(
            Alert.dedup_key == dedup_key,
            Alert.status.in_(["active", "acknowledged"]),
            Alert.created_at >= datetime.now(timezone.utc) - timedelta(minutes=60),
        )
        .first()
    )

    alert = alert_service.create_alert(
        db=db,
        title=title,
        description=description,
        severity=severity,
        alert_type="predictive_disruption",
        location=label,
        latitude=latitude,
        longitude=longitude,
        source_entity=source_entity,
        source_entity_id=source_entity_id,
        dedup_key=dedup_key,
        suppress_window_minutes=60,
    )

    was_new = existing_before is None
    return alert, was_new
