import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  MapPin,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { PredictiveRiskCard } from "../components/PredictiveRiskCard";
import { mlClient } from "../api/mlClient";
import type { PredictiveRiskResult } from "../types/ml";
import { useAuth } from "../context/AuthContext";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

type RiskItem = {
  id: number;
  road?: string;
  highway?: string;
  state?: string;
  district?: string;
  status?: string;
  risk_score?: number;
  risk_level?: string;
  probability?: number;
  confidence?: number;
  material?: string;
  movement_type?: string;
  latitude?: number;
  longitude?: number;
  surface?: string;
  smoothness?: string;
};

const demoRisks: RiskItem[] = [
  {
    id: 1,
    road: "NH-415",
    highway: "NH-415",
    state: "Arunachal Pradesh",
    district: "Papum Pare",
    risk_score: 82,
    risk_level: "High",
    probability: 0.82,
    confidence: 0.91,
    material: "Rock",
    movement_type: "Landslide",
    latitude: 27.1,
    longitude: 93.6,
    surface: "Paved",
    smoothness: "Poor",
  },
  {
    id: 2,
    road: "NH-6",
    highway: "NH-6",
    state: "Mizoram",
    district: "Aizawl",
    risk_score: 76,
    risk_level: "High",
    probability: 0.76,
    confidence: 0.88,
    material: "Earth",
    movement_type: "Slope movement",
    latitude: 23.7,
    longitude: 92.7,
    surface: "Paved",
    smoothness: "Intermediate",
  },
  {
    id: 3,
    road: "NH-10",
    highway: "NH-10",
    state: "Sikkim",
    district: "East Sikkim",
    risk_score: 68,
    risk_level: "Moderate",
    probability: 0.68,
    confidence: 0.84,
    material: "Debris",
    movement_type: "Rockfall",
    latitude: 27.3,
    longitude: 88.6,
    surface: "Paved",
    smoothness: "Poor",
  },
  {
    id: 4,
    road: "NH-27",
    highway: "NH-27",
    state: "Assam",
    district: "Kamrup",
    risk_score: 43,
    risk_level: "Moderate",
    probability: 0.43,
    confidence: 0.79,
    material: "Earth",
    movement_type: "Flooding",
    latitude: 26.1,
    longitude: 91.7,
    surface: "Paved",
    smoothness: "Good",
  },
  {
    id: 5,
    road: "NH-208",
    highway: "NH-208",
    state: "Tripura",
    district: "West Tripura",
    risk_score: 29,
    risk_level: "Low",
    probability: 0.29,
    confidence: 0.87,
    material: "Earth",
    movement_type: "Minor",
    latitude: 23.8,
    longitude: 91.3,
    surface: "Paved",
    smoothness: "Good",
  },
];

function riskStyle(level?: string) {
  const value = level?.toLowerCase();

  if (value === "critical") {
    return {
      badge: "border-red-500/30 bg-red-500/10 text-red-400",
      bar: "bg-red-500",
    };
  }

  if (value === "high") {
    return {
      badge: "border-orange-500/30 bg-orange-500/10 text-orange-400",
      bar: "bg-orange-500",
    };
  }

  if (value === "moderate") {
    return {
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      bar: "bg-amber-500",
    };
  }

  return {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    bar: "bg-emerald-500",
  };
}

function getRiskLevel(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 65) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

function RoadRisk() {
  const [risks, setRisks] = useState<RiskItem[]>(demoRisks);
  const [selectedRisk, setSelectedRisk] =
    useState<RiskItem | null>(demoRisks[0]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(
    "Using AI risk engine"
  );

  async function loadRisks() {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/risk/`);

      if (!response.ok) {
        throw new Error("Risk endpoint unavailable");
      }

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const normalized = data.map(
          (item: RiskItem, index: number) => {
            const score =
              item.risk_score ??
              (item.probability != null
                ? item.probability * 100
                : 0);

            return {
              ...item,
              id: item.id ?? index + 1,
              risk_score: Math.round(score),
              risk_level:
                item.risk_level || getRiskLevel(score),
            };
          }
        );

        setRisks(normalized);
        setSelectedRisk(normalized[0]);
        setLastUpdated(
          `Updated ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        );
      }
    } catch (error) {
      console.log(
        "Risk API unavailable, showing model demonstration data."
      );
      setLastUpdated("Demo risk model • API ready");
    } finally {
      setLoading(false);
    }
  }

  const [predictiveResult, setPredictiveResult] = useState<PredictiveRiskResult | null>(null);
  const [loadingPredictive, setLoadingPredictive] = useState(false);
  const [predictiveError, setPredictiveError] = useState<string | null>(null);

  const loadPredictiveRisk = useCallback(async (roadId: number, lat?: number, lon?: number) => {
    try {
      setLoadingPredictive(true);
      setPredictiveError(null);
      const data = await mlClient.getPredictiveRisk(roadId, lat, lon);
      setPredictiveResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Predictive risk evaluation unavailable";
      setPredictiveError(msg);
      setPredictiveResult(null);
    } finally {
      setLoadingPredictive(false);
    }
  }, []);

  const { user, getAuthHeader } = useAuth();
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updateRoadStatus = useCallback(
    async (roadId: number, newStatus: string) => {
      try {
        setStatusUpdating(true);
        setStatusMessage(null);

        const response = await fetch(`${API_URL}/roads/${roadId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update road status (${response.status})`);
        }

        const updated = await response.json();

        setRisks((prev) =>
          prev.map((r) =>
            r.id === roadId
              ? {
                  ...r,
                  status: updated.status,
                  risk_score: Math.round(updated.risk_score),
                  risk_level: getRiskLevel(updated.risk_score),
                }
              : r
          )
        );

        setSelectedRisk((prev) =>
          prev && prev.id === roadId
            ? {
                ...prev,
                status: updated.status,
                risk_score: Math.round(updated.risk_score),
                risk_level: getRiskLevel(updated.risk_score),
              }
            : prev
        );

        setStatusMessage({
          type: "success",
          text: `Road status set to "${updated.status}" (Risk: ${Math.round(updated.risk_score)}%).`,
        });

        // Re-evaluate predictive risk if selected
        if (selectedRisk && selectedRisk.id === roadId) {
          loadPredictiveRisk(roadId, selectedRisk.latitude, selectedRisk.longitude);
        }
      } catch (err: any) {
        console.error("Update road status error:", err);
        setStatusMessage({
          type: "error",
          text: err.message || "Failed to update road status.",
        });
      } finally {
        setStatusUpdating(false);
      }
    },
    [getAuthHeader, selectedRisk, loadPredictiveRisk]
  );

  useEffect(() => {
    loadRisks();

    const interval = window.setInterval(loadRisks, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRisk) {
      loadPredictiveRisk(selectedRisk.id, selectedRisk.latitude, selectedRisk.longitude);
    }
  }, [selectedRisk, loadPredictiveRisk]);

  const critical = risks.filter(
    (risk) => (risk.risk_score ?? 0) >= 85
  ).length;

  const high = risks.filter(
    (risk) =>
      (risk.risk_score ?? 0) >= 65 &&
      (risk.risk_score ?? 0) < 85
  ).length;

  const moderate = risks.filter(
    (risk) =>
      (risk.risk_score ?? 0) >= 40 &&
      (risk.risk_score ?? 0) < 65
  ).length;

  const low = risks.filter(
    (risk) => (risk.risk_score ?? 0) < 40
  ).length;

  const averageRisk = useMemo(() => {
    if (!risks.length) return 0;

    return Math.round(
      risks.reduce(
        (sum, item) => sum + (item.risk_score ?? 0),
        0
      ) / risks.length
    );
  }, [risks]);

  const highestRisk = useMemo(() => {
    return [...risks].sort(
      (a, b) =>
        (b.risk_score ?? 0) - (a.risk_score ?? 0)
    )[0];
  }, [risks]);

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <div className="space-y-6 p-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Road Risk Intelligence
              </h2>

              <span className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-400">
                <BrainCircuit size={13} />
                AI Powered
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Predictive road accessibility and disruption risk across
              the North Eastern Region.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRisks}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Risk
          </button>
        </div>

        {/* AI model banner */}
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.08] via-slate-900 to-cyan-500/[0.05] p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-400">
                <BrainCircuit size={24} />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  Predictive Accessibility Engine
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                  Risk scores combine terrain characteristics, historical
                  incidents, road condition indicators and disruption
                  signals to estimate potential logistics impact.
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Model Status
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-sm font-medium text-emerald-400">
                  Operational
                </span>
              </div>

              <p className="mt-1 text-[10px] text-slate-600">
                {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Avg. Risk Score
              </p>

              <ShieldAlert
                size={18}
                className="text-cyan-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {averageRisk}
            </p>

            <div className="mt-2 h-1.5 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${averageRisk}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Critical
              </p>

              <AlertTriangle
                size={18}
                className="text-red-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {critical}
            </p>

            <p className="mt-1 text-xs text-red-400">
              Immediate action
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                High
              </p>

              <TrendingUp
                size={18}
                className="text-orange-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {high}
            </p>

            <p className="mt-1 text-xs text-orange-400">
              Closely monitor
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Moderate
              </p>

              <CloudRain
                size={18}
                className="text-amber-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {moderate}
            </p>

            <p className="mt-1 text-xs text-amber-400">
              Monitor conditions
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Low Risk
              </p>

              <CheckCircle2
                size={18}
                className="text-emerald-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {low}
            </p>

            <p className="mt-1 text-xs text-emerald-400">
              Normal operations
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-3">

          {/* Risk map */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  Risk Distribution Map
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Predicted disruption hotspots across NER
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Low
                </span>

                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Medium
                </span>

                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  High
                </span>
              </div>
            </div>

            <div className="relative h-[440px] overflow-hidden bg-slate-950">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
                  backgroundSize: "35px 35px",
                }}
              />

              <div className="absolute left-[30%] top-[8%] h-[80%] w-[46%] rotate-[-8deg] rounded-[45%] border border-cyan-500/20 bg-cyan-500/[0.025]" />

              {/* roads */}
              <div className="absolute left-[18%] top-[52%] h-px w-[58%] rotate-[-16deg] bg-slate-600/60" />
              <div className="absolute left-[34%] top-[48%] h-px w-[40%] rotate-[30deg] bg-slate-600/60" />
              <div className="absolute left-[38%] top-[65%] h-px w-[37%] rotate-[-5deg] bg-slate-600/60" />

              {/* hotspots */}
              <div className="absolute left-[62%] top-[25%]">
                <div className="relative">
                  <span className="absolute -inset-5 animate-pulse rounded-full bg-red-500/10" />
                  <span className="absolute -inset-3 rounded-full bg-red-500/15" />
                  <span className="relative block h-5 w-5 rounded-full border-2 border-slate-950 bg-red-500" />
                </div>

                <div className="absolute left-7 top-[-5px] whitespace-nowrap">
                  <p className="text-xs font-medium text-slate-300">
                    Arunachal Pradesh
                  </p>
                  <p className="text-[10px] text-red-400">
                    Risk 82
                  </p>
                </div>
              </div>

              <div className="absolute left-[69%] top-[58%]">
                <div className="relative">
                  <span className="absolute -inset-5 animate-pulse rounded-full bg-red-500/10" />
                  <span className="absolute -inset-3 rounded-full bg-red-500/15" />
                  <span className="relative block h-5 w-5 rounded-full border-2 border-slate-950 bg-red-500" />
                </div>

                <div className="absolute left-7 top-[-5px] whitespace-nowrap">
                  <p className="text-xs font-medium text-slate-300">
                    Mizoram
                  </p>
                  <p className="text-[10px] text-red-400">
                    Risk 76
                  </p>
                </div>
              </div>

              <div className="absolute left-[54%] top-[45%]">
                <div className="relative">
                  <span className="absolute -inset-4 rounded-full bg-amber-400/10" />
                  <span className="relative block h-4 w-4 rounded-full border-2 border-slate-950 bg-amber-400" />
                </div>

                <div className="absolute left-6 top-[-5px] whitespace-nowrap">
                  <p className="text-xs text-slate-400">
                    Sikkim
                  </p>
                  <p className="text-[10px] text-amber-400">
                    Risk 68
                  </p>
                </div>
              </div>

              <div className="absolute left-[35%] top-[53%]">
                <div className="relative">
                  <span className="relative block h-4 w-4 rounded-full border-2 border-slate-950 bg-amber-400" />
                </div>

                <div className="absolute left-6 top-[-5px] whitespace-nowrap">
                  <p className="text-xs text-slate-400">
                    Assam
                  </p>
                  <p className="text-[10px] text-amber-400">
                    Risk 43
                  </p>
                </div>
              </div>

              <div className="absolute left-[65%] top-[75%]">
                <div className="relative">
                  <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
                </div>

                <div className="absolute left-5 top-[-5px] whitespace-nowrap">
                  <p className="text-xs text-slate-400">
                    Tripura
                  </p>
                  <p className="text-[10px] text-emerald-400">
                    Risk 29
                  </p>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur">
                <div className="flex items-center gap-2">
                  <MapPin
                    size={14}
                    className="text-cyan-400"
                  />

                  <span className="text-xs text-slate-400">
                    AI Risk Heatmap
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Highest risk */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70">
            <div className="border-b border-slate-800 px-5 py-4">
              <h3 className="font-semibold text-white">
                Highest Risk Corridor
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Priority area for operator review
              </p>
            </div>

            {highestRisk && (
              <div className="p-5">
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-red-500/10 p-2.5 text-red-400">
                      <AlertTriangle size={20} />
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${riskStyle(
                        highestRisk.risk_level
                      ).badge}`}
                    >
                      {highestRisk.risk_level}
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold text-white">
                    {highestRisk.risk_score}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Risk score / 100
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        riskStyle(highestRisk.risk_level).bar
                      }`}
                      style={{
                        width: `${highestRisk.risk_score ?? 0}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-200">
                      {highestRisk.road ||
                        highestRisk.highway ||
                        "High Risk Corridor"}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} />
                      {highestRisk.district},{" "}
                      {highestRisk.state}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-[10px] text-slate-600">
                        Probability
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {Math.round(
                          (highestRisk.probability ??
                            (highestRisk.risk_score ?? 0) / 100) *
                            100
                        )}
                        %
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-[10px] text-slate-600">
                        Confidence
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {Math.round(
                          (highestRisk.confidence ?? 0.9) * 100
                        )}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRisk(highestRisk)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-400"
                >
                  View Risk Analysis
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Predictive Disruption Intelligence for Selected Corridor */}
        {selectedRisk && (
          <PredictiveRiskCard
            result={predictiveResult}
            loading={loadingPredictive}
            error={predictiveError}
            onRefresh={() =>
              loadPredictiveRisk(
                selectedRisk.id,
                selectedRisk.latitude,
                selectedRisk.longitude
              )
            }
            roadName={selectedRisk.road || selectedRisk.highway || "Selected Corridor"}
          />
        )}

        {/* Risk table */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-white">
                Road Risk Assessment
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                AI-generated risk scores for monitored road segments
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Route size={14} />
              {risks.length} segments
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 font-medium">
                    Road
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Location
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Risk Score
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Risk Level
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Hazard
                  </th>

                  <th className="px-5 py-3 font-medium">
                    AI Confidence
                  </th>

                  <th className="px-5 py-3 font-medium text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {risks.map((risk) => {
                  const score = risk.risk_score ?? 0;
                  const level =
                    risk.risk_level || getRiskLevel(score);

                  return (
                    <tr
                      key={risk.id}
                      className="transition hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                            <Route size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {risk.road ||
                                risk.highway ||
                                "Road Segment"}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              Segment #{risk.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-300">
                          {risk.district || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {risk.state || "Northeast India"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-white">
                              {score}
                            </span>

                            <span className="text-[10px] text-slate-600">
                              /100
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                riskStyle(level).bar
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  score
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${riskStyle(
                            level
                          ).badge}`}
                        >
                          {level}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <CloudRain
                            size={14}
                            className="text-slate-500"
                          />

                          <span className="text-xs text-slate-300">
                            {risk.movement_type ||
                              "Environmental disruption"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-cyan-400">
                          {Math.round(
                            (risk.confidence ?? 0.85) * 100
                          )}
                          %
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedRisk(risk)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-400"
                        >
                          Analyze
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Model factors */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400">
                <BrainCircuit size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  AI Prediction
                </p>

                <p className="text-xs text-slate-500">
                  Machine learning risk scoring
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Historical landslide and road-condition patterns can be
              combined with current signals to estimate disruption
              probability.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400">
                <CloudRain size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  Weather Signals
                </p>

                <p className="text-xs text-slate-500">
                  Rainfall and environmental conditions
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Weather conditions can increase the probability of
              flooding, landslides and road accessibility degradation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-400">
                <TrendingDown size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-white">
                  Road Condition
                </p>

                <p className="text-xs text-slate-500">
                  Surface and accessibility indicators
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Surface quality, smoothness, terrain and historical
              incidents help identify vulnerable logistics corridors.
            </p>
          </div>
        </div>
      </div>

      {/* Risk details modal */}
      {selectedRisk && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedRisk(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <div className="flex items-center gap-3">
                  <BrainCircuit
                    size={19}
                    className="text-purple-400"
                  />

                  <h3 className="font-semibold text-white">
                    AI Risk Analysis
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {selectedRisk.road ||
                    selectedRisk.highway ||
                    "Road Segment"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRisk(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      Predicted Risk
                    </p>

                    <p className="mt-1 text-4xl font-bold text-white">
                      {selectedRisk.risk_score}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs ${riskStyle(
                      selectedRisk.risk_level
                    ).badge}`}
                  >
                    {selectedRisk.risk_level}
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      riskStyle(selectedRisk.risk_level).bar
                    }`}
                    style={{
                      width: `${selectedRisk.risk_score ?? 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Location
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {selectedRisk.district},{" "}
                    {selectedRisk.state}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Hazard Type
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {selectedRisk.movement_type ||
                      "Environmental disruption"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Material
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {selectedRisk.material || "Not available"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Surface
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {selectedRisk.surface || "Not available"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.05] p-4">
                <div className="flex items-center gap-3">
                  <BrainCircuit
                    size={18}
                    className="text-purple-400"
                  />

                  <div>
                    <p className="text-sm font-medium text-white">
                      AI Recommendation
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Consider alternate routing and increased monitoring
                      for this corridor when the risk score remains
                      elevated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Operator Corridor Status Control */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-cyan-400" />
                    <p className="text-sm font-semibold text-white">
                      Operator Corridor Status Control
                    </p>
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Role: <span className="font-semibold text-slate-300">{user?.role || "GUEST"}</span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Update live corridor operational status to adjust deterministic network risk and recalculate predictive models.
                </p>

                {statusMessage && (
                  <div
                    className={`mt-3 rounded-lg border p-3 text-xs ${
                      statusMessage.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {statusMessage.text}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "open", label: "Open", score: "0%", color: "emerald" },
                    { id: "restricted", label: "Restricted", score: "50%", color: "amber" },
                    { id: "under_repair", label: "Under Repair", score: "70%", color: "orange" },
                    { id: "blocked", label: "Blocked", score: "95%", color: "red" },
                  ].map((st) => {
                    const isActive = (selectedRisk.status || "open").toLowerCase() === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        disabled={statusUpdating}
                        onClick={() => updateRoadStatus(selectedRisk.id, st.id)}
                        className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs transition ${
                          isActive
                            ? st.color === "emerald"
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold"
                              : st.color === "amber"
                              ? "border-amber-500 bg-amber-500/20 text-amber-300 font-semibold"
                              : st.color === "orange"
                              ? "border-orange-500 bg-orange-500/20 text-orange-300 font-semibold"
                              : "border-red-500 bg-red-500/20 text-red-300 font-semibold"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        } disabled:opacity-50`}
                      >
                        <span>{st.label}</span>
                        <span className="mt-0.5 text-[10px] opacity-70">Risk: {st.score}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedRisk.latitude != null &&
                selectedRisk.longitude != null && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={14} />
                    {selectedRisk.latitude},{" "}
                    {selectedRisk.longitude}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoadRisk;