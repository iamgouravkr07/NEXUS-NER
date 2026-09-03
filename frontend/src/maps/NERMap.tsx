import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const incidents = [
  {
    id: "INC-001",
    name: "Landslide",
    location: "NH-15, Assam",
    position: [27.47, 94.91] as [number, number],
    severity: "Critical",
  },
  {
    id: "INC-002",
    name: "Road Blockage",
    location: "NH-10, Sikkim",
    position: [27.33, 88.61] as [number, number],
    severity: "High",
  },
  {
    id: "INC-003",
    name: "Flooding",
    location: "Meghalaya",
    position: [25.57, 91.88] as [number, number],
    severity: "Medium",
  },
];

const vehicles = [
  {
    id: "VH-001",
    location: "Assam",
    position: [26.14, 91.74] as [number, number],
  },
  {
    id: "VH-002",
    location: "Manipur",
    position: [24.82, 93.94] as [number, number],
  },
  {
    id: "VH-003",
    location: "Arunachal Pradesh",
    position: [27.1, 93.62] as [number, number],
  },
];

function NERMap() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-b-xl">
      <MapContainer
        center={[26.5, 92.5]}
        zoom={6}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Incident markers */}
        {incidents.map((incident) => (
          <CircleMarker
            key={incident.id}
            center={incident.position}
            radius={9}
            pathOptions={{
              color:
                incident.severity === "Critical"
                  ? "#ef4444"
                  : incident.severity === "High"
                    ? "#f97316"
                    : "#f59e0b",
              fillOpacity: 0.8,
            }}
          >
            <Popup>
              <div>
                <strong>{incident.name}</strong>
                <br />
                {incident.location}
                <br />
                Severity: {incident.severity}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Vehicle markers */}
        {vehicles.map((vehicle) => (
          <CircleMarker
            key={vehicle.id}
            center={vehicle.position}
            radius={7}
            pathOptions={{
              color: "#06b6d4",
              fillColor: "#06b6d4",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <strong>{vehicle.id}</strong>
              <br />
              Location: {vehicle.location}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-lg">
        <p className="mb-2 text-xs font-semibold text-white">
          Map Legend
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-slate-300">
              Critical Incident
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-slate-300">
              High Risk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-slate-300">
              Medium Risk
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyan-400" />
            <span className="text-slate-300">
              Vehicle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NERMap;