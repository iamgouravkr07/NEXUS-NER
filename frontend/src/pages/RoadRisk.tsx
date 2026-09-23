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
import { useLanguage } from "../context/LanguageContext";

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
  const { t, formatString } = useLanguage();
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

  const canUpdateRoadStatus =
    user?.role === "ADMIN" ||
    user?.role === "CONTROL_OPERATOR";

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
                {t.roads.title}
              </h2>

              <span className="flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                <BrainCircuit size={13} />
                {t.roads.aiPowered}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.roads.subtitle}
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
            {loading ? t.common.refreshing : t.roads.refreshRisk}
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
                  {t.roads.engineTitle}
                </h3>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {t.roads.engineDesc}
                </p>
              </div>
            </div>

            <div className="shrink-0 rounded-lg border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                {t.roads.modelStatus}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />

                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {t.roads.operational}
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
                {t.roads.avgNetworkRisk}
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
                {t.common.critical}
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
              {t.roads.immediateAction}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-5 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.common.high}
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
              {t.roads.closelyMonitor}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.common.medium}
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
              {t.roads.monitorConditions}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/[0.04]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t.common.low}
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
              {t.roads.normalOperations}
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
                  {t.roads.mapTitle}
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.roads.mapSub}
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
                {t.roads.highestRiskTitle}
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.roads.highestRiskSub}
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
                    {t.roads.riskScoreRatio}
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
                        {t.roads.colProbability}
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
                        {t.common.confidence}
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
                  {t.roads.viewAnalysis}
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
                {t.roads.tableTitle}
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.roads.tableSub}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Route size={14} />
              {formatString(t.roads.segmentsCount, { count: risks.length })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  <th className="px-5 py-3 font-medium">
                    {t.roads.colCorridor}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t.roads.colRegion}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t.common.riskScore}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t.roads.colRiskLevel}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t.roads.colHazard}
                  </th>

                  <th className="px-5 py-3 font-medium">
                    {t.roads.colConfidence}
                  </th>

                  <th className="px-5 py-3 font-medium text-right">
                    {t.common.actions}
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
                          {t.common.inspect}
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
                  {t.roads.aiPrediction}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.roads.aiPredictionSub}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {t.roads.aiPredictionDesc}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-600 dark:text-cyan-400">
                <CloudRain size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t.roads.weatherSignals}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.roads.weatherSignalsSub}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {t.roads.weatherSignalsDesc}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
                <TrendingDown size={19} />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {t.roads.roadCondition}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.roads.roadConditionSub}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {t.roads.roadConditionDesc}
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
                      {t.roads.modalTitle}
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
                        {t.roads.riskScore}
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
                      {t.common.location}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.district},{" "}
                      {selectedRisk.state}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.roads.hazardType}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.movement_type ||
                        "Environmental disruption"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.roads.material}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.material || t.roads.notAvailable}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.roads.surface}
                    </p>

                    <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {selectedRisk.surface || t.roads.notAvailable}
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
                        {t.roads.aiRecommendation}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
                        {t.roads.aiRecommendationDesc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operator Corridor Status Control */}
                {canUpdateRoadStatus && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-cyan-600 dark:text-cyan-400" />
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {t.roads.operatorControlTitle}
                        </p>
                      </div>

                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.roads.roleLabel}: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.role || "GUEST"}</span>
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {t.roads.operatorControlDesc}
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
                        {
                          id: "open",
                          label: t.roads.statusOpen,
                          score: "0%",
                          activeStyles:
                            "bg-emerald-100 border-emerald-600 text-emerald-950 ring-2 ring-emerald-600/40 font-bold shadow-sm hover:bg-emerald-200/90 active:bg-emerald-300/80 dark:bg-emerald-900/70 dark:border-emerald-400 dark:text-white dark:ring-2 dark:ring-emerald-400/60 dark:hover:bg-emerald-900/90 dark:active:bg-emerald-950",
                          inactiveStyles:
                            "bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-400 hover:text-emerald-950 active:bg-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:border-emerald-600 dark:hover:text-emerald-100 dark:active:bg-emerald-900/80",
                          focusStyles:
                            "focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400",
                          subtextActive: "text-emerald-800 dark:text-emerald-200",
                          subtextInactive: "text-emerald-700 dark:text-emerald-400",
                        },
                        {
                          id: "restricted",
                          label: t.roads.statusRestricted,
                          score: "50%",
                          activeStyles:
                            "bg-amber-100 border-amber-600 text-amber-950 ring-2 ring-amber-600/40 font-bold shadow-sm hover:bg-amber-200/90 active:bg-amber-300/80 dark:bg-amber-900/70 dark:border-amber-400 dark:text-white dark:ring-2 dark:ring-amber-400/60 dark:hover:bg-amber-900/90 dark:active:bg-amber-950",
                          inactiveStyles:
                            "bg-amber-50/70 border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-950 active:bg-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50 dark:hover:border-amber-600 dark:hover:text-amber-100 dark:active:bg-amber-900/80",
                          focusStyles:
                            "focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400",
                          subtextActive: "text-amber-800 dark:text-amber-200",
                          subtextInactive: "text-amber-700 dark:text-amber-400",
                        },
                        {
                          id: "under_repair",
                          label: t.roads.statusUnderRepair,
                          score: "70%",
                          activeStyles:
                            "bg-blue-100 border-blue-600 text-blue-950 ring-2 ring-blue-600/40 font-bold shadow-sm hover:bg-blue-200/90 active:bg-blue-300/80 dark:bg-blue-900/70 dark:border-blue-400 dark:text-white dark:ring-2 dark:ring-blue-400/60 dark:hover:bg-blue-900/90 dark:active:bg-blue-950",
                          inactiveStyles:
                            "bg-blue-50/70 border-blue-300 text-blue-900 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-950 active:bg-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50 dark:hover:border-blue-600 dark:hover:text-blue-100 dark:active:bg-blue-900/80",
                          focusStyles:
                            "focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
                          subtextActive: "text-blue-800 dark:text-blue-200",
                          subtextInactive: "text-blue-700 dark:text-blue-400",
                        },
                        {
                          id: "blocked",
                          label: t.roads.statusBlocked,
                          score: "95%",
                          activeStyles:
                            "bg-red-100 border-red-600 text-red-950 ring-2 ring-red-600/40 font-bold shadow-sm hover:bg-red-200/90 active:bg-red-300/80 dark:bg-red-900/70 dark:border-red-400 dark:text-white dark:ring-2 dark:ring-red-400/60 dark:hover:bg-red-900/90 dark:active:bg-red-950",
                          inactiveStyles:
                            "bg-red-50/70 border-red-300 text-red-900 hover:bg-red-100 hover:border-red-400 hover:text-red-950 active:bg-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50 dark:hover:border-red-600 dark:hover:text-red-100 dark:active:bg-red-900/80",
                          focusStyles:
                            "focus-visible:ring-red-500 dark:focus-visible:ring-red-400",
                          subtextActive: "text-red-800 dark:text-red-200",
                          subtextInactive: "text-red-700 dark:text-red-400",
                        },
                      ].map((st) => {
                        const isActive = (selectedRisk.status || "open").toLowerCase() === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            disabled={statusUpdating}
                            onClick={() => updateRoadStatus(selectedRisk.id, st.id)}
                            className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs transition-all cursor-pointer font-medium select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                              st.focusStyles
                            } ${
                              isActive ? st.activeStyles : st.inactiveStyles
                            }`}
                          >
                            <span>{st.label}</span>
                            <span
                              className={`mt-0.5 text-[10px] font-mono ${
                                isActive ? st.subtextActive : st.subtextInactive
                              }`}
                            >
                              Risk: {st.score}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

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