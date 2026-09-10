import {
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
      return "bg-emerald-500/10 text-emerald-400";

    case "Delayed":
      return "bg-amber-500/10 text-amber-400";

    case "Stopped":
      return "bg-orange-500/10 text-orange-400";

    case "Offline":
      return "bg-slate-500/10 text-slate-400";

    case "Idle":
      return "bg-slate-500/10 text-slate-400";
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

  useEffect(() => {
    async function loadVehicles() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/vehicles/`);

        if (!response.ok) {
          throw new Error(`Failed to load vehicles (${response.status})`);
        }

        const data: BackendVehicle[] = await response.json();

        setVehicles(data);
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
  }, []);

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
          <h1 className="text-2xl font-semibold text-white">Vehicles</h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor logistics vehicles and their current movement across the
            North Eastern Region
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <Wifi size={17} className="text-emerald-400" />

          <span className="text-sm text-emerald-400">
            GPS Tracking Active
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Total Vehicles</p>

            <Truck size={20} className="text-cyan-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {vehicles.length}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Registered vehicles
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Moving</p>

            <Navigation size={20} className="text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {moving}
          </p>

          <p className="mt-1 text-xs text-slate-600">Currently on route</p>
        </div>

        <div className="rounded-xl border border-amber-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Delayed</p>

            <Clock3 size={20} className="text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            {delayed}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Requiring attention
          </p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Offline</p>

            <WifiOff size={20} className="text-slate-500" />
          </div>

          <p className="mt-3 text-3xl font-bold text-slate-400">
            {offline}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            No recent GPS signal
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <Search size={18} className="text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, type or cargo..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 lg:w-80"
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
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-500 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Vehicle
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Current Location
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Cargo
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Vehicle Type
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    Loading vehicles from backend...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    No vehicles found in the backend database.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const status = displayStatus(vehicle.status);

                  return (
                    <tr
                      key={vehicle.id}
                      onClick={() => openVehicle(vehicle)}
                      className="cursor-pointer transition hover:bg-slate-800/40"
                    >
                      {/* Vehicle */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Truck size={20} />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-white">
                              {vehicle.vehicle_number}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              Database ID: {vehicle.id}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-cyan-400" />

                          <span className="text-sm text-slate-300">
                            {vehicle.latitude !== null &&
                            vehicle.longitude !== null
                              ? `${vehicle.latitude.toFixed(
                                  4,
                                )}, ${vehicle.longitude.toFixed(4)}`
                              : "Location unavailable"}
                          </span>
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm text-slate-300">
                            {vehicle.cargo_type}
                          </p>

                          <p className="mt-1 text-xs capitalize text-slate-600">
                            Priority: {vehicle.cargo_priority}
                          </p>
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td className="px-5 py-4">
                        <span className="text-sm capitalize text-slate-300">
                          {vehicle.vehicle_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                            status,
                          )}`}
                        >
                          <StatusIcon status={status} />
                          {formatStatus(vehicle.status)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openVehicle(vehicle);
                          }}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-cyan-400 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
                        >
                          View Details
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
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-600">
            Showing {filteredVehicles.length} of {vehicles.length} registered
            vehicles
          </p>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {moving} vehicles transmitting GPS
          </div>
        </div>
      </div>

      {/* Live Tracking Note */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <Navigation
          size={18}
          className="mt-0.5 shrink-0 text-cyan-400"
        />

        <div>
          <p className="text-sm font-medium text-cyan-400">
            Live vehicle tracking
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Vehicle information is now being loaded directly from the NEXUS-NER
            backend. GPS coordinates are shown when available.
          </p>
        </div>
      </div>

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedVehicle(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-400">
                  Vehicle Details
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {selectedVehicle.vehicle_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Vehicle ID</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedVehicle.id}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Vehicle Number</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedVehicle.vehicle_number}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Vehicle Type</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">
                  {selectedVehicle.vehicle_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Status</p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                      displayStatus(selectedVehicle.status),
                    )}`}
                  >
                    <StatusIcon
                      status={displayStatus(selectedVehicle.status)}
                    />
                    {formatStatus(selectedVehicle.status)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Cargo Type</p>
                <p className="mt-2 text-sm font-medium text-white">
                  {selectedVehicle.cargo_type}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-600">Cargo Priority</p>
                <p className="mt-2 text-sm font-medium capitalize text-white">
                  {selectedVehicle.cargo_priority}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-cyan-400" />
                  <p className="text-xs text-slate-600">GPS Location</p>
                </div>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedVehicle.latitude !== null &&
                  selectedVehicle.longitude !== null
                    ? `${selectedVehicle.latitude}, ${selectedVehicle.longitude}`
                    : "GPS location unavailable"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                <p className="text-xs text-slate-600">Current Trip</p>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedVehicle.current_trip_id !== null
                    ? `Trip #${selectedVehicle.current_trip_id}`
                    : "No active trip assigned"}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedVehicle(null)}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vehicles;