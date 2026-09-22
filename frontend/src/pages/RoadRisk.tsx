import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapErrorBoundary } from "../components/MapErrorBoundary";
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
    id: 135,
    road: "NH-15 Guwahati-Tezpur Corridor",
    highway: "NH-15",
    state: "Assam / Northeast India",
    district: "Darrang / Sonitpur",
    status: "open",
    risk_score: 15,
    risk_level: "Low",
    probability: 0.15,
    confidence: 0.88,
    material: "Earth",
    movement_type: "Normal",
    latitude: 26.40463,
    longitude: 91.925314,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedRisk) {
        setSelectedRisk(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedRisk]);

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
    <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Road Risk Intelligence
              </h2>

              <span className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                <BrainCircuit size={13} />
                AI Powered
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Predictive road accessibility and disruption risk across
              the North Eastern Region.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRisks}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Risk
          </button>
        </div>

        {/* AI model banner */}
        <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-cyan-50 p-5 shadow-sm dark:border-purple-500/20 dark:bg-gradient-to-r dark:from-purple-500/[0.08] dark:via-slate-900 dark:to-cyan-500/[0.05]">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-600 dark:text-purple-400">
                <BrainCircuit size={24} />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Predictive Accessibility Engine
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Risk scores combine terrain characteristics, historical
                  incidents, road condition indicators and disruption
                  signals to estimate potential logistics impact.
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                Model Status
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />

                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Operational
                </span>
              </div>

              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Avg. Risk Score
              </p>

              <ShieldAlert
                size={18}
                className="text-cyan-600 dark:text-cyan-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {averageRisk}
            </p>

            <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400"
                style={{ width: `${averageRisk}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/60 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Critical
              </p>

              <AlertTriangle
                size={18}
                className="text-red-500 dark:text-red-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {critical}
            </p>

            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              Immediate action
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                High
              </p>

              <TrendingUp
                size={18}
                className="text-orange-500 dark:text-orange-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {high}
            </p>

            <p className="mt-1 text-xs font-medium text-orange-600 dark:text-orange-400">
              Closely monitor
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Moderate
              </p>

              <CloudRain
                size={18}
                className="text-amber-500 dark:text-amber-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {moderate}
            </p>

            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              Monitor conditions
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Low Risk
              </p>

              <CheckCircle2
                size={18}
                className="text-emerald-500 dark:text-emerald-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {low}
            </p>

            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Normal operations
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 xl:grid-cols-3">

          {/* Risk map */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70 xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Risk Distribution Map
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Predicted disruption hotspots across NER
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Corridor NH-15 (Open)
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Hazard #15 (Risk 95)
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  Vehicle #472
                </span>
              </div>
            </div>

            <div className="relative h-[440px] overflow-hidden bg-slate-950">
              <MapErrorBoundary fallbackMessage="Road risk GIS map tiles offline">
                <MapContainer
                  center={[26.40, 92.20]}
                  zoom={8}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* NH-15 Monitored Corridor Polyline */}
                  <Polyline
                    positions={[
                      [26.1445, 91.7362],
                      [26.40463, 91.925314],
                      [26.6528, 92.7926],
                    ]}
                    pathOptions={{
                      color: selectedRisk?.status === "blocked" ? "#ef4444" : "#06b6d4",
                      weight: 4,
                      opacity: 0.85,
                      dashArray: selectedRisk?.status === "blocked" ? "6, 6" : undefined,
                    }}
                  />

                  {/* Guwahati Hub */}
                  <CircleMarker
                    center={[26.1445, 91.7362]}
                    radius={7}
                    pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-emerald-500">Guwahati Logistics Hub</strong>
                        <br />Origin Terminal (26.14°N, 91.74°E)
                      </div>
                    </Popup>
                  </CircleMarker>

                  {/* Tezpur Logistics Center */}
                  <CircleMarker
                    center={[26.6528, 92.7926]}
                    radius={7}
                    pathOptions={{ color: "#3b82f6", fillColor: "#2563eb", fillOpacity: 0.9, weight: 2 }}
                  >
                    <Popup>
                      <div className="text-xs">
                        <strong className="text-blue-500">Tezpur Logistics Center</strong>
                        <br />Destination Terminal (26.65°N, 92.79°E)
                      </div>
                    </Popup>
                  </CircleMarker>

                  {/* Critical Landslide Hazard Marker at Kharupetia (Incident #15) */}
                  <CircleMarker
                    center={[26.40463, 91.925314]}
                    radius={16}
                    pathOptions={{
                      color: "#ef4444",
                      fillColor: "#ef4444",
                      fillOpacity: 0.25,
                      weight: 1.5,
                      dashArray: "4 3",
                    }}
                  />
                  <CircleMarker
                    center={[26.40463, 91.925314]}
                    radius={9}
                    pathOptions={{
                      color: "#991b1b",
                      fillColor: "#ef4444",
                      fillOpacity: 0.95,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <strong className="text-red-600 font-bold">Landslide Hazard — Incident #15</strong>
                        <br />NH-15 near Kharupetia (26.40°N, 91.93°E)
                        <br /><strong>Status:</strong> Reported Blockage (Risk 95.0)
                        <br /><strong>Corridor:</strong> NH-15 Guwahati-Tezpur
                      </div>
                    </Popup>
                  </CircleMarker>

                  {/* Active Vehicle Marker: AS-01-BX-4091 */}
                  <CircleMarker
                    center={[26.1445, 91.7362]}
                    radius={14}
                    pathOptions={{
                      color: "#06b6d4",
                      fillColor: "#22d3ee",
                      fillOpacity: 0.2,
                      weight: 1.5,
                    }}
                  />
                  <CircleMarker
                    center={[26.1445, 91.7362]}
                    radius={6}
                    pathOptions={{
                      color: "#0e7490",
                      fillColor: "#06b6d4",
                      fillOpacity: 0.95,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <strong className="text-cyan-600 font-bold">Vehicle #472 (AS-01-BX-4091)</strong>
                        <br />Cargo: Critical Vaccines & Cold-Chain
                        <br />Status: in transit
                      </div>
                    </Popup>
                  </CircleMarker>
                </MapContainer>
              </MapErrorBoundary>

              <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-300">GIS Corridors & Hazard Layer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Highest risk */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Highest Risk Corridor
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Priority area for operator review
              </p>
            </div>

            {highestRisk && (
              <div className="p-5">
                <div className="rounded-xl border border-red-200 bg-red-50/60 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/[0.04]">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-red-500/10 p-2.5 text-red-500 dark:text-red-400">
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

                  <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">
                    {highestRisk.risk_score}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Risk score / 100
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                      {highestRisk.road ||
                        highestRisk.highway ||
                        "High Risk Corridor"}
                    </p>

                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} />
                      {highestRisk.district},{" "}
                      {highestRisk.state}
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                        Probability
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                        {Math.round(
                          (highestRisk.probability ??
                            (highestRisk.risk_score ?? 0) / 100) *
                            100
                        )}
                        %
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                        Confidence
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
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
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:text-cyan-400 cursor-pointer"
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Road Risk Assessment
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                AI-generated risk scores for monitored road segments
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Route size={14} />
              {risks.length} segments
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
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

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {risks.map((risk) => {
                  const score = risk.risk_score ?? 0;
                  const level =
                    risk.risk_level || getRiskLevel(score);

                  return (
                    <tr
                      key={risk.id}
                      className="transition hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-400">
                            <Route size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                              {risk.road ||
                                risk.highway ||
                                "Road Segment"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                              Segment #{risk.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {risk.district || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {risk.state || "Northeast India"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {score}
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-500">
                              /100
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${riskStyle(
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
                            className="text-slate-400"
                          />

                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {risk.movement_type ||
                              "Environmental disruption"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:text-cyan-400 cursor-pointer"
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
                <BrainCircuit size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  AI Prediction
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Machine learning risk scoring
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Historical landslide and road-condition patterns can be
              combined with current signals to estimate disruption
              probability.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">
                <CloudRain size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Weather Signals
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rainfall and environmental conditions
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Weather conditions can increase the probability of
              flooding, landslides and road accessibility degradation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                <TrendingDown size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Road Condition
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Surface and accessibility indicators
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Surface quality, smoothness, terrain and historical
              incidents help identify vulnerable logistics corridors.
            </p>
          </div>
        </div>

      {/* Risk details modal application-level portal */}
      {selectedRisk &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-3 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedRisk(null)}
            role="presentation"
            style={{ zIndex: 99999 }}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 my-auto text-slate-900 dark:text-white"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-risk-modal-title"
              style={{ zIndex: 100000 }}
            >
              {/* Fixed / Sticky Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 py-4 dark:border-slate-800 dark:bg-slate-900 shrink-0">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit
                      size={20}
                      className="text-purple-600 dark:text-purple-400 shrink-0"
                    />

                    <h3 id="ai-risk-modal-title" className="font-semibold text-slate-900 dark:text-white truncate">
                      AI Risk Analysis
                    </h3>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedRisk.road ||
                      selectedRisk.highway ||
                      "Road Segment"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRisk(null)}
                  aria-label="Close AI Risk Analysis modal"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5 break-words">
                {/* Predicted Risk Summary */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Predicted Risk
                      </p>

                      <p className="mt-1 text-4xl font-bold text-slate-900 dark:text-white">
                        {selectedRisk.risk_score}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${riskStyle(
                        selectedRisk.risk_level
                      ).badge}`}
                    >
                      {selectedRisk.risk_level}
                    </span>
                  </div>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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

                {/* Corridor Attributes Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Location
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.district},{" "}
                      {selectedRisk.state}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hazard Type
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.movement_type ||
                        "Environmental disruption"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Material
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.material || "Not available"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Surface
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.surface || "Not available"}
                    </p>
                  </div>
                </div>

                {/* AI Recommendation */}
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.05] p-4">
                  <div className="flex items-center gap-3">
                    <BrainCircuit
                      size={18}
                      className="text-purple-600 dark:text-purple-400 shrink-0"
                    />

                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        AI Recommendation
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        Consider alternate routing and increased monitoring
                        for this corridor when the risk score remains
                        elevated.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operator Corridor Status Control */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-cyan-600 dark:text-cyan-400" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Operator Corridor Status Control
                      </p>
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Role: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.role || "GUEST"}</span>
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Update live corridor operational status to adjust deterministic network risk and recalculate predictive models.
                  </p>

                  {statusMessage && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-xs ${
                        statusMessage.type === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
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
                          className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs transition cursor-pointer ${
                            isActive
                              ? st.color === "emerald"
                                ? "border-emerald-600 bg-emerald-100 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300 ring-2 ring-emerald-500/30 font-bold shadow-sm"
                                : st.color === "amber"
                                ? "border-amber-600 bg-amber-100 text-amber-950 dark:border-amber-500 dark:bg-amber-500/20 dark:text-amber-300 ring-2 ring-amber-500/30 font-bold shadow-sm"
                                : st.color === "orange"
                                ? "border-orange-600 bg-orange-100 text-orange-950 dark:border-orange-500 dark:bg-orange-500/20 dark:text-orange-300 ring-2 ring-orange-500/30 font-bold shadow-sm"
                                : "border-red-600 bg-red-100 text-red-950 dark:border-red-500 dark:bg-red-500/20 dark:text-red-300 ring-2 ring-red-500/30 font-bold shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                          } disabled:opacity-50`}
                        >
                          <span>{st.label}</span>
                          <span className="mt-0.5 text-[10px] opacity-80">Risk: {st.score}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedRisk.latitude != null &&
                  selectedRisk.longitude != null && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={14} />
                      {selectedRisk.latitude},{" "}
                      {selectedRisk.longitude}
                    </div>
                  )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default RoadRisk;