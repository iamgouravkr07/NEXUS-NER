import {
  AlertTriangle,
  Clock3,
  MapPin,
  Navigation,
  Search,
  Truck,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

type BackendVehicle = {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  cargo_type: string;
  cargo_priority: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  current_trip_id: number | null;
};

type VehicleStatus = "Moving" | "Delayed" | "Stopped" | "Offline" | "Idle";

function displayStatus(status: string): VehicleStatus {
  switch (status.toLowerCase()) {
    case "in_transit":
      return "Moving";

    case "delayed":
      return "Delayed";

    case "stopped":
      return "Stopped";

    case "offline":
      return "Offline";

    case "idle":
    default:
      return "Idle";
  }
}

function statusStyles(status: VehicleStatus) {
  switch (status) {
    case "Moving":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400";

    case "Delayed":
      return "bg-amber-50 text-amber-700 border border-amber-200 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400";

    case "Stopped":
      return "bg-orange-50 text-orange-700 border border-orange-200 dark:border-transparent dark:bg-orange-500/10 dark:text-orange-400";

    case "Offline":
      return "bg-slate-100 text-slate-700 border border-slate-200 dark:border-transparent dark:bg-slate-500/10 dark:text-slate-400";

    case "Idle":
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200 dark:border-transparent dark:bg-slate-500/10 dark:text-slate-400";
  }
}

function StatusIcon({ status }: { status: VehicleStatus }) {
  switch (status) {
    case "Moving":
      return <Navigation size={14} />;

    case "Delayed":
      return <Clock3 size={14} />;

    case "Stopped":
      return <Truck size={14} />;

    case "Offline":
      return <WifiOff size={14} />;

    case "Idle":
      return <Clock3 size={14} />;
  }
}

function formatStatus(status: string) {
  return status
    .replace("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

function Vehicles() {
  const [vehicles, setVehicles] = useState<BackendVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<BackendVehicle | null>(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "All" | "Moving" | "Delayed" | "Offline"
  >("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { getAuthHeader } = useAuth();
  const { t, formatString } = useLanguage();
  const { subscribe } = useWebSocket();
  const [anomalies, setAnomalies] = useState<
    Record<number, { anomaly_type: string; severity: string; description: string }>
  >({});
  const [driverAssignments, setDriverAssignments] = useState<Record<number, string>>({});

  function getStatusLabel(statusStr: string) {
    switch (statusStr.toLowerCase()) {
      case "in_transit":
      case "moving":
        return t.vehicles.tabMoving;
      case "delayed":
        return t.vehicles.tabDelayed;
      case "stopped":
        return t.vehicles.tabStopped;
      case "offline":
        return t.vehicles.tabOffline;
      case "idle":
        return t.vehicles.tabIdle;
      default:
        return formatStatus(statusStr);
    }
  }

  const filterLabels: Record<string, string> = {
    All: t.vehicles.tabAll,
    Moving: t.vehicles.tabMoving,
    Delayed: t.vehicles.tabDelayed,
    Offline: t.vehicles.tabOffline,
  };

  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoading(true);
        setError("");

        const [response, assignResponse] = await Promise.all([
          fetch(`${API_URL}/vehicles/`, {
            headers: getAuthHeader(),
          }),
          fetch(`${API_URL}/assignments/?active_only=true`, {
            headers: getAuthHeader(),
          }).catch(() => null),
        ]);

        if (!response.ok) {
          throw new Error(`Failed to load vehicles (${response.status})`);
        }

        const data: BackendVehicle[] = await response.json();
        setVehicles(data);

        if (assignResponse && assignResponse.ok) {
          const assignData = await assignResponse.json().catch(() => []);
          if (Array.isArray(assignData)) {
            const map: Record<number, string> = {};
            for (const a of assignData) {
              if (a.vehicle_id && a.driver_username) {
                map[a.vehicle_id] = a.driver_username;
              }
            }
            setDriverAssignments(map);
          }
        }
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load vehicles from the backend. Make sure FastAPI is running.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadVehicles();

    // Subscribe to live telemetry and anomaly events over WebSocket
    const unsubscribe = subscribe((event) => {
      if (event.type === "vehicle.position.updated") {
        const updated = event.data;
        if (updated && updated.vehicle_id) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === updated.vehicle_id
                ? {
                    ...v,
                    latitude: updated.latitude,
                    longitude: updated.longitude,
                    status: updated.status || v.status,
                    current_trip_id:
                      updated.current_trip_id !== undefined
                        ? updated.current_trip_id
                        : v.current_trip_id,
                  }
                : v,
            ),
          );

          setSelectedVehicle((curr) =>
            curr && curr.id === updated.vehicle_id
              ? {
                  ...curr,
                  latitude: updated.latitude,
                  longitude: updated.longitude,
                  status: updated.status || curr.status,
                }
              : curr,
          );
        }
      } else if (event.type === "vehicle.anomaly.detected") {
        const a = event.data;
        if (a && a.vehicle_id) {
          setAnomalies((prev) => ({
            ...prev,
            [a.vehicle_id]: {
              anomaly_type: a.anomaly_type,
              severity: a.severity,
              description: a.description,
            },
          }));
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [subscribe]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const status = displayStatus(vehicle.status);

      const matchesFilter =
        activeFilter === "All" ||
        (activeFilter === "Moving" && status === "Moving") ||
        (activeFilter === "Delayed" && status === "Delayed") ||
        (activeFilter === "Offline" && status === "Offline");

      const searchText = search.toLowerCase();

      const matchesSearch =
        vehicle.vehicle_number.toLowerCase().includes(searchText) ||
        vehicle.vehicle_type.toLowerCase().includes(searchText) ||
        vehicle.cargo_type.toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [vehicles, activeFilter, search]);

  const moving = vehicles.filter(
    (vehicle) => displayStatus(vehicle.status) === "Moving",
  ).length;

  const delayed = vehicles.filter(
    (vehicle) => displayStatus(vehicle.status) === "Delayed",
  ).length;

  const offline = vehicles.filter(
    (vehicle) => displayStatus(vehicle.status) === "Offline",
  ).length;

  async function openVehicle(vehicle: BackendVehicle) {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/vehicles/${vehicle.id}`,
      );

      if (!response.ok) {
        throw new Error(`Failed to load vehicle (${response.status})`);
      }

      const data: BackendVehicle = await response.json();

      setSelectedVehicle(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load vehicle details from the backend.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.vehicles.title}</h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t.vehicles.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 px-4 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <Wifi size={17} className="text-emerald-600 dark:text-emerald-400" />

          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {t.vehicles.liveGpsSignal}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.vehicles.totalVehicles}</p>

            <Truck size={20} className="text-cyan-600 dark:text-cyan-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
            {vehicles.length}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.vehicles.totalVehiclesSub}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-500/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.vehicles.tabMoving}</p>

            <Navigation size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {moving}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.vehicles.inTransitSub}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-500/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.vehicles.tabDelayed}</p>

            <Clock3 size={20} className="text-amber-600 dark:text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {delayed}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.vehicles.delayedSub}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.vehicles.tabOffline}</p>

            <WifiOff size={20} className="text-slate-400 dark:text-slate-500" />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-700 dark:text-slate-400">
            {offline}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.vehicles.stoppedOfflineSub}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
            <Search size={18} className="text-slate-400 dark:text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.vehicles.searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600 lg:w-80"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["All", "Moving", "Delayed", "Offline"] as const).map(
              (filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                    activeFilter === filter
                      ? "border border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                >
                  {filterLabels[filter] || filter}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
              <tr>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colVehicle}
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colGps}
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colCargo}
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colType}
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colStatus}
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.vehicles.colActions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {t.common.loading}
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    {t.vehicles.noVehiclesFound}
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const status = displayStatus(vehicle.status);

                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => openVehicle(vehicle)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {/* Vehicle */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400">
                            <Truck size={20} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {vehicle.vehicle_number}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              ID: {vehicle.id} {driverAssignments[vehicle.id] && <span className="font-mono text-cyan-700 dark:text-cyan-400">• {t.vehicles.assignmentDetails}: {driverAssignments[vehicle.id]}</span>}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-cyan-600 dark:text-cyan-400" />

                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {vehicle.latitude !== null &&
                            vehicle.longitude !== null
                              ? `${vehicle.latitude.toFixed(
                                  4,
                                )}, ${vehicle.longitude.toFixed(4)}`
                              : t.vehicles.lastSeen}
                          </span>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                            {vehicle.cargo_type}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                            {t.vehicles.colPriority}: {vehicle.cargo_priority}
                          </p>
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td className="px-5 py-4">
                        <span className="text-sm capitalize text-slate-700 dark:text-slate-300">
                          {vehicle.vehicle_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                              status,
                            )}`}
                          >
                            <StatusIcon status={status} />
                            {getStatusLabel(vehicle.status)}
                          </span>
                          {anomalies[vehicle.id] && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                anomalies[vehicle.id].severity === "critical"
                                  ? "border-red-500/30 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                  : "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                              }`}
                            >
                              <AlertTriangle size={10} />
                              {anomalies[vehicle.id].anomaly_type.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openVehicle(vehicle);
                          }}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-transparent dark:text-cyan-400 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10"
                        >
                          {t.vehicles.viewDetails}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatString(t.incidents.showingCount, { count: filteredVehicles.length, total: vehicles.length })}
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            {moving} {t.vehicles.inTransitSub}
          </div>
        </div>
      </div>

      {/* Live Tracking Note */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/10 dark:bg-cyan-500/5">
        <Navigation
          size={18}
          className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400"
        />

        <div>
          <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-400">
            {t.vehicles.title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {t.vehicles.subtitle}
          </p>
        </div>
      </div>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-400">
                  {t.vehicles.modalTitle}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {selectedVehicle.vehicle_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {anomalies[selectedVehicle.id] && (
                <div
                  className={`mb-4 rounded-xl border p-4 ${
                    anomalies[selectedVehicle.id].severity === "critical"
                      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
                      : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Active Anomaly: {anomalies[selectedVehicle.id].anomaly_type.replace("_", " ")}
                    </p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-300">
                    {anomalies[selectedVehicle.id].description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.unitDetails}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedVehicle.id}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.colVehicle}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedVehicle.vehicle_number}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.assignmentDetails}</p>
                <p className="mt-2 font-mono text-sm font-medium text-cyan-700 dark:text-cyan-300">
                  {driverAssignments[selectedVehicle.id] || t.vehicles.unassignedTrip}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.colType}</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                  {selectedVehicle.vehicle_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.colStatus}</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                      displayStatus(selectedVehicle.status),
                    )}`}
                  >
                    <StatusIcon
                      status={displayStatus(selectedVehicle.status)}
                    />
                    {getStatusLabel(selectedVehicle.status)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.cargoDetails}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedVehicle.cargo_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.colPriority}</p>
                <p className="mt-2 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                  {selectedVehicle.cargo_priority}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-cyan-600 dark:text-cyan-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.telemetryDetails}</p>
                </div>

                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedVehicle.latitude !== null &&
                  selectedVehicle.longitude !== null
                    ? `${selectedVehicle.latitude}, ${selectedVehicle.longitude}`
                    : t.vehicles.lastSeen}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:col-span-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.vehicles.colTrip}</p>

                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedVehicle.current_trip_id !== null
                    ? `Trip #${selectedVehicle.current_trip_id}`
                    : t.vehicles.unassignedTrip}
                </p>
              </div>
            </div>
          </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;