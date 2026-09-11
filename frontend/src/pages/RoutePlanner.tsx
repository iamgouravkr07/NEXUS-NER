import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Package,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Route as RouteIcon,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  WifiOff,
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
import { useAuth } from "../context/AuthContext";
import { MapErrorBoundary } from "../components/MapErrorBoundary";
import { networkService } from "../services/network";

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
  origin_lat?: number | null;
  origin_lon?: number | null;
  destination_lat?: number | null;
  destination_lon?: number | null;
  reroute_count?: number;
  last_reroute_reason?: string | null;
};

type RerouteResponse = {
  trip_id: number;
  vehicle_id: number;
  reroute_required: boolean;
  status: string;
  message?: string;
  blockage?: {
    title: string;
    latitude: number;
    longitude: number;
    type: string;
    description?: string;
  };
  previous_route?: {
    distance_km: number;
    duration_minutes: number;
    geometry: any;
    risk_score: number;
    risk_level: string;
  };
  new_route?: {
    distance_km: number;
    duration_minutes: number;
    geometry: any;
    risk_score: number;
    risk_level: string;
    risk_factors?: {
      factor: string;
      score: number;
      severity: string;
      description: string;
    }[];
  } | null;
  current_route?: {
    distance_km: number;
    duration_minutes: number;
    geometry: any;
    risk_score: number;
    risk_level: string;
    risk_factors?: {
      factor: string;
      score: number;
      severity: string;
      description: string;
    }[];
  };
  delay_minutes?: number | null;
  reroute_count?: number;
  reason?: string;
  alternatives_evaluated?: number;
  safe_alternatives_found?: number;
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
  last_gps_timestamp?: string | null;
  current_trip_id: number | null;
};

type LocationPoint = {
  name: string;
  position: [number, number];
};

const API_URL = import.meta.env.VITE_API_URL;

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
  routeCoords,
}: {
  origin: [number, number] | null;
  destination: [number, number] | null;
  routeCoords?: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      map.fitBounds(routeCoords, {
        padding: [60, 60],
        maxZoom: 10,
      });
      return;
    }

    if (!origin || !destination) {
      return;
    }

    const bounds = [origin, destination] as [[number, number], [number, number]];

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 9,
    });
  }, [map, origin, destination, routeCoords]);

  return null;
}

function parseCoordinates(geometry: any): [number, number][] {
  if (!geometry) return [];
  const coords = Array.isArray(geometry) ? geometry : geometry.coordinates;
  if (!Array.isArray(coords)) return [];
  return coords.map((pt: any) => {
    if (typeof pt[0] === "number" && typeof pt[1] === "number") {
      // In NER, lon is ~88-97 and lat is ~22-29
      if (pt[0] > 60 && pt[1] < 40) {
        return [pt[1], pt[0]];
      }
      return [pt[0], pt[1]];
    }
    return [0, 0];
  });
}

function RoutePlanner() {
  const { getAuthHeader } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [search, setSearch] = useState("");

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [error, setError] = useState("");

  const [routeCalculated, setRouteCalculated] = useState(false);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [mainRoute, setMainRoute] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState<number | null>(null);

  // Dynamic Rerouting state
  const [rerouteResult, setRerouteResult] = useState<RerouteResponse | null>(null);
  const [isRerouted, setIsRerouted] = useState(false);
  const [blockedRoute, setBlockedRoute] = useState<[number, number][]>([]);
  const [detourRoute, setDetourRoute] = useState<[number, number][]>([]);
  const [blockagePoint, setBlockagePoint] = useState<{
    lat: number;
    lng: number;
    title: string;
    type: string;
    description?: string;
  } | null>(null);

  // Network & Offline Map Safeguard
  const [isOnline, setIsOnline] = useState<boolean>(networkService.getStatus().connected);
  const [tileError, setTileError] = useState<boolean>(false);

  useEffect(() => {
    const unsub = networkService.subscribe((status) => {
      setIsOnline(status.connected);
      if (!status.connected) {
        setTileError(true);
      } else {
        setTileError(false);
      }
    });
    return () => unsub();
  }, []);

  // GPS Tracking & Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const simIndexRef = useRef<number>(0);
  const simIntervalRef = useRef<any>(null);

  const handleToggleSimulation = async () => {
    if (isSimulating) {
      setIsSimulating(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      return;
    }

    if (!selectedVehicle) return;

    const routeToFollow = isRerouted && detourRoute.length > 0 ? detourRoute : mainRoute;
    if (routeToFollow.length === 0) {
      await handleCalculateRoute();
    }

    setIsSimulating(true);
  };

  const handleResetSimulation = async () => {
    setIsSimulating(false);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simIndexRef.current = 0;

    if (!selectedTrip || !selectedVehicle) return;
    const orig = getLocation(selectedTrip.origin);
    const startLat = selectedTrip.origin_lat ?? orig?.position[0] ?? selectedVehicle.latitude;
    const startLon = selectedTrip.origin_lon ?? orig?.position[1] ?? selectedVehicle.longitude;

    const resetVehicle = {
      ...selectedVehicle,
      latitude: startLat,
      longitude: startLon,
      status: "idle",
      last_gps_timestamp: new Date().toISOString(),
    };
    setSelectedVehicle(resetVehicle);

    try {
      await fetch(`${API_URL}/vehicles/${selectedVehicle.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: startLat,
          longitude: startLon,
          timestamp: new Date().toISOString(),
          status: "idle",
        }),
      });
    } catch (err) {
      console.error("Failed to reset vehicle location:", err);
    }
  };

  useEffect(() => {
    if (!isSimulating || !selectedVehicle) return;

    const routeToFollow = isRerouted && detourRoute.length > 0 ? detourRoute : mainRoute;
    if (routeToFollow.length === 0) return;

    const intervalMs = Math.max(250, 1500 / simSpeed);

    simIntervalRef.current = setInterval(async () => {
      const activeRoute = isRerouted && detourRoute.length > 0 ? detourRoute : mainRoute;
      if (activeRoute.length === 0) return;

      const stepIncrement = Math.max(1, Math.floor(activeRoute.length / 30));
      simIndexRef.current = Math.min(simIndexRef.current + stepIncrement, activeRoute.length - 1);
      const nextCoord = activeRoute[simIndexRef.current];

      const isFinished = simIndexRef.current >= activeRoute.length - 1;
      const status = isFinished ? "delivered" : "in_transit";
      const nowIso = new Date().toISOString();

      setSelectedVehicle((prev) =>
        prev
          ? {
              ...prev,
              latitude: nextCoord[0],
              longitude: nextCoord[1],
              status,
              last_gps_timestamp: nowIso,
            }
          : null
      );

      try {
        await fetch(`${API_URL}/vehicles/${selectedVehicle.id}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: nextCoord[0],
            longitude: nextCoord[1],
            timestamp: nowIso,
            status,
          }),
        });
      } catch (err) {
        console.error("Failed to push simulated GPS position:", err);
      }

      if (isFinished) {
        setIsSimulating(false);
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      }
    }, intervalMs);

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [isSimulating, simSpeed, mainRoute, detourRoute, isRerouted, selectedVehicle?.id]);

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
  }, [selectedTrip?.vehicle_id, vehicles]);

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

  const handleCalculateRoute = async () => {
    if (!selectedTrip || !origin || !destination) {
      return;
    }

    try {
      setRouting(true);
      setRouteError("");
      setIsRerouted(false);
      setBlockedRoute([]);
      setDetourRoute([]);
      setBlockagePoint(null);
      setRerouteResult(null);

      const originLat = selectedTrip.origin_lat ?? origin.position[0];
      const originLng = selectedTrip.origin_lon ?? origin.position[1];
      const destLat = selectedTrip.destination_lat ?? destination.position[0];
      const destLng = selectedTrip.destination_lon ?? destination.position[1];

      const response = await fetch(`${API_URL}/routes/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin_lat: originLat,
          origin_lon: originLng,
          destination_lat: destLat,
          destination_lon: destLng,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.detail || `Backend route calculation failed (${response.status})`
        );
      }

      const routeData = await response.json();
      const coords = parseCoordinates(routeData.geometry);

      setMainRoute(coords);
      setRouteDistanceKm(routeData.distance_km);
      setRouteDurationMinutes(routeData.duration_minutes);
      setRouteCalculated(true);
    } catch (err) {
      console.error(err);
      setRouteCalculated(false);
      setRouteError(
        err instanceof Error
          ? err.message
          : "Unable to calculate the road route via backend"
      );
    } finally {
      setRouting(false);
    }
  };

  const handleDynamicReroute = async () => {
    if (!selectedTrip) {
      return;
    }

    try {
      setRouting(true);
      setRouteError("");

      const response = await fetch(
        `${API_URL}/trips/${selectedTrip.id}/reroute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.detail || `Dynamic rerouting failed (${response.status})`
        );
      }

      const data: RerouteResponse = await response.json();
      setRerouteResult(data);
      setRouteCalculated(true);

      if (data.reroute_required) {
        setIsRerouted(true);

        // Previous blocked route
        if (data.previous_route?.geometry) {
          setBlockedRoute(parseCoordinates(data.previous_route.geometry));
        }

        // New detour route
        if (data.new_route) {
          const detourCoords = parseCoordinates(data.new_route.geometry);
          setDetourRoute(detourCoords);
          setMainRoute(detourCoords);
          setRouteDistanceKm(data.new_route.distance_km);
          setRouteDurationMinutes(data.new_route.duration_minutes);
        } else {
          setDetourRoute([]);
        }

        // Incident / blockage marker
        if (data.blockage) {
          setBlockagePoint({
            lat: data.blockage.latitude,
            lng: data.blockage.longitude,
            title: data.blockage.title,
            type: data.blockage.type,
            description: data.blockage.description,
          });
        }

        // Update local selected trip and trips collection
        const updatedFields = {
          status: data.status,
          eta_minutes: data.new_route?.duration_minutes ?? selectedTrip.eta_minutes,
          route_distance_km: data.new_route?.distance_km ?? selectedTrip.route_distance_km,
          route_duration_minutes: data.new_route?.duration_minutes ?? selectedTrip.route_duration_minutes,
          reroute_count: data.reroute_count ?? (selectedTrip.reroute_count ?? 0) + 1,
          last_reroute_reason: data.reason ?? selectedTrip.last_reroute_reason,
        };

        setSelectedTrip((prev) => (prev ? { ...prev, ...updatedFields } : null));
        setTrips((prev) =>
          prev.map((t) => (t.id === data.trip_id ? { ...t, ...updatedFields } : t))
        );
      } else {
        // Clear of blockages
        setIsRerouted(false);
        setBlockedRoute([]);
        setDetourRoute([]);
        setBlockagePoint(null);

        if (data.current_route?.geometry) {
          const coords = parseCoordinates(data.current_route.geometry);
          setMainRoute(coords);
          setRouteDistanceKm(data.current_route.distance_km);
          setRouteDurationMinutes(data.current_route.duration_minutes);
        }
      }
    } catch (err) {
      console.error(err);
      setRouteError(
        err instanceof Error
          ? err.message
          : "Unable to evaluate and reroute trip"
      );
    } finally {
      setRouting(false);
    }
  };

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
    setRouteCalculated(false);
    setRouteError("");
    setMainRoute([]);
    setBlockedRoute([]);
    setDetourRoute([]);
    setBlockagePoint(null);
    setIsRerouted(false);
    setRerouteResult(null);
    setRouteDistanceKm(null);
    setRouteDurationMinutes(null);
  };

  const handleVehicleChange = (vehicleId: number) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId);

    if (!vehicle) {
      return;
    }

    setSelectedVehicle(vehicle);

    const trip = trips.find((item) => item.vehicle_id === vehicle.id);

    if (trip) {
      handleTripClick(trip);
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

      {routeError && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <AlertTriangle size={20} className="shrink-0 text-orange-400" />
          <div>
            <p className="font-medium text-orange-300">Routing service message</p>
            <p className="mt-1 text-sm text-orange-300/80">{routeError}</p>
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
                    {routeDistanceKm !== null
                      ? routeDistanceKm.toFixed(1)
                      : selectedTrip.route_distance_km ?? "N/A"} km
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950 p-3">
                  <p className="text-[11px] text-slate-500">
                    ETA
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatDuration(
                      routeDurationMinutes !== null
                        ? Math.round(routeDurationMinutes)
                        : selectedTrip.eta_minutes
                    )}
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
                  disabled={routing}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  <RouteIcon size={16} />
                  {routing && !isRerouted ? "Calculating..." : "Calculate Route"}
                </button>

                <button
                  onClick={handleDynamicReroute}
                  disabled={routing}
                  className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={routing && isRerouted ? "animate-spin" : ""} />
                  {routing && isRerouted ? "Evaluating..." : "Dynamic Reroute"}
                </button>
              </div>
            </div>
          )}

          {/* VEHICLE LIVE GPS TRACKING & SIMULATOR */}
          {selectedVehicle && (
            <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-slate-900 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-400">
                    <Navigation size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Live Vehicle Tracking</h3>
                    <p className="text-[11px] text-slate-400">Hardware & Telematics Telemetry</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                    selectedVehicle.status === "in_transit"
                      ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                      : "border border-slate-700 bg-slate-800 text-slate-300"
                  }`}
                >
                  {selectedVehicle.status}
                </span>
              </div>

              {/* Coordinates Display Card */}
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-cyan-300/80">GPS Coordinates</span>
                  <span className="text-[11px] text-slate-400">
                    {selectedVehicle.last_gps_timestamp
                      ? new Date(selectedVehicle.last_gps_timestamp).toLocaleTimeString()
                      : "Live Stream"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-xs text-cyan-200">
                  <div className="rounded bg-slate-950/80 p-2">
                    <span className="block text-[10px] text-slate-500">LATITUDE</span>
                    <span className="font-semibold">{selectedVehicle.latitude.toFixed(5)}°</span>
                  </div>
                  <div className="rounded bg-slate-950/80 p-2">
                    <span className="block text-[10px] text-slate-500">LONGITUDE</span>
                    <span className="font-semibold">{selectedVehicle.longitude.toFixed(5)}°</span>
                  </div>
                  <div className="rounded bg-slate-950/80 p-2 text-right">
                    <span className="block text-[10px] text-slate-500">SIGNAL</span>
                    <span className="inline-flex items-center gap-1 font-sans text-[11px] text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle & Trip Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950 p-2.5">
                  <span className="text-slate-500">Unit ID</span>
                  <p className="mt-0.5 font-medium text-slate-200">
                    {selectedVehicle.vehicle_number} ({selectedVehicle.vehicle_type})
                  </p>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5">
                  <span className="text-slate-500">Assigned Trip</span>
                  <p className="mt-0.5 font-medium text-slate-200">
                    {selectedTrip ? `Trip #${selectedTrip.id}` : "Idle"}
                  </p>
                </div>
              </div>

              {/* Deterministic GPS Simulator Controls */}
              <div className="space-y-2 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Play size={13} className="text-cyan-400" />
                    GPS Simulator
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setSimSpeed(spd)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                          simSpeed === spd
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSimulation}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                      isSimulating
                        ? "border border-amber-500 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30"
                        : "bg-cyan-600 text-white hover:bg-cyan-500"
                    }`}
                  >
                    {isSimulating ? <Pause size={14} /> : <Play size={14} />}
                    {isSimulating ? "Pause Simulator" : "Start Simulation"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
                  >
                    <RotateCcw size={14} />
                    Reset Start
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MAP */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 xl:col-span-8">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Route GIS Visualization
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {isRerouted
                  ? "Dynamic detour active — comparing blocked corridor against safe road alternative"
                  : "Select a trip and calculate route or evaluate dynamic reroute"}
              </p>
            </div>

            {routeCalculated && selectedTrip && (
              <div className="flex items-center gap-2">
                {isRerouted ? (
                  rerouteResult?.new_route ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Safe Detour Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                      <ShieldAlert size={14} className="text-red-400" />
                      <span>Route Blocked - Delayed</span>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                    <CheckCircle2 size={14} className="text-blue-400" />
                    <span>Route Calculated</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative h-[650px]">
            <MapErrorBoundary fallbackMessage="Map tiles unavailable — offline mode">
              <MapContainer
                center={[26.2, 92.5]}
                zoom={6}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  eventHandlers={{
                    tileerror: () => setTileError(true),
                    load: () => {
                      if (isOnline) setTileError(false);
                    },
                  }}
                />

              <MapController
                origin={origin?.position ?? null}
                destination={destination?.position ?? null}
                routeCoords={
                  isRerouted && detourRoute.length > 0
                    ? detourRoute
                    : isRerouted && blockedRoute.length > 0
                    ? blockedRoute
                    : mainRoute.length > 0
                    ? mainRoute
                    : undefined
                }
              />

              {/* CURRENT VEHICLE GPS TELEMETRY MARKER */}
              {selectedVehicle && (
                <>
                  <CircleMarker
                    center={[
                      selectedVehicle.latitude,
                      selectedVehicle.longitude,
                    ]}
                    radius={16}
                    pathOptions={{
                      color: "#06b6d4",
                      fillColor: "#22d3ee",
                      fillOpacity: 0.22,
                      weight: 1.5,
                      dashArray: "4 3",
                    }}
                  />
                  <CircleMarker
                    center={[
                      selectedVehicle.latitude,
                      selectedVehicle.longitude,
                    ]}
                    radius={9}
                    pathOptions={{
                      color: "#0891b2",
                      fillColor: "#06b6d4",
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong className="text-cyan-400">{selectedVehicle.vehicle_number}</strong>
                        <br />
                        <strong>Type:</strong> {selectedVehicle.vehicle_type}
                        <br />
                        <strong>Status:</strong>{" "}
                        <span className="capitalize">{selectedVehicle.status}</span>
                        <br />
                        <strong>GPS:</strong> {selectedVehicle.latitude.toFixed(5)},{" "}
                        {selectedVehicle.longitude.toFixed(5)}
                        <br />
                        <strong>Assigned Trip:</strong>{" "}
                        {selectedTrip ? `Trip #${selectedTrip.id}` : "None"}
                        <br />
                        <strong>Last Fix:</strong>{" "}
                        {selectedVehicle.last_gps_timestamp
                          ? new Date(selectedVehicle.last_gps_timestamp).toLocaleTimeString()
                          : "Live Stream"}
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
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

              {/* NORMAL PRIMARY ROUTE */}
              {routeCalculated && !isRerouted && mainRoute.length > 0 && (
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
                      <strong>OSRM Road Route</strong>
                      <br />
                      {selectedTrip?.origin} → {selectedTrip?.destination}
                      <br />
                      Distance: {routeDistanceKm?.toFixed(1)} km
                      <br />
                      Travel time: {formatDuration(
                        routeDurationMinutes !== null
                          ? Math.round(routeDurationMinutes)
                          : null
                      )}
                    </div>
                  </Popup>
                </Polyline>
              )}

              {/* REROUTE: ORIGINAL BLOCKED ROUTE (Red/Amber dashed) */}
              {isRerouted && blockedRoute.length > 0 && (
                <Polyline
                  positions={blockedRoute}
                  pathOptions={{
                    color: "#ef4444",
                    weight: 5,
                    opacity: 0.75,
                    dashArray: "10 8",
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong className="text-red-500">Original Blocked Route</strong>
                      <br />
                      {selectedTrip?.origin} → {selectedTrip?.destination}
                      <br />
                      Distance: {rerouteResult?.previous_route?.distance_km} km
                      <br />
                      Duration: {formatDuration(
                        rerouteResult?.previous_route?.duration_minutes ?? null
                      )}
                      <br />
                      Risk Score: {rerouteResult?.previous_route?.risk_score} (
                      {rerouteResult?.previous_route?.risk_level})
                    </div>
                  </Popup>
                </Polyline>
              )}

              {/* REROUTE: SELECTED DETOUR ROUTE (Solid Emerald) */}
              {isRerouted && detourRoute.length > 0 && (
                <Polyline
                  positions={detourRoute}
                  pathOptions={{
                    color: "#10b981",
                    weight: 7,
                    opacity: 0.95,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong className="text-emerald-500">
                        Selected Detour (Safe Corridor)
                      </strong>
                      <br />
                      Distance: {rerouteResult?.new_route?.distance_km} km
                      <br />
                      Updated ETA: {formatDuration(
                        rerouteResult?.new_route?.duration_minutes ?? null
                      )}
                      <br />
                      Evaluated Risk: {rerouteResult?.new_route?.risk_score} (
                      {rerouteResult?.new_route?.risk_level})
                      {rerouteResult?.delay_minutes !== null &&
                        rerouteResult?.delay_minutes !== undefined && (
                          <>
                            <br />
                            <span className="font-semibold text-amber-500">
                              Delay: +{rerouteResult.delay_minutes} min
                            </span>
                          </>
                        )}
                    </div>
                  </Popup>
                </Polyline>
              )}

              {/* ACTIVE BLOCKAGE / HAZARD MARKER */}
              {isRerouted && blockagePoint && (
                <>
                  <CircleMarker
                    center={[blockagePoint.lat, blockagePoint.lng]}
                    radius={18}
                    pathOptions={{
                      color: "#dc2626",
                      fillColor: "#ef4444",
                      fillOpacity: 0.25,
                      weight: 2,
                      dashArray: "4 4",
                    }}
                  />
                  <CircleMarker
                    center={[blockagePoint.lat, blockagePoint.lng]}
                    radius={10}
                    pathOptions={{
                      color: "#7f1d1d",
                      fillColor: "#dc2626",
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-sm">
                        <div className="mb-1 flex items-center gap-1.5 font-bold text-red-600">
                          <AlertTriangle size={15} />
                          <span>Active Road Hazard</span>
                        </div>
                        <p className="font-semibold text-slate-800">
                          {blockagePoint.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 capitalize">
                          Type: {blockagePoint.type}
                        </p>
                        {blockagePoint.description && (
                          <p className="mt-1 text-xs text-slate-500">
                            {blockagePoint.description}
                          </p>
                        )}
                        <div className="mt-2 rounded border border-red-200 bg-red-50 p-1.5 text-[11px] text-red-700">
                          Original corridor unsafe. Automatic detour calculated.
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}
            </MapContainer>
          </MapErrorBoundary>

          {/* OFFLINE MAP TILE INDICATOR */}
          {(!isOnline || tileError) && (
            <div
              data-testid="map-offline-banner"
              className="absolute top-4 right-4 z-[1000] flex items-center gap-2 rounded-lg border border-amber-500/30 bg-slate-900/90 backdrop-blur-sm px-3.5 py-2 text-xs font-medium text-amber-400 shadow-lg pointer-events-auto"
            >
              <WifiOff size={15} className="shrink-0 text-amber-400" />
              <span>Map tiles unavailable — offline mode</span>
            </div>
          )}

            {/* MAP STATUS */}
            <div className="absolute left-4 top-4 z-[1000] rounded-lg border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isRerouted
                      ? "animate-ping bg-amber-400"
                      : "animate-pulse bg-emerald-400"
                  }`}
                />

                <span className="text-xs font-medium text-slate-200">
                  {isRerouted ? "Dynamic Detour Active" : "Route GIS Operations"}
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
                  Vehicle GPS
                </div>

                {isRerouted ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-6 border-b-2 border-dashed border-red-500" />
                      Blocked Route
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="h-1 w-6 rounded bg-emerald-500" />
                      Safe Detour
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-red-400" />
                      Active Blockage
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="h-1 w-6 rounded bg-blue-500" />
                    Primary Route
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC REROUTE IMPACT COMPARISON PANEL */}
      {routeCalculated && selectedTrip && isRerouted && rerouteResult && (
        <div className="space-y-4 rounded-xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
          {/* Incident / Detour Header */}
          <div className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-300">
                    {rerouteResult.new_route
                      ? "Corridor Blockage Intercepted — Safe Detour Selected"
                      : "Corridor Blockage Intercepted — No Safe Detour"}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusStyle(
                      selectedTrip.status
                    )}`}
                  >
                    {selectedTrip.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {rerouteResult.reason || "Trip automatically rerouted around hazardous road segment."}
                </p>
                {rerouteResult.blockage && (
                  <p className="mt-1 text-[11px] text-amber-400/80">
                    Obstruction: {rerouteResult.blockage.title} ({rerouteResult.blockage.type}) at [
                    {rerouteResult.blockage.latitude.toFixed(4)}, {rerouteResult.blockage.longitude.toFixed(4)}]
                  </p>
                )}
              </div>
            </div>

            <div className="text-right sm:self-center">
              <span className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                Reroute #{selectedTrip.reroute_count ?? rerouteResult.reroute_count ?? 1}
              </span>
            </div>
          </div>

          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Previous Route */}
            <div className="rounded-lg border border-red-500/20 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Original Blocked Route
                </span>
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  Risk: {rerouteResult.previous_route?.risk_score ?? "High"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Distance:</span>
                  <span className="font-semibold text-slate-200">
                    {rerouteResult.previous_route?.distance_km} km
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Original ETA:</span>
                  <span className="font-semibold text-slate-200">
                    {formatDuration(rerouteResult.previous_route?.duration_minutes ?? null)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Risk Level:</span>
                  <span className="font-semibold capitalize text-red-400">
                    {rerouteResult.previous_route?.risk_level ?? "Critical"}
                  </span>
                </div>
              </div>
            </div>

            {/* New Safe Detour */}
            <div className="rounded-lg border border-emerald-500/30 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">
                  Safe Detour Corridor
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Risk: {rerouteResult.new_route?.risk_score ?? "Safe"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Distance:</span>
                  <span className="font-semibold text-emerald-300">
                    {rerouteResult.new_route?.distance_km ?? "N/A"} km
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Updated ETA:</span>
                  <span className="font-semibold text-white">
                    {formatDuration(rerouteResult.new_route?.duration_minutes ?? null)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Expected Delay:</span>
                  <span className="font-bold text-amber-400">
                    +{rerouteResult.delay_minutes ?? 0} min
                  </span>
                </div>
              </div>
            </div>

            {/* Risk & Detour Intelligence */}
            <div className="rounded-lg border border-purple-500/20 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-purple-300">
                  Detour Optimization
                </span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  Safety Gain
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Risk Delta:</span>
                  <span className="font-semibold text-emerald-400">
                    {rerouteResult.previous_route && rerouteResult.new_route
                      ? `-${(
                          rerouteResult.previous_route.risk_score -
                          rerouteResult.new_route.risk_score
                        ).toFixed(1)} pts`
                      : "Optimized"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Candidates Evaluated:</span>
                  <span className="font-semibold text-slate-200">
                    {rerouteResult.alternatives_evaluated ?? 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Safe Corridors Found:</span>
                  <span className="font-semibold text-emerald-400">
                    {rerouteResult.safe_alternatives_found ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STANDARD ROUTE RESULT (WHEN NOT REROUTED) */}
      {routeCalculated && selectedTrip && !isRerouted && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Route Calculation Result
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {selectedTrip.origin} → {selectedTrip.destination}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                <RouteIcon size={17} className="text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-500">Distance</p>
                  <p className="text-sm font-semibold text-white">
                    {routeDistanceKm !== null
                      ? routeDistanceKm.toFixed(1)
                      : selectedTrip.route_distance_km ?? "N/A"}{" "}
                    km
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                <Clock3 size={17} className="text-orange-400" />
                <div>
                  <p className="text-[10px] text-slate-500">ETA</p>
                  <p className="text-sm font-semibold text-white">
                    {formatDuration(
                      routeDurationMinutes !== null
                        ? Math.round(routeDurationMinutes)
                        : selectedTrip.eta_minutes
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3">
                <CheckCircle2 size={17} className="text-emerald-400" />
                <div>
                  <p className="text-[10px] text-slate-500">Status</p>
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
                  <p className="text-xs text-slate-500">Assigned Vehicle</p>
                  <p className="text-sm font-medium text-white">
                    {selectedVehicle?.vehicle_number ??
                      `VH-${String(selectedTrip.vehicle_id).padStart(3, "0")}`}
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

      {/* AI ROAD RISK GIS ENGINE STATUS */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-5">
        <div className="flex gap-4">
          <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h3 className="font-semibold text-purple-300">
              AI Risk-Aware GIS Rerouting Engine Active
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Connected to backend PostGIS spatial database and OSRM routing engine.
              The planner dynamically computes perpendicular corridor detours around
              verified landslides, floods, and road blockages, rejecting any detour that
              intersects active hazard zones.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-emerald-400 border border-emerald-500/30">
                OSRM Routing Engine: Online
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-blue-400 border border-blue-500/30">
                GIS Detour Corridor Snapping: Active
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-purple-400 border border-purple-500/30">
                AI Risk Scoring: Real-time
              </span>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-amber-400 border border-amber-500/30">
                Dynamic Hazard Avoidance: Enabled
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoutePlanner;