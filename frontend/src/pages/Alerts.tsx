import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  CloudRain,
  MapPin,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, getAuthApiUrl } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";

type AlertSeverity = "Critical" | "High" | "Medium" | "Low";
type AlertStatus = "Active" | "Acknowledged" | "Resolved";

type AlertItem = {
  rawId: number;
  id: string;
  title: string;
  description: string;
  location: string;
  severity: AlertSeverity;
  type: string;
  rawType: string;
  time: string;
  status: AlertStatus;
  sourceEntity?: string | null;
  sourceEntityId?: number | null;
  isTestFixture?: boolean;
};

type AlertSummaryData = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  active: number;
  acknowledged: number;
  resolved: number;
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

function formatAlertType(rawType: string): string {
  const map: Record<string, string> = {
    road_incident: "Road Incident",
    road_risk: "Road Risk",
    reroute: "Reroute",
    trip_delay: "Trip Delay",
    weather: "Weather",
    vehicle: "Vehicle",
    predictive_disruption: "Predictive Disruption",
    corridor_blocked: "Confirmed Corridor Blockage",
  };
  return map[rawType.toLowerCase()] || rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityClass(severity: AlertSeverity) {
  switch (severity) {
    case "Critical":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    case "High":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    case "Low":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
  }
}

function alertIcon(type: string) {
  switch (type) {
    case "Predictive Disruption":
      return BrainCircuit;
    case "Confirmed Corridor Blockage":
      return ShieldAlert;
    case "Weather":
      return CloudRain;
    case "Vehicle":
      return Truck;
    case "Road Risk":
      return AlertTriangle;
    case "Road Incident":
      return ShieldAlert;
    case "Reroute":
      return Route;
    case "Trip Delay":
      return Clock3;
    default:
      return Bell;
  }
}

function Alerts() {
  const { getAuthHeader } = useAuth();
  const { subscribe } = useWebSocket();
  const apiBase = getAuthApiUrl();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [hideTestFixtures, setHideTestFixtures] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchAlertsData = useCallback(async () => {
    try {
      setError("");
      const authHeaders = getAuthHeader();
      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${apiBase}/alerts/?limit=100`, { headers: authHeaders }),
        fetch(`${apiBase}/alerts/summary`, { headers: authHeaders }),
      ]);

      if (!alertsRes.ok) {
        throw new Error(`Failed to fetch alerts (${alertsRes.status})`);
      }
      if (!summaryRes.ok) {
        throw new Error(`Failed to fetch summary (${summaryRes.status})`);
      }

      const rawAlerts = await alertsRes.json();
      const rawSummary: AlertSummaryData = await summaryRes.json();

      const mappedAlerts: AlertItem[] = rawAlerts.map((a: any) => {
        const sevKey = (a.severity || "low").toLowerCase();
        const sevFormatted: AlertSeverity =
          sevKey === "critical"
            ? "Critical"
            : sevKey === "high"
              ? "High"
              : sevKey === "medium"
                ? "Medium"
                : "Low";

        const statKey = (a.status || "active").toLowerCase();
        const statFormatted: AlertStatus =
          statKey === "acknowledged"
            ? "Acknowledged"
            : statKey === "resolved"
              ? "Resolved"
              : "Active";

        const rawAlertsType = (a.alert_type || "general").toLowerCase();
        const titleStr = a.title || "";
        const descStr = a.description || "";
        const dedupStr = a.dedup_key || "";
        const isFixture =
          titleStr.includes("Lifecycle Test") ||
          titleStr.includes("Duplicate Test") ||
          titleStr.includes("RBAC Alert") ||
          titleStr.startsWith("TEST_") ||
          descStr.includes("TEST_") ||
          dedupStr.startsWith("TEST_") ||
          dedupStr.includes("TEST_RD_");

        return {
          rawId: a.id,
          id: `ALT-${String(a.id).padStart(3, "0")}`,
          title: a.title,
          description: a.description,
          location: a.location || "North Eastern Region",
          severity: sevFormatted,
          type: formatAlertType(a.alert_type || "general"),
          rawType: rawAlertsType,
          time: formatRelativeTime(a.created_at),
          status: statFormatted,
          sourceEntity: a.source_entity || null,
          sourceEntityId: a.source_entity_id || null,
          isTestFixture: Boolean(isFixture),
        };
      });

      setAlerts(mappedAlerts);
      setSummary(rawSummary);
    } catch (err: any) {
      setError(err?.message || "Failed to load alerts data");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchAlertsData();
    const interval = window.setInterval(fetchAlertsData, 10000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchAlertsData]);

  useEffect(() => {
    const unsub = subscribe((message) => {
      if (!message || !message.type) return;
      const ev = message.type;
      if (
        ev === "alert.status.updated" ||
        ev === "incident.created" ||
        ev === "incident.status.updated" ||
        ev === "trip.rerouted"
      ) {
        fetchAlertsData();
      }
    });
    return () => unsub();
  }, [fetchAlertsData, subscribe]);

  const handleAcknowledge = async (rawId: number) => {
    try {
      setActionLoadingId(rawId);
      setActionError("");
      const authHeaders = getAuthHeader();
      const res = await fetch(`${apiBase}/alerts/${rawId}/acknowledge`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Authorization required: You must be logged in as a Control Operator or Admin to acknowledge alerts.");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to acknowledge alert (${res.status})`);
      }
      setAlerts((prev) =>
        prev.map((item) =>
          item.rawId === rawId ? { ...item, status: "Acknowledged" } : item
        )
      );
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              active: Math.max(0, prev.active - 1),
              acknowledged: prev.acknowledged + 1,
            }
          : prev
      );
    } catch (err: any) {
      setActionError(err.message || "Could not acknowledge alert");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (rawId: number) => {
    try {
      setActionLoadingId(rawId);
      setActionError("");
      const authHeaders = getAuthHeader();
      const res = await fetch(`${apiBase}/alerts/${rawId}/resolve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("Authorization required: You must be logged in as a Control Operator or Admin to resolve alerts.");
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to resolve alert (${res.status})`);
      }
      setAlerts((prev) =>
        prev.map((item) =>
          item.rawId === rawId ? { ...item, status: "Resolved" } : item
        )
      );
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              acknowledged: Math.max(0, prev.acknowledged - 1),
              resolved: prev.resolved + 1,
            }
          : prev
      );
    } catch (err: any) {
      setActionError(err.message || "Could not resolve alert");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (hideTestFixtures && item.isTestFixture) {
        return false;
      }
      if (selectedSeverity !== "All" && item.severity !== selectedSeverity) {
        return false;
      }
      if (selectedStatus !== "All" && item.status !== selectedStatus) {
        return false;
      }
      if (selectedType !== "All" && item.type !== selectedType) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [alerts, selectedSeverity, selectedStatus, selectedType, searchQuery, hideTestFixtures]);

  const summaryCards = useMemo(() => {
    const totalCount = summary?.total ?? alerts.length;
    const critCount = summary?.critical ?? alerts.filter((a) => a.severity === "Critical").length;
    const highCount = summary?.high ?? alerts.filter((a) => a.severity === "High").length;
    const ackCount = summary?.acknowledged ?? alerts.filter((a) => a.status === "Acknowledged").length;

    return [
      {
        label: "Total Alerts",
        value: String(totalCount).padStart(2, "0"),
        description: "Recorded incidents & risks",
        icon: Bell,
        iconClass: "border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400",
      },
      {
        label: "Critical",
        value: String(critCount).padStart(2, "0"),
        description: "Requires immediate action",
        icon: ShieldAlert,
        iconClass: "border border-red-200 bg-red-50 text-red-700 dark:border-transparent dark:bg-red-500/10 dark:text-red-400",
      },
      {
        label: "High Priority",
        value: String(highCount).padStart(2, "0"),
        description: "Needs active monitoring",
        icon: AlertTriangle,
        iconClass: "border border-orange-200 bg-orange-50 text-orange-700 dark:border-transparent dark:bg-orange-500/10 dark:text-orange-400",
      },
      {
        label: "Acknowledged",
        value: String(ackCount).padStart(2, "0"),
        description: "Reviewed by operators",
        icon: CheckCircle2,
        iconClass: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400",
      },
    ];
  }, [summary, alerts]);

  const criticalCount = summary?.critical ?? alerts.filter((a) => a.severity === "Critical" && a.status === "Active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Alerts & Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor critical logistics, road, weather, reroute, and vehicle alerts across the North Eastern Region
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAlertsData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Alert Engine Online
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-amber-700 hover:text-amber-900 ml-4 font-semibold dark:text-amber-400/70 dark:hover:text-amber-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <div className={`rounded-lg p-3 ${item.iconClass}`}>
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Banner */}
      {criticalCount > 0 && (
        <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-500/20 dark:bg-red-500/5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-red-200 bg-red-100 p-2.5 dark:border-transparent dark:bg-red-500/10">
              <AlertCircle size={21} className="text-red-700 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-red-400">
                {criticalCount} critical alert{criticalCount > 1 ? "s" : ""} require attention
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                These alerts indicate verified blockages, hazardous corridor conditions, or delayed supply trips requiring immediate operator action.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedSeverity("Critical")}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 dark:border-transparent dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            View Critical Alerts
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">Alert Center</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Live operational alerts ({filteredAlerts.length} matching)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <Search size={16} className="text-slate-400 dark:text-slate-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600 sm:w-44"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="All">All Types</option>
              <option value="Predictive Disruption">Predictive Disruption</option>
              <option value="Confirmed Corridor Blockage">Confirmed Corridor Blockage</option>
              <option value="Road Incident">Road Incident</option>
              <option value="Road Risk">Road Risk</option>
              <option value="Reroute">Reroute</option>
              <option value="Trip Delay">Trip Delay</option>
              <option value="Weather">Weather</option>
              <option value="Vehicle">Vehicle</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 select-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-slate-200">
              <input
                type="checkbox"
                checked={hideTestFixtures}
                onChange={(e) => setHideTestFixtures(e.target.checked)}
                className="rounded border-slate-300 bg-white text-cyan-600 focus:ring-0 focus:ring-offset-0 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-500"
              />
              <span>Hide test fixtures</span>
            </label>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-slate-500 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <RefreshCw size={18} className="mr-2 animate-spin text-cyan-600 dark:text-cyan-400" />
            Loading operational alerts...
          </div>
        )}

        {!loading && filteredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CheckCircle2 size={32} className="text-emerald-500 dark:text-emerald-400" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">No matching alerts</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              All monitored logistics corridors and active vehicles are operating normally.
            </p>
          </div>
        )}

        {!loading &&
          filteredAlerts.map((alert) => {
            const Icon = alertIcon(alert.type);

            return (
              <div
                key={alert.rawId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  {/* Main Alert Info */}
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        alert.rawType === "predictive_disruption"
                          ? "border border-purple-200 bg-purple-50 text-purple-700 dark:border-transparent dark:bg-purple-500/10 dark:text-purple-400"
                          : alert.severity === "Critical"
                            ? "border border-red-200 bg-red-50 text-red-700 dark:border-transparent dark:bg-red-500/10 dark:text-red-400"
                            : alert.severity === "High"
                              ? "border border-orange-200 bg-orange-50 text-orange-700 dark:border-transparent dark:bg-orange-500/10 dark:text-orange-400"
                              : alert.severity === "Medium"
                                ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400"
                      }`}
                    >
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        {alert.rawType === "predictive_disruption" ? (
                          <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                            PREDICTIVE ADVISORY
                          </span>
                        ) : alert.rawType === "corridor_blocked" || alert.rawType === "road_incident" ? (
                          <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            CONFIRMED
                          </span>
                        ) : null}
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:border-transparent dark:bg-slate-800 dark:text-slate-400">
                          {alert.type}
                        </span>
                        {alert.sourceEntity && alert.sourceEntityId ? (
                          <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300">
                            {alert.sourceEntity.replace(/_/g, " ").toUpperCase()} #{alert.sourceEntityId}
                          </span>
                        ) : null}
                        {alert.isTestFixture ? (
                          <span className="rounded-full border border-yellow-400 bg-yellow-50 px-2 py-0.5 text-[10px] font-mono font-medium text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
                            TEST FIXTURE
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600 dark:text-slate-400">
                        {alert.description}
                      </p>

                      {alert.rawType === "predictive_disruption" && (
                        <div className="mt-2.5 rounded-lg border border-purple-200 bg-purple-50/60 p-2.5 text-[11px] text-purple-950 flex flex-wrap items-center justify-between gap-2 dark:border-purple-500/20 dark:bg-purple-500/[0.04] dark:text-slate-300">
                          <span className="flex items-center gap-1.5 font-medium text-purple-800 dark:text-purple-300">
                            <BrainCircuit size={13} />
                            <span>Forecast Horizon: Next 6 Hours &bull; Threshold: 55%</span>
                          </span>
                          <span className="text-[10px] text-slate-500 italic dark:text-slate-400">
                            Operational verification required &bull; Prototype ML advisory
                          </span>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 dark:text-slate-600" />
                          <span className="text-[11px] text-slate-600 dark:text-slate-400">{alert.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock3 size={13} className="text-slate-400 dark:text-slate-600" />
                          <span className="text-[11px] text-slate-500">{alert.time}</span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{alert.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Lifecycle Status */}
                  <div className="flex shrink-0 items-center gap-3 xl:flex-col xl:items-end">
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-medium ${
                        alert.status === "Active"
                          ? "text-cyan-700 dark:text-cyan-400"
                          : alert.status === "Acknowledged"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          alert.status === "Active"
                            ? "bg-cyan-600 dark:bg-cyan-400"
                            : alert.status === "Acknowledged"
                              ? "bg-emerald-600 dark:bg-emerald-400"
                              : "bg-slate-400 dark:bg-slate-600"
                        }`}
                      />
                      {alert.status}
                    </span>

                    {alert.status === "Active" && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alert.rawId)}
                        disabled={actionLoadingId === alert.rawId}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                      >
                        {actionLoadingId === alert.rawId ? "Updating..." : "Acknowledge"}
                      </button>
                    )}

                    {alert.status === "Acknowledged" && (
                      <button
                        type="button"
                        onClick={() => handleResolve(alert.rawId)}
                        disabled={actionLoadingId === alert.rawId}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      >
                        {actionLoadingId === alert.rawId ? "Updating..." : "Resolve"}
                      </button>
                    )}

                    {alert.status === "Resolved" && (
                      <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:border-transparent dark:bg-slate-950 dark:text-slate-500">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Alert Intelligence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400">
              <Bell size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Alert Sources</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Where operational alerts originate</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
              <span className="text-xs text-slate-600 dark:text-slate-400">Road & Landslide Monitoring</span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {alerts.filter((a) => a.type === "Road Incident" || a.type === "Road Risk").length} alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
              <span className="text-xs text-slate-600 dark:text-slate-400">Dynamic Reroute & Trip Delay</span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {alerts.filter((a) => a.type === "Reroute" || a.type === "Trip Delay").length} alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
              <span className="text-xs text-slate-600 dark:text-slate-400">Vehicle Telemetry & Tracking</span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {alerts.filter((a) => a.type === "Vehicle").length} alerts
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-2.5 text-purple-700 dark:border-transparent dark:bg-purple-500/10 dark:text-purple-400">
              <ShieldAlert size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">Alert Intelligence</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Automated risk detection & duplicate suppression</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-500">Automatically detected via GIS / Engine</span>
                <span className="font-semibold text-cyan-700 dark:text-cyan-400">85%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-1.5 w-[85%] rounded-full bg-cyan-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-500">Operator reviewed / acknowledged</span>
                <span className="font-semibold text-purple-700 dark:text-purple-400">
                  {summary?.total ? Math.round(((summary.acknowledged + summary.resolved) / summary.total) * 100) : 15}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-purple-500"
                  style={{
                    width: `${summary?.total ? Math.min(100, Math.round(((summary.acknowledged + summary.resolved) / summary.total) * 100)) : 15}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/10 dark:bg-cyan-500/5">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
        <div>
          <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-400">Intelligent alerting active</p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            NEXUS-NER automatically generates prioritized operational alerts when field disruptions occur, road corridor risks escalate, active trips encounter blockages, or vehicles are dynamically rerouted. Duplicate suppression avoids operator fatigue.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Alerts;