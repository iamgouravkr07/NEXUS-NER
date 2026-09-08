import {
  AlertCircle,
  AlertTriangle,
  Bell,
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

const API_URL = "http://127.0.0.1:8000";

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
  time: string;
  status: AlertStatus;
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
  };
  return map[rawType.toLowerCase()] || rawType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityClass(severity: AlertSeverity) {
  switch (severity) {
    case "Critical":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "High":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Low":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
}

function alertIcon(type: string) {
  switch (type) {
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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchAlertsData = useCallback(async () => {
    try {
      setError("");
      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/alerts/?limit=100`),
        fetch(`${API_URL}/alerts/summary`),
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

        return {
          rawId: a.id,
          id: `ALT-${String(a.id).padStart(3, "0")}`,
          title: a.title,
          description: a.description,
          location: a.location || "North Eastern Region",
          severity: sevFormatted,
          type: formatAlertType(a.alert_type || "general"),
          time: formatRelativeTime(a.created_at),
          status: statFormatted,
        };
      });

      setAlerts(mappedAlerts);
      setSummary(rawSummary);
    } catch (err: any) {
      setError(err?.message || "Failed to load alerts data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsData();
    const interval = window.setInterval(fetchAlertsData, 10000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchAlertsData]);

  const handleAcknowledge = async (rawId: number) => {
    try {
      setActionLoadingId(rawId);
      const res = await fetch(`${API_URL}/alerts/${rawId}/acknowledge`, {
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Failed to acknowledge alert");
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
      alert(err.message || "Could not acknowledge alert");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (rawId: number) => {
    try {
      setActionLoadingId(rawId);
      const res = await fetch(`${API_URL}/alerts/${rawId}/resolve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Failed to resolve alert");
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
      alert(err.message || "Could not resolve alert");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (selectedSeverity !== "All" && item.severity !== selectedSeverity) {
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
  }, [alerts, selectedSeverity, selectedType, searchQuery]);

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
        iconClass: "bg-cyan-500/10 text-cyan-400",
      },
      {
        label: "Critical",
        value: String(critCount).padStart(2, "0"),
        description: "Requires immediate action",
        icon: ShieldAlert,
        iconClass: "bg-red-500/10 text-red-400",
      },
      {
        label: "High Priority",
        value: String(highCount).padStart(2, "0"),
        description: "Needs active monitoring",
        icon: AlertTriangle,
        iconClass: "bg-orange-500/10 text-orange-400",
      },
      {
        label: "Acknowledged",
        value: String(ackCount).padStart(2, "0"),
        description: "Reviewed by operators",
        icon: CheckCircle2,
        iconClass: "bg-emerald-500/10 text-emerald-400",
      },
    ];
  }, [summary, alerts]);

  const criticalCount = summary?.critical ?? alerts.filter((a) => a.severity === "Critical" && a.status === "Active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Alerts & Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor critical logistics, road, weather, reroute, and vehicle alerts across the North Eastern Region
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAlertsData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Alert Engine Online
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.description}</p>
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
        <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/10 p-2.5">
              <AlertCircle size={21} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-400">
                {criticalCount} critical alert{criticalCount > 1 ? "s" : ""} require attention
              </p>
              <p className="mt-1 text-xs text-slate-500">
                These alerts indicate verified blockages, hazardous corridor conditions, or delayed supply trips requiring immediate operator action.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedSeverity("Critical")}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
          >
            View Critical Alerts
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">Alert Center</h2>
            <p className="mt-1 text-xs text-slate-500">
              Live operational alerts ({filteredAlerts.length} matching)
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <Search size={16} className="text-slate-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 sm:w-48"
              />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none"
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
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="All">All Types</option>
              <option value="Road Incident">Road Incident</option>
              <option value="Road Risk">Road Risk</option>
              <option value="Reroute">Reroute</option>
              <option value="Trip Delay">Trip Delay</option>
              <option value="Weather">Weather</option>
              <option value="Vehicle">Vehicle</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-12 text-slate-500 text-xs">
            <RefreshCw size={18} className="mr-2 animate-spin text-cyan-400" />
            Loading operational alerts...
          </div>
        )}

        {!loading && filteredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="mt-3 text-sm font-medium text-white">No matching alerts</p>
            <p className="mt-1 text-xs text-slate-500">
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
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  {/* Main Alert Info */}
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        alert.severity === "Critical"
                          ? "bg-red-500/10 text-red-400"
                          : alert.severity === "High"
                            ? "bg-orange-500/10 text-orange-400"
                            : alert.severity === "Medium"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{alert.title}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          {alert.type}
                        </span>
                      </div>

                      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
                        {alert.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-600" />
                          <span className="text-[11px] text-slate-400">{alert.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock3 size={13} className="text-slate-600" />
                          <span className="text-[11px] text-slate-500">{alert.time}</span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-600">{alert.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Lifecycle Status */}
                  <div className="flex shrink-0 items-center gap-3 xl:flex-col xl:items-end">
                    <span
                      className={`flex items-center gap-1.5 text-[11px] ${
                        alert.status === "Active"
                          ? "text-cyan-400"
                          : alert.status === "Acknowledged"
                            ? "text-emerald-400"
                            : "text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          alert.status === "Active"
                            ? "bg-cyan-400"
                            : alert.status === "Acknowledged"
                              ? "bg-emerald-400"
                              : "bg-slate-600"
                        }`}
                      />
                      {alert.status}
                    </span>

                    {alert.status === "Active" && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(alert.rawId)}
                        disabled={actionLoadingId === alert.rawId}
                        className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white disabled:opacity-50"
                      >
                        {actionLoadingId === alert.rawId ? "Updating..." : "Acknowledge"}
                      </button>
                    )}

                    {alert.status === "Acknowledged" && (
                      <button
                        type="button"
                        onClick={() => handleResolve(alert.rawId)}
                        disabled={actionLoadingId === alert.rawId}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {actionLoadingId === alert.rawId ? "Updating..." : "Resolve"}
                      </button>
                    )}

                    {alert.status === "Resolved" && (
                      <span className="rounded-lg bg-slate-950 px-3 py-1.5 text-[11px] font-medium text-slate-500">
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
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2.5">
              <Bell size={19} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Alert Sources</h2>
              <p className="mt-1 text-xs text-slate-500">Where operational alerts originate</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">Road & Landslide Monitoring</span>
              <span className="text-xs font-medium text-white">
                {alerts.filter((a) => a.type === "Road Incident" || a.type === "Road Risk").length} alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">Dynamic Reroute & Trip Delay</span>
              <span className="text-xs font-medium text-white">
                {alerts.filter((a) => a.type === "Reroute" || a.type === "Trip Delay").length} alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">Vehicle Telemetry & Tracking</span>
              <span className="text-xs font-medium text-white">
                {alerts.filter((a) => a.type === "Vehicle").length} alerts
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2.5">
              <ShieldAlert size={19} className="text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Alert Intelligence</h2>
              <p className="mt-1 text-xs text-slate-500">Automated risk detection & duplicate suppression</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-500">Automatically detected via GIS / Engine</span>
                <span className="text-cyan-400">85%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[85%] rounded-full bg-cyan-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-500">Operator reviewed / acknowledged</span>
                <span className="text-purple-400">
                  {summary?.total ? Math.round(((summary.acknowledged + summary.resolved) / summary.total) * 100) : 15}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
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
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-cyan-400" />
        <div>
          <p className="text-sm font-medium text-cyan-400">Intelligent alerting active</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            NEXUS-NER automatically generates prioritized operational alerts when field disruptions occur, road corridor risks escalate, active trips encounter blockages, or vehicles are dynamically rerouted. Duplicate suppression avoids operator fatigue.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Alerts;