import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  CloudRain,
  MapPin,
  Search,
  ShieldAlert,
  Truck,
} from "lucide-react";

type AlertSeverity = "Critical" | "High" | "Medium" | "Low";

type AlertItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  severity: AlertSeverity;
  type: string;
  time: string;
  status: "Active" | "Acknowledged";
};

const alerts: AlertItem[] = [
  {
    id: "ALT-001",
    title: "Critical landslide warning",
    description:
      "Landslide activity reported near an active logistics corridor.",
    location: "NH-15, Dhemaji, Assam",
    severity: "Critical",
    type: "Road Incident",
    time: "8 min ago",
    status: "Active",
  },
  {
    id: "ALT-002",
    title: "Road accessibility reduced",
    description:
      "Heavy rainfall has increased disruption probability on the route.",
    location: "NH-10, Gangtok, Sikkim",
    severity: "High",
    type: "Road Risk",
    time: "15 min ago",
    status: "Active",
  },
  {
    id: "ALT-003",
    title: "Heavy rainfall detected",
    description:
      "Rainfall intensity is above the regional warning threshold.",
    location: "East Siang, Arunachal Pradesh",
    severity: "High",
    type: "Weather",
    time: "21 min ago",
    status: "Acknowledged",
  },
  {
    id: "ALT-004",
    title: "Vehicle running behind schedule",
    description:
      "Estimated arrival time has increased due to traffic congestion.",
    location: "Truck VH-024 · Shillong",
    severity: "Medium",
    type: "Vehicle",
    time: "35 min ago",
    status: "Active",
  },
  {
    id: "ALT-005",
    title: "Flood risk increasing",
    description:
      "Water level and rainfall indicators suggest elevated flood risk.",
    location: "Barak Valley, Assam",
    severity: "Medium",
    type: "Weather",
    time: "47 min ago",
    status: "Active",
  },
  {
    id: "ALT-006",
    title: "Road conditions improved",
    description:
      "Previously restricted road segment has returned to normal operation.",
    location: "NH-6, Meghalaya",
    severity: "Low",
    type: "Road Status",
    time: "1 hr ago",
    status: "Acknowledged",
  },
];

const summary = [
  {
    label: "Total Alerts",
    value: "19",
    description: "Today",
    icon: Bell,
    iconClass: "bg-cyan-500/10 text-cyan-400",
  },
  {
    label: "Critical",
    value: "02",
    description: "Requires immediate action",
    icon: ShieldAlert,
    iconClass: "bg-red-500/10 text-red-400",
  },
  {
    label: "High Priority",
    value: "05",
    description: "Needs attention",
    icon: AlertTriangle,
    iconClass: "bg-orange-500/10 text-orange-400",
  },
  {
    label: "Acknowledged",
    value: "08",
    description: "Reviewed by operators",
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/10 text-emerald-400",
  },
];

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

    default:
      return Bell;
  }
}

function Alerts() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Alerts & Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor critical logistics, road, weather and vehicle
            alerts across the region
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Alert system operational
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-white">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {item.description}
                  </p>
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
      <div className="flex flex-col gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-500/10 p-2.5">
            <AlertCircle
              size={21}
              className="text-red-400"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-red-400">
              2 critical alerts require attention
            </p>

            <p className="mt-1 text-xs text-slate-500">
              These alerts may affect active logistics routes and
              require immediate operator review.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
        >
          View Critical Alerts
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Alert Center
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Latest operational notifications
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <Search
                size={16}
                className="text-slate-600"
              />

              <input
                type="text"
                placeholder="Search alerts..."
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 sm:w-48"
              />
            </div>

            <select
              defaultValue="All"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 outline-none"
            >
              <option>All Severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <select
              defaultValue="All"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 outline-none"
            >
              <option>All Types</option>
              <option>Road Incident</option>
              <option>Road Risk</option>
              <option>Weather</option>
              <option>Vehicle</option>
              <option>Road Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alertIcon(alert.type);

          return (
            <div
              key={alert.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                {/* Main Alert */}
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
                      <h3 className="text-sm font-medium text-white">
                        {alert.title}
                      </h3>

                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClass(
                          alert.severity,
                        )}`}
                      >
                        {alert.severity}
                      </span>

                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">
                        {alert.type}
                      </span>
                    </div>

                    <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                      {alert.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin
                          size={13}
                          className="text-slate-600"
                        />

                        <span className="text-[11px] text-slate-500">
                          {alert.location}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock3
                          size={13}
                          className="text-slate-600"
                        />

                        <span className="text-[11px] text-slate-600">
                          {alert.time}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-700">
                        {alert.id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-3 xl:flex-col xl:items-end">
                  <span
                    className={`flex items-center gap-1.5 text-[11px] ${
                      alert.status === "Active"
                        ? "text-cyan-400"
                        : "text-emerald-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        alert.status === "Active"
                          ? "bg-cyan-400"
                          : "bg-emerald-400"
                      }`}
                    />

                    {alert.status}
                  </span>

                  <button
                    type="button"
                    className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
                  >
                    {alert.status === "Active"
                      ? "Acknowledge"
                      : "View Details"}
                  </button>
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
              <Bell
                size={19}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Alert Sources
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Where operational alerts originate
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">
                Road Monitoring
              </span>

              <span className="text-xs font-medium text-white">
                7 alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">
                Weather Intelligence
              </span>

              <span className="text-xs font-medium text-white">
                5 alerts
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <span className="text-xs text-slate-400">
                Vehicle Tracking
              </span>

              <span className="text-xs font-medium text-white">
                4 alerts
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2.5">
              <ShieldAlert
                size={19}
                className="text-purple-400"
              />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Alert Intelligence
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Automated risk detection
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-500">
                  Automatically detected
                </span>

                <span className="text-cyan-400">
                  84%
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[84%] rounded-full bg-cyan-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-500">
                  Operator reported
                </span>

                <span className="text-purple-400">
                  16%
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[16%] rounded-full bg-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <AlertCircle
          size={18}
          className="mt-0.5 shrink-0 text-cyan-400"
        />

        <div>
          <p className="text-sm font-medium text-cyan-400">
            Intelligent alerting
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            In production, alerts will be generated from road-risk
            predictions, weather feeds, vehicle telemetry, field
            reports and verified incidents. Critical events can
            trigger priority notifications for logistics
            operators.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Alerts;