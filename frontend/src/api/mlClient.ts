/**
 * NEXUS-NER ML API Client (Phase 6F).
 * Connects to Phase 6D and Phase 6E backend ML endpoints:
 * - GET  /risk/corridor/{road_id}/predictive
 * - POST /ml/predict-corridor-risk
 * - GET  /ml/model-info
 * - GET  /ml/metadata
 */

import type {
  PredictiveRiskResult,
  CorridorPredictiveRiskRequest,
  ModelMetadataResponse,
} from "../types/ml";

function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    if (envUrl) return envUrl.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000";
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof localStorage !== "undefined") {
    const token = localStorage.getItem("nexus_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export const mlClient = {
  /**
   * Fetch live combined predictive risk for a monitored corridor.
   * Calls GET /risk/corridor/{road_id}/predictive
   */
  async getPredictiveRisk(
    roadId: number,
    latitude?: number | null,
    longitude?: number | null
  ): Promise<PredictiveRiskResult> {
    const baseUrl = getApiUrl();
    let url = `${baseUrl}/risk/corridor/${roadId}/predictive`;
    const params = new URLSearchParams();
    if (latitude != null) params.append("latitude", latitude.toString());
    if (longitude != null) params.append("longitude", longitude.toString());
    const query = params.toString();
    if (query) url += `?${query}`;

    const res = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Predictive risk service returned HTTP ${res.status}`
      );
    }

    return (await res.json()) as PredictiveRiskResult;
  },

  /**
   * Evaluate predictive risk using custom corridor overrides.
   * Calls POST /ml/predict-corridor-risk
   */
  async predictCorridorRisk(
    request: CorridorPredictiveRiskRequest
  ): Promise<PredictiveRiskResult> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/ml/predict-corridor-risk`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Predictive risk calculation returned HTTP ${res.status}`
      );
    }

    return (await res.json()) as PredictiveRiskResult;
  },

  /**
   * Fetch ML model architecture and operational metadata.
   * Calls GET /ml/model-info
   */
  async getModelInfo(): Promise<ModelMetadataResponse> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/ml/model-info`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Model info endpoint returned HTTP ${res.status}`
      );
    }

    return (await res.json()) as ModelMetadataResponse;
  },

  /**
   * Fetch full dataset provenance and operational threshold metadata.
   * Calls GET /ml/metadata
   */
  async getMetadata(): Promise<ModelMetadataResponse> {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/ml/metadata`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Metadata endpoint returned HTTP ${res.status}`
      );
    }

    return (await res.json()) as ModelMetadataResponse;
  },
};
