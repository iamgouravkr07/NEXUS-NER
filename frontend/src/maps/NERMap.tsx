import {
  CircleMarker,
  MapContainer,
  Popup,
  Polyline,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type RiskLevel = "Critical" | "High" | "Medium" | "Low";

type Road = {
  id: string;
  name: string;
  risk: RiskLevel;
  status: string;
  positions: [number, number][];
};

type Incident = {
  id: string;
  name: string;
  location: string;
  position: [number, number];
  severity: RiskLevel;
};

type Vehicle = {
  id: string;
  location: string;
  position: [number, number];
  status: string;
};

const roads: Road[] = [
  {
    id: "RD-001",
    name: "NH-15",
    risk: "Critical",
    status: "Restricted",
    positions: [
      [27.47, 94.91],
      [27.2, 94.5],
      [26.9, 94.1],
      [26.6, 93.8],
    ],
  },
  {
    id: "RD-002",
    name: "NH-10",
    risk: "High",
    status: "Slow Traffic",
    positions: [
      [27.33, 88.61],
      [27.25, 88.7],
      [27.15, 88.8],
      [26.95, 88.9],
    ],
  },
  {
    id: "RD-003",
    name: "NH-6",
    risk: "Medium",
    status: "Open",
    positions: [
      [25.57, 91.88],
      [25.35, 92.0],
      [25.1, 92.15],
      [24.9, 92.3],
    ],
  },
  {
    id: "RD-004",
    name: "Trans-Arunachal Highway",
    risk: "Low",
    status: "Open",
    positions: [
      [27.1, 93.62],
      [27.25, 93.4],
      [27.4, 93.2],
      [27.55, 93.0],
    ],
  },
];

const incidents: Incident[] = [
  {
    id: "INC-001",
    name: "Landslide",
    location: "NH-15, Assam",
    position: [27.47, 94.91],
    severity: "Critical",
  },
  {
    id: "INC-002",
    name: "Road Blockage",
    location: "NH-10, Sikkim",
    position: [27.33, 88.61],
    severity: "High",
  },
  {
    id: "INC-003",
    name: "Flooding",
    location: "Meghalaya",
    position: [25.57, 91.88],
    severity: "Medium",
  },
];

const vehicles: Vehicle[] = [
  {
    id: "VH-001",
    location: "Assam",
    position: [26.14, 91.74],
    status: "Moving",
  },
  {
    id: "VH-002",
    location: "Manipur",
    position: [24.82, 93.94],
    status: "Moving",
  },
  {
    id: "VH-003",
    location: "Arunachal Pradesh",
    position: [27.1, 93.62],
    status: "Moving",
  },
  {
    id: "VH-004",
    location: "Tripura",
    position: [23.83, 91.28],
    status: "Delayed",
  },
];

function getRiskColor(risk: RiskLevel) {
  switch (risk) {
    case "Critical":
      return "#ef4444";

    case "High":
      return "#f97316";

    case "Medium":
      return "#f59e0b";

    case "Low":
      return "#22c55e";

    default:
      return "#64748b";
  }
}

function NERMap() {
  return (
    <div className="relative h-full w-full overflow-hidden">
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

        {/* Road Risk Layers */}
        {roads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.positions}
            pathOptions={{
              color: getRiskColor(road.risk),
              weight: road.risk === "Critical" ? 7 : 5,
              opacity: 0.85,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{road.name}</strong>

                <br />

                Risk: {road.risk}

                <br />

                Status: {road.status}
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Incident Markers */}
        {incidents.map((incident) => (
          <CircleMarker
            key={incident.id}
            center={incident.position}
            radius={9}
            pathOptions={{
              color: getRiskColor(incident.severity),
              fillColor: getRiskColor(incident.severity),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{incident.name}</strong>

                <br />

                Location: {incident.location}

                <br />

                Severity: {incident.severity}

                <br />

                ID: {incident.id}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => (
          <CircleMarker
            key={vehicle.id}
            center={vehicle.position}
            radius={7}
            pathOptions={{
              color: "#06b6d4",
              fillColor: "#06b6d4",
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{vehicle.id}</strong>

                <br />

                Location: {vehicle.location}

                <br />

                Status: {vehicle.status}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] min-w-[175px] rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
        <p className="mb-3 text-xs font-semibold text-white">
          Map Legend
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-slate-300">
              Critical Road / Incident
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-xs text-slate-300">
              High Risk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-300">
              Medium Risk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-slate-300">
              Low Risk
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 border-t border-slate-700 pt-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="text-xs text-slate-300">
              Vehicle
            </span>
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="absolute right-4 top-4 z-[1000] flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

        <span className="text-xs font-medium text-slate-300">
          Live Operations
        </span>
      </div>
    </div>
  );
}

export default NERMap;