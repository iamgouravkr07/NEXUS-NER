/**
 * TypeScript Interfaces for NEXUS-NER ML Disruption Prediction and TreeSHAP Explainability (Phase 6F).
 * Mirrors backend Pydantic schemas in `backend/app/schemas/ml.py` exactly.
 */

export interface FeatureAttributionItem {
  feature: string;
  display_name: string;
  unit: string;
  transformed_value?: number | null;
  raw_value?: number | string | boolean | null;
  shap_value: number; // probability-space delta
  direction: "increases_disruption_probability" | "decreases_disruption_probability" | string;
  magnitude: number;
  physical_interpretation: string;
}

export interface AdditiveConsistencyDetail {
  reconstructed_probability: number;
  absolute_error: number;
  is_exact: boolean;
}

export interface PredictionDetail {
  predicted_probability: number;
  disruption_probability: number;
  threshold: number;
  operational_threshold: number;
  predicted_class: number;
  is_disrupted: boolean;
  risk_tier: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW" | string;
  base_value: number;
  explained_output_space: string;
  additive_consistency?: AdditiveConsistencyDetail | null;
}

export interface ExplanationDetail {
  output_space: string;
  base_value: number;
  top_positive_contributors: FeatureAttributionItem[];
  top_negative_contributors: FeatureAttributionItem[];
  all_feature_attributions?: FeatureAttributionItem[] | null;
  narrative: string;
  human_readable_explanation: string;
  additive_consistency: AdditiveConsistencyDetail;
}

export interface DisruptionPredictionResponse {
  model_name: string;
  model_version: string;
  dataset_version: string;
  provenance: string;
  is_synthetic: boolean;
  prediction: PredictionDetail;
  explanation: ExplanationDetail;
  data_honesty_notice: string;
}

export interface ModelMetadataResponse {
  model_version: string;
  primary_model: string;
  baseline_model: string;
  target_variable: string;
  prediction_horizon_hours: number;
  provenance: string;
  is_synthetic: boolean;
  data_honesty_notice: string;
  operational_thresholds: Record<string, number>;
  features: Record<string, unknown>;
  trained_at?: string | null;
}

export interface MLPredictionSignal {
  available: boolean;
  disruption_probability?: number | null;
  probability?: number | null;
  threshold?: number | null;
  predicted_class?: number | null;
  is_disrupted?: boolean | null;
  risk_tier?: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW" | string | null;
  risk_signal?: "DISRUPTION_LIKELY" | "DISRUPTION_UNLIKELY" | string | null;
  model_version?: string | null;
  dataset_version?: string | null;
  provenance?: string | null;
  is_synthetic?: boolean | null;
  top_positive_contributors?: FeatureAttributionItem[] | null;
  top_negative_contributors?: FeatureAttributionItem[] | null;
  narrative?: string | null;
  missing_features?: string[] | null;
  reason?: string | null;
}

export interface CombinedRiskAssessment {
  predictive_signal:
    | "ELEVATED_CONFIRMED_AND_PREDICTIVE_RISK"
    | "PREDICTIVE_DISRUPTION_RISK_ELEVATED"
    | "HIGH_DETERMINISTIC_RISK"
    | "CORRIDOR_CLEAR"
    | "DETERMINISTIC_RISK_ONLY"
    | "CORRIDOR_CLEAR_ML_UNAVAILABLE"
    | string;
  advisory: string;
  corroborated: boolean;
  action_recommendation?: string | null;
}

export interface PredictiveRiskResult {
  deterministic_risk_score: number;
  deterministic_risk_level: "critical" | "high" | "moderate" | "medium" | "low" | string;
  ml_prediction: MLPredictionSignal;
  combined_assessment: CombinedRiskAssessment;
  alert_created?: boolean;
  alert_id?: number | null;
  evaluated_at: string;
}

export interface CorridorPredictiveRiskRequest {
  road_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  corridor_name?: string | null;
  generate_alert?: boolean;
  require_corroboration?: boolean;
}

/**
 * Human-readable mapping for CombinedRiskAssessment signals.
 */
export function formatPredictiveSignalLabel(signal?: string): string {
  switch (signal) {
    case "HIGH_PREDICTIVE_DISRUPTION_RISK":
      return "High Predictive Disruption Risk";
    case "PREDICTIVE_EARLY_WARNING":
      return "Predictive Early Warning";
    case "DETERMINISTIC_HAZARD_PREVAILS":
      return "Deterministic Hazard Prevails";
    case "LOW_DISRUPTION_RISK":
      return "Low Disruption Risk (Corridor Clear)";
    case "ML_PREDICTION_UNAVAILABLE":
      return "Operational Risk Only (ML Unavailable)";
    case "ELEVATED_CONFIRMED_AND_PREDICTIVE_RISK":
      return "Confirmed + Predictive Risk";
    case "PREDICTIVE_DISRUPTION_RISK_ELEVATED":
      return "Predictive Disruption Risk Elevated";
    case "HIGH_DETERMINISTIC_RISK":
      return "Elevated Operational Risk (ML Normal)";
    case "CORRIDOR_CLEAR":
      return "Corridor Clear";
    case "DETERMINISTIC_RISK_ONLY":
      return "Operational Risk Only (ML Unavailable)";
    case "CORRIDOR_CLEAR_ML_UNAVAILABLE":
      return "Operational Risk Clear — ML Unavailable";
    default:
      return signal ? signal.replace(/_/g, " ") : "Unknown";
  }
}

/**
 * Styling helper for CombinedRiskAssessment signal badges.
 */
export function getPredictiveSignalBadgeStyle(signal?: string): {
  badge: string;
  text: string;
  dot: string;
} {
  switch (signal) {
    case "HIGH_PREDICTIVE_DISRUPTION_RISK":
    case "ELEVATED_CONFIRMED_AND_PREDICTIVE_RISK":
      return {
        badge: "border-red-500/30 bg-red-500/10 text-red-300",
        text: "text-red-400",
        dot: "bg-red-500",
      };
    case "PREDICTIVE_EARLY_WARNING":
    case "PREDICTIVE_DISRUPTION_RISK_ELEVATED":
      return {
        badge: "border-purple-500/30 bg-purple-500/10 text-purple-300",
        text: "text-purple-400",
        dot: "bg-purple-500",
      };
    case "DETERMINISTIC_HAZARD_PREVAILS":
    case "HIGH_DETERMINISTIC_RISK":
      return {
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        text: "text-amber-400",
        dot: "bg-amber-500",
      };
    case "LOW_DISRUPTION_RISK":
    case "CORRIDOR_CLEAR":
      return {
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        text: "text-emerald-400",
        dot: "bg-emerald-500",
      };
    case "ML_PREDICTION_UNAVAILABLE":
    case "DETERMINISTIC_RISK_ONLY":
    case "CORRIDOR_CLEAR_ML_UNAVAILABLE":
    default:
      return {
        badge: "border-slate-700 bg-slate-800/60 text-slate-300",
        text: "text-slate-400",
        dot: "bg-slate-500",
      };
  }
}
