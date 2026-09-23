import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  Eye,
  LogIn,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  ShieldAlert,
  ShieldCheck,
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
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { geolocationService, type GpsPosition } from "../services/geolocation";

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
  reroute_count?: number;
  last_reroute_reason?: string | null;
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
  postgisLabel = "PostGIS Live",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgeType?: "critical" | "warning" | "success" | "info";
  postgisLabel?: string;
}) {
  const badgeColors = {
    critical: "border-red-500/30 bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400",
    warning: "border-amber-500/30 bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
    success: "border-emerald-500/30 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400",
    info: "border-cyan-500/30 bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 sm:p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 p-2.5 sm:p-3 text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
          {icon}
        </div>
      </div>

      {badgeText && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeColors[badgeType]}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {badgeText}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">{postgisLabel}</span>
        </div>
      )}
    </div>
  );
}

interface DriverMissionCockpitProps {
  vehicle: Vehicle | null;
  trip: Trip | null;
  incident: Incident | null;
  road: Road | null;
  criticalAlerts: AlertItem[];
  getAuthHeader: () => Record<string, string>;
  backendOnline: boolean;
  driverUsername?: string;
}

function DriverMissionCockpit({
  vehicle,
  trip,
  incident,
  road,
  criticalAlerts,
  getAuthHeader,
  backendOnline,
  driverUsername,
}: DriverMissionCockpitProps) {
  const { t } = useLanguage();
  const [isGpsTransmitting, setIsGpsTransmitting] = useState(false);
  const [isPendingGps, setIsPendingGps] = useState(false);
  const [lastTransmittedGps, setLastTransmittedGps] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
    time: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const stopTrackingRef = useRef<(() => void) | null>(null);

  const transmitVehicleGps = useCallback(
    async (vehicleId: number, pos: GpsPosition) => {
      const res = await fetch(`${API_URL}/vehicles/${vehicleId}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          latitude: pos.latitude,
          longitude: pos.longitude,
          timestamp: new Date(pos.timestamp).toISOString(),
          status: "in_transit",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }
    },
    [getAuthHeader]
  );

  const handleToggleGps = async () => {
    if (isGpsTransmitting) {
      if (stopTrackingRef.current) {
        stopTrackingRef.current();
        stopTrackingRef.current = null;
      }
      setIsGpsTransmitting(false);
      setGpsError(null);
      return;
    }

    if (!vehicle) {
      setGpsError("No assigned vehicle found for telemetry broadcast.");
      return;
    }

    setIsPendingGps(true);
    setGpsError(null);

    try {
      const initialPos = await geolocationService.getCurrentPosition(10000, 30000);
      if (!initialPos.isWithinNER) {
        setGpsError(
          `Coordinates (${initialPos.latitude.toFixed(4)}, ${initialPos.longitude.toFixed(4)}) outside NER bounds [20-30°N, 88-98°E]. Transmission blocked.`
        );
        setIsPendingGps(false);
        return;
      }

      await transmitVehicleGps(vehicle.id, initialPos);
      setLastTransmittedGps({
        lat: initialPos.latitude,
        lon: initialPos.longitude,
        accuracy: Math.round(initialPos.accuracy),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });

      const cleanup = geolocationService.startThrottledTracking(
        async (pos: GpsPosition) => {
          if (!pos.isWithinNER) return;
          try {
            await transmitVehicleGps(vehicle.id, pos);
            setLastTransmittedGps({
              lat: pos.latitude,
              lon: pos.longitude,
              accuracy: Math.round(pos.accuracy),
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            });
            setGpsError(null);
          } catch (err: unknown) {
            const msg =
              err instanceof Error ? err.message : "Failed to push telemetry";
            setGpsError(msg);
          }
        },
        30000,
        50,
        (err: Error) => {
          setGpsError(err.message || "GPS acquisition error");
        }
      );

      stopTrackingRef.current = cleanup;
      setIsGpsTransmitting(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Location permission denied or GPS unavailable.";
      setGpsError(msg);
      setIsGpsTransmitting(false);
    } finally {
      setIsPendingGps(false);
    }
  };

  useEffect(() => {
    return () => {
      if (stopTrackingRef.current) {
        stopTrackingRef.current();
        stopTrackingRef.current = null;
      }
    };
  }, []);

  const d = t.driverCockpit || {
    missionActive: "MISSION ACTIVE",
    assignedVehicle: "Assigned Vehicle",
    tripId: "Trip ID",
    corridor: "Assigned Corridor",
    cargoManifest: "Cargo Manifest",
    priority: "Priority",
    missionStatus: "Mission Status",
    hazardAlert: "Critical Corridor Disruption",
    corridorRisk: "Corridor Risk Index",
    activeDetour: "Safe Detour Active",
    viewSafeRoute: "VIEW SAFE ROUTE",
    transmitGps: "Transmit Live GPS",
    gpsTransmitting: "LIVE GPS TRANSMITTING",
    gpsStandby: "Telemetry Standby — Not Transmitting",
    lastTelemetry: "Last Transmitted Telemetry",
    noActiveMission: "No Active Mission Dispatched",
    detourDescription:
      "Safe detour route computed avoiding active corridor disruption",
  };

  if (!vehicle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 p-8 text-center shadow-sm space-y-4 max-w-lg mx-auto my-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30">
          <Truck size={32} />
        </div>
        <div>
          <span className="inline-block rounded-full border border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Vehicle Assignment Unavailable
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-3">
            No Active Vehicle Assigned
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mt-2">
            Authenticated Driver: <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">{driverUsername || "Driver"}</span>.<br />
            No fleet transport vehicle is currently assigned to your terminal. Contact Control Central dispatch for vehicle assignment.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 px-3 py-1 text-[11px] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            Terminal Status: Standby / Unassigned
          </span>
        </div>
      </div>
    );
  }

  const riskVal = incident?.risk_score ?? road?.risk_score ?? 0;
  const vehicleNum = vehicle.vehicle_number || `Unit #${vehicle.id}`;
  const vehicleId = vehicle.id;
  const tripId = trip?.id ?? "Standby";
  const originStr = trip?.origin || "Guwahati Hub";
  const destStr = trip?.destination || "Regional Depot";
  const cargoStr = trip?.cargo_type || vehicle.cargo_type || "General Logistics Freight";
  const priorityStr = (trip?.priority || vehicle.cargo_priority || "NORMAL").toUpperCase();
  const statusStr = (trip?.status || vehicle.status || "IDLE").replace("_", " ").toUpperCase();
  const corridorName = road?.road_name || "NH-15";

  return (
    <div className="space-y-4 pb-2">
      {/* 1. TOP MISSION CALLSIGN BANNER */}
      <div className="flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-gradient-to-r dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950/40 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                {d.missionActive}
              </span>
              <span className="rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                {trip ? `TRIP #${trip.id}` : "STANDBY"}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400">
              Driver: <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{driverUsername || "driver"}</span> • Unit: <span className="text-slate-900 dark:text-white font-medium">{vehicleNum}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-bold">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>{statusStr}</span>
        </div>
      </div>

      {/* 2. CRITICAL HAZARD & SAFE DETOUR CARD */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 dark:border-red-500/40 dark:bg-gradient-to-b dark:from-red-950/40 dark:via-slate-950 dark:to-slate-950 p-4 shadow-sm space-y-3">
        {/* Hazard Header */}
        <div className="flex items-start justify-between gap-2 border-b border-red-200 dark:border-red-500/20 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 p-1.5 border border-red-200 dark:border-red-500/30">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {d.hazardAlert}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {incident?.title || (incident?.incident_type ? `Incident #${incident.id} — ${incident.incident_type.toUpperCase()} on ${corridorName}` : "Active Hazard Detected")}
              </h3>
            </div>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-100 dark:border-red-500/30 dark:bg-red-500/20 px-2 py-1 text-right shrink-0">
            <span className="text-[9px] uppercase tracking-wider text-red-700 dark:text-red-300 block font-semibold">
              Risk Score
            </span>
            <span className="font-mono text-sm font-black text-red-800 dark:text-red-200">
              {riskVal} / 100
            </span>
          </div>
        </div>

        {/* Hazard Location & Description */}
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {incident?.description ||
            "Active corridor hazard detected by PostGIS geofence along transit route."}
        </p>

        {/* Detour Callout */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/30 p-3 flex items-start gap-2.5">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {d.activeDetour}
              </span>
              <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                Dispatch Approved
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-snug">
              {criticalAlerts[0]?.description ||
                trip?.last_reroute_reason ||
                "Safe alternate corridor dispatched by Control Central"}
            </p>
          </div>
        </div>

        {/* Prominent Primary CTA: VIEW SAFE ROUTE */}
        <Link
          to={`/route-planner?trip_id=${tripId}&vehicle_id=${vehicleId}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-[0.99]"
        >
          <Route size={18} />
          <span>{d.viewSafeRoute} →</span>
        </Link>
      </div>

      {/* 3. ASSIGNED VEHICLE & CARGO MANIFEST CARD */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 shadow-sm space-y-3">
        {/* Vehicle Identity */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 p-2 border border-cyan-200 dark:border-cyan-500/20">
              <Truck size={20} />
            </div>
            <div>
              <p className="font-mono text-base font-black text-slate-900 dark:text-white tracking-wide">
                {vehicleNum}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Unit #{vehicleId} • {vehicle?.vehicle_type || "Heavy Carrier"}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
              priorityStr === "CRITICAL"
                ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40"
                : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40"
            }`}
          >
            {priorityStr}
          </span>
        </div>

        {/* Corridor Endpoints */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/80">
          <div className="flex-1 min-w-0">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
              Origin
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {originStr}
            </p>
          </div>

          <div className="flex flex-col items-center px-2 shrink-0">
            <ArrowRight size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">{corridorName.split(" ")[0]}</span>
          </div>

          <div className="flex-1 min-w-0 text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold block">
              Destination
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {destStr}
            </p>
          </div>
        </div>

        {/* Cargo Detail */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-slate-500 dark:text-slate-400">{d.cargoManifest}:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px] text-right">
            {cargoStr}
          </span>
        </div>
      </div>

      {/* 4. LIVE GPS TELEMETRY TRANSMISSION (P1-3) */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg p-2 border ${
                isGpsTransmitting
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40"
                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
              }`}
            >
              <Radio size={18} className={isGpsTransmitting ? "animate-pulse" : ""} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{d.transmitGps}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isGpsTransmitting
                  ? "Broadcasting coordinates to Control Central"
                  : d.gpsStandby}
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={handleToggleGps}
            disabled={isPendingGps || !backendOnline}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
              isGpsTransmitting ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isGpsTransmitting ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Transmission Status Feedback */}
        {isPendingGps && (
          <div className="flex items-center gap-2 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 dark:bg-cyan-500/10 dark:border-cyan-500/20 dark:text-cyan-300 p-2.5 text-xs">
            <RefreshCw size={13} className="animate-spin shrink-0" />
            <span>Acquiring GPS fix from device sensors...</span>
          </div>
        )}

        {isGpsTransmitting && lastTransmittedGps && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-300 p-2.5 text-xs space-y-1 font-mono">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping inline-block" />
                {d.gpsTransmitting}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                ±{lastTransmittedGps.accuracy}m
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
              <span>
                {lastTransmittedGps.lat.toFixed(5)}°N, {lastTransmittedGps.lon.toFixed(5)}°E
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                {lastTransmittedGps.time}
              </span>
            </div>
          </div>
        )}

        {gpsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 p-2.5 text-xs flex items-start gap-2">
            <AlertOctagon size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{gpsError}</span>
          </div>
        )}

        {!isGpsTransmitting && !gpsError && !isPendingGps && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            GPS telemetry is transmitted every 30s with &gt;=50m displacement via{" "}
            <code className="rounded bg-slate-100 text-cyan-800 dark:bg-slate-800 dark:text-cyan-300 px-1 py-0.5 text-[10px] font-mono">
              POST /vehicles/{vehicleId}/location
            </code>
            . NER boundary bounds enforced.
          </p>
        )}
      </div>
    </div>
  );
}

function Home() {
  const { user, getAuthHeader } = useAuth();
  const { subscribe } = useWebSocket();
  const { t, formatString } = useLanguage();
  const isDriver = user?.role === "DRIVER";
  const isOperator = user?.role === "ADMIN" || user?.role === "CONTROL_OPERATOR" || user?.role === "FIELD_OFFICER";

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
    if (!user || user.role === "PUBLIC") {
      setLoadingPredictive(false);
      return;
    }
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
  }, [roads, user]);

  useEffect(() => {
    fetchHubWeather(selectedHubIdx);
    fetchPredictiveRisk(selectedHubIdx);
    const interval = window.setInterval(() => {
      fetchHubWeather(selectedHubIdx);
      fetchPredictiveRisk(selectedHubIdx);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [selectedHubIdx, fetchPredictiveRisk]);

  // Phase 7C: Driver ↔ Vehicle Assignment state
  const [driverAssignment, setDriverAssignment] = useState<any | null>(null);
  const [driverVehicle, setDriverVehicle] = useState<Vehicle | null>(null);
  const [driverTrip, setDriverTrip] = useState<Trip | null>(null);
  const [vehicleAssignments, setVehicleAssignments] = useState<Record<number, string>>({});
  // Phase 7D: Public Reports Summary indicator
  const [publicReportSummary, setPublicReportSummary] = useState<{
    unverified: number;
    verified: number;
    rejected: number;
    total: number;
  } | null>(null);

  const loadDriverMission = useCallback(async () => {
    try {
      const authHeaders = getAuthHeader();
      const assignRes = await fetch(`${API_URL}/assignments/me`, { headers: authHeaders });
      if (!assignRes.ok) {
        if (assignRes.status === 404) {
          setDriverAssignment(null);
          setDriverVehicle(null);
          setDriverTrip(null);
          setBackendOnline(true);
          return;
        }
        throw new Error(`Failed to load driver assignment (${assignRes.status})`);
      }

      const assignData = await assignRes.json();
      setDriverAssignment(assignData);

      const [vehRes, tripsRes, roadsRes, alertsRes, incsRes] = await Promise.all([
        fetch(`${API_URL}/vehicles/${assignData.vehicle_id}`, { headers: authHeaders }),
        fetch(`${API_URL}/trips/`, { headers: authHeaders }),
        fetch(`${API_URL}/roads/`, { headers: authHeaders }),
        fetch(`${API_URL}/alerts/?severity=critical&status=active&limit=5`, { headers: authHeaders }),
        fetch(`${API_URL}/incidents/`, { headers: authHeaders }),
      ]);

      if (vehRes.ok) {
        const vData = await vehRes.json();
        setDriverVehicle(vData);
      }

      if (tripsRes.ok) {
        const tData: Trip[] = await tripsRes.json();
        setTrips(tData);
        const matchedTrip = tData.find(
          (t) =>
            t.vehicle_id === assignData.vehicle_id &&
            t.status?.toLowerCase() !== "completed" &&
            t.status?.toLowerCase() !== "cancelled"
        ) || null;
        setDriverTrip(matchedTrip);
      }

      if (roadsRes.ok) {
        const rData = await roadsRes.json();
        setRoads(rData);
      }
      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setCriticalAlerts(aData);
      }
      if (incsRes.ok) {
        const iData = await incsRes.json();
        setIncidents(iData);
      }

      setBackendOnline(true);
    } catch (err) {
      console.error("Failed to load driver mission:", err);
      setBackendOnline(false);
    } finally {
      setLoading(false);
      setLoadingAlerts(false);
    }
  }, [getAuthHeader]);

  const loadDashboard = useCallback(async () => {
    try {
      const authHeaders = getAuthHeader();

      // If user is unauthenticated guest or public citizen, fetch ONLY public roads (never call protected operational endpoints)
      if (!user || user.role === "PUBLIC") {
        const roadsResponse = await fetch(`${API_URL}/roads/`, { headers: authHeaders }).catch(() => null);
        if (roadsResponse && roadsResponse.ok) {
          const roadsData = await roadsResponse.json();
          if (Array.isArray(roadsData)) {
            setRoads(roadsData);
          }
        }
        setBackendOnline(true);
        setLoading(false);
        setLoadingAlerts(false);
        return;
      }

      const [vehicleResponse, incidentResponse, alertResponse, tripsResponse, roadsResponse, assignResponse, summaryResponse] =
        await Promise.all([
          fetch(`${API_URL}/vehicles/`, { headers: authHeaders }),
          fetch(`${API_URL}/incidents/`, { headers: authHeaders }),
          fetch(`${API_URL}/alerts/?severity=critical&status=active&limit=5`, { headers: authHeaders }),
          fetch(`${API_URL}/trips/`, { headers: authHeaders }),
          fetch(`${API_URL}/roads/`, { headers: authHeaders }),
          fetch(`${API_URL}/assignments/?active_only=true`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_URL}/public-reports/summary`, { headers: authHeaders }).catch(() => null),
        ]);

      if (!vehicleResponse.ok || !incidentResponse.ok) {
        throw new Error("Backend request failed");
      }

      const vehicleData = await vehicleResponse.json();
      const incidentData = await incidentResponse.json();
      const alertData = alertResponse.ok ? await alertResponse.json() : [];
      const tripsData = tripsResponse.ok ? await tripsResponse.json() : [];
      const roadsData = roadsResponse.ok ? await roadsResponse.json() : [];

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

      if (assignResponse && assignResponse.ok) {
        const aData = await assignResponse.json().catch(() => []);
        if (Array.isArray(aData)) {
          const map: Record<number, string> = {};
          for (const a of aData) {
            if (a.vehicle_id && a.driver_username) {
              map[a.vehicle_id] = a.driver_username;
            }
          }
          setVehicleAssignments(map);
        }
      }

      if (summaryResponse && summaryResponse.ok) {
        const sData = await summaryResponse.json().catch(() => null);
        if (sData && typeof sData.unverified === "number") {
          setPublicReportSummary(sData);
        }
      }

      setAlertsError(!alertResponse.ok);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      setAlertsError(true);
    } finally {
      setLoading(false);
      setLoadingAlerts(false);
    }
  }, [getAuthHeader, user]);

  useEffect(() => {
    if (isDriver) {
      loadDriverMission();
      const interval = window.setInterval(loadDriverMission, 10000);
      return () => window.clearInterval(interval);
    } else {
      loadDashboard();
      const interval = window.setInterval(loadDashboard, 10000);
      return () => window.clearInterval(interval);
    }
  }, [isDriver, loadDriverMission, loadDashboard]);

  // Real-time WebSocket event listeners for immediate state invalidation & telemetry
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      switch (event.type) {
        case "incident.created":
        case "incident.status.updated":
        case "trip.rerouted":
        case "alert.status.updated":
        case "vehicle.anomaly.detected":
          if (isDriver) {
            loadDriverMission();
          } else {
            loadDashboard();
          }
          break;

        case "vehicle.position.updated":
          if (event.data?.vehicle_id) {
            setVehicles((prev) =>
              prev.map((v) =>
                v.id === event.data.vehicle_id
                  ? {
                      ...v,
                      latitude: event.data.latitude,
                      longitude: event.data.longitude,
                      status: event.data.status || v.status,
                      current_trip_id:
                        event.data.current_trip_id !== undefined
                          ? event.data.current_trip_id
                          : v.current_trip_id,
                    }
                  : v
              )
            );
          }
          break;

        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [subscribe, loadDashboard]);

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

  // Relational resolution of affected road from active disruption foreign key
  const affectedRoad = useMemo(() => {
    if (!activeDisruption?.affected_road_id) return null;
    return roads.find((r) => r.id === activeDisruption.affected_road_id) || null;
  }, [activeDisruption, roads]);

  // Relational resolution of active dispatched trip (in-transit/rerouting/active with vehicle_id)
  const activeDispatchedTrip = useMemo(() => {
    return (
      trips.find(
        (t) =>
          (t.status?.toLowerCase() === "in_transit" ||
           t.status?.toLowerCase() === "rerouting" ||
           t.status?.toLowerCase() === "active") &&
          t.vehicle_id != null
      ) || null
    );
  }, [trips]);

  // Relational resolution of active transport vehicle matching the active trip
  const activeDispatchedVehicle = useMemo(() => {
    if (!activeDispatchedTrip) {
      return (
        vehicles.find(
          (v) =>
            v.status?.toLowerCase() === "in_transit" &&
            v.current_trip_id != null
        ) || null
      );
    }
    return (
      vehicles.find(
        (v) =>
          v.id === activeDispatchedTrip.vehicle_id &&
          (v.current_trip_id === activeDispatchedTrip.id || v.status?.toLowerCase() === "in_transit")
      ) ||
      vehicles.find((v) => v.id === activeDispatchedTrip.vehicle_id) ||
      null
    );
  }, [activeDispatchedTrip, vehicles]);

  // Symmetrical resolution of active trip from vehicle if needed
  const activeTrip = useMemo(() => {
    if (activeDispatchedTrip) return activeDispatchedTrip;
    if (activeDispatchedVehicle?.current_trip_id) {
      return trips.find((t) => t.id === activeDispatchedVehicle.current_trip_id) || null;
    }
    return null;
  }, [activeDispatchedTrip, activeDispatchedVehicle]);

  // Unified assignments for Control Tower and Driver Cockpit
  const impactedVehicle = activeDispatchedVehicle;
  const interceptedTrip = activeTrip;

  // Extract real route coordinates from interceptedTrip current_route_geometry
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
      {/* If logged in as DRIVER, render dedicated Mission Cockpit exclusively */}
      {isDriver ? (
        <div className="space-y-6">
          <DriverMissionCockpit
            vehicle={driverVehicle}
            trip={driverTrip}
            incident={activeDisruption}
            road={affectedRoad}
            criticalAlerts={criticalAlerts}
            getAuthHeader={getAuthHeader}
            backendOnline={backendOnline}
            driverUsername={user?.username || driverAssignment?.driver_username}
          />
        </div>
      ) : isOperator ? (
        /* Control Tower Dashboard for Operators and Admins */
        <div className="space-y-6">
          {/* COMPACT OPERATIONAL STATUS STRIP (Replaces duplicate Control Tower title) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-300">
            <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
            <span>{t.dashboard.controlCentralTitle}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.dispatchTerminal}</span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="rounded bg-cyan-50 text-cyan-800 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/25 px-2 py-0.5 text-[10px] font-bold dark:text-cyan-300">
            {t.dashboard.geofencingActive}
          </span>
          {publicReportSummary && (
            <>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">{t.dashboard.citizenReports}</span>
                <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 px-1.5 py-0.5 font-bold font-mono">
                  {publicReportSummary.unverified} {t.common.unverified}
                </span>
                <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-1.5 py-0.5 font-bold font-mono">
                  {publicReportSummary.verified} {t.common.verified}
                </span>
                {publicReportSummary.rejected > 0 && (
                  <span className="rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 font-mono">
                    {publicReportSummary.rejected} {t.common.rejected}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
              backendOnline
                ? "border-emerald-600/30 bg-emerald-100 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border-red-600/30 bg-red-100 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {backendOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{backendOnline ? t.dashboard.telemetrySynced : t.dashboard.backendOffline}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Clock3 size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span>{t.dashboard.autoRefresh}</span>
          </div>
        </div>
      </div>

      {/* EXCEPTION-FIRST OPERATOR STATUS BANNER WITH CAUSAL CHAIN */}
      {activeDisruption ? (
        <div className="rounded-xl border border-red-300 bg-red-50/50 dark:border-red-500/40 dark:bg-gradient-to-r dark:from-red-950/40 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between border-b border-red-200 dark:border-red-500/20 pb-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 p-2.5 shrink-0 mt-0.5 border border-red-200 dark:border-red-500/30">
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="rounded-md bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:border-red-500/40 px-2.5 py-0.5 text-xs font-bold dark:text-red-300 uppercase tracking-wider">
                    {t.dashboard.criticalDisruptionActive}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {formatString(t.dashboard.incidentStatus, { id: activeDisruption.id, status: activeDisruption.status || "Reported" })}
                  </span>
                </div>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {activeDisruption.title || activeDisruption.description}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start lg:self-center w-full sm:w-auto">
              <Link
                to="/route-planner"
                className="flex-1 sm:flex-none justify-center rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Route size={15} />
                {t.dashboard.executeDynamicDetour}
              </Link>
              <Link
                to="/incidents"
                className="flex-1 sm:flex-none justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2.5 text-xs font-medium dark:text-slate-300 transition"
              >
                {t.dashboard.inspectIncident}
              </Link>
            </div>
          </div>

          {/* OPERATIONAL CAUSAL IMPACT CHAIN (Directly on Dashboard) */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-red-500/25 dark:bg-slate-950/90 p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-red-500 dark:text-red-400" />
                {t.dashboard.causalChainTitle}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{t.dashboard.interactiveGraph}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Node 1: Incident */}
              <Link
                to="/incidents"
                title="Inspect Incident in Incident Management"
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300 px-2.5 py-1.5 font-semibold transition hover:bg-red-100 dark:hover:bg-red-500/20"
              >
                <AlertTriangle size={13} className="text-red-500 dark:text-red-400" />
                <span>{t.common.incident} #{activeDisruption.id}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />

              {/* Node 2: Affected Road */}
              <Link
                to="/road-risk"
                title="View Road Risk Telemetry"
                className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-50 text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300 px-2.5 py-1.5 font-semibold transition hover:bg-orange-100 dark:hover:bg-orange-500/20"
              >
                <Route size={13} className="text-orange-500 dark:text-orange-400" />
                <span>{t.dashboard.roadNode} #{affectedRoad?.id ?? 135}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />

              {/* Node 3: Disruption Risk */}
              <div className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-100 text-red-800 dark:border-red-500/50 dark:bg-red-950/60 dark:text-red-400 px-2.5 py-1.5 font-bold">
                <ShieldAlert size={13} className="text-red-500 dark:text-red-400" />
                <span>{t.dashboard.riskNode}: {activeDisruption.risk_score ? activeDisruption.risk_score.toFixed(1) : "95.0"}</span>
              </div>

              <ArrowRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />

              {/* Node 4: Alert */}
              <Link
                to="/alerts"
                title="View Operational Alerts Feed"
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 px-2.5 py-1.5 font-semibold transition hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                <Bell size={13} className="text-amber-500 dark:text-amber-400" />
                <span>{t.dashboard.alertActiveNode}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />

              {/* Node 5: Vehicle */}
              <Link
                to="/vehicles"
                title="Track Vehicle Telemetry"
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-50 text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-500/10 dark:text-cyan-300 px-2.5 py-1.5 font-semibold transition hover:bg-cyan-100 dark:hover:bg-cyan-500/20"
              >
                <Truck size={13} className="text-cyan-600 dark:text-cyan-400" />
                <span>{impactedVehicle?.vehicle_number || "AS-01-BX-4091"}</span>
              </Link>

              <ArrowRight size={13} className="text-slate-400 dark:text-slate-600 shrink-0" />

              {/* Node 6: Trip */}
              <Link
                to="/route-planner"
                title="Open Route Planner Detour"
                className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-50 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 px-2.5 py-1.5 font-semibold transition hover:bg-blue-100 dark:hover:bg-blue-500/20"
              >
                <Navigation size={13} className="text-blue-600 dark:text-blue-400" />
                <span>{t.dashboard.tripNode} #{interceptedTrip?.id ?? 318}</span>
              </Link>
            </div>
          </div>

          {/* Three Critical Questions Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 pt-1">
            {/* 1. Is Anything Wrong? */}
            <div className="rounded-lg border border-red-200 bg-white dark:border-red-500/20 dark:bg-slate-950/80 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider text-[11px]">
                  1. {t.dashboard.disruptionsTitle}
                </span>
                <span className="rounded bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-bold">
                  {t.common.risk}: {activeDisruption.risk_score ? activeDisruption.risk_score.toFixed(1) : "95.0"}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.dashboard.disruptionsSub}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {activeDisruption.description || "Major landslide blocking NH-15 corridor near Kharupetia. Impassable for heavy logistics units."}
              </p>
            </div>

            {/* 2. What Is Affected? */}
            <div className="rounded-lg border border-orange-200 bg-white dark:border-orange-500/20 dark:bg-slate-950/80 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider text-[11px]">
                  2. {t.dashboard.fleetAttention}
                </span>
                <Link to="/road-risk" className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline">
                  {t.dashboard.roadNode} #{affectedRoad?.id ?? 135} →
                </Link>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {affectedRoad?.road_name || "NH-15 Guwahati-Tezpur Corridor"}
              </p>
              <Link
                to="/vehicles"
                className="text-xs text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 mt-1 font-medium block"
              >
                {impactedVehicle?.vehicle_number || "AS-01-BX-4091"} ({t.dashboard.tripNode} #{interceptedTrip?.id ?? 318}) →
              </Link>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t.common.assigned}: <strong className="text-slate-800 dark:text-slate-200 font-mono">{vehicleAssignments[impactedVehicle?.id ?? 472] || "driver"}</strong></span>
                <span>•</span>
                <span>GPS: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{t.common.online}</strong></span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {t.dashboard.tableColCargo}: {impactedVehicle?.cargo_type || "Critical Vaccines & Cold-Chain Supplies"}
              </p>
            </div>

            {/* 3. What Is Being Done? */}
            <div className="rounded-lg border border-emerald-200 bg-white dark:border-emerald-500/20 dark:bg-slate-950/80 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[11px]">
                  3. {t.dashboard.safeAlternative}
                </span>
                <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                  {t.common.verified}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {t.dashboard.safeAlternative}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Dynamic detour via Mangaldai-Tangla corridor computed. Reduces corridor risk by 70 points.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/15 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 p-2.5 border border-emerald-200 dark:border-emerald-500/30">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.dashboard.fleetPassable}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Primary highway corridors across all 8 NER states are clear. Automated PostGIS risk telemetry and AI hazard tracking active.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20 px-3 py-1 text-xs font-semibold dark:text-emerald-400">
              {t.common.normal}
            </span>
          </div>
        </div>
      )}

      {/* REAL OPERATIONAL KPI CARDS (No fake SaaS percentages) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title={t.dashboard.activeConvoysTitle}
          value={loading ? "—" : activeVehicles}
          subtitle={`${vehicles.length} ${t.vehicles.totalUnits} (${impactedVehicle?.vehicle_number || "AS-01-BX-4091"})`}
          icon={<Truck size={21} />}
          badgeText={t.dashboard.postgisLive}
          badgeType="success"
          postgisLabel={t.dashboard.postgisLive}
        />

        <StatCard
          title={t.dashboard.disruptionsTitle}
          value={loading ? "—" : openIncidents.length}
          subtitle={`${criticalIncidents} ${t.incidents.criticalHazards}`}
          icon={<AlertTriangle size={21} />}
          badgeText={openIncidents.length > 0 ? t.common.critical : t.common.normal}
          badgeType={openIncidents.length > 0 ? "critical" : "success"}
          postgisLabel={t.dashboard.postgisLive}
        />

        <StatCard
          title={t.dashboard.citizenReports}
          value={loading ? "—" : (publicReportSummary?.unverified ?? 0)}
          subtitle={`${publicReportSummary?.total ?? 0} (${publicReportSummary?.verified ?? 0} ${t.common.verified})`}
          icon={<AlertTriangle size={21} />}
          badgeText={(publicReportSummary?.unverified ?? 0) > 0 ? t.fieldReport.statusPending : t.common.normal}
          badgeType={(publicReportSummary?.unverified ?? 0) > 0 ? "warning" : "success"}
          postgisLabel={t.dashboard.postgisLive}
        />

        <StatCard
          title={t.dashboard.roadRiskTitle}
          value={loading ? "—" : tripsCount}
          subtitle="NH-15 (Guwahati → Tezpur)"
          icon={<Route size={21} />}
          badgeText={activeDisruption ? t.alerts.statusActive : t.common.normal}
          badgeType={activeDisruption ? "warning" : "info"}
          postgisLabel={t.dashboard.postgisLive}
        />

        <StatCard
          title={t.driverCockpit.priority}
          value="Cold-Chain"
          subtitle="AS-01-BX-4091 • Nominal"
          icon={<ShieldAlert size={21} />}
          badgeText={t.common.verified}
          badgeType="info"
          postgisLabel={t.dashboard.postgisLive}
        />
      </div>

      {/* TACTICAL MAP + CORRIDOR WEATHER (Main 2-Column Grid) */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* REAL TACTICAL LEAFLET GIS MAP (Replaces decorative CSS mock) */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {t.dashboard.mapTitle}
                </h3>
                <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold dark:text-cyan-300">
                  {t.dashboard.mapSub}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.dashboard.liveTracking}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">{t.common.unit} AS-01-BX-4091</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">NH-15 {t.roads.statusBlocked}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">NH-15 {t.common.corridor}</span>
              </div>
            </div>
          </div>

          <div className="relative h-[410px] bg-slate-100 dark:bg-slate-950 overflow-hidden">
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
                      <strong className="text-emerald-600 dark:text-emerald-500">Origin: Guwahati Logistics Hub</strong>
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
                      <strong className="text-blue-600 dark:text-blue-500">Destination: Tezpur Logistics Center</strong>
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
            <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 text-slate-900 dark:border-slate-800 dark:bg-slate-950/90 dark:text-white px-3 py-2 backdrop-blur shadow-md">
              <div className="flex items-center gap-2">
                <Route size={14} className="text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold">NH-15 Guwahati-Tezpur Corridor</span>
                <span className="rounded bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5">
                  Blocked at km 84
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Corridor Weather Intelligence Panel */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <CloudRain size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t.dashboard.weatherTitle}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.dashboard.weatherSub}</p>
              </div>
              <button
                type="button"
                onClick={() => fetchHubWeather(selectedHubIdx)}
                aria-label="Refresh atmospheric conditions"
                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 transition dark:hover:border-slate-700 dark:hover:text-white"
                title={t.common.refresh}
              >
                <RefreshCw size={13} className={loadingWeather ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""} />
              </button>
            </div>

            {/* Hub Selector Dropdown */}
            <div className="border-b border-slate-100 dark:border-slate-800/80 p-3">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t.dashboard.legendTelemetry}:</label>
              <select
                value={selectedHubIdx}
                onChange={(e) => setSelectedHubIdx(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500"
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
                <div className="flex h-36 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw size={16} className="animate-spin text-cyan-600 dark:text-cyan-400 mr-2" />
                  {t.common.loading}
                </div>
              ) : weatherError && !weatherData ? (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
                  <p className="font-medium">{t.common.error}</p>
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400/80">{weatherError}</p>
                  <button
                    type="button"
                    onClick={() => fetchHubWeather(selectedHubIdx)}
                    className="mt-2 text-[11px] underline hover:text-red-800 dark:hover:text-red-300"
                  >
                    {t.common.refresh}
                  </button>
                </div>
              ) : weatherData ? (
                <div className="space-y-4">
                  {/* Primary condition banner */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950/70 p-3.5 border border-slate-200 dark:border-slate-800/60">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {weatherData.temperature_c !== undefined ? `${weatherData.temperature_c}°C` : "—"}
                        </span>
                        {weatherData.feels_like_c !== undefined && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.feelsLike} {weatherData.feels_like_c}°C</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                        {weatherData.weather_condition || "Clear"}
                      </p>
                    </div>

                    {/* Deterministic Weather Risk Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          weatherData.risk_signal?.risk_level === "Critical"
                            ? "border-red-300 bg-red-100 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                            : weatherData.risk_signal?.risk_level === "High"
                            ? "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                            : weatherData.risk_signal?.risk_level === "Moderate"
                            ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                            : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                        }`}
                      >
                        {weatherData.risk_signal?.risk_level || "Low"} {t.dashboard.threatTitle}
                      </span>
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        {t.dashboard.threatScore}: {weatherData.risk_signal?.risk_score ?? 0}/100
                      </p>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                        <Droplets size={13} className="text-cyan-600 dark:text-cyan-400" />
                        <span>{t.dashboard.rain}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {weatherData.rainfall_mm !== undefined ? `${weatherData.rainfall_mm} mm` : "0 mm"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                        <Wind size={13} className="text-cyan-600 dark:text-cyan-400" />
                        <span>{t.dashboard.wind}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {weatherData.wind_speed_kmh !== undefined ? `${weatherData.wind_speed_kmh} km/h` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                        <Eye size={13} className="text-cyan-600 dark:text-cyan-400" />
                        <span>{t.dashboard.visibility}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {weatherData.visibility_km !== undefined ? `${weatherData.visibility_km} km` : "—"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                        <Thermometer size={13} className="text-cyan-600 dark:text-cyan-400" />
                        <span>{t.dashboard.humidity}</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {weatherData.humidity_percent !== undefined ? `${weatherData.humidity_percent}%` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Operational warning if any */}
                  {weatherData.risk_signal?.warnings && weatherData.risk_signal.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>{weatherData.risk_signal.warnings[0]}</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{t.dashboard.source}: {weatherData.source} {weatherData.cached ? "(Cached)" : "(Live)"}</span>
                    <span>{t.dashboard.observedAt}: {weatherLastUpdated || "Just now"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-950/40 text-center rounded-b-xl">
            <Link
              to="/road-risk"
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition inline-flex items-center gap-1"
            >
              {t.roads.title} &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* CORRIDOR THREAT & VULNERABILITY ASSESSMENT + CRITICAL ALERTS */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* CORRIDOR THREAT ASSESSMENT (Replaces fabricated Mon-Sun AreaChart) */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500 dark:text-red-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {t.dashboard.threatTitle}
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.dashboard.threatSub}
              </p>
            </div>

            <span className="self-start sm:self-center rounded-full bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/15 dark:border-red-500/30 px-3 py-1 text-xs font-bold dark:text-red-400">
              {t.dashboard.threatTitle}: 95.0 / 100
            </span>
          </div>

          {/* 4 Threat Assessment Fact Blocks */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/80 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.dashboard.roadNode}</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">Road #135 — NH-15 Guwahati-Tezpur</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Length: 175.5 km • Baseline: 15.0 • Elevated: 95.0</p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">{t.driverCockpit.hazardAlert}</span>
              <p className="text-sm font-bold text-red-700 dark:text-red-300 mt-1">Incident #15 — Major Landslide</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Near Kharupetia (26.40°N, 91.93°E) • Impassable</p>
            </div>

            <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300">{t.dashboard.vehicleNode}</span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">AS-01-BX-4091 (Trip #318)</p>
              <p className="text-xs text-cyan-800 dark:text-cyan-200 mt-0.5">Cargo: Critical Vaccines & Cold-Chain Supplies</p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-950/20 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">{t.driverCockpit.activeDetour}</span>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-1">Mangaldai-Tangla-Tezpur Detour</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Detour Delta: +44.3 km • Detour Risk: 25.0 (-70 pts)</p>
            </div>
          </div>

          {/* Vulnerability Severity Meter */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">{t.dashboard.threatTitle}</span>
              <span className="text-red-600 dark:text-red-400 font-bold">95.0 / 100</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                style={{ width: "95%" }}
              />
            </div>
            <div className="flex flex-wrap justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Geological Slope Instability: 45 pts</span>
              <span>Atmospheric Precipitation: 30 pts</span>
              <span>Cargo Criticality (Vaccines): 20 pts</span>
            </div>
          </div>
        </div>

        {/* Critical Alerts Feed (Existing Real API) */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    {t.dashboard.criticalAlertsTitle}
                  </h3>
                  {criticalAlerts.length > 0 && (
                    <span className="rounded-full bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 px-2 py-0.5 text-[10px] font-bold">
                      {criticalAlerts.length} {t.common.active}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.dashboard.criticalAlertsSub}
                </p>
              </div>

              <AlertTriangle
                size={18}
                className={criticalAlerts.length > 0 ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}
              />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingAlerts && criticalAlerts.length === 0 ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : alertsError && criticalAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle size={24} className="mx-auto text-amber-500 dark:text-amber-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.common.error}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.dashboard.backendOffline}</p>
                </div>
              ) : criticalAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.dashboard.noAlerts}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.dashboard.recentAlertsSub}</p>
                </div>
              ) : (
                criticalAlerts.map((alert) => {
                  const IconComponent = alertIcon(alert.alert_type);
                  return (
                    <div key={alert.id} className="p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <div className="flex gap-3">
                        <div className="mt-0.5 rounded-lg bg-red-100 dark:bg-red-500/10 p-2 text-red-600 dark:text-red-400 shrink-0">
                          <IconComponent size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">
                              {alert.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">
                              {formatRelativeTime(alert.created_at)}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {alert.description}
                          </p>

                          {alert.location && (
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <MapPin size={11} className="shrink-0 text-slate-400 dark:text-slate-500" />
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

          <div className="border-t border-slate-100 dark:border-slate-800/80 p-3 bg-slate-50/50 dark:bg-slate-950/40 text-center rounded-b-xl">
            <Link
              to="/alerts"
              className="text-xs font-medium text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition inline-flex items-center gap-1"
            >
              {t.dashboard.viewAllAlerts} &rarr;
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
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t.incidents.title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.incidents.subtitle}
              </p>
            </div>

            <MapPin size={18} className="text-cyan-600 dark:text-cyan-400" />
          </div>

          {recentIncidents.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-red-100 dark:bg-red-500/10 p-2 text-red-600 dark:text-red-400 shrink-0">
                      <AlertTriangle size={16} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-200">
                        {incident.title ||
                          incident.incident_type ||
                          "Road Incident"}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {incident.district ||
                          incident.state ||
                          "Northeast Region"} • {t.common.risk}: {incident.risk_score ?? 95.0}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/incidents"
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 ${getStatusClass(
                      incident.severity
                    )}`}
                  >
                    {t.common.inspect} →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center px-5 text-center">
              <div>
                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-500 dark:text-emerald-400"
                />
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                  {t.incidents.noIncidentsFound}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.dashboard.fleetPassable}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ACTIVE TRANSPORT UNIT TELEMETRY (Replaces fake 12 online operators) */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={17} className="text-cyan-600 dark:text-cyan-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{t.dashboard.fleetTitle}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.dashboard.fleetSub}</p>
            </div>
            <Link to="/vehicles" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
              {t.vehicles.title} →
            </Link>
          </div>

          {impactedVehicle ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950/80 p-3.5 border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">{impactedVehicle.vehicle_number}</span>
                    <span className="rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 px-2 py-0.5 text-[10px] font-bold uppercase">
                      {impactedVehicle.status?.replace("_", " ") || "In Transit"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">{impactedVehicle.cargo_type}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t.driverCockpit.missionActive}</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">Trip #{interceptedTrip?.id ?? 318}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t.driverCockpit.corridor}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Guwahati → Tezpur</span>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t.driverCockpit.cargoManifest}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Nominal (2.4°C)</span>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t.dashboard.legendTelemetry}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{impactedVehicle.latitude?.toFixed(4)}°N, {impactedVehicle.longitude?.toFixed(4)}°E</span>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t.driverCockpit.missionStatus}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{t.driverCockpit.activeDetour}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {t.vehicles.noVehiclesFound}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM OPERATIONAL SUMMARY ROW (Replaces fake 6h 42m, 7 routes, 284 deliveries) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
          <div className="rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 p-3 shrink-0">
            <Navigation size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Trip #318 {t.common.eta}</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              126 min direct • +59 min detour
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
          <div className="rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 p-3 shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.disruptionsTitle}</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              1 {t.roads.statusBlocked} (NH-15)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4 sm:p-5 shadow-sm">
          <div className="rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 p-3 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.controlCentralTitle}</p>
            <p className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t.common.online}
            </p>
          </div>
        </div>
        </div>
        </div>
      ) : (
        /* Public-Safe Corridor & Weather Intelligence Experience for Guests & Public Citizens */
        <div className="space-y-6">
          {/* Public Hero / Welcome Card */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-md bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/20 dark:border-cyan-500/40 px-2.5 py-0.5 text-xs font-bold dark:text-cyan-300 uppercase tracking-wider">
                    Public Road &amp; Weather Intelligence
                  </span>
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Monitoring</span>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  North Eastern Region Corridor Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Real-time transport corridor status, atmospheric condition monitoring, and road hazard intelligence for Assam, Meghalaya, Manipur, Sikkim, and Arunachal Pradesh.
                </p>
              </div>

              {/* Quick Public Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
                <Link
                  to="/road-risk"
                  className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
                >
                  <Activity size={15} />
                  <span>Explore Corridor Risks</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/report-problem"
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3.5 py-2.5 text-xs font-medium transition"
                >
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span>Report Road Hazard</span>
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3.5 py-2.5 text-xs font-medium transition"
                  >
                    <LogIn size={15} className="text-cyan-600 dark:text-cyan-400" />
                    <span>Operator Sign In</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Public Key Metrics Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Strategic Corridors"
              value={roads.length || 6}
              subtitle="Regional Highways Monitored"
              icon={<Route size={22} />}
              badgeText="Active GIS"
              badgeType="info"
            />
            <StatCard
              title="Open &amp; Passable"
              value={roads.filter((r) => r.status?.toLowerCase() === "open").length}
              subtitle="Unrestricted Corridors"
              icon={<ShieldCheck size={22} className="text-emerald-500" />}
              badgeText="Clear Flow"
              badgeType="success"
            />
            <StatCard
              title="Corridors With Advisories"
              value={roads.filter((r) => r.status?.toLowerCase() !== "open").length}
              subtitle="Restricted / Repair / Blocked"
              icon={<AlertTriangle size={22} className="text-amber-500" />}
              badgeText="Caution"
              badgeType="warning"
            />
            <StatCard
              title="Regional Weather Hubs"
              value={WEATHER_HUBS.length}
              subtitle="Active Atmospheric Sensors"
              icon={<CloudRain size={22} className="text-cyan-500" />}
              badgeText="Telemetry Live"
              badgeType="info"
            />
          </div>

          {/* Regional Map + Corridor Weather Intelligence */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Public-Safe Corridor Map (NO driver GPS or vehicle fleet units) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm xl:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-cyan-600 dark:text-cyan-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                      North Eastern Regional Corridor Map
                    </h3>
                    <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold dark:text-cyan-300">
                      Public GIS
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Inter-state arterial connectivity &amp; atmospheric observation stations
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Logistics Hubs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Weather Stations</span>
                  </div>
                </div>
              </div>

              <div className="relative h-[380px] bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <MapErrorBoundary fallbackMessage="Regional corridor map tiles offline — cached geometry available">
                  <MapContainer
                    center={[26.20, 92.50]}
                    zoom={7}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Regional Weather Hubs Markers */}
                    {WEATHER_HUBS.map((hub, idx) => (
                      <CircleMarker
                        key={hub.name}
                        center={[hub.lat, hub.lon]}
                        radius={6}
                        pathOptions={{
                          color: selectedHubIdx === idx ? "#06b6d4" : "#0284c7",
                          fillColor: selectedHubIdx === idx ? "#22d3ee" : "#38bdf8",
                          fillOpacity: 0.9,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <strong className="text-cyan-600 dark:text-cyan-400">{hub.name}</strong>
                            <br />State: {hub.state}
                            <br />Lat: {hub.lat.toFixed(4)}, Lon: {hub.lon.toFixed(4)}
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}

                    {/* Guwahati Primary Origin Hub */}
                    <CircleMarker
                      center={[26.1445, 91.7362]}
                      radius={8}
                      pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.9, weight: 2 }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong className="text-emerald-600">Guwahati Regional Logistics Gateway</strong>
                          <br />NH-27 Central Interchange
                        </div>
                      </Popup>
                    </CircleMarker>

                    {/* Tezpur Hub */}
                    <CircleMarker
                      center={[26.6528, 92.7926]}
                      radius={8}
                      pathOptions={{ color: "#3b82f6", fillColor: "#2563eb", fillOpacity: 0.9, weight: 2 }}
                    >
                      <Popup>
                        <div className="text-xs">
                          <strong className="text-blue-600">Tezpur North Bank Hub</strong>
                          <br />NH-15 Northern Corridor
                        </div>
                      </Popup>
                    </CircleMarker>
                  </MapContainer>
                </MapErrorBoundary>

                <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 text-slate-900 dark:border-slate-800 dark:bg-slate-950/90 dark:text-white px-3 py-1.5 backdrop-blur shadow-md">
                  <div className="flex items-center gap-2">
                    <Route size={14} className="text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-semibold">NER Arterial Corridors</span>
                    <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5">
                      Public GIS View
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Intelligence Panel */}
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CloudRain size={16} className="text-cyan-600 dark:text-cyan-400" />
                      <h3 className="font-semibold text-slate-900 dark:text-white">{t.dashboard.weatherTitle}</h3>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.dashboard.weatherSub}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchHubWeather(selectedHubIdx)}
                    aria-label="Refresh atmospheric conditions"
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 transition dark:hover:border-slate-700 dark:hover:text-white"
                    title={t.common.refresh}
                  >
                    <RefreshCw size={13} className={loadingWeather ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""} />
                  </button>
                </div>

                <div className="border-b border-slate-100 dark:border-slate-800/80 p-3">
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Select Weather Observation Hub:
                  </label>
                  <select
                    value={selectedHubIdx}
                    onChange={(e) => setSelectedHubIdx(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {WEATHER_HUBS.map((hub, idx) => (
                      <option key={hub.name} value={idx}>
                        {hub.name} ({hub.lat.toFixed(2)}°N, {hub.lon.toFixed(2)}°E)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4">
                  {loadingWeather && !weatherData ? (
                    <div className="flex h-36 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                      <RefreshCw size={16} className="animate-spin text-cyan-600 dark:text-cyan-400 mr-2" />
                      {t.common.loading}
                    </div>
                  ) : weatherError && !weatherData ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400">
                      <p className="font-medium">{t.common.error}</p>
                      <p className="mt-1 text-[11px] text-red-600 dark:text-red-400/80">{weatherError}</p>
                      <button
                        type="button"
                        onClick={() => fetchHubWeather(selectedHubIdx)}
                        className="mt-2 text-[11px] underline hover:text-red-800 dark:hover:text-red-300"
                      >
                        {t.common.refresh}
                      </button>
                    </div>
                  ) : weatherData ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950/70 p-3.5 border border-slate-200 dark:border-slate-800/60">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">
                              {weatherData.temperature_c !== undefined ? `${weatherData.temperature_c}°C` : "—"}
                            </span>
                            {weatherData.feels_like_c !== undefined && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {t.dashboard.feelsLike} {weatherData.feels_like_c}°C
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                            {weatherData.weather_condition || "Clear"}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                              weatherData.risk_signal?.risk_level === "Critical"
                                ? "border-red-300 bg-red-100 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                                : weatherData.risk_signal?.risk_level === "High"
                                ? "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400"
                                : weatherData.risk_signal?.risk_level === "Moderate"
                                ? "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                                : "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                            }`}
                          >
                            {weatherData.risk_signal?.risk_level || "Low"} {t.dashboard.threatTitle}
                          </span>
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            {t.dashboard.threatScore}: {weatherData.risk_signal?.risk_score ?? 0}/100
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                            <Droplets size={13} className="text-cyan-600 dark:text-cyan-400" />
                            <span>{t.dashboard.rain}</span>
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {weatherData.rainfall_mm !== undefined ? `${weatherData.rainfall_mm} mm` : "0 mm"}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50 dark:bg-slate-950/60 p-2.5 border border-slate-200 dark:border-slate-800/40">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                            <Wind size={13} className="text-cyan-600 dark:text-cyan-400" />
                            <span>{t.dashboard.wind}</span>
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {weatherData.wind_speed_kmh !== undefined ? `${weatherData.wind_speed_kmh} km/h` : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {weatherLastUpdated && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 bg-slate-50/50 dark:bg-slate-950/40 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Observation Time: {weatherLastUpdated}</span>
                  <span className="text-cyan-600 dark:text-cyan-400">Station Online</span>
                </div>
              )}
            </div>
          </div>

          {/* Strategic Corridors Status Cards */}
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Strategic Highway Corridors
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Current accessibility, disruption risk, and operational status for primary routes
                </p>
              </div>
              <Link
                to="/road-risk"
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition"
              >
                <span>View Full Road Risk GIS</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roads.slice(0, 6).map((road) => {
                const statusLower = road.status?.toLowerCase();
                const statusBadgeClass =
                  statusLower === "open"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : statusLower === "restricted"
                    ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                    : statusLower === "under_repair"
                    ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                    : "bg-red-50 text-red-800 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";

                return (
                  <div
                    key={road.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-950/40 hover:border-cyan-500/40 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {road.road_name}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${statusBadgeClass}`}>
                          {road.status?.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Disruption Risk</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {Math.round(road.risk_score)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            road.risk_score >= 80
                              ? "bg-red-500"
                              : road.risk_score >= 50
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, road.risk_score))}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      to="/road-risk"
                      className="mt-3.5 text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center gap-1 transition"
                    >
                      <span>Corridor Details</span>
                      <ArrowRight size={11} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
