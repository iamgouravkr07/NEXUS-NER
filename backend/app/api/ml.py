"""
ML Disruption Inference & Feature Attribution API Router (Phase 6D).
Exposes the trained Random Forest model with SHAP probability-space feature attribution,
strict pre-prediction validation, zero data leakage, and authenticated RBAC access.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.auth import get_current_user
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.road import Road
from app.ml import config
from app.ml.feature_engineering import TemporalLeakageError
from app.ml.explainability import DisruptionExplainer
from app.schemas.ml import (
    DisruptionPredictionRequest,
    FeatureAttributionItem,
    AdditiveConsistencyDetail,
    PredictionDetail,
    ExplanationDetail,
    DisruptionPredictionResponse,
    ModelMetadataResponse,
    CorridorPredictiveRiskRequest,
    PredictiveRiskResult,
)
from app.services import ml_prediction_service

logger = logging.getLogger("nexus_ner.ml")

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning & Disruption Prediction"],
)

# Application-level cached singleton for DisruptionExplainer
_explainer_instance: Optional[DisruptionExplainer] = None


def get_explainer() -> DisruptionExplainer:
    """
    Retrieve or initialize the DisruptionExplainer singleton.
    Caches model weights and SHAP TreeExplainer in memory to minimize inference latency.
    """
    global _explainer_instance
    if _explainer_instance is None:
        logger.info("Initializing DisruptionExplainer singleton from %s...", config.DEFAULT_RF_MODEL_FILE)
        if not config.DEFAULT_RF_MODEL_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Model artifact not found at {config.DEFAULT_RF_MODEL_FILE}. Please verify model artifacts.",
            )
        _explainer_instance = DisruptionExplainer(model_bundle_path=config.DEFAULT_RF_MODEL_FILE)
    return _explainer_instance


@router.post(
    "/predict-disruption",
    response_model=DisruptionPredictionResponse,
    summary="Predict Corridor Disruption with SHAP Probability-Space Attribution",
    description=(
        "Predicts the probability of a corridor-halting disruption event (landslide, severe flood, "
        "or structural road blockage) within a 6-hour forward horizon [t, t+6h]. "
        "Enforces strict temporal anti-leakage boundaries and returns full additive SHAP attribution."
    ),
)
def predict_corridor_disruption(
    request: DisruptionPredictionRequest,
    current_user: User = Depends(get_current_user),
    explainer: DisruptionExplainer = Depends(get_explainer),
) -> DisruptionPredictionResponse:
    """
    Execute authenticated disruption inference with SHAP explanation.
    """
    try:
        # Convert request to observation dict for DisruptionExplainer
        obs_dict = request.model_dump(exclude={"top_k"})
        top_k = request.top_k or 5

        # Compute prediction and SHAP explanation in probability space
        raw_explanation = explainer.explain_instance(obs_dict, top_k=top_k)

        pred_data = raw_explanation["prediction"]
        consistency_data = pred_data.get("additive_consistency", {})

        consistency_detail = AdditiveConsistencyDetail(
            reconstructed_probability=consistency_data.get("reconstructed_probability", 0.0),
            absolute_error=consistency_data.get("absolute_error", 0.0),
            is_exact=consistency_data.get("is_exact", True),
        )

        prediction_detail = PredictionDetail(
            predicted_probability=pred_data["predicted_probability"],
            disruption_probability=pred_data["predicted_probability"],
            threshold=pred_data["operational_threshold"],
            operational_threshold=pred_data["operational_threshold"],
            predicted_class=pred_data["predicted_class"],
            is_disrupted=bool(pred_data["predicted_class"] == 1),
            risk_tier=pred_data["risk_tier"],
            base_value=pred_data["base_value"],
            explained_output_space=pred_data.get("explained_output_space", "probability_space"),
            additive_consistency=consistency_detail,
        )

        top_pos_items = [
            FeatureAttributionItem(**item)
            for item in raw_explanation.get("top_positive_contributors", [])
        ]
        top_neg_items = [
            FeatureAttributionItem(**item)
            for item in raw_explanation.get("top_negative_contributors", [])
        ]
        all_attributions = [
            FeatureAttributionItem(**item)
            for item in raw_explanation.get("all_feature_attributions", [])
        ]

        explanation_detail = ExplanationDetail(
            output_space="probability_space",
            base_value=pred_data["base_value"],
            top_positive_contributors=top_pos_items,
            top_negative_contributors=top_neg_items,
            all_feature_attributions=all_attributions,
            narrative=raw_explanation.get("human_readable_explanation", ""),
            human_readable_explanation=raw_explanation.get("human_readable_explanation", ""),
            additive_consistency=consistency_detail,
        )

        return DisruptionPredictionResponse(
            model_name="RandomForestClassifier",
            model_version="v1.0",
            dataset_version=config.DATASET_VERSION,
            provenance=config.DATASET_PROVENANCE,
            is_synthetic=config.IS_SYNTHETIC,
            prediction=prediction_detail,
            explanation=explanation_detail,
            data_honesty_notice=config.DATASET_HONESTY_NOTE,
        )

    except TemporalLeakageError as leak_err:
        logger.warning("Temporal leakage detected in inference request: %s", leak_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(leak_err),
        )
    except ValueError as val_err:
        logger.warning("Feature validation error during inference: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Unexpected failure during ML disruption inference: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failure: {str(exc)}",
        )


@router.get(
    "/model-info",
    response_model=Dict[str, Any],
    summary="Get Disruption Prediction Model Metadata & Provenance",
)
@router.get(
    "/metadata",
    response_model=Dict[str, Any],
    include_in_schema=False,
)
def get_model_metadata(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Return persisted architecture, operational thresholds, and data provenance metadata.
    """
    metadata_file = config.DEFAULT_MODEL_METADATA_FILE
    if not metadata_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metadata artifact not found.",
        )
    try:
        with open(metadata_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
        return meta
    except Exception as err:
        logger.error("Failed to load model metadata: %s", err)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read model metadata: {str(err)}",
        )


@router.post(
    "/predict-corridor-risk",
    response_model=PredictiveRiskResult,
    summary="Evaluate Corridor Predictive Disruption Risk with Authoritative Deterministic Baseline",
    description=(
        "Evaluates composite risk for a corridor segment by combining authoritative deterministic risk "
        "with the prototype ML disruption prediction model. Optionally triggers controlled predictive alerts."
    ),
)
def evaluate_corridor_predictive_risk_endpoint(
    request: CorridorPredictiveRiskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictiveRiskResult:
    """
    Execute authenticated corridor predictive risk evaluation.
    """
    try:
        road = None
        if request.road_id is not None:
            road = db.query(Road).filter(Road.id == request.road_id).first()
            if not road:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Road with ID {request.road_id} not found.",
                )

        target_lat = request.latitude or (road.latitude if road else None)
        target_lon = request.longitude or (road.longitude if road else None)
        target_name = request.corridor_name or (road.road_name if road else None)

        # Evaluate predictive risk
        result = ml_prediction_service.evaluate_predictive_risk(
            db=db,
            road=road,
            latitude=target_lat,
            longitude=target_lon,
            corridor_name=target_name,
            features=request.features,
        )

        alert_created = False
        alert_id = None
        if request.generate_alert:
            alert, was_new = ml_prediction_service.check_and_create_predictive_alert(
                db=db,
                combined_risk=result,
                source_entity="road" if road else "corridor",
                source_entity_id=road.id if road else None,
                corridor_name=target_name,
                latitude=target_lat,
                longitude=target_lon,
                require_corroboration=request.require_corroboration,
            )
            if alert:
                alert_created = was_new
                alert_id = alert.id

        result["alert_created"] = alert_created
        result["alert_id"] = alert_id
        return PredictiveRiskResult(**result)

    except TemporalLeakageError as leak_err:
        logger.warning("Temporal leakage in corridor predictive risk request: %s", leak_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(leak_err),
        )
    except ValueError as val_err:
        logger.warning("Validation error in corridor predictive risk request: %s", val_err)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Unexpected failure evaluating corridor predictive risk: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Corridor risk evaluation failure: {str(exc)}",
        )
