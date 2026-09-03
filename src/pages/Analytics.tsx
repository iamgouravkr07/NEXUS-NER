import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Map,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const incidentTrend = [
  { day: "Mon", incidents: 8 },
  { day: "Tue", incidents: 11 },
  { day: "Wed", incidents: 7 },
  { day: "Thu", incidents: 14 },
  { day: "Fri", incidents: 10 },
  { day: "Sat", incidents: 6 },
  { day: "Sun", incidents: 9 },
];

const deliveryTrend = [
  { day: "Mon", time: 8.7 },
  { day: "Tue", time: 8.2 },
  { day: "Wed", time: 8.5 },
  { day: "Thu", time: 9.1 },
  { day: "Fri", time: 8.4 },
  { day: "Sat", time: 7.9 },
  { day: "Sun", time: 8.1 },
];

const regionalData = [
  { region: "Assam", vehicles: 18, incidents: 5 },
  { region: "Arunachal", vehicles: 9, incidents: 3 },
  { region: "Meghalaya", vehicles: 7, incidents: 4 },
  { region: "Sikkim", vehicles: 5, incidents: 2 },
  { region: "Manipur", vehicles: 5, incidents: 3 },
  { region: "Tripura", vehicles: 4, incidents: 2 },
];

const riskData = [
  { name: "Critical", value: 2 },
  { name: "High", value: 5 },
  { name: "Medium", value: 11 },
  { name: "Low", value: 36 },
];

const kpis = [
  {
    title: "Routes Completed",
    value: "1,284",
    change: "+12.4%",
    trend: "up",
    description: "vs previous week",
    icon: Map,
    iconClass: "bg-cyan-500/10 text-cyan-400",
  },
  {
    title: "Average ETA",
    value: "8h 14m",
    change: "-6.8%",
    trend: "down",
    description: "faster than last week",
    icon: Clock3,
    iconClass: "bg-purple-500/10 text-purple-400",
  },
  {
    title: "Active Vehicles",
    value: "48",
    change: "+8.2%",
    trend: "up",
    description: "fleet utilization",
    icon: Truck,
    iconClass: "bg-emerald-500/10 text-emerald-400",
  },
  {
    title: "Road Accessibility",
    value: "87.4%",
    change: "+3.1%",
    trend: "up",
    description: "regional average",
    icon: ShieldCheck,
    iconClass: "bg-amber-500/10 text-amber-400",
  },
];

function Analytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Logistics Analytics
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Operational performance, incident trends and regional
            logistics intelligence
          </p>
        </div>

        <select
          defaultValue="7"
          className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-400 outline-none"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <div
              key={kpi.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">
                    {kpi.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-white">
                    {kpi.value}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        kpi.trend === "up"
                          ? "text-emerald-400"
                          : "text-cyan-400"
                      }`}
                    >
                      {kpi.trend === "up" ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}

                      {kpi.change}
                    </span>

                    <span className="text-[11px] text-slate-600">
                      {kpi.description}
                    </span>
                  </div>
                </div>

                <div className={`rounded-lg p-3 ${kpi.iconClass}`}>
                  <Icon size={21} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Incident Trend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Incident Trend
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Reported incidents during the selected period
              </p>
            </div>

            <div className="rounded-lg bg-red-500/10 p-2.5">
              <AlertTriangle
                size={19}
                className="text-red-400"
              />
            </div>
          </div>

          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incidentTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#ef4444",
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average ETA */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Average Route Time
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Average completion time in hours
              </p>
            </div>

            <div className="rounded-lg bg-purple-500/10 p-2.5">
              <Clock3
                size={19}
                className="text-purple-400"
              />
            </div>
          </div>

          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[7, 10]}
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} hrs`,
                    "Average Time",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "#a855f7",
                  }}
                  activeDot={{
                    r: 5,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Regional Performance + Risk */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Regional Performance */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Regional Operations
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Vehicle activity and incident volume by region
              </p>
            </div>

            <BarChart3
              size={20}
              className="text-cyan-400"
            />
          </div>

          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="region"
                  tick={{
                    fill: "#64748b",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />

                <Bar
                  dataKey="vehicles"
                  name="Vehicles"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="incidents"
                  name="Incidents"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />

              <span className="text-xs text-slate-500">
                Vehicles
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />

              <span className="text-xs text-slate-500">
                Incidents
              </span>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Road Risk
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current monitored roads
              </p>
            </div>

            <Activity
              size={20}
              className="text-amber-400"
            />
          </div>

          <div className="mt-7 space-y-5">
            {riskData.map((risk) => {
              const percentage =
                risk.value === 36
                  ? 72
                  : risk.value === 11
                    ? 44
                    : risk.value === 5
                      ? 25
                      : 10;

              const barClass =
                risk.name === "Critical"
                  ? "bg-red-500"
                  : risk.name === "High"
                    ? "bg-orange-500"
                    : risk.name === "Medium"
                      ? "bg-amber-500"
                      : "bg-emerald-500";

              const textClass =
                risk.name === "Critical"
                  ? "text-red-400"
                  : risk.name === "High"
                    ? "text-orange-400"
                    : risk.name === "Medium"
                      ? "text-amber-400"
                      : "text-emerald-400";

              return (
                <div key={risk.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${barClass}`}
                      />

                      <span className="text-xs text-slate-400">
                        {risk.name}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-medium ${textClass}`}
                    >
                      {risk.value}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${barClass}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total monitored roads
              </span>

              <span className="text-sm font-semibold text-white">
                54
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Safe / Low Risk
              </span>

              <span className="text-sm font-semibold text-emerald-400">
                66.7%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2.5">
              <Activity
                size={19}
                className="text-cyan-400"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-cyan-400">
                Fleet Utilization
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                82%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Most active vehicles are currently assigned to
            essential supply routes.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <ShieldCheck
                size={19}
                className="text-emerald-400"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-emerald-400">
                Route Safety
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                91%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Recommended routes are avoiding most currently
            identified high-risk road segments.
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <AlertTriangle
                size={19}
                className="text-amber-400"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-amber-400">
                Incident Resolution
              </p>

              <p className="mt-1 text-2xl font-bold text-white">
                74%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Reported road incidents are being resolved or
            acknowledged by field teams.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start gap-3">
          <BarChart3
            size={19}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <div>
            <p className="text-sm font-medium text-white">
              Analytics intelligence
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              These visualizations currently use demonstration
              data. Once the backend is connected, analytics will
              be calculated from vehicle telemetry, verified
              incidents, road-risk predictions, route history and
              regional logistics activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;