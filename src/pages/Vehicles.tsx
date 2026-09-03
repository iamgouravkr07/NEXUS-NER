import {
  Clock3,
  MapPin,
  Navigation,
  Search,
  Truck,
  Wifi,
  WifiOff,
} from "lucide-react";

type VehicleStatus = "Moving" | "Delayed" | "Stopped" | "Offline";

type Vehicle = {
  id: string;
  driver: string;
  location: string;
  destination: string;
  speed: number;
  status: VehicleStatus;
  lastUpdated: string;
};

const vehicles: Vehicle[] = [
  {
    id: "VH-001",
    driver: "Raj Kumar",
    location: "Guwahati, Assam",
    destination: "Itanagar, Arunachal Pradesh",
    speed: 42,
    status: "Moving",
    lastUpdated: "2 min ago",
  },
  {
    id: "VH-002",
    driver: "Amit Das",
    location: "Gangtok, Sikkim",
    destination: "Siliguri, West Bengal",
    speed: 28,
    status: "Moving",
    lastUpdated: "4 min ago",
  },
  {
    id: "VH-003",
    driver: "Pawan Singh",
    location: "Imphal, Manipur",
    destination: "Kohima, Nagaland",
    speed: 0,
    status: "Stopped",
    lastUpdated: "7 min ago",
  },
  {
    id: "VH-004",
    driver: "Mohan Thapa",
    location: "Shillong, Meghalaya",
    destination: "Guwahati, Assam",
    speed: 18,
    status: "Delayed",
    lastUpdated: "9 min ago",
  },
  {
    id: "VH-005",
    driver: "Deepak Rai",
    location: "Aizawl, Mizoram",
    destination: "Silchar, Assam",
    speed: 35,
    status: "Moving",
    lastUpdated: "11 min ago",
  },
  {
    id: "VH-006",
    driver: "Suresh Das",
    location: "Agartala, Tripura",
    destination: "Guwahati, Assam",
    speed: 0,
    status: "Offline",
    lastUpdated: "26 min ago",
  },
];

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
  }
}

function Vehicles() {
  const moving = vehicles.filter(
    (vehicle) => vehicle.status === "Moving",
  ).length;

  const delayed = vehicles.filter(
    (vehicle) => vehicle.status === "Delayed",
  ).length;

  const offline = vehicles.filter(
    (vehicle) => vehicle.status === "Offline",
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Vehicles
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor logistics vehicles and their current movement
            across the North Eastern Region
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <Wifi
            size={17}
            className="text-emerald-400"
          />

          <span className="text-sm text-emerald-400">
            GPS Tracking Active
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Vehicles
            </p>

            <Truck
              size={20}
              className="text-cyan-400"
            />
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
            <p className="text-sm text-slate-500">
              Moving
            </p>

            <Navigation
              size={20}
              className="text-emerald-400"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {moving}
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Currently on route
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Delayed
            </p>

            <Clock3
              size={20}
              className="text-amber-400"
            />
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
            <p className="text-sm text-slate-500">
              Offline
            </p>

            <WifiOff
              size={20}
              className="text-slate-500"
            />
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
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              type="text"
              placeholder="Search vehicle, driver or location..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 lg:w-80"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400"
            >
              All
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              Moving
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              Delayed
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              Offline
            </button>
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
                  Destination
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Speed
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Last Update
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {vehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="transition hover:bg-slate-800/40"
                >
                  {/* Vehicle */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                        <Truck size={20} />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {vehicle.id}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {vehicle.driver}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin
                        size={15}
                        className="text-cyan-400"
                      />

                      <span className="text-sm text-slate-300">
                        {vehicle.location}
                      </span>
                    </div>
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Navigation
                        size={15}
                        className="text-slate-500"
                      />

                      <span className="text-sm text-slate-400">
                        {vehicle.destination}
                      </span>
                    </div>
                  </td>

                  {/* Speed */}
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-white">
                      {vehicle.speed}
                    </span>

                    <span className="ml-1 text-xs text-slate-600">
                      km/h
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                        vehicle.status,
                      )}`}
                    >
                      <StatusIcon status={vehicle.status} />
                      {vehicle.status}
                    </span>
                  </td>

                  {/* Last Updated */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {vehicle.lastUpdated}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-600">
            Showing {vehicles.length} registered vehicles
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
            Vehicle positions and movement data will be updated
            automatically when the GPS tracking service is connected
            to the backend.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Vehicles;