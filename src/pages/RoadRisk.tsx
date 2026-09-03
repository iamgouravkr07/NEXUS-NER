import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  MapPin,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

type RiskLevel = "Critical" | "High" | "Medium" | "Low";

type Road = {
  id: string;
  name: string;
  location: string;
  risk: RiskLevel;
  score: number;
  status: string;
  weather: string;
  incidents: number;
  updated: string;
};

const roads: Road[] = [
  {
    id: "RD-001",
    name: "NH-15",
    location: "Dhemaji, Assam",
    risk: "Critical",
    score: 91,
    status: "Restricted",
    weather: "Heavy Rain",
    incidents: 2,
    updated: "8 min ago",
  },
  {
    id: "RD-002",
    name: "NH-10",
    location: "Gangtok, Sikkim",
    risk: "High",
    score: 78,
    status: "Slow Traffic",
    weather: "Rain",
    incidents: 1,
    updated: "15 min ago",
  },
  {
    id: "RD-003",
    name: "NH-6",
    location: "Shillong, Meghalaya",
    risk: "Medium",
    score: 56,
    status: "Open",
    weather: "Cloudy",
    incidents: 1,
    updated: "22 min ago",
  },
  {
    id: "RD-004",
    name: "Trans-Arunachal Highway",
    location: "Itanagar, Arunachal Pradesh",
    risk: "Low",
    score: 24,
    status: "Open",
    weather: "Clear",
    incidents: 0,
    updated: "31 min ago",
  },
  {
    id: "RD-005",
    name: "NH-37",
    location: "Jorhat, Assam",
    risk: "Low",
    score: 19,
    status: "Open",
    weather: "Clear",
    incidents: 0,
    updated: "38 min ago",
  },
  {
    id: "RD-006",
    name: "NH-2",
    location: "Imphal, Manipur",
    risk: "High",
    score: 74,
    status: "Caution",
    weather: "Heavy Rain",
    incidents: 2,
    updated: "42 min ago",
  },
];

const riskSummary = [
  {
    label: "Critical",
    count: 2,
    percentage: "8%",
    icon: ShieldAlert,
    style: "border-red-500/20 bg-red-500/5 text-red-400",
    bar: "bg-red-500",
    width: "w-[12%]",
  },
  {
    label: "High Risk",
    count: 5,
    percentage: "20%",
    icon: TriangleAlert,
    style: "border-orange-500/20 bg-orange-500/5 text-orange-400",
    bar: "bg-orange-500",
    width: "w-[32%]",
  },
  {
    label: "Moderate",
    count: 11,
    percentage: "44%",
    icon: AlertTriangle,
    style: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    bar: "bg-amber-500",
    width: "w-[58%]",
  },
  {
    label: "Low Risk",
    count: 36,
    percentage: "28%",
    icon: CheckCircle2,
    style: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    bar: "bg-emerald-500",
    width: "w-[82%]",
  },
];

function riskBadge(risk: RiskLevel) {
  switch (risk) {
    case "Critical":
      return "bg-red-500/10 text-red-400";

    case "High":
      return "bg-orange-500/10 text-orange-400";

    case "Medium":
      return "bg-amber-500/10 text-amber-400";

    case "Low":
      return "bg-emerald-500/10 text-emerald-400";
  }
}

function scoreText(score: number) {
  if (score >= 80) {
    return "text-red-400";
  }

  if (score >= 60) {
    return "text-orange-400";
  }

  if (score >= 40) {
    return "text-amber-400";
  }

  return "text-emerald-400";
}

function RoadRisk() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Road Risk Intelligence
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor road accessibility and predicted disruption
            risk across the North Eastern Region
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Risk model updated 5 min ago
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {riskSummary.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={`rounded-xl border p-5 ${item.style}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-white">
                    {item.count}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.percentage} of monitored roads
                  </p>
                </div>

                <div className="rounded-lg bg-slate-950/50 p-3">
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Regional Risk Distribution
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current risk classification across monitored road
                segments
              </p>
            </div>

            <Activity
              size={20}
              className="text-cyan-400"
            />
          </div>

          <div className="mt-6 space-y-5">
            {riskSummary.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${item.bar}`}
                    />

                    <span className="text-sm text-slate-400">
                      {item.label}
                    </span>
                  </div>

                  <span className="text-xs text-slate-500">
                    {item.count} roads
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${item.bar} ${item.width}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2.5">
              <CloudRain
                size={20}
                className="text-purple-400"
              />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Risk Factors
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Major contributors today
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Heavy Rainfall
                </span>

                <span className="text-xs font-medium text-red-400">
                  High Impact
                </span>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[82%] rounded-full bg-red-500" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Landslide Risk
                </span>

                <span className="text-xs font-medium text-orange-400">
                  Elevated
                </span>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[64%] rounded-full bg-orange-500" />
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Traffic Congestion
                </span>

                <span className="text-xs font-medium text-amber-400">
                  Moderate
                </span>
              </div>

              <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                <div className="h-1.5 w-[48%] rounded-full bg-amber-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Road Monitoring */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Road Risk Monitoring
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Individual road accessibility and risk scores
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
                placeholder="Search roads..."
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 sm:w-44"
              />
            </div>

            <select
              defaultValue="All"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 outline-none"
            >
              <option>All Risk Levels</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Road
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Risk Score
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Risk Level
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Accessibility
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Weather
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Incidents
                </th>

                <th className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Updated
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {roads.map((road) => (
                <tr
                  key={road.id}
                  className="transition hover:bg-slate-800/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-slate-800 p-2">
                        <MapPin
                          size={16}
                          className="text-cyan-400"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {road.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {road.location}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-700">
                          {road.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="w-28">
                      <div className="mb-1 flex justify-between">
                        <span
                          className={`text-xs font-semibold ${scoreText(
                            road.score,
                          )}`}
                        >
                          {road.score}
                        </span>

                        <span className="text-[10px] text-slate-600">
                          /100
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div
                          className={`h-1.5 rounded-full ${
                            road.score >= 80
                              ? "w-[91%] bg-red-500"
                              : road.score >= 60
                                ? "w-[75%] bg-orange-500"
                                : road.score >= 40
                                  ? "w-[55%] bg-amber-500"
                                  : "w-[25%] bg-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${riskBadge(
                        road.risk,
                      )}`}
                    >
                      {road.risk}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-medium ${
                        road.status === "Open"
                          ? "text-emerald-400"
                          : road.status === "Restricted"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {road.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CloudRain
                        size={15}
                        className="text-slate-600"
                      />

                      <span className="text-xs text-slate-400">
                        {road.weather}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`text-xs ${
                        road.incidents > 0
                          ? "text-red-400"
                          : "text-slate-500"
                      }`}
                    >
                      {road.incidents}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="text-xs text-slate-600">
                      {road.updated}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="divide-y divide-slate-800 md:hidden">
          {roads.map((road) => (
            <div
              key={road.id}
              className="space-y-4 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {road.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    {road.location}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${riskBadge(
                    road.risk,
                  )}`}
                >
                  {road.risk}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Risk Score
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${scoreText(
                      road.score,
                    )}`}
                  >
                    {road.score}/100
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Status
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {road.status}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Weather
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {road.weather}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Incidents
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {road.incidents}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligence Footer */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-400"
        />

        <div>
          <p className="text-sm font-medium text-amber-400">
            Predictive risk intelligence
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Risk scores are currently using demonstration data.
            The production model will combine rainfall, terrain,
            historical incidents, traffic, road condition and
            other accessibility signals to predict disruption
            probability.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoadRisk;