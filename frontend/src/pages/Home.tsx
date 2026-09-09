import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  CloudRain,
  Droplets,
  Eye,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  Route,
  ShieldAlert,
  Thermometer,
  Truck,
  Users,
  Wifi,
  WifiOff,
  Wind,
} from "lucide-react";
import { PredictiveRiskCard } from "../components/PredictiveRiskCard";
import { mlClient } from "../api/mlClient";
import type { PredictiveRiskResult } from "../types/ml";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type RiskPoint = {
  name: string;
  risk: number;
};

const riskData: RiskPoint[] = [
  { name: "Mon", risk: 38 },
  { name: "Tue", risk: 44 },
  { name: "Wed", risk: 41 },
  { name: "Thu", risk: 57 },
  { name: "Fri", risk: 52 },
  { name: "Sat", risk: 68 },
  { name: "Sun", risk: 61 },
];

const regions = [
  {
    name: "Assam",
    short: "AS",
    vehicles: 12,
    risk: "Moderate",
    riskValue: 48,
  },
  {
    name: "Arunachal Pradesh",
    short: "AR",
    vehicles: 6,
    risk: "High",
    riskValue: 72,
  },
  {
    name: "Meghalaya",
    short: "ML",
    vehicles: 5,
    risk: "Moderate",
    riskValue: 55,
  },
  {
    name: "Mizoram",
    short: "MZ",
    vehicles: 4,
    risk: "High",
    riskValue: 76,
  },
  {
    name: "Tripura",
    short: "TR",
    vehicles: 3,
    risk: "Low",
    riskValue: 31,
  },
];

function getRiskClass(risk: string) {
  if (risk === "High") {
    return "text-red-400 bg-red-500/10 border-red-500/20";
  }

  if (risk === "Moderate") {
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  }

  return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
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

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-cyan-400">
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1 text-xs">
          {trendUp ? (
            <ArrowUpRight size={14} className="text-emerald-400" />
          ) : (
            <ArrowDownRight size={14} className="text-red-400" />
          )}

          <span
            className={
              trendUp ? "text-emerald-400" : "text-red-400"
            }
          >
            {trend}
          </span>

          <span className="text-slate-500">vs last week</span>
        </div>
      )}
    </div>
  );
}

function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([]);
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
      const roadId = (idx % 2) + 1;
      const data = await mlClient.getPredictiveRisk(roadId, hub.lat, hub.lon);
      setPredictiveRisk(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Predictive disruption risk unavailable";
      setPredictiveError(msg);
      setPredictiveRisk(null);
    } finally {
      setLoadingPredictive(false);
    }
  }, []);

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
        const [vehicleResponse, incidentResponse, alertResponse] =
          await Promise.all([
            fetch(`${API_URL}/vehicles/`),
            fetch(`${API_URL}/incidents/`),
            fetch(`${API_URL}/alerts/?severity=critical&status=active&limit=5`),
          ]);

        if (!vehicleResponse.ok || !incidentResponse.ok) {
          throw new Error("Backend request failed");
        }

        const vehicleData = await vehicleResponse.json();
        const incidentData = await incidentResponse.json();
        const alertData = alertResponse.ok ? await alertResponse.json() : [];

        if (!mounted) return;

        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
        setIncidents(Array.isArray(incidentData) ? incidentData : []);
        setCriticalAlerts(Array.isArray(alertData) ? alertData : []);
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

  const delayedVehicles = useMemo(() => {
    return vehicles.filter(
      (vehicle) => vehicle.status?.toLowerCase() === "delayed"
    ).length;
  }, [vehicles]);

  const criticalIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const severity = incident.severity?.toLowerCase();

      return severity === "critical" || severity === "high";
    }).length;
  }, [incidents]);

  const recentIncidents = incidents.slice(0, 5);

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <div className="space-y-6 p-6">

        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Control Tower
              </h2>

              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                  backendOnline
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}
              >
                {backendOnline ? (
                  <Wifi size={13} />
                ) : (
                  <WifiOff size={13} />
                )}

                {backendOnline
                  ? "System Online"
                  : "Backend Offline"}
              </div>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Real-time logistics intelligence across North Eastern India
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2">
            <Clock3 size={16} className="text-cyan-400" />

            <div>
              <p className="text-xs text-slate-500">
                Last synchronized
              </p>

              <p className="text-sm text-slate-300">
                Live • Auto refresh 30s
              </p>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active Vehicles"
            value={loading ? "—" : activeVehicles}
            subtitle={`${vehicles.length || 30} vehicles registered`}
            icon={<Truck size={21} />}
            trend="+12%"
            trendUp
          />

          <StatCard
            title="Open Incidents"
            value={loading ? "—" : incidents.length}
            subtitle={`${criticalIncidents} high priority`}
            icon={<AlertTriangle size={21} />}
            trend="+4%"
            trendUp={false}
          />

          <StatCard
            title="Routes Monitored"
            value="18"
            subtitle="Across 8 NER states"
            icon={<Route size={21} />}
            trend="+8%"
            trendUp
          />

          <StatCard
            title="On-Time Delivery"
            value="91.4%"
            subtitle={`${delayedVehicles} vehicles delayed`}
            icon={<Package size={21} />}
            trend="+3.2%"
            trendUp
          />
        </div>

        {/* Main grid */}
        <div className="grid gap-6 xl:grid-cols-3">

          {/* NER operational map */}
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 xl:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  NER Operational Map
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Vehicle movement and regional risk overview
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Active
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Risk
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  Incident
                </div>
              </div>
            </div>

            <div className="relative h-[390px] overflow-hidden bg-slate-950">

              {/* Grid */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
                  backgroundSize: "35px 35px",
                }}
              />

              {/* Northeast India silhouette approximation */}
              <div className="absolute left-[35%] top-[12%] h-[75%] w-[43%] rotate-[-8deg] rounded-[45%] border border-cyan-500/20 bg-cyan-500/[0.025]" />

              {/* Route lines */}
              <div className="absolute left-[24%] top-[48%] h-px w-[48%] rotate-[-16deg] bg-cyan-400/40" />
              <div className="absolute left-[36%] top-[57%] h-px w-[36%] rotate-[18deg] bg-cyan-400/30" />
              <div className="absolute left-[43%] top-[32%] h-px w-[29%] rotate-[48deg] bg-cyan-400/30" />

              {/* Map markers */}
              <div className="absolute left-[30%] top-[53%]">
                <div className="relative">
                  <span className="absolute -inset-2 animate-ping rounded-full bg-emerald-400/20" />
                  <span className="relative block h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
                </div>

                <span className="absolute left-5 top-[-5px] whitespace-nowrap text-xs text-slate-400">
                  Guwahati
                </span>
              </div>

              <div className="absolute left-[57%] top-[30%]">
                <div className="relative">
                  <span className="absolute -inset-2 animate-pulse rounded-full bg-amber-400/20" />
                  <span className="relative block h-3 w-3 rounded-full border-2 border-slate-950 bg-amber-400" />
                </div>

                <span className="absolute left-5 top-[-5px] whitespace-nowrap text-xs text-slate-400">
                  Itanagar
                </span>
              </div>

              <div className="absolute left-[70%] top-[52%]">
                <div className="relative">
                  <span className="absolute -inset-2 animate-pulse rounded-full bg-red-400/20" />
                  <span className="relative block h-3 w-3 rounded-full border-2 border-slate-950 bg-red-400" />
                </div>

                <span className="absolute left-5 top-[-5px] whitespace-nowrap text-xs text-slate-400">
                  Aizawl
                </span>
              </div>

              <div className="absolute left-[62%] top-[70%]">
                <div className="relative">
                  <span className="relative block h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
                </div>

                <span className="absolute left-5 top-[-5px] whitespace-nowrap text-xs text-slate-400">
                  Agartala
                </span>
              </div>

              {/* Map label */}
              <div className="absolute bottom-4 left-4 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Navigation size={15} className="text-cyan-400" />
                  <span className="text-xs text-slate-300">
                    NER Logistics Network
                  </span>
                </div>
              </div>

              {/* Vehicle count */}
              <div className="absolute right-4 top-4 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 backdrop-blur">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Vehicles Live
                </p>

                <p className="mt-1 text-lg font-bold text-white">
                  {vehicles.length || 30}
                </p>
              </div>
            </div>
          </div>

          {/* Right column: Regional Risk + Corridor Weather Intelligence */}
          <div className="space-y-6">
            {/* Regional risk */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70">
              <div className="border-b border-slate-800 px-5 py-4">
                <h3 className="font-semibold text-white">
                  Regional Risk
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Current accessibility risk by state
                </p>
              </div>

              <div className="space-y-1 p-3">
                {regions.map((region) => (
                  <div
                    key={region.name}
                    className="rounded-lg p-3 transition hover:bg-slate-800/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-cyan-400">
                          {region.short}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {region.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {region.vehicles} vehicles
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-medium ${getRiskClass(
                          region.risk
                        )}`}
                      >
                        {region.risk}
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-current"
                        style={{
                          width: `${region.riskValue}%`,
                          color:
                            region.risk === "High"
                              ? "rgb(248 113 113)"
                              : region.risk === "Moderate"
                              ? "rgb(251 191 36)"
                              : "rgb(52 211 153)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corridor Weather Intelligence Panel */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/70">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CloudRain size={16} className="text-cyan-400" />
                    <h3 className="font-semibold text-white">Corridor Weather</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Real-time atmospheric conditions across NER routes</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchHubWeather(selectedHubIdx)}
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
                  <div className="flex h-36 items-center justify-center text-xs text-slate-500">
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
                        <p className="mt-1 text-[10px] text-slate-500">
                          Deterministic Score: {weatherData.risk_signal?.risk_score ?? 0}/100
                        </p>
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Droplets size={13} className="text-cyan-400" />
                          <span>Precipitation</span>
                        </div>
                        <p className="font-semibold text-white">
                          {weatherData.rainfall_mm !== undefined ? `${weatherData.rainfall_mm} mm` : "0 mm"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Wind size={13} className="text-cyan-400" />
                          <span>Wind Speed</span>
                        </div>
                        <p className="font-semibold text-white">
                          {weatherData.wind_speed_kmh !== undefined ? `${weatherData.wind_speed_kmh} km/h` : "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                          <Eye size={13} className="text-cyan-400" />
                          <span>Visibility</span>
                        </div>
                        <p className="font-semibold text-white">
                          {weatherData.visibility_km !== undefined ? `${weatherData.visibility_km} km` : "—"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/40">
                        <div className="flex items-center gap-1.5 text-slate-500 mb-1">
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
                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-500">
                      <span>Source: {weatherData.source} {weatherData.cached ? "(Cached)" : "(Live)"}</span>
                      <span>Updated: {weatherLastUpdated || "Just now"}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Disruption Risk & TreeSHAP Explainability */}
        <PredictiveRiskCard
          result={predictiveRisk}
          loading={loadingPredictive}
          error={predictiveError}
          onRefresh={() => fetchPredictiveRisk(selectedHubIdx)}
          roadName={WEATHER_HUBS[selectedHubIdx].name}
        />

        {/* Charts + alerts */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Risk trend */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  Network Risk Trend
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  AI-predicted accessibility risk over the last 7 days
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                <ShieldAlert size={14} />
                Moderate Risk
              </div>
            </div>

            <div className="h-[260px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskData}>
                  <defs>
                    <linearGradient
                      id="riskGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#22d3ee"
                        stopOpacity={0.3}
                      />

                      <stop
                        offset="100%"
                        stopColor="#22d3ee"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.08)"
                  />

                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    fill="url(#riskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col justify-between">
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

                  <p className="mt-1 text-xs text-slate-500">
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
                    <p className="text-xs text-slate-500 mt-1">Connecting to backend...</p>
                  </div>
                ) : criticalAlerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-sm font-medium text-slate-200">All Corridors Normal</p>
                    <p className="mt-1 text-xs text-slate-500">No active critical alerts require operator intervention.</p>
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
                              <span className="shrink-0 text-[10px] text-slate-500">
                                {formatRelativeTime(alert.created_at)}
                              </span>
                            </div>

                            <p className="mt-1 text-xs leading-5 text-slate-400 line-clamp-2">
                              {alert.description}
                            </p>

                            {alert.location && (
                              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin size={11} className="shrink-0 text-slate-600" />
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
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition"
              >
                View All Operational Alerts &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Recent incidents + fleet */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Incidents */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  Recent Incidents
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Latest field and system-reported events
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
                      <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
                        <AlertTriangle size={16} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {incident.title ||
                            incident.incident_type ||
                            "Road Incident"}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {incident.district ||
                            incident.state ||
                            "Northeast Region"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-xs font-medium ${getStatusClass(
                        incident.severity
                      )}`}
                    >
                      {incident.severity || "Unknown"}
                    </span>
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
                    No incidents available
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    New incidents will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fleet status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  Fleet Status
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Current vehicle operations
                </p>
              </div>

              <Truck size={18} className="text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Active
                </div>

                <p className="mt-2 text-2xl font-bold text-white">
                  {activeVehicles || 18}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Delayed
                </div>

                <p className="mt-2 text-2xl font-bold text-white">
                  {delayedVehicles || 3}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Idle
                </div>

                <p className="mt-2 text-2xl font-bold text-white">
                  {Math.max(
                    (vehicles.length || 30) -
                      activeVehicles -
                      delayedVehicles,
                    9
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Offline
                </div>

                <p className="mt-2 text-2xl font-bold text-white">
                  0
                </p>
              </div>
            </div>

            <div className="mx-5 mb-5 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-slate-500" />

                  <div>
                    <p className="text-sm text-slate-300">
                      Fleet operators
                    </p>

                    <p className="text-xs text-slate-500">
                      Connected control center users
                    </p>
                  </div>
                </div>

                <span className="text-sm font-semibold text-white">
                  12 online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom operational summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="rounded-lg bg-cyan-500/10 p-3 text-cyan-400">
              <Navigation size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Average Route ETA
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                6h 42m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400">
              <ShieldAlert size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                High Risk Corridors
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                7 routes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Successful Deliveries
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                284 this week
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;