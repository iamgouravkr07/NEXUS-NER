import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Truck,
  XCircle,
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

type Trip = {
  id: number;
  vehicle_id: number;
  origin: string;
  destination: string;
  cargo_type: string;
  priority: string;
  status: string;
  eta_minutes: number | null;
  route_distance_km: number | null;
  route_duration_minutes: number | null;
};

type Vehicle = {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  cargo_type: string;
  cargo_priority: string;
  status: string;
  latitude: number;
  longitude: number;
  current_trip_id: number | null;
};

type LocationPoint = {
  name: string;
  position: [number, number];
};

const API_URL = "http://127.0.0.1:8000";

const NER_LOCATIONS: Record<string, [number, number]> = {
  Guwahati: [26.1445, 91.7362],
  Itanagar: [27.0844, 93.6053],
  Shillong: [25.5788, 91.8933],
  Gangtok: [27.3389, 88.6065],
  Siliguri: [26.7271, 88.3953],
  Aizawl: [23.7271, 92.7176],
  Silchar: [24.8333, 92.7789],
  Imphal: [24.817, 93.9368],
  Dimapur: [25.8629, 93.7531],
  Kohima: [25.6751, 94.1086],
  Agartala: [23.8315, 91.2868],
  Tawang: [27.586, 91.859],
  Dibrugarh: [27.4728, 94.912],
  Pasighat: [28.066, 95.326],
  Tezpur: [26.6528, 92.7926],
  Bomdila: [27.2645, 92.4247],
  Jowai: [25.45, 92.2],
  Moreh: [24.253, 94.303],
  Naharlagun: [27.104, 93.695],
  Dharmanagar: [24.3667, 92.1667],
};

function getCityName(location: string) {
  return location.split(",")[0].trim();
}

function getLocation(location: string): LocationPoint {
  const city = getCityName(location);

  return {
    name: city,
    position: NER_LOCATIONS[city] ?? [26.2, 92.5],
  };
}

function formatDuration(minutes: number | null) {
  if (minutes === null || minutes === undefined) {
    return "N/A";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

function getPriorityStyle(priority: string) {
  switch (priority.toLowerCase()) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-400";

    case "normal":
      return "border-slate-700 bg-slate-800 text-slate-300";

    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

function getStatusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-500/10 text-emerald-400";

    case "delayed":
      return "bg-red-500/10 text-red-400";

    case "planned":
      return "bg-blue-500/10 text-blue-400";

    case "completed":
      return "bg-emerald-500/10 text-emerald-400";

    case "rerouting":
      return "bg-purple-500/10 text-purple-400";

    case "cancelled":
      return "bg-slate-500/10 text-slate-400";

    default:
      return "bg-slate-500/10 text-slate-400";
  }
}

/*
 * Moves the Leaflet map whenever the selected route changes.
 */
function MapController({
  origin,
  destination,
}: {
  origin: [number, number] | null;
  destination: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!origin || !destination) {
      return;
    }

    const bounds = [origin, destination] as [[number, number], [number, number]];

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 9,
    });
  }, [map, origin, destination]);

  return null;
}

function RoutePlanner() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [search, setSearch] = useState("");

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [error, setError] = useState("");

  const [routeCalculated, setRouteCalculated] = useState(false);
  const [showAlternate, setShowAlternate] = useState(false);

  const fetchData = async () => {
    try {
      setError("");
      setLoadingTrips(true);
      setLoadingVehicles(true);

      const [tripsResponse, vehiclesResponse] = await Promise.all([
        fetch(`${API_URL}/trips/`),
        fetch(`${API_URL}/vehicles/`),
      ]);

      if (!tripsResponse.ok) {
        throw new Error("Failed to load trips");
      }

      if (!vehiclesResponse.ok) {
        throw new Error("Failed to load vehicles");
      }

      const tripsData: Trip[] = await tripsResponse.json();
      const vehiclesData: Vehicle[] = await vehiclesResponse.json();

      setTrips(tripsData);
      setVehicles(vehiclesData);

      if (tripsData.length > 0) {
        setSelectedTrip((current) => current ?? tripsData[0]);
      }

      if (vehiclesData.length > 0) {
        setSelectedVehicle((current) => current ?? vehiclesData[0]);
      }
    } catch (err) {
      console.error(err);

      setError(
        "Unable to connect to the backend. Make sure FastAPI and PostgreSQL are running."
      );
    } finally {
      setLoadingTrips(false);
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /*
   * When a trip is selected, automatically find its vehicle.
   */
  useEffect(() => {
    if (!selectedTrip) {
      return;
    }

    const vehicle = vehicles.find(
      (item) => item.id === selectedTrip.vehicle_id
    );

    if (vehicle) {
      setSelectedVehicle(vehicle);
    }

    setRouteCalculated(false);
    setShowAlternate(false);
  }, [selectedTrip, vehicles]);

  const filteredTrips = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return trips;
    }

    return trips.filter((trip) => {
      const vehicleNumber = `VH-${String(trip.vehicle_id).padStart(3, "0")}`;

      return (
        vehicleNumber.toLowerCase().includes(query) ||
        trip.origin.toLowerCase().includes(query) ||
        trip.destination.toLowerCase().includes(query) ||
        trip.cargo_type.toLowerCase().includes(query) ||
        trip.priority.toLowerCase().includes(query) ||
        trip.status.toLowerCase().includes(query)
      );
    });
  }, [trips, search]);

  const origin = selectedTrip
    ? getLocation(selectedTrip.origin)
    : null;

  const destination = selectedTrip
    ? getLocation(selectedTrip.destination)
    : null;

  /*
   * Main route.
   *
   * This is currently a visual route between the two known
   * NER locations. Later, OSRM/PostGIS/AI risk weighting
   * will replace this with an actual road-network route.
   */
  const mainRoute = useMemo(() => {
    if (!origin || !destination) {
      return [];
    }

    const [lat1, lng1] = origin.position;
    const [lat2, lng2] = destination.position;

    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    return [
      origin.position,
      [midLat + 0.25, midLng] as [number, number],
      destination.position,
    ];
  }, [origin, destination]);

  /*
   * Alternate route intentionally takes a different visual
   * path. Later this will be replaced by the AI routing engine.
   */
  const alternateRoute = useMemo(() => {
    if (!origin || !destination) {
      return [];
    }

    const [lat1, lng1] = origin.position;
    const [lat2, lng2] = destination.position;

    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    return [
      origin.position,
      [midLat - 0.35, midLng + 0.35] as [number, number],
      destination.position,
    ];
  }, [origin, destination]);

  const handleCalculateRoute = () => {
    if (!selectedTrip) {
      return;
    }

    setRouteCalculated(true);
    setShowAlternate(false);
  };

  const handleAlternateRoute = () => {
    if (!selectedTrip) {
      return;
    }

    setRouteCalculated(true);
    setShowAlternate(true);
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setRouteCalculated(false);
    setShowAlternate(false);
  };

  const handleVehicleChange = (vehicleId: number) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);

    if (!vehicle) {
      return;
    }

    setSelectedVehicle(vehicle);

    const trip = trips.find((item) => item.vehicle_id === vehicle.id);

    if (trip) {
      setSelectedTrip(trip);
    }
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Route Planner
          </h1>

          <p className="mt-2 text-slate-400">
            Interactive route planning for NER logistics operations
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex w-fit items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw size={16} />
          Refresh Data
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle
            size={20}
            className="shrink-0 text-red-400"
          />

          <div>
            <p className="font-medium text-red-400">
              Backend connection error
            </p>

            <p className="mt-1 text-sm text-red-400/80">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* TOP CONTROL PANEL */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* VEHICLE */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Truck size={18} className="text-cyan-400" />

            <p className="text-sm font-medium text-slate-300">
              Select Vehicle
            </p>
          </div>

          <select
            value={selectedVehicle?.id ?? ""}
            onChange={(e) =>
              handleVehicleChange(Number(e.target.value))
            }
            disabled={loadingVehicles}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
          >
            {loadingVehicles ? (
              <option>Loading vehicles...</option>
            ) : (
              vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicle_number} — {vehicle.cargo_type}
                </option>
              ))
            )}
          </select>
        </div>

        {/* ORIGIN */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" />

            <p className="text-sm font-medium text-slate-300">
              Origin
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3">
            <p className="text-sm font-medium text-white">
              {origin?.name ?? "Select a trip"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selectedTrip?.origin ?? "No origin selected"}
            </p>
          </div>
        </div>

        {/* DESTINATION */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-red-400" />

            <p className="text-sm font-medium text-slate-300">
              Destination
            </p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3">
            <p className="text-sm font-medium text-white">
              {destination?.name ?? "Select a trip"}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {selectedTrip?.destination ??
                "No destination selected"}
            </p>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* LEFT SIDE */}
        <div className="space-y-6 xl:col-span-4">
          {/* SEARCH + TRIPS */}
          <div className="rounded-xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">
                    Available Trips
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Click any trip to load it on the map
                  </p>
                </div>

                <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-400">
                  {trips.length}
                </span>
              </div>

              <div className="relative mt-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vehicle, route, cargo..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-[430px] overflow-y-auto p-3">
              {loadingTrips ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Loading trips...
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No trips found.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTrips.map((trip) => {
                    const isSelected =
                      selectedTrip?.id === trip.id;

                    return (
                      <button
                        key={trip.id}
                        onClick={() => handleTripClick(trip)}
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-500/50 bg-blue-500/10"
                            : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Truck
                              size={16}
                              className={
                                isSelected
                                  ? "text-blue-400"
                                  : "text-slate-500"
                              }
                            />

                            <span className="text-sm font-semibold text-white">
                              VH-
                              {String(trip.vehicle_id).padStart(
                                3,
                                "0"
                              )}
                            </span>
                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${getStatusStyle(
                              trip.status
                            )}`}
                          >
                            {trip.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs">
                          <span className="max-w-[110px] truncate text-slate-300">
                            {getCityName(trip.origin)}
                          </span>

                          <ArrowRight
                            size={13}
                            className="shrink-0 text-slate-600"
                          />

                          <span className="max-w-[110px] truncate text-slate-300">
                            {getCityName(trip.destination)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] capitalize ${getPriorityStyle(
                              trip.priority
                            )}`}
                          >
                            {trip.priority}
                          </span>

                          <span className="text-[10px] text-slate-500">
                            Trip #{trip.id}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SELECTED TRIP */}
          {selectedTrip && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">
                    Selected Trip
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Trip #{selectedTrip.id}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${getStatusStyle(
                    selectedTrip.status
                  )}`}
                >
                  {selectedTrip.status}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-0.5 text-emerald-400"
                  />

                  <div>
                    <p className="text-[11px] uppercase text-slate-500">
                      Origin
                    </p>

                    <p className="mt-1 text-sm text-white">
                      {selectedTrip.origin}
                    </p>
                  </div>
                </div>

                <div className="ml-2 h-5 border-l border-dashed border-slate-700" />

                <div className="flex items-start gap-3">
                  <MapPin
                    size={17}
                    className="mt-0.5 text-red-400"
                  />

                  <div>
                    <p className="text-[11px] uppercase text-slate-500">
                      Destination
                    </p>

                    <p className="mt-1 text-sm text-white">
                      {selectedTrip.destination}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-500">
                    Distance
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {selectedTrip.route_distance_km ?? "N/A"} km
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-500">
                    ETA
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatDuration(selectedTrip.eta_minutes)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-950 p-3">
                <Package
                  size={16}
                  className="text-orange-400"
                />

                <div>
                  <p className="text-[11px] text-slate-500">
                    Cargo
                  </p>

                  <p className="text-sm text-slate-200">
                    {selectedTrip.cargo_type}
                  </p>
                </div>
              </div>

              {/* ROUTE ACTIONS */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={handleCalculateRoute}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  <RouteIcon size={16} />
                  Calculate
                </button>

                <button
                  onClick={handleAlternateRoute}
                  className="flex items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-sm font-medium text-purple-300 transition hover:bg-purple-500/20"
                >
                  <ArrowRight size={16} />
                  Alternate
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MAP */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 xl:col-span-8">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Route Visualization
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select a trip and calculate the route
              </p>
            </div>

            {routeCalculated && selectedTrip && (
              <div className="flex items-center gap-2">
                {showAlternate ? (
                  <>
                    <AlertTriangle
                      size={15}
                      className="text-purple-400"
                    />

                    <span className="text-xs font-medium text-purple-300">
                      Alternate route
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={15}
                      className="text-emerald-400"
                    />

                    <span className="text-xs font-medium text-emerald-300">
                      Route calculated
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative h-[650px]">
            <MapContainer
              center={[26.2, 92.5]}
              zoom={6}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                origin={origin?.position ?? null}
                destination={destination?.position ?? null}
              />

              {/* CURRENT VEHICLE */}
              {selectedVehicle && (
                <CircleMarker
                  center={[
                    selectedVehicle.latitude,
                    selectedVehicle.longitude,
                  ]}
                  radius={9}
                  pathOptions={{
                    color: "#06b6d4",
                    fillColor: "#06b6d4",
                    fillOpacity: 0.95,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>
                        {selectedVehicle.vehicle_number}
                      </strong>

                      <br />

                      Vehicle: {selectedVehicle.vehicle_type}

                      <br />

                      Cargo: {selectedVehicle.cargo_type}

                      <br />

                      Status: {selectedVehicle.status}
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* ORIGIN */}
              {origin && (
                <CircleMarker
                  center={origin.position}
                  radius={11}
                  pathOptions={{
                    color: "#22c55e",
                    fillColor: "#22c55e",
                    fillOpacity: 0.95,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Origin</strong>

                      <br />

                      {selectedTrip?.origin}
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* DESTINATION */}
              {destination && (
                <CircleMarker
                  center={destination.position}
                  radius={11}
                  pathOptions={{
                    color: "#ef4444",
                    fillColor: "#ef4444",
                    fillOpacity: 0.95,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Destination</strong>

                      <br />

                      {selectedTrip?.destination}
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* MAIN ROUTE */}
              {routeCalculated && !showAlternate && (
                <Polyline
                  positions={mainRoute}
                  pathOptions={{
                    color: "#2563eb",
                    weight: 7,
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Primary Route</strong>

                      <br />

                      {selectedTrip?.origin} →{" "}
                      {selectedTrip?.destination}

                      <br />

                      Distance:{" "}
                      {selectedTrip?.route_distance_km} km
                    </div>
                  </Popup>
                </Polyline>
              )}

              {/* ALTERNATE ROUTE */}
              {routeCalculated && showAlternate && (
                <>
                  <Polyline
                    positions={alternateRoute}
                    pathOptions={{
                      color: "#a855f7",
                      weight: 7,
                      opacity: 0.9,
                      dashArray: "12 8",
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>Alternate Route</strong>

                        <br />

                        Risk-aware alternate path

                        <br />

                        {selectedTrip?.origin} →{" "}
                        {selectedTrip?.destination}
                      </div>
                    </Popup>
                  </Polyline>

                  {/* Primary route shown faintly for comparison */}
                  <Polyline
                    positions={mainRoute}
                    pathOptions={{
                      color: "#64748b",
                      weight: 4,
                      opacity: 0.35,
                      dashArray: "6 8",
                    }}
                  />
                </>
              )}
            </MapContainer>

            {/* MAP STATUS */}
            <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-xs font-medium text-slate-200">
                  Route Operations
                </span>
              </div>

              {selectedTrip && (
                <p className="mt-2 text-xs text-slate-400">
                  VH-
                  {String(selectedTrip.vehicle_id).padStart(
                    3,
                    "0"
                  )}{" "}
                  • {getCityName(selectedTrip.origin)} →{" "}
                  {getCityName(selectedTrip.destination)}
                </p>
              )}
            </div>

            {/* MAP LEGEND */}
            <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
              <p className="mb-2 text-xs font-semibold text-white">
                Route Legend
              </p>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  Origin
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Destination
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-cyan-400" />
                  Vehicle
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-1 w-6 rounded bg-blue-500" />
                  Primary Route
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-1 w-6 rounded bg-purple-500" />
                  Alternate Route
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROUTE RESULT */}
      {routeCalculated && selectedTrip && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                {showAlternate
                  ? "Alternate Route Recommendation"
                  : "Route Calculation Result"}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {selectedTrip.origin} →{" "}
                {selectedTrip.destination}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                <RouteIcon
                  size={17}
                  className="text-blue-400"
                />

                <div>
                  <p className="text-[10px] text-slate-500">
                    Distance
                  </p>

                  <p className="text-sm font-semibold text-white">
                    {selectedTrip.route_distance_km ?? "N/A"} km
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                <Clock3
                  size={17}
                  className="text-orange-400"
                />

                <div>
                  <p className="text-[10px] text-slate-500">
                    ETA
                  </p>

                  <p className="text-sm font-semibold text-white">
                    {formatDuration(selectedTrip.eta_minutes)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                {selectedTrip.status === "delayed" ? (
                  <XCircle
                    size={17}
                    className="text-red-400"
                  />
                ) : (
                  <CheckCircle2
                    size={17}
                    className="text-emerald-400"
                  />
                )}

                <div>
                  <p className="text-[10px] text-slate-500">
                    Status
                  </p>

                  <p className="text-sm font-semibold capitalize text-white">
                    {selectedTrip.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-800 pt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <Truck size={18} />
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Assigned Vehicle
                  </p>

                  <p className="text-sm font-medium text-white">
                    {selectedVehicle?.vehicle_number ??
                      `VH-${String(
                        selectedTrip.vehicle_id
                      ).padStart(3, "0")}`}
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${getPriorityStyle(
                    selectedTrip.priority
                  )}`}
                >
                  {selectedTrip.priority} priority cargo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI ROAD RISK PLACEHOLDER */}
      <div className="rounded-xl border border-dashed border-purple-500/30 bg-purple-500/5 p-5">
        <div className="flex gap-4">
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
            <AlertTriangle size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-purple-300">
              AI Risk-Aware Routing
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              The current planner uses your real vehicle and trip
              data. The next integration will connect the road-risk
              model and GIS routing engine so routes can be scored
              using landslide risk, road condition, incidents and
              other NER disruption signals.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                ML Risk Score
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                Road Network
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                Incident Data
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                Alternate Routing
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoutePlanner;