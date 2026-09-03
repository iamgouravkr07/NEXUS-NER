import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Truck,
  TriangleAlert,
} from "lucide-react";

import NERMap from "../maps/NERMap";

const stats = [
  {
    title: "Active Incidents",
    value: "12",
    change: "+3 today",
    icon: TriangleAlert,
    iconClass: "text-red-400 bg-red-500/10",
  },
  {
    title: "Vehicles on Route",
    value: "48",
    change: "42 moving",
    icon: Truck,
    iconClass: "text-cyan-400 bg-cyan-500/10",
  },
  {
    title: "High-Risk Roads",
    value: "07",
    change: "2 critical",
    icon: AlertTriangle,
    iconClass: "text-amber-400 bg-amber-500/10",
  },
  {
    title: "Active Alerts",
    value: "19",
    change: "5 urgent",
    icon: Bell,
    iconClass: "text-purple-400 bg-purple-500/10",
  },
];

const incidents = [
  {
    location: "NH-15, Assam",
    type: "Landslide",
    severity: "Critical",
    time: "12 min ago",
  },
  {
    location: "NH-10, Sikkim",
    type: "Road Blockage",
    severity: "High",
    time: "28 min ago",
  },
  {
    location: "NH-6, Meghalaya",
    type: "Flooding",
    severity: "Medium",
    time: "43 min ago",
  },
];

const alerts = [
  {
    title: "Heavy rainfall detected",
    location: "East Siang, Arunachal Pradesh",
    time: "8 min ago",
  },
  {
    title: "Road risk increased",
    location: "NH-10, Sikkim",
    time: "21 min ago",
  },
  {
    title: "Vehicle delayed",
    location: "Truck VH-024",
    time: "35 min ago",
  },
];

function Home() {
  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Control Tower
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Real-time logistics and accessibility overview across the
          North Eastern Region
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-white">
                    {stat.value}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {stat.change}
                  </p>
                </div>

                <div
                  className={`rounded-lg p-3 ${stat.iconClass}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Regional Operations Map */}
        <div className="min-h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">
                Regional Operations Map
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Live incidents, vehicles and road conditions
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>

          <div className="h-[350px] bg-slate-950">
            <NERMap />
          </div>
        </div>

        {/* Active Incidents */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">
                Active Incidents
              </h2>

              <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-400">
                12 Active
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {incidents.map((incident) => (
              <div
                key={incident.location}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {incident.type}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {incident.location}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                      incident.severity === "Critical"
                        ? "bg-red-500/10 text-red-400"
                        : incident.severity === "High"
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {incident.severity}
                  </span>
                </div>

                <p className="mt-3 text-[11px] text-slate-600">
                  {incident.time}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-800 p-4">
            <button
              type="button"
              className="w-full rounded-lg bg-slate-800 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              View all incidents
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Dashboard */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Road Risk */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">
                Road Risk Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current accessibility status
              </p>
            </div>

            <AlertTriangle
              size={20}
              className="text-amber-400"
            />
          </div>

          <div className="space-y-4 p-5">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Critical
                </span>

                <span className="text-red-400">
                  2 roads
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[20%] rounded-full bg-red-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  High Risk
                </span>

                <span className="text-orange-400">
                  5 roads
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[40%] rounded-full bg-orange-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Moderate
                </span>

                <span className="text-amber-400">
                  11 roads
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[65%] rounded-full bg-amber-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Safe
                </span>

                <span className="text-emerald-400">
                  36 roads
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[85%] rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">
                Recent Alerts
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest operational notifications
              </p>
            </div>

            <Bell
              size={20}
              className="text-cyan-400"
            />
          </div>

          <div className="divide-y divide-slate-800">
            {alerts.map((alert) => (
              <div
                key={alert.title}
                className="flex gap-4 p-5"
              >
                <div className="mt-1">
                  <CheckCircle2
                    size={18}
                    className="text-cyan-400"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {alert.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {alert.location}
                  </p>

                  <p className="mt-2 text-[11px] text-slate-600">
                    {alert.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;