"""
Pydantic Schemas for NEXUS-NER ML Disruption Prediction and Feature Attribution (Phase 6D).
Defines request validation with strict anti-leakage safeguards, and structured
explainability response models in model probability space.
"""

from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

from app.ml import config

FORBIDDEN_LEAKAGE_KEYS = set(config.FORBIDDEN_LEAKAGE_COLUMNS) | {
    config.TARGET_COLUMN,
    "disruption_within_6h",
    "actual_rain_next_6h",
    "actual_weather_next_6h",
    "status",
    "road_status",
    "risk_score",
    "incident_id",
    "disruption_duration_hours",
    "is_disrupted_now",
}


class DisruptionPredictionRequest(BaseModel):
    """
    Validated request payload for corridor disruption prediction.
    Enforces strict pre-prediction temporal boundaries with zero data leakage.
    """
    model_config = ConfigDict(extra="forbid")

    # Atmospheric features at observation time t
    curr_precip_mm: float = Field(
        ...,
        ge=0.0,
        le=500.0,
        description="Observed surface precipitation at t (preceding 1h sum in mm)",
    )
    forecast_rain_6h_sum_mm: float = Field(
        ...,
        ge=0.0,
        le=1000.0,
        description="Projected cumulative forecasted rain over forward 6h window [t, t+6h] (mm)",
    )
    forecast_rain_max_intensity_mm: float = Field(
        ...,
        ge=0.0,
        le=300.0,
        description="Peak 1-hour projected forecast rain intensity in [t, t+6h] (mm/h)",
    )
    forecast_precip_prob_max: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Maximum forecast precipitation probability in [t, t+6h] (%)",
    )
    wind_speed_kmh: float = Field(
        ...,
        ge=0.0,
        le=250.0,
        description="Sustained surface horizontal wind speed at t (km/h)",
    )
    wind_gust_kmh: float = Field(
        ...,
        ge=0.0,
        le=350.0,
        description="Peak instantaneous surface wind gust at t (km/h)",
    )
    visibility_km: float = Field(
        ...,
        ge=0.0,
        le=50.0,
        description="Atmospheric horizontal visibility at t (km)",
    )
    severe_weather_flag: int = Field(
        ...,
        ge=0,
        le=1,
        description="Binary meteorological flag for convective storm / cloudburst (0 or 1)",
    )

    # Antecedent hydrological saturation (strictly prior to t)
    antecedent_rain_24h_mm: float = Field(
        ...,
        ge=0.0,
        le=2000.0,
        description="Antecedent precipitation over [t-24h, t] (soil moisture saturation proxy)",
    )
    antecedent_rain_72h_mm: float = Field(
        ...,
        ge=0.0,
        le=3000.0,
        description="Antecedent precipitation over [t-72h, t] (deep pore-pressure proxy)",
    )

    # Topographical and structural features
    elevation_m: float = Field(
        ...,
        ge=0.0,
        le=9000.0,
        description="Corridor altitude above sea level in meters",
    )
    slope_angle_deg: float = Field(
        ...,
        ge=0.0,
        le=90.0,
        description="Roadside cut-slope gradient in degrees",
    )
    terrain_type: Literal["Plain", "Foothill", "Steep Ghat", "High Mountain Ridge"] = Field(
        ...,
        description="Geomorphological terrain classification along corridor segment",
    )
    road_class: Literal["national_highway", "state_highway", "arterial"] = Field(
        ...,
        description="Highway engineering classification",
    )
    historical_vulnerability_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Baseline structural geotechnical vulnerability score [0.0 - 1.0]",
    )

    # Temporal cyclical features
    is_monsoon_season: int = Field(
        ...,
        ge=0,
        le=1,
        description="Binary South-West monsoon indicator: June to September (0 or 1)",
    )
    month_of_year: int = Field(
        ...,
        ge=1,
        le=12,
        description="Calendar month of observation (1-12)",
    )
    hour_of_day: int = Field(
        ...,
        ge=0,
        le=23,
        description="Diurnal observation hour in 24h format (0-23)",
    )

    # Historical network state (strictly prior to t)
    active_incidents_nearby_15km: int = Field(
        ...,
        ge=0,
        le=100,
        description="Verified active incidents within 15km prior to t",
    )

    # Request options
    top_k: Optional[int] = Field(
        default=5,
        ge=1,
        le=24,
        description="Number of top positive and negative SHAP attribution features to return",
    )

    @model_validator(mode="before")
    @classmethod
    def check_forbidden_leakage(cls, data: Any) -> Any:
        """Reject any target or post-event leakage columns with validation error."""
        if isinstance(data, dict):
            detected = [k for k in data.keys() if k in FORBIDDEN_LEAKAGE_KEYS]
            if detected:
                raise ValueError(
                    f"CRITICAL LEAKAGE DETECTED: Forbidden column(s) {detected} are not allowed in prediction requests. "
                    "These variables represent post-event outcomes or future ground truth."
                )
        return data


class FeatureAttributionItem(BaseModel):
    """Detailed SHAP feature attribution element."""
    feature: str = Field(..., description="Feature identifier in model input matrix")
    display_name: str = Field(..., description="Human-readable feature name")
    unit: str = Field(default="", description="Physical engineering unit of measure")
    transformed_value: Optional[float] = Field(default=None, description="Standardized or one-hot numerical value")
    raw_value: Optional[Union[float, int, str, bool]] = Field(default=None, description="Original raw domain value")
    shap_value: float = Field(..., description="SHAP attribution value in model probability space")
    direction: str = Field(..., description="'increases_disruption_probability' or 'decreases_disruption_probability'")
    magnitude: float = Field(..., description="Absolute magnitude of SHAP contribution |phi_i|")
    physical_interpretation: str = Field(..., description="Domain-specific physical explanation")


class AdditiveConsistencyDetail(BaseModel):
    """Proof of exact SHAP additive consistency in probability space."""
    reconstructed_probability: float = Field(..., description="base_value + sum(shap_values)")
    absolute_error: float = Field(..., description="|reconstructed - predicted|")
    is_exact: bool = Field(..., description="True if |error| < 1e-4")


class PredictionDetail(BaseModel):
    """Statistical prediction results from trained model."""
    predicted_probability: float = Field(..., description="Model disruption probability P(disruption | x)")
    disruption_probability: float = Field(..., description="Alias for predicted_probability")
    threshold: float = Field(..., description="Operational decision threshold (tau* = 0.55)")
    operational_threshold: float = Field(..., description="Alias for threshold")
    predicted_class: int = Field(..., description="Binary prediction: 1 if P >= threshold else 0")
    is_disrupted: bool = Field(..., description="Boolean flag: True if predicted_class == 1")
    risk_tier: str = Field(..., description="Operational risk tier: CRITICAL, HIGH, ELEVATED, LOW")
    base_value: float = Field(..., description="SHAP base prior value E[f(x)] across training distribution")
    explained_output_space: str = Field(default="probability_space", description="Probability space attribution")
    additive_consistency: Optional[AdditiveConsistencyDetail] = None


class ExplanationDetail(BaseModel):
    """Comprehensive explainability breakdown."""
    output_space: str = Field(default="probability_space", description="SHAP evaluation output space")
    base_value: float = Field(..., description="Baseline expected value E[f(x)]")
    top_positive_contributors: List[FeatureAttributionItem] = Field(
        default_factory=list,
        description="Top features driving disruption probability upward",
    )
    top_negative_contributors: List[FeatureAttributionItem] = Field(
        default_factory=list,
        description="Top features mitigating disruption probability downward",
    )
    all_feature_attributions: Optional[List[FeatureAttributionItem]] = Field(
        default=None,
        description="Full feature attribution breakdown across all 24 transformed dimensions",
    )
    narrative: str = Field(..., description="Human-readable non-causal attribution summary")
    human_readable_explanation: str = Field(..., description="Alias for narrative")
    additive_consistency: AdditiveConsistencyDetail = Field(
        ...,
        description="Proof of exact additive consistency",
    )


class DisruptionPredictionResponse(BaseModel):
    """Complete response payload for POST /ml/predict-disruption."""
    model_name: str = Field(..., description="Trained classification model name")
    model_version: str = Field(..., description="Model release version")
    dataset_version: str = Field(..., description="Training dataset version")
    provenance: str = Field(..., description="Dataset provenance tag")
    is_synthetic: bool = Field(default=True, description="Data honesty flag")
    prediction: PredictionDetail = Field(..., description="Classification probability and decision")
    explanation: ExplanationDetail = Field(..., description="SHAP probability-space attribution")
    data_honesty_notice: str = Field(..., description="Mandatory prototype data honesty disclaimer")


class ModelMetadataResponse(BaseModel):
    """Metadata response for model information endpoints."""
    model_version: str
    primary_model: str
    baseline_model: str
    target_variable: str
    prediction_horizon_hours: int
    provenance: str
    is_synthetic: bool
    data_honesty_notice: str
    operational_thresholds: Dict[str, float]
    features: Dict[str, Any]
    trained_at: Optional[str] = None


class MLPredictionSignal(BaseModel):
    """Predictive disruption signal extracted from model."""
    available: bool = Field(..., description="Whether model inference was successfully executed")
    disruption_probability: Optional[float] = Field(default=None, description="Predicted probability P(disruption | x)")
    probability: Optional[float] = Field(default=None, description="Alias for disruption_probability")
    threshold: Optional[float] = Field(default=None, description="Calibrated operational threshold (0.55)")
    predicted_class: Optional[int] = Field(default=None, description="Binary decision: 1 if P >= threshold else 0")
    is_disrupted: Optional[bool] = Field(default=None, description="True if predicted_class == 1")
    risk_tier: Optional[str] = Field(default=None, description="Operational risk tier: CRITICAL, HIGH, ELEVATED, LOW")
    risk_signal: Optional[str] = Field(default=None, description="DISRUPTION_LIKELY or DISRUPTION_UNLIKELY")
    model_version: Optional[str] = Field(default=None, description="Model release version")
    dataset_version: Optional[str] = Field(default=None, description="Dataset release version")
    provenance: Optional[str] = Field(default=None, description="Dataset provenance tag")
    is_synthetic: Optional[bool] = Field(default=None, description="Data honesty flag")
    top_positive_contributors: Optional[List[FeatureAttributionItem]] = Field(default=None, description="Top positive SHAP features")
    top_negative_contributors: Optional[List[FeatureAttributionItem]] = Field(default=None, description="Top negative SHAP features")
    narrative: Optional[str] = Field(default=None, description="Human-readable non-causal attribution text")
    missing_features: Optional[List[str]] = Field(default=None, description="List of required features unavailable at prediction time")
    reason: Optional[str] = Field(default=None, description="Explanation for unavailable prediction")


class CombinedRiskAssessment(BaseModel):
    """Rule-based advisory interpretation combining authoritative deterministic risk and ML prediction."""
    predictive_signal: str = Field(..., description="Categorical predictive risk signal")
    advisory: str = Field(..., description="Operational guidance distinguishing prediction from confirmed events")
    corroborated: bool = Field(..., description="Whether ML signal is corroborated by operational evidence")
    action_recommendation: Optional[str] = Field(default=None, description="Actionable recommendation for control operator")


class PredictiveRiskResult(BaseModel):
    """Comprehensive composite risk assessment preserving deterministic risk as authoritative."""
    deterministic_risk_score: float = Field(..., description="Authoritative deterministic risk score [0 - 100]")
    deterministic_risk_level: str = Field(..., description="Deterministic risk classification (low, medium, high, critical)")
    ml_prediction: MLPredictionSignal = Field(..., description="Predictive ML signal and SHAP breakdown")
    combined_assessment: CombinedRiskAssessment = Field(..., description="Rule-based advisory interpretation")
    alert_created: Optional[bool] = Field(default=False, description="Whether a predictive alert was generated")
    alert_id: Optional[int] = Field(default=None, description="ID of generated or deduplicated alert")
    evaluated_at: str = Field(..., description="Evaluation timestamp in ISO 8601 format")


class CorridorPredictiveRiskRequest(BaseModel):
    """Request payload for corridor-level predictive risk evaluation."""
    model_config = ConfigDict(extra="forbid")

    road_id: Optional[int] = Field(default=None, description="Target road ID in database")
    latitude: Optional[float] = Field(default=None, ge=20.0, le=30.0, description="Latitude inside NER bounds [20.0, 30.0]")
    longitude: Optional[float] = Field(default=None, ge=88.0, le=98.0, description="Longitude inside NER bounds [88.0, 98.0]")
    corridor_name: Optional[str] = Field(default=None, description="Human-readable corridor or highway name")
    features: Optional[DisruptionPredictionRequest] = Field(default=None, description="Explicit 19 pre-prediction features")
    generate_alert: bool = Field(default=False, description="Whether to generate a predictive alert if criteria met")
    require_corroboration: bool = Field(default=True, description="Whether alert generation requires corroborating evidence")

    @model_validator(mode="before")
    @classmethod
    def check_forbidden_leakage(cls, data: Any) -> Any:
        """Reject any target or post-event leakage columns at root level."""
        if isinstance(data, dict):
            detected = [k for k in data.keys() if k in FORBIDDEN_LEAKAGE_KEYS]
            if detected:
                raise ValueError(
                    f"CRITICAL LEAKAGE DETECTED: Forbidden column(s) {detected} are not allowed in predictive risk requests."
                )
        return data
