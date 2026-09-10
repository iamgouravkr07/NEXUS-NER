import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

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

function severityStyle(severity?: string) {
  const value = severity?.toLowerCase();

  if (value === "critical") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  if (value === "high") {
    return "border-orange-500/30 bg-orange-500/10 text-orange-400";
  }

  if (value === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
}

function statusStyle(status?: string) {
  const value = status?.toLowerCase();

  if (value === "verified" || value === "resolved" || value === "closed") {
    return "text-emerald-400";
  }

  if (value === "rejected") {
    return "text-rose-400";
  }

  if (value === "investigating" || value === "active" || value === "reported") {
    return "text-amber-400";
  }

  return "text-slate-400";
}

function formatDate(value?: string) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Incidents() {
  const { user, getAuthHeader } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIncident, setSelectedIncident] =
    useState<Incident | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function updateIncidentStatus(
    incidentId: number,
    newStatus: "verified" | "rejected" | "resolved"
  ) {
    try {
      setActionLoadingId(incidentId);
      setActionMessage(null);

      const response = await fetch(`${API_URL}/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Permission denied: ADMIN or CONTROL_OPERATOR role required to verify/reject incidents."
          );
        }
        throw new Error(`Failed to update incident status (${response.status})`);
      }

      const updated = await response.json();

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === incidentId ? { ...item, status: updated.status } : item
        )
      );

      if (selectedIncident?.id === incidentId) {
        setSelectedIncident((prev) =>
          prev ? { ...prev, status: updated.status } : null
        );
      }

      setActionMessage({
        type: "success",
        text: `Incident #${incidentId} status updated to "${updated.status}".`,
      });
    } catch (err: any) {
      console.error("Incident action error:", err);
      setActionMessage({
        type: "error",
        text: err.message || "Failed to update incident status.",
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function loadIncidents(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(`${API_URL}/incidents/`);

      if (!response.ok) {
        throw new Error("Failed to fetch incidents");
      }

      const data = await response.json();

      setIncidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Incident fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadIncidents();

    const interval = window.setInterval(() => {
      loadIncidents();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const text = [
        incident.title,
        incident.description,
        incident.incident_type,
        incident.district,
        incident.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesSeverity =
        severityFilter === "all" ||
        incident.severity?.toLowerCase() === severityFilter;

      const matchesStatus =
        statusFilter === "all" ||
        incident.status?.toLowerCase() === statusFilter;

      return (
        matchesSearch &&
        matchesSeverity &&
        matchesStatus
      );
    });
  }, [incidents, search, severityFilter, statusFilter]);

  const criticalCount = incidents.filter(
    (incident) =>
      incident.severity?.toLowerCase() === "critical"
  ).length;

  const highCount = incidents.filter(
    (incident) =>
      incident.severity?.toLowerCase() === "high"
  ).length;

  const activeCount = incidents.filter((incident) => {
    const status = incident.status?.toLowerCase();

    return (
      status === "active" ||
      status === "investigating" ||
      !status
    );
  }).length;

  const resolvedCount = incidents.filter((incident) => {
    const status = incident.status?.toLowerCase();

    return status === "resolved" || status === "closed";
  }).length;

  return (
    <div className="min-h-full bg-slate-950 text-white">
      <div className="space-y-6 p-6">

        {/* Header */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                Incident Management
              </h2>

              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                {incidents.length} Total
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-400">
              Monitor, investigate and manage road accessibility incidents
              across the NER logistics network.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadIncidents(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />

            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Critical
              </p>

              <AlertTriangle
                size={19}
                className="text-red-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {criticalCount}
            </p>

            <p className="mt-1 text-xs text-red-400">
              Immediate attention required
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                High Severity
              </p>

              <ShieldAlert
                size={19}
                className="text-orange-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {highCount}
            </p>

            <p className="mt-1 text-xs text-orange-400">
              Requires monitoring
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Active
              </p>

              <Clock3
                size={19}
                className="text-amber-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {activeCount}
            </p>

            <p className="mt-1 text-xs text-amber-400">
              Under investigation
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Resolved
              </p>

              <CheckCircle2
                size={19}
                className="text-emerald-400"
              />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {resolvedCount}
            </p>

            <p className="mt-1 text-xs text-emerald-400">
              Successfully cleared
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search incidents, districts, states..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter
                size={16}
                className="text-slate-500"
              />

              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none"
              >
                <option value="all">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="investigating">
                  Investigating
                </option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incident table */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">
                  Incident Feed
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Live incidents received from the operations backend
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Live
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <RefreshCw
                size={22}
                className="animate-spin text-cyan-400"
              />
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <CheckCircle2
                  size={34}
                  className="mx-auto text-emerald-400"
                />

                <p className="mt-3 text-sm font-medium text-slate-300">
                  No incidents found
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Try changing your filters or search query.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3 font-medium">
                      Incident
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Location
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Severity
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Status
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Confidence
                    </th>

                    <th className="px-5 py-3 font-medium">
                      Reported
                    </th>

                    <th className="px-5 py-3 font-medium text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {filteredIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="transition hover:bg-slate-800/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
                            <AlertTriangle size={16} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {incident.title ||
                                incident.incident_type ||
                                "Road Incident"}
                            </p>

                            <p className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                              {incident.description ||
                                "No description available"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <MapPin
                            size={14}
                            className="text-slate-500"
                          />

                          {incident.district ||
                            incident.state ||
                            "NER Region"}
                        </div>

                        {incident.latitude &&
                          incident.longitude && (
                            <p className="mt-1 text-[10px] text-slate-600">
                              {incident.latitude.toFixed(4)},{" "}
                              {incident.longitude.toFixed(4)}
                            </p>
                          )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityStyle(
                            incident.severity
                          )}`}
                        >
                          {incident.severity || "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {incident.status?.toLowerCase() ===
                          "resolved" ? (
                            <CheckCircle2
                              size={14}
                              className="text-emerald-400"
                            />
                          ) : (
                            <Clock3
                              size={14}
                              className="text-amber-400"
                            />
                          )}

                          <span
                            className={`text-xs font-medium ${statusStyle(
                              incident.status
                            )}`}
                          >
                            {incident.status || "Active"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-24">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500">
                              AI
                            </span>

                            <span className="text-slate-300">
                              {incident.confidence != null
                                ? `${Math.round(
                                    incident.confidence <= 1
                                      ? incident.confidence * 100
                                      : incident.confidence
                                  )}%`
                                : "—"}
                            </span>
                          </div>

                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{
                                width: `${
                                  incident.confidence != null
                                    ? Math.min(
                                        100,
                                        incident.confidence <=
                                          1
                                          ? incident.confidence *
                                              100
                                          : incident.confidence
                                      )
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(incident.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(!incident.status ||
                            incident.status.toLowerCase() === "reported" ||
                            incident.status.toLowerCase() === "active") && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoadingId === incident.id}
                                onClick={() =>
                                  updateIncidentStatus(incident.id, "verified")
                                }
                                title="Verify incident and escalate road risk"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                              >
                                <Check size={13} />
                                Verify
                              </button>

                              <button
                                type="button"
                                disabled={actionLoadingId === incident.id}
                                onClick={() =>
                                  updateIncidentStatus(incident.id, "rejected")
                                }
                                title="Reject incident as false report"
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
                              >
                                <X size={13} />
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedIncident(incident)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-400"
                          >
                            <Eye size={13} />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5 text-cyan-400">
                <MapPin size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Geo-tagged Reports
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  {incidents.filter(
                    (item) =>
                      item.latitude != null &&
                      item.longitude != null
                  ).length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-500/10 p-2.5 text-purple-400">
                <ShieldAlert size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  AI-Assisted Detection
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  Enabled
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Auto Verification
                </p>

                <p className="mt-1 text-xl font-semibold text-white">
                  Ready
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident details modal */}
      {selectedIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedIncident(null)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h3 className="font-semibold text-white">
                  Incident Details
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Incident #{selectedIncident.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Incident
                </p>

                <p className="mt-2 text-lg font-semibold text-white">
                  {selectedIncident.title ||
                    selectedIncident.incident_type ||
                    "Road Incident"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {selectedIncident.description ||
                    "No description available."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Location
                  </p>

                  <p className="mt-2 text-sm text-slate-200">
                    {selectedIncident.district ||
                      selectedIncident.state ||
                      "NER Region"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Severity
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs ${severityStyle(
                      selectedIncident.severity
                    )}`}
                  >
                    {selectedIncident.severity || "Unknown"}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <p
                    className={`mt-2 text-sm font-medium ${statusStyle(
                      selectedIncident.status
                    )}`}
                  >
                    {selectedIncident.status || "Active"}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-500">
                    AI Confidence
                  </p>

                  <p className="mt-2 text-sm font-medium text-cyan-400">
                    {selectedIncident.confidence != null
                      ? `${Math.round(
                          selectedIncident.confidence <= 1
                            ? selectedIncident.confidence * 100
                            : selectedIncident.confidence
                        )}%`
                      : "Not available"}
                  </p>
                </div>
              </div>

              {selectedIncident.latitude != null &&
                selectedIncident.longitude != null && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center gap-2">
                      <MapPin
                        size={16}
                        className="text-cyan-400"
                      />

                      <p className="text-sm text-slate-300">
                        GPS Coordinates
                      </p>
                    </div>

                    <p className="mt-2 font-mono text-xs text-slate-500">
                      {selectedIncident.latitude},{" "}
                      {selectedIncident.longitude}
                    </p>
                  </div>
                )}

              {/* Operator Action Controls */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-cyan-400" />
                    <p className="text-sm font-semibold text-white">Operator Validation & Control</p>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Role: <span className="font-semibold text-slate-300">{user?.role || "GUEST"}</span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Verifying escalates road disruption risk to critical (95%) and triggers an operational alert.
                  Rejecting marks the report as invalid.
                </p>

                {actionMessage && (
                  <div
                    className={`mt-3 rounded-lg border p-3 text-xs ${
                      actionMessage.type === "success"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {actionMessage.text}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedIncident.id || selectedIncident.status === "verified"}
                    onClick={() => updateIncidentStatus(selectedIncident.id, "verified")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  >
                    <Check size={14} />
                    {selectedIncident.status === "verified" ? "Verified" : "Verify Disruption"}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === selectedIncident.id || selectedIncident.status === "rejected"}
                    onClick={() => updateIncidentStatus(selectedIncident.id, "rejected")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-40"
                  >
                    <X size={14} />
                    {selectedIncident.status === "rejected" ? "Rejected" : "Reject Report"}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === selectedIncident.id || selectedIncident.status === "resolved"}
                    onClick={() => updateIncidentStatus(selectedIncident.id, "resolved")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
                  >
                    <CheckCircle2 size={14} />
                    {selectedIncident.status === "resolved" ? "Resolved" : "Mark Resolved"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incidents;