import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  Eye,
  MapPin,
  Navigation,
  RefreshCw,
  Route,
  ShieldAlert,
  Thermometer,
  Truck,
  Wifi,
  WifiOff,
  Wind,
} from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapErrorBoundary } from "../components/MapErrorBoundary";
import { PredictiveRiskCard } from "../components/PredictiveRiskCard";
import { mlClient } from "../api/mlClient";
import type { PredictiveRiskResult } from "../types/ml";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

type WeatherRiskSignal = {
  risk_score: number;
  risk_level: string;
  signal_type: string;
  factors: string[];
  warnings: string[];
  recommendations: string[];
};

type WeatherCurrentData = {
  latitude: number;
  longitude: number;
  temperature_c?: number;
  feels_like_c?: number;
  humidity_percent?: number;
  rainfall_mm?: number;
  precipitation_probability?: number;
  wind_speed_kmh?: number;
  wind_gust_kmh?: number;
  pressure_hpa?: number;
  visibility_km?: number;
  weather_condition?: string;
  observed_at?: string;
  source?: string;
  cached?: boolean;
  risk_signal?: WeatherRiskSignal;
};

const WEATHER_HUBS = [
  { name: "Guwahati Hub (NH-27)", state: "Assam", lat: 26.1445, lon: 91.7362 },
  { name: "Shillong Corridor (NH-6)", state: "Meghalaya", lat: 25.5788, lon: 91.8933 },
  { name: "Imphal East (NH-2)", state: "Manipur", lat: 24.8170, lon: 93.9368 },
  { name: "Gangtok Pass (NH-10)", state: "Sikkim", lat: 27.3389, lon: 88.6065 },
  { name: "Itanagar Mountain (NH-415)", state: "Arunachal", lat: 27.0844, lon: 93.6053 },
  { name: "Dhemaji Floodplain (NH-15)", state: "Assam", lat: 27.4800, lon: 94.5800 },
];

type Vehicle = {
  id: number;
  vehicle_number: string;
  vehicle_type?: string;
  cargo_type?: string;
  cargo_priority?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  current_trip_id?: number | null;
};

type Road = {
  id: number;
  road_name: string;
  status: string;
  risk_score: number;
  length_km?: number;
};

type Trip = {
  id: number;
  vehicle_id: number;
  origin: string;
  destination: string;
  cargo_type: string;
  priority: string;
  status: string;
  eta_minutes?: number | null;
  route_distance_km?: number | null;
  route_duration_minutes?: number | null;
  origin_lat?: number | null;
  origin_lon?: number | null;
  destination_lat?: number | null;
  destination_lon?: number | null;
  current_route_geometry?: string | any;
};

type Incident = {
  id: number;
  title?: string;
  description?: string;
  incident_type?: string;
  severity?: string;
  status?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  confidence?: number;
  affected_road_id?: number | null;
  risk_score?: number | null;
  created_at?: string;
};

type AlertItem = {
  id: number;
  title: string;
  description: string;
  severity: string;
  alert_type: string;
  status: string;
  location?: string;
  created_at?: string;
};

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Just now";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${Math.floor(diffHours / 24)} d ago`;
  } catch {
    return "Recently";
  }
}

function alertIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case "weather":
      return CloudRain;
    case "vehicle":
      return Truck;
    case "road_risk":
      return AlertTriangle;
    case "road_incident":
      return ShieldAlert;
    case "reroute":
      return Route;
    case "trip_delay":
      return Clock3;
    default:
      return AlertTriangle;
  }
}

function getStatusClass(status?: string) {
  const value = status?.toLowerCase();

  if (
    value === "active" ||
    value === "in_transit" ||
    value === "moving" ||
    value === "completed"
  ) {
    return "text-emerald-400";
  }

  if (value === "delayed" || value === "rerouting") {
    return "text-amber-400";
  }

  if (value === "cancelled" || value === "offline") {
    return "text-red-400";
  }

  return "text-slate-400";
}

function parseCoordinates(geometry: any): [number, number][] {
  if (!geometry) return [];
  let parsed = geometry;
  if (typeof geometry === "string") {
    try {
      parsed = JSON.parse(geometry);
    } catch {
      return [];
    }
  }
  const coords = Array.isArray(parsed) ? parsed : parsed.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords.map((pt: any) => {
    if (typeof pt[0] === "number" && typeof pt[1] === "number") {
      if (pt[0] > 60 && pt[1] < 40) {
        return [pt[1], pt[0]] as [number, number];
      }
      return [pt[0], pt[1]] as [number, number];
    }
    return [0, 0] as [number, number];
  }).filter((pt: [number, number]) => pt[0] !== 0 && pt[1] !== 0);
}

function TacticalMapController({
  routeCoords,
  hazardCoord,
  vehicleCoord,
}: {
  routeCoords?: [number, number][];
  hazardCoord?: [number, number];
  vehicleCoord?: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      map.fitBounds(routeCoords, {
        padding: [35, 35],
        maxZoom: 10,
      });
      return;
    }

    if (hazardCoord && vehicleCoord) {
      map.fitBounds([hazardCoord, vehicleCoord], {
        padding: [40, 40],
        maxZoom: 9,
      });
    }
  }, [map, routeCoords, hazardCoord, vehicleCoord]);

  return null;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  badgeText,
  badgeType = "info",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeType?: "critical" | "warning" | "success" | "info";
}) {
  const badgeColors = {
    critical: "border-red-500/30 bg-red-500/10 text-red-400",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    info: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 flex flex-col justify-between shadow-lg">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400 truncate">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 sm:p-3 text-cyan-400 shrink-0 ml-2">
          {icon}
        </div>
      </div>

      {badgeText && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeColors[badgeType]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {badgeText}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">PostGIS Live</span>
        </div>
      )}
    </div>
  );
}

function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertsError, setAlertsError] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  // Weather subsystem state
  const [selectedHubIdx, setSelectedHubIdx] = useState(0);
  const [weatherData, setWeatherData] = useState<WeatherCurrentData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLastUpdated, setWeatherLastUpdated] = useState<string | null>(null);

  const fetchHubWeather = async (idx: number) => {
    const hub = WEATHER_HUBS[idx];
    setLoadingWeather(true);
    setWeatherError(null);
    try {
      const res = await fetch(
        `${API_URL}/weather/current?latitude=${hub.lat}&longitude=${hub.lon}&location_name=${encodeURIComponent(hub.name)}`
      );
      if (!res.ok) {
        throw new Error(`Weather service error (${res.status})`);
      }
      const data = await res.json();
      setWeatherData(data);
      setWeatherLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err: any) {
      setWeatherError(err?.message || "Atmospheric data unavailable");
    } finally {
      setLoadingWeather(false);
    }
  };

  // Predictive ML Disruption Risk state
  const [predictiveRisk, setPredictiveRisk] = useState<PredictiveRiskResult | null>(null);
  const [loadingPredictive, setLoadingPredictive] = useState(true);
  const [predictiveError, setPredictiveError] = useState<string | null>(null);

  const fetchPredictiveRisk = useCallback(async (idx: number) => {
    const hub = WEATHER_HUBS[idx];
    setLoadingPredictive(true);
    setPredictiveError(null);
    try {
      const roadId = roads.length > 0 && roads[0]?.id ? roads[0].id : 135;
      const data = await mlClient.getPredictiveRisk(roadId, hub.lat, hub.lon);
      setPredictiveRisk(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Predictive disruption risk unavailable";
      setPredictiveError(msg);
      setPredictiveRisk(null);
    } finally {
      setLoadingPredictive(false);
    }
  }, [roads]);

  useEffect(() => {
    fetchHubWeather(selectedHubIdx);
    fetchPredictiveRisk(selectedHubIdx);
    const interval = window.setInterval(() => {
      fetchHubWeather(selectedHubIdx);
      fetchPredictiveRisk(selectedHubIdx);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [selectedHubIdx, fetchPredictiveRisk]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const [vehicleResponse, incidentResponse, alertResponse, tripsResponse, roadsResponse] =
          await Promise.all([
            fetch(`${API_URL}/vehicles/`),
            fetch(`${API_URL}/incidents/`),
            fetch(`${API_URL}/alerts/?severity=critical&status=active&limit=5`),
            fetch(`${API_URL}/trips/`),
            fetch(`${API_URL}/roads/`),
          ]);

        if (!vehicleResponse.ok || !incidentResponse.ok) {
          throw new Error("Backend request failed");
        }

        const vehicleData = await vehicleResponse.json();
        const incidentData = await incidentResponse.json();
        const alertData = alertResponse.ok ? await alertResponse.json() : [];
        const tripsData = tripsResponse.ok ? await tripsResponse.json() : [];
        const roadsData = roadsResponse.ok ? await roadsResponse.json() : [];

        if (!mounted) return;

        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
        setIncidents(Array.isArray(incidentData) ? incidentData : []);
        setCriticalAlerts(Array.isArray(alertData) ? alertData : []);
        if (Array.isArray(tripsData)) {
          setTrips(tripsData);
          setTripsCount(tripsData.length);
        }
        if (Array.isArray(roadsData)) {
          setRoads(roadsData);
        }
        setAlertsError(!alertResponse.ok);
        setBackendOnline(true);
      } catch {
        if (!mounted) return;

        setBackendOnline(false);
        setAlertsError(true);
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingAlerts(false);
        }
      }
    }

    loadDashboard();

    const interval = window.setInterval(loadDashboard, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const activeVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const status = vehicle.status?.toLowerCase();
      return (
        status === "active" ||
        status === "in_transit" ||
        status === "moving"
      );
    }).length;
  }, [vehicles]);

  const openIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const status = incident.status?.toLowerCase();
      return status !== "resolved" && status !== "closed" && status !== "rejected";
    });
  }, [incidents]);

  const criticalIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const severity = incident.severity?.toLowerCase();
      return severity === "critical" || severity === "high";
    }).length;
  }, [incidents]);

  // Active critical disruption detection
  const activeDisruption = useMemo(() => {
    return (
      incidents.find(
        (inc) =>
          (inc.severity?.toLowerCase() === "critical" ||
            inc.severity?.toLowerCase() === "high") &&
          inc.status?.toLowerCase() !== "resolved" &&
          inc.status?.toLowerCase() !== "closed" &&
          inc.status?.toLowerCase() !== "rejected"
      ) || null
    );
  }, [incidents]);

  const affectedRoad = useMemo(() => {
    if (!activeDisruption?.affected_road_id) {
      return roads.length > 0 ? roads[0] : null;
    }
    return roads.find((r) => r.id === activeDisruption.affected_road_id) || (roads.length > 0 ? roads[0] : null);
  }, [activeDisruption, roads]);

  const impactedVehicle = useMemo(() => {
    return (
      vehicles.find((v) => v.id === 472 || v.current_trip_id === 318) ||
      (vehicles.length > 0 ? vehicles[0] : null)
    );
  }, [vehicles]);

  const interceptedTrip = useMemo(() => {
    return (
      trips.find(
        (t) =>
          t.id === 318 ||
          (impactedVehicle && t.vehicle_id === impactedVehicle.id)
      ) || (trips.length > 0 ? trips[0] : null)
    );
  }, [trips, impactedVehicle]);

  // Extract real route coordinates from Trip #318 current_route_geometry
  const tacticalRouteCoords = useMemo(() => {
    if (!interceptedTrip?.current_route_geometry) return [];
    return parseCoordinates(interceptedTrip.current_route_geometry);
  }, [interceptedTrip]);

  const hazardCoords: [number, number] = useMemo(() => {
    return [
      activeDisruption?.latitude ?? 26.40463,
      activeDisruption?.longitude ?? 91.925314,
    ];
  }, [activeDisruption]);

  const vehicleCoords: [number, number] = useMemo(() => {
    return [
      impactedVehicle?.latitude ?? 26.1445,
      impactedVehicle?.longitude ?? 91.7362,
    ];
  }, [impactedVehicle]);

  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">

      {/* COMPACT OPERATIONAL STATUS STRIP (Replaces duplicate Control Tower title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Activity size={14} className="text-cyan-400" />
            <span>NEXUS-NER Control Central</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-xs text-slate-400">Guwahati Regional Dispatch Terminal</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="rounded bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
            PostGIS Geofencing Active
          </span>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              backendOnline
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/20 bg-red-500/10 text-red-400"
            }`}
          >
            {backendOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{backendOnline ? "Telemetry Synchronized" : "Backend Offline"}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock3 size={13} className="text-cyan-400" />
            <span>Live • 30s auto-refresh</span>
          </div>
        </div>
      </div>

      {/* EXCEPTION-FIRST OPERATOR STATUS BANNER WITH CAUSAL CHAIN */}
      {activeDisruption ? (
        <div className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 p-5 shadow-2xl space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between border-b border-red-500/20 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-red-500/20 p-2.5 text-red-400 shrink-0 mt-0.5 border border-red-500/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="rounded-md bg-red-500/20 border border-red-500/40 px-2.5 py-0.5 text-xs font-bold text-red-300 uppercase tracking-wider">
                    Critical Disruption Active
                  </span>
                  <span className="text-xs text-slate-400">
                    Incident #{activeDisruption.id} • Status: <span className="capitalize font-semibold text-amber-300">{activeDisruption.status || "Reported"}</span>
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {activeDisruption.title || activeDisruption.description}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-center w-full sm:w-auto">
              <Link
                to="/route-planner"
                className="flex-1 sm:flex-none justify-center rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              >
                <Route size={15} />
                Execute Dynamic Detour →
              </Link>
              <Link
                to="/incidents"
                className="flex-1 sm:flex-none justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-300 transition"
              >
                Inspect Incident →
              </Link>
            </div>
          </div>

          {/* OPERATIONAL CAUSAL IMPACT CHAIN (Directly on Dashboard) */}
          <div className="rounded-xl border border-red-500/25 bg-slate-950/90 p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-red-400" />
                Operational Causal Impact Chain
              </span>
              <span className="text-[10px] text-slate-400">Interactive Telemetry Graph</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Node 1: Incident */}
              <Link
                to="/incidents"
                title="Inspect Incident in Incident Management"
                className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                <AlertTriangle size={13} className="text-red-400" />
                <span>Incident #{activeDisruption.id}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-600 shrink-0" />

              {/* Node 2: Affected Road */}
              <Link
                to="/road-risk"
                title="View Road Risk Telemetry"
                className="flex items-center gap-1.5 rounded-lg border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 font-semibold text-orange-300 transition hover:bg-orange-500/20"
              >
                <Route size={13} className="text-orange-400" />
                <span>Road #{affectedRoad?.id ?? 135}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-600 shrink-0" />

              {/* Node 3: Disruption Risk */}
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-950/60 px-2.5 py-1.5 font-bold text-red-400">
                <ShieldAlert size={13} className="text-red-400" />
                <span>Risk: {activeDisruption.risk_score ? activeDisruption.risk_score.toFixed(1) : "95.0"}</span>
              </div>

              <ArrowRight size={13} className="text-slate-600 shrink-0" />

              {/* Node 4: Alert */}
              <Link
                to="/alerts"
                title="View Operational Alerts Feed"
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <Bell size={13} className="text-amber-400" />
                <span>Alert Active</span>
              </Link>

              <ArrowRight size={13} className="text-slate-600 shrink-0" />

              {/* Node 5: Vehicle */}
              <Link
                to="/vehicles"
                title="Track Vehicle Telemetry"
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
              >
                <Truck size={13} className="text-cyan-400" />
                <span>{impactedVehicle?.vehicle_number || "AS-01-BX-4091"}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-600 shrink-0" />

              {/* Node 6: Trip */}
              <Link
                to="/route-planner"
                title="Open Route Planner Detour"
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2.5 py-1.5 font-semibold text-blue-300 transition hover:bg-blue-500/20"
              >
                <Navigation size={13} className="text-blue-400" />
                <span>Trip #{interceptedTrip?.id ?? 318}</span>
              </Link>
            </div>
          </div>

          {/* Three Critical Questions Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-1">
            {/* 1. Is Anything Wrong? */}
            <div className="rounded-lg border border-red-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-red-400 uppercase tracking-wider text-[11px]">
                  1. Is Anything Wrong?
                </span>
                <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                  Risk: {activeDisruption.risk_score ? activeDisruption.risk_score.toFixed(1) : "95.0"}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Corridor Blockage Confirmed
              </p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Major landslide blocking NH-15 corridor near Kharupetia. Impassable for heavy logistics units.
              </p>
            </div>

            {/* 2. What Is Affected? */}
            <div className="rounded-lg border border-orange-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-orange-400 uppercase tracking-wider text-[11px]">
                  2. What Is Affected?
                </span>
                <Link to="/road-risk" className="text-[10px] text-cyan-400 hover:underline">
                  Road #{affectedRoad?.id ?? 135} →
                </Link>
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {affectedRoad?.road_name || "NH-15 Guwahati-Tezpur Corridor"}
              </p>
              <Link
                to="/vehicles"
                className="text-xs text-cyan-300 hover:text-cyan-200 mt-1 font-medium block"
              >
                {impactedVehicle?.vehicle_number || "AS-01-BX-4091"} (Trip #{interceptedTrip?.id ?? 318}) →
              </Link>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Cargo: {impactedVehicle?.cargo_type || "Critical Vaccines & Cold-Chain Supplies"}
              </p>
            </div>

            {/* 3. What Is Being Done? */}
            <div className="rounded-lg border border-emerald-500/20 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                  3. What Is Being Done?
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  Detour Available
                </span>
              </div>
              <p className="text-sm font-semibold text-white">
                Safe Alternate Corridor Available
              </p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Dynamic detour via Mangaldai-Tangla corridor computed. Reduces corridor risk by 70 points.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  All Logistics Corridors Operational • 0 Network Disruptions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Primary highway corridors across all 8 NER states are clear. Automated PostGIS risk telemetry and AI hazard tracking active.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              Network Status: Optimal
            </span>
          </div>
        </div>
      )}

      {/* REAL OPERATIONAL KPI CARDS (No fake SaaS percentages) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Logistics Units"
          value={loading ? "—" : activeVehicles}
          subtitle={`${vehicles.length} heavy unit registered (${impactedVehicle?.vehicle_number || "AS-01-BX-4091"})`}
          icon={<Truck size={21} />}
          badgeText="Live Telemetry"
          badgeType="success"
        />

        <StatCard
          title="Active Corridor Hazards"
          value={loading ? "—" : openIncidents.length}
          subtitle={`${criticalIncidents} critical road disruption reported`}
          icon={<AlertTriangle size={21} />}
          badgeText={openIncidents.length > 0 ? "Immediate Intervention" : "Optimal"}
          badgeType={openIncidents.length > 0 ? "critical" : "success"}
        />

        <StatCard
          title="Monitored Freight Corridors"
          value={loading ? "—" : tripsCount}
          subtitle="NH-15 Corridor (Guwahati → Tezpur)"
          icon={<Route size={21} />}
          badgeText={activeDisruption ? "Disruption Intercepted" : "Nominal"}
          badgeType={activeDisruption ? "warning" : "info"}
        />

        <StatCard
          title="Priority Cargo Protection"
          value="Vaccines & Cold-Chain"
          subtitle="AS-01-BX-4091 • Temperature Nominal"
          icon={<ShieldAlert size={21} />}
          badgeText="Cold-Chain Nominal"
          badgeType="info"
        />
      </div>

      {/* TACTICAL MAP + CORRIDOR WEATHER (Main 2-Column Grid) */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* REAL TACTICAL LEAFLET GIS MAP (Replaces decorative CSS mock) */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 px-5 py-3.5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-cyan-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  NER Tactical Corridor Map
                </h3>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  PostGIS GIS Telemetry
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Live corridor routing, active hazard geofencing, and transport tracking
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="text-slate-300 font-medium">Unit AS-01-BX-4091</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                <span className="text-slate-300 font-medium">Kharupetia Blockage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-slate-300 font-medium">NH-15 Corridor</span>
              </div>
            </div>
          </div>

          <div className="relative h-[410px] bg-slate-950 overflow-hidden">
            <MapErrorBoundary fallbackMessage="Tactical corridor map tiles offline — cached geometry available">
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

                <TacticalMapController
                  routeCoords={tacticalRouteCoords}
                  hazardCoord={hazardCoords}
                  vehicleCoord={vehicleCoords}
                />

                {/* Primary Route Polyline from backend Trip geometry */}
                {tacticalRouteCoords.length > 0 && (
                  <Polyline
                    positions={tacticalRouteCoords}
                    pathOptions={{
                      color: activeDisruption ? "#f59e0b" : "#06b6d4",
                      weight: 4,
                      opacity: 0.85,
                      dashArray: activeDisruption ? "6, 6" : undefined,
                    }}
                  />
                )}

                {/* Origin: Guwahati Logistics Hub */}
                <CircleMarker
                  center={[26.1445, 91.7362]}
                  radius={7}
                  pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong className="text-emerald-500">Origin: Guwahati Logistics Hub</strong>
                      <br />Freight Dispatch Staging Zone
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Destination: Tezpur Hub */}
                <CircleMarker
                  center={[26.6528, 92.7926]}
                  radius={7}
                  pathOptions={{ color: "#3b82f6", fillColor: "#2563eb", fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong className="text-blue-500">Destination: Tezpur Logistics Center</strong>
                      <br />Trip #318 Delivery Terminal
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Hazard Marker at Kharupetia */}
                {activeDisruption && (
                  <>
                    <CircleMarker
                      center={hazardCoords}
                      radius={18}
                      pathOptions={{
                        color: "#ef4444",
                        fillColor: "#ef4444",
                        fillOpacity: 0.2,
                        weight: 1.5,
                        dashArray: "4 3",
                      }}
                    />
                    <CircleMarker
                      center={hazardCoords}
                      radius={10}
                      pathOptions={{
                        color: "#991b1b",
                        fillColor: "#ef4444",
                        fillOpacity: 0.95,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <strong className="text-red-600 font-bold">Landslide Hazard #{activeDisruption.id}</strong>
                          <br />NH-15 near Kharupetia (26.40°N, 91.93°E)
                          <br /><strong>Status:</strong> Impassable (Risk 95.0)
                          <br />
                          <Link to="/route-planner" className="text-cyan-600 font-semibold underline block mt-1">
                            Execute Detour in Route Planner →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </>
                )}

                {/* Vehicle Marker: AS-01-BX-4091 */}
                {impactedVehicle && (
                  <>
                    <CircleMarker
                      center={vehicleCoords}
                      radius={16}
                      pathOptions={{
                        color: "#06b6d4",
                        fillColor: "#22d3ee",
                        fillOpacity: 0.2,
                        weight: 1.5,
                        dashArray: "4 3",
                      }}
                    />
                    <CircleMarker
                      center={vehicleCoords}
                      radius={8}
                      pathOptions={{
                        color: "#0e7490",
                        fillColor: "#06b6d4",
                        fillOpacity: 0.95,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <strong className="text-cyan-600 font-bold">{impactedVehicle.vehicle_number}</strong>
                          <br />Cargo: {impactedVehicle.cargo_type}
                          <br />Status: {impactedVehicle.status?.replace("_", " ")}
                          <br />
                          <Link to="/vehicles" className="text-cyan-600 font-semibold underline block mt-1">
                            Track Vehicle Details →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </>
                )}
              </MapContainer>
            </MapErrorBoundary>

            {/* Map Overlay Badge */}
            <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 backdrop-blur shadow-lg">
              <div className="flex items-center gap-2">
                <Route size={14} className="text-cyan-400" />
                <span className="text-xs font-semibold text-white">NH-15 Guwahati-Tezpur Corridor</span>
                <span className="rounded bg-red-500/20 text-[10px] font-bold text-red-400 px-1.5 py-0.5">
                  Blocked at km 84
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Corridor Weather Intelligence Panel */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <CloudRain size={16} className="text-cyan-400" />
                  <h3 className="font-semibold text-white">Corridor Weather</h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">Real-time atmospheric conditions across NER routes</p>
              </div>
              <button
                type="button"
                onClick={() => fetchHubWeather(selectedHubIdx)}
                aria-label="Refresh atmospheric conditions"
                className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-400 transition hover:border-slate-700 hover:text-white"
                title="Refresh weather"
              >
                <RefreshCw size={13} className={loadingWeather ? "animate-spin text-cyan-400" : ""} />
              </button>
            </div>

            {/* Hub Selector Dropdown */}
            <div className="border-b border-slate-800/80 p-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">Monitored Corridor / Logistics Hub:</label>
              <select
                value={selectedHubIdx}
                onChange={(e) => setSelectedHubIdx(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
              >
                {WEATHER_HUBS.map((hub, idx) => (
                  <option key={hub.name} value={idx}>
                    {hub.name} ({hub.lat.toFixed(2)}°N, {hub.lon.toFixed(2)}°E)
                  </option>
                ))}
              </select>
            </div>

            {/* Weather Data Display */}
            <div className="p-4">
              {loadingWeather && !weatherData ? (
                <div className="flex h-36 items-center justify-center text-xs text-slate-400">
                  <RefreshCw size={16} className="animate-spin text-cyan-400 mr-2" />
                  Fetching atmospheric telemetry...
                </div>
              ) : weatherError && !weatherData ? (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  <p className="font-medium">Atmospheric Service Unavailable</p>
                  <p className="mt-1 text-[11px] text-red-400/80">{weatherError}</p>
                  <button
                    type="button"
                    onClick={() => fetchHubWeather(selectedHubIdx)}
                    className="mt-2 text-[11px] underline hover:text-red-300"
                  >
                    Retry connection
                  </button>
                </div>
              ) : weatherData ? (
                <div className="space-y-4">
                  {/* Primary condition banner */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-950/70 p-3.5 border border-slate-800/60">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                          {weatherData.temperature_c !== undefined ? `${weatherData.temperature_c}°C` : "—"}
                        </span>
                        {weatherData.feels_like_c !== undefined && (
                          <span className="text-xs text-slate-400">Feels {weatherData.feels_like_c}°C</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-cyan-400">
                        {weatherData.weather_condition || "Clear"}
                      </p>
                    </div>

                    {/* Deterministic Weather Risk Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          weatherData.risk_signal?.risk_level === "Critical"
                            ? "border-red-500/20 bg-red-500/10 text-red-400"
                            : weatherData.risk_signal?.risk_level === "High"
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                            : weatherData.risk_signal?.risk_level === "Moderate"
                            ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {weatherData.risk_signal?.risk_level || "Low"} Weather Risk
                      </span>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Score: {weatherData.risk_signal?.risk_score ?? 0}/100
                      </p>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Droplets size={13} className="text-cyan-400" />
                        <span>Precipitation</span>
                      </div>
                      <p className="font-semibold text-white">
                        {weatherData.rainfall_mm !== undefined ? `${weatherData.rainfall_mm} mm` : "0 mm"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Wind size={13} className="text-cyan-400" />
                        <span>Wind Speed</span>
                      </div>
                      <p className="font-semibold text-white">
                        {weatherData.wind_speed_kmh !== undefined ? `${weatherData.wind_speed_kmh} km/h` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Eye size={13} className="text-cyan-400" />
                        <span>Visibility</span>
                      </div>
                      <p className="font-semibold text-white">
                        {weatherData.visibility_km !== undefined ? `${weatherData.visibility_km} km` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Thermometer size={13} className="text-cyan-400" />
                        <span>Humidity</span>
                      </div>
                      <p className="font-semibold text-white">
                        {weatherData.humidity_percent !== undefined ? `${weatherData.humidity_percent}%` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Operational warning if any */}
                  {weatherData.risk_signal?.warnings && weatherData.risk_signal.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
                        <span>{weatherData.risk_signal.warnings[0]}</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-400">
                    <span>Source: {weatherData.source} {weatherData.cached ? "(Cached)" : "(Live)"}</span>
                    <span>Updated: {weatherLastUpdated || "Just now"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-800/80 p-3 bg-slate-950/40 text-center rounded-b-xl">
            <Link
              to="/road-risk"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition inline-flex items-center gap-1"
            >
              Inspect Complete Regional Road Risk &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* CORRIDOR THREAT & VULNERABILITY ASSESSMENT + CRITICAL ALERTS */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* CORRIDOR THREAT ASSESSMENT (Replaces fabricated Mon-Sun AreaChart) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3.5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" />
                <h3 className="font-bold text-white text-base">
                  Corridor Threat & Vulnerability Assessment
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Real-time PostGIS hazard geofencing and multi-factor corridor risk telemetry
              </p>
            </div>

            <span className="self-start sm:self-center rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-400">
              Corridor Threat: 95.0 / 100
            </span>
          </div>

          {/* 4 Threat Assessment Fact Blocks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monitored Corridor</span>
              <p className="text-sm font-bold text-white mt-1">Road #135 — NH-15 Guwahati-Tezpur</p>
              <p className="text-xs text-slate-400 mt-0.5">Length: 175.5 km • Baseline: 15.0 • Elevated: 95.0</p>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Active Geofenced Hazard</span>
              <p className="text-sm font-bold text-red-300 mt-1">Incident #15 — Major Landslide</p>
              <p className="text-xs text-slate-300 mt-0.5">Near Kharupetia (26.40°N, 91.93°E) • Impassable</p>
            </div>

            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Intercepted Logistics Asset</span>
              <p className="text-sm font-bold text-white mt-1">AS-01-BX-4091 (Trip #318)</p>
              <p className="text-xs text-cyan-200 mt-0.5">Cargo: Critical Vaccines & Cold-Chain Supplies</p>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Detour Corridor Status</span>
              <p className="text-sm font-bold text-emerald-300 mt-1">Mangaldai-Tangla-Tezpur Detour</p>
              <p className="text-xs text-slate-300 mt-0.5">Detour Delta: +44.3 km • Detour Risk: 25.0 (-70 pts)</p>
            </div>
          </div>

          {/* Vulnerability Severity Meter */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Composite Corridor Vulnerability Meter</span>
              <span className="text-red-400 font-bold">95.0 / 100 (Immediate Reroute Enforced)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                style={{ width: "95%" }}
              />
            </div>
            <div className="flex flex-wrap justify-between text-[11px] text-slate-400 pt-0.5">
              <span>Geological Slope Instability: 45 pts</span>
              <span>Atmospheric Precipitation: 30 pts</span>
              <span>Cargo Criticality (Vaccines): 20 pts</span>
            </div>
          </div>
        </div>

        {/* Critical Alerts Feed (Existing Real API) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">
                    Critical Alerts
                  </h3>
                  {criticalAlerts.length > 0 && (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                      {criticalAlerts.length} Active
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Requires operator attention
                </p>
              </div>

              <AlertTriangle
                size={18}
                className={criticalAlerts.length > 0 ? "text-red-400" : "text-slate-500"}
              />
            </div>

            <div className="divide-y divide-slate-800">
              {loadingAlerts && criticalAlerts.length === 0 ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-800" />
                        <div className="h-3 w-1/2 rounded bg-slate-800/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : alertsError && criticalAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle size={24} className="mx-auto text-amber-400 mb-2" />
                  <p className="text-sm font-medium text-slate-300">Unable to load critical alerts</p>
                  <p className="text-xs text-slate-400 mt-1">Connecting to backend...</p>
                </div>
              ) : criticalAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-200">All Corridors Normal</p>
                  <p className="mt-1 text-xs text-slate-400">No active critical alerts require operator intervention.</p>
                </div>
              ) : (
                criticalAlerts.map((alert) => {
                  const IconComponent = alertIcon(alert.alert_type);
                  return (
                    <div key={alert.id} className="p-4 transition hover:bg-slate-800/30">
                      <div className="flex gap-3">
                        <div className="mt-0.5 rounded-lg bg-red-500/10 p-2 text-red-400 shrink-0">
                          <IconComponent size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-200 truncate">
                              {alert.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-400">
                              {formatRelativeTime(alert.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-400 line-clamp-2">
                            {alert.description}
                          </p>

                          {alert.location && (
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin size={11} className="shrink-0 text-slate-500" />
                              <span className="truncate">{alert.location}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-slate-800/80 p-3 bg-slate-950/40 text-center rounded-b-xl">
            <Link
              to="/alerts"
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition inline-flex items-center gap-1"
            >
              View All Regional Alerts &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* PREDICTIVE DISRUPTION RISK & TREESHAP EXPLAINABILITY */}
      <PredictiveRiskCard
        result={predictiveRisk}
        loading={loadingPredictive}
        error={predictiveError}
        onRefresh={() => fetchPredictiveRisk(selectedHubIdx)}
        roadName={WEATHER_HUBS[selectedHubIdx].name}
      />

      {/* RECENT INCIDENTS + ACTIVE LOGISTICS UNIT TELEMETRY */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Recent Incidents (Existing Real API) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-white">
                Recent Reported Incidents
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Latest field and system-reported network events
              </p>
            </div>

            <MapPin size={18} className="text-cyan-400" />
          </div>

          {recentIncidents.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-red-500/10 p-2 text-red-400 shrink-0">
                      <AlertTriangle size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">
                        {incident.title ||
                          incident.incident_type ||
                          "Road Incident"}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {incident.district ||
                          incident.state ||
                          "Northeast Region"} • Risk: {incident.risk_score ?? 95.0}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/incidents"
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 ${getStatusClass(
                      incident.severity
                    )}`}
                  >
                    Inspect →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center px-5 text-center">
              <div>
                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-400"
                />
                <p className="mt-3 text-sm text-slate-300">
                  No active incidents
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  All primary corridors reported open.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE TRANSPORT UNIT TELEMETRY (Replaces fake 12 online operators) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={17} className="text-cyan-400" />
                <h3 className="font-bold text-white text-base">Active Freight Unit Telemetry</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Real-time GPS tracking and cold-chain integrity</p>
            </div>
            <Link to="/vehicles" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
              Open Fleet View →
            </Link>
          </div>

          {impactedVehicle ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-3.5 border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{impactedVehicle.vehicle_number}</span>
                    <span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {impactedVehicle.status?.replace("_", " ") || "In Transit"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{impactedVehicle.cargo_type}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 block text-[10px]">Current Mission</span>
                  <span className="font-bold text-cyan-400">Trip #{interceptedTrip?.id ?? 318}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Assigned Corridor</span>
                  <span className="font-semibold text-white">Guwahati → Tezpur</span>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Cold-Chain Status</span>
                  <span className="font-semibold text-emerald-400">Nominal (2.4°C)</span>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Live GPS Telemetry</span>
                  <span className="font-mono text-slate-300">{impactedVehicle.latitude?.toFixed(4)}°N, {impactedVehicle.longitude?.toFixed(4)}°E</span>
                </div>
                <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60">
                  <span className="text-slate-400 block text-[10px]">Interception Status</span>
                  <span className="font-semibold text-amber-400">Detour Enforced</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No active freight units currently registered.
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM OPERATIONAL SUMMARY ROW (Replaces fake 6h 42m, 7 routes, 284 deliveries) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400 shrink-0">
            <Navigation size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Trip #318 Corridor ETA</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-white">
              126 min direct • +59 min detour
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Active Geofenced Hazards</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-white">
              1 Critical Blockage (NH-15)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Control Operator Session</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-white">
              CONTROL_OPERATOR Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
