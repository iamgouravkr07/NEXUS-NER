import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock3,
  Map,
  RefreshCw,
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

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

// Fallback baseline demonstration data
const defaultIncidentTrend = [
  { day: "Mon", incidents: 8 },
  { day: "Tue", incidents: 11 },
  { day: "Wed", incidents: 7 },
  { day: "Thu", incidents: 14 },
  { day: "Fri", incidents: 10 },
  { day: "Sat", incidents: 6 },
  { day: "Sun", incidents: 9 },
];

const defaultDeliveryTrend = [
  { day: "Mon", time: 8.7 },
  { day: "Tue", time: 8.2 },
  { day: "Wed", time: 8.5 },
  { day: "Thu", time: 9.1 },
  { day: "Fri", time: 8.4 },
  { day: "Sat", time: 7.9 },
  { day: "Sun", time: 8.1 },
];

const defaultRegionalData = [
  { region: "Assam", vehicles: 18, incidents: 5 },
  { region: "Arunachal", vehicles: 9, incidents: 3 },
  { region: "Meghalaya", vehicles: 7, incidents: 4 },
  { region: "Sikkim", vehicles: 5, incidents: 2 },
  { region: "Manipur", vehicles: 5, incidents: 3 },
  { region: "Tripura", vehicles: 4, incidents: 2 },
];

const defaultRiskData = [
  { name: "Critical", value: 2, percentage: 10, color_class: "bg-red-500" },
  { name: "High", value: 5, percentage: 25, color_class: "bg-orange-500" },
  { name: "Medium", value: 11, percentage: 44, color_class: "bg-amber-500" },
  { name: "Low", value: 36, percentage: 72, color_class: "bg-emerald-500" },
];

const defaultKpis = [
  {
    title: "Routes Completed",
    value: "1,284",
    change: "+12.4%",
    trend: "up",
    description: "vs previous week",
    icon: "Map",
    iconClass: "bg-cyan-500/10 text-cyan-400",
  },
  {
    title: "Average ETA",
    value: "8h 14m",
    change: "-6.8%",
    trend: "down",
    description: "faster than last week",
    icon: "Clock3",
    iconClass: "bg-purple-500/10 text-purple-400",
  },
  {
    title: "Active Vehicles",
    value: "48",
    change: "+8.2%",
    trend: "up",
    description: "fleet utilization",
    icon: "Truck",
    iconClass: "bg-emerald-500/10 text-emerald-400",
  },
  {
    title: "Road Accessibility",
    value: "87.4%",
    change: "+3.1%",
    trend: "up",
    description: "regional average",
    icon: "ShieldCheck",
    iconClass: "bg-amber-500/10 text-amber-400",
  },
];

type KPICardItem = {
  title: string;
  value: string;
  change: string;
  trend: string;
  description: string;
  icon: string;
  iconClass: string;
};

type TrendPoint = {
  day: string;
  incidents: number;
};

type DeliveryPoint = {
  day: string;
  time: number;
};

type RegionalPoint = {
  region: string;
  vehicles: number;
  incidents: number;
};

type RiskPoint = {
  name: string;
  value: number;
  percentage: number;
  color_class: string;
};

type OperationalInsights = {
  fleet_utilization: number;
  route_safety: number;
  incident_resolution: number;
};

type RoadsSummary = {
  total: number;
  open: number;
  restricted: number;
  blocked: number;
  under_repair: number;
  safe_percentage: number;
};

type AnalyticsResponse = {
  kpis: KPICardItem[];
  incident_trend: TrendPoint[];
  delivery_trend: DeliveryPoint[];
  regional_data: RegionalPoint[];
  risk_data: RiskPoint[];
  operational_insights: OperationalInsights;
  roads_summary: RoadsSummary;
};

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Map,
  Clock3,
  Truck,
  ShieldCheck,
  Activity,
  AlertTriangle,
  BarChart3,
};

function Analytics() {
  const [days, setDays] = useState("7");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (selectedDays: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/analytics/summary?days=${selectedDays}`);
      if (!response.ok) {
        throw new Error(`Failed to load analytics (${response.status})`);
      }

      const summaryData: AnalyticsResponse = await response.json();
      setData(summaryData);
    } catch (err) {
      console.warn("Analytics endpoint unavailable or returned error, using fallback data:", err);
      setError("Analytics backend currently unreachable. Displaying operational baseline.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  const kpis = data?.kpis || defaultKpis;
  const incidentTrend = data?.incident_trend || defaultIncidentTrend;
  const deliveryTrend = data?.delivery_trend || defaultDeliveryTrend;
  const regionalData = data?.regional_data || defaultRegionalData;
  const riskData = data?.risk_data || defaultRiskData;
  const insights = data?.operational_insights || {
    fleet_utilization: 82,
    route_safety: 91,
    incident_resolution: 74,
  };
  const roadsSummary = data?.roads_summary || {
    total: 54,
    open: 47,
    restricted: 5,
    blocked: 2,
    under_repair: 0,
    safe_percentage: 66.7,
  };

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

        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-cyan-400">
              <RefreshCw size={14} className="animate-spin" />
              <span>Updating...</span>
            </div>
          )}

          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-400 outline-none focus:border-cyan-500/50"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Error / Offline Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAnalytics(days)}
            className="flex items-center gap-1 font-semibold text-amber-400 underline hover:text-amber-300"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const IconComponent = iconMap[kpi.icon] || BarChart3;

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
                  <IconComponent size={21} />
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
              const percentage = risk.percentage ?? 25;
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
                        width: `${Math.min(Math.max(percentage, 5), 100)}%`,
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
                {roadsSummary.total}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Safe / Low Risk
              </span>

              <span className="text-sm font-semibold text-emerald-400">
                {roadsSummary.safe_percentage}%
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
                {insights.fleet_utilization}%
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
                {insights.route_safety}%
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
                {insights.incident_resolution}%
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
              Live operational analytics computed from vehicle telemetry, verified
              incidents, road-risk assessments, route history and regional
              logistics activity across the North Eastern Region.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;