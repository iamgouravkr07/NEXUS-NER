import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
  { day: "Mon", incidents: 0 },
  { day: "Tue", incidents: 0 },
  { day: "Wed", incidents: 1 },
  { day: "Thu", incidents: 0 },
  { day: "Fri", incidents: 0 },
  { day: "Sat", incidents: 0 },
  { day: "Sun", incidents: 0 },
];

const defaultDeliveryTrend = [
  { day: "Mon", time: 0.0 },
  { day: "Tue", time: 0.0 },
  { day: "Wed", time: 2.3 },
  { day: "Thu", time: 0.0 },
  { day: "Fri", time: 0.0 },
  { day: "Sat", time: 0.0 },
  { day: "Sun", time: 0.0 },
];

const defaultRegionalData = [
  { region: "Assam", vehicles: 1, incidents: 1 },
  { region: "Arunachal", vehicles: 0, incidents: 0 },
  { region: "Meghalaya", vehicles: 0, incidents: 0 },
  { region: "Sikkim", vehicles: 0, incidents: 0 },
  { region: "Manipur", vehicles: 0, incidents: 0 },
  { region: "Tripura", vehicles: 0, incidents: 0 },
];

const defaultRiskData = [
  { name: "Critical", value: 0, percentage: 0, color_class: "bg-red-500" },
  { name: "High", value: 0, percentage: 0, color_class: "bg-orange-500" },
  { name: "Medium", value: 0, percentage: 0, color_class: "bg-amber-500" },
  { name: "Low", value: 1, percentage: 100, color_class: "bg-emerald-500" },
];

const defaultKpis = [
  {
    title: "Routes Completed",
    value: "0",
    change: "0 completed",
    trend: "neutral",
    description: "0 in transit • 0 completed",
    icon: "Map",
    iconClass: "border border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400",
  },
  {
    title: "Average ETA",
    value: "2h 20m",
    change: "Direct OSRM calculation",
    trend: "neutral",
    description: "Guwahati → Tezpur mission",
    icon: "Clock3",
    iconClass: "border border-purple-200 bg-purple-50 text-purple-700 dark:border-transparent dark:bg-purple-500/10 dark:text-purple-400",
  },
  {
    title: "Active Vehicles",
    value: "1",
    change: "1 in transit",
    trend: "up",
    description: "AS-01-BX-4091 transmitting",
    icon: "Truck",
    iconClass: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    title: "Road Accessibility",
    value: "100.0%",
    change: "1/1 open corridors",
    trend: "neutral",
    description: "monitored highway network",
    icon: "ShieldCheck",
    iconClass: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400",
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
  const { t } = useLanguage();
  const { getAuthHeader } = useAuth();
  const [days, setDays] = useState("7");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (selectedDays: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/analytics/summary?days=${selectedDays}`, {
        headers: getAuthHeader(),
      });
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
    fleet_utilization: 100,
    route_safety: 100,
    incident_resolution: 0,
  };
  const roadsSummary = data?.roads_summary || {
    total: 1,
    open: 1,
    restricted: 0,
    blocked: 0,
    under_repair: 0,
    safe_percentage: 100.0,
  };

  const getKpiTitle = (title: string) => {
    switch (title) {
      case "Routes Completed":
        return t.analytics.routesCompleted;
      case "Average ETA":
        return t.analytics.avgEta;
      case "Active Vehicles":
        return t.analytics.activeVehicles;
      case "Road Accessibility":
        return t.analytics.accessibilityRate;
      default:
        return title;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {t.analytics.title}
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t.analytics.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400">
              <RefreshCw size={14} className="animate-spin" />
              <span>{t.common.refreshing}</span>
            </div>
          )}

          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-700 shadow-sm outline-none focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
          >
            <option value="7">{t.analytics.last7d}</option>
            <option value="30">{t.analytics.last30d}</option>
            <option value="90">{t.analytics.lastQuarter}</option>
          </select>
        </div>
      </div>

      {/* Error / Offline Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAnalytics(days)}
            className="flex items-center gap-1 font-semibold text-amber-700 underline hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <RefreshCw size={12} />
            {t.common.retry}
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
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {getKpiTitle(kpi.title)}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                    {kpi.value}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        kpi.trend === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-cyan-700 dark:text-cyan-400"
                      }`}
                    >
                      {kpi.trend === "up" ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}

                      {kpi.change}
                    </span>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t.analytics.incidentTrendTitle}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.incidentTrendSub}
              </p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 dark:border-transparent dark:bg-red-500/10">
              <AlertTriangle
                size={19}
                className="text-red-600 dark:text-red-400"
              />
            </div>
          </div>

          <div className="mt-6 h-[280px] w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={incidentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.25}
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
                  domain={[0, "auto"]}
                  allowDecimals={false}
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
                    border: "1px solid #334155",
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t.analytics.deliveryTrendTitle}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.deliveryTrendSub}
              </p>
            </div>

            <div className="rounded-lg border border-purple-200 bg-purple-50 p-2.5 dark:border-transparent dark:bg-purple-500/10">
              <Clock3
                size={19}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
          </div>

          <div className="mt-6 h-[280px] w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveryTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.25}
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
                  domain={[0, "auto"]}
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
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} hrs`,
                    t.common.duration,
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t.analytics.regionalTitle}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.regionalSub}
              </p>
            </div>

            <BarChart3
              size={20}
              className="text-cyan-600 dark:text-cyan-400"
            />
          </div>

          <div className="mt-6 h-[300px] w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b8"
                  strokeOpacity={0.25}
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
                  allowDecimals={false}
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
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />

                <Bar
                  dataKey="vehicles"
                  name={t.vehicles.title}
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="incidents"
                  name={t.incidents.title}
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />

              <span className="text-xs text-slate-600 dark:text-slate-400">
                {t.vehicles.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />

              <span className="text-xs text-slate-600 dark:text-slate-400">
                {t.incidents.title}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t.roads.title}
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.riskDistSub}
              </p>
            </div>

            <Activity
              size={20}
              className="text-amber-500 dark:text-amber-400"
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
                  ? "text-red-600 dark:text-red-400"
                  : risk.name === "High"
                    ? "text-orange-600 dark:text-orange-400"
                    : risk.name === "Medium"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400";

              const localizedName =
                risk.name === "Critical"
                  ? t.common.critical
                  : risk.name === "High"
                    ? t.common.high
                    : risk.name === "Medium"
                      ? t.common.medium
                      : t.common.low;

              return (
                <div key={risk.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${barClass}`}
                      />

                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {localizedName}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-semibold ${textClass}`}
                    >
                      {risk.value}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
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

          <div className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.totalMonitoredRoads}
              </span>

              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {roadsSummary.total}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t.analytics.safeLowRisk}
              </span>

              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {roadsSummary.safe_percentage}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-5 shadow-sm dark:border-cyan-500/10 dark:bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-cyan-200 bg-cyan-100 p-2.5 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400">
              <Activity
                size={19}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-400">
                {t.analytics.fleetUtilization}
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {insights.fleet_utilization}%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {t.analytics.insight3}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm dark:border-emerald-500/10 dark:bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-100 p-2.5 text-emerald-700 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400">
              <ShieldCheck
                size={19}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-400">
                {t.analytics.routeSafety}
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {insights.route_safety}%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {t.analytics.insight2}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/10 dark:bg-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-200 bg-amber-100 p-2.5 text-amber-700 dark:border-transparent dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle
                size={19}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-400">
                {t.analytics.incidentResolution}
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {insights.incident_resolution}%
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600 dark:text-slate-400">
            {t.analytics.insight1}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <BarChart3
            size={19}
            className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400"
          />

          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.analytics.footerTitle}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {t.analytics.footerDesc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;