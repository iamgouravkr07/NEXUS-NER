import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Route,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const navigation = [
  {
    name: "Control Tower",
    path: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "CONTROL_OPERATOR"],
  },
  {
    name: "Mission Cockpit",
    path: "/",
    icon: LayoutDashboard,
    roles: ["DRIVER"],
  },
  {
    name: "Incidents",
    path: "/incidents",
    icon: ShieldAlert,
    roles: ["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"],
  },
  {
    name: "Vehicles",
    path: "/vehicles",
    icon: Truck,
    roles: ["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"],
  },
  {
    name: "Route Planner",
    path: "/routes",
    icon: Route,
    roles: ["ADMIN", "CONTROL_OPERATOR"],
  },
  {
    name: "Road Risk",
    path: "/road-risk",
    icon: Activity,
    roles: ["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER", "PUBLIC"],
  },
  {
    name: "Alerts",
    path: "/alerts",
    icon: Bell,
    roles: ["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"],
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: Activity,
    roles: ["ADMIN", "CONTROL_OPERATOR"],
  },
  {
    name: "Field Report",
    path: "/field-report",
    icon: FileText,
    roles: ["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"],
  },
  {
    name: "Report Problem",
    path: "/report-problem",
    icon: AlertTriangle,
    roles: ["PUBLIC"],
  },
  {
    name: "My Reports",
    path: "/my-reports",
    icon: FileText,
    roles: ["PUBLIC"],
  },
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = (user?.role || "").toUpperCase();

  const getLabel = (item: { name: string; path: string; roles: string[] }) => {
    if (item.path === "/") {
      return role === "DRIVER" ? "Mission Cockpit" : t.nav.controlTower;
    }
    if (item.path === "/field-report") return t.nav.fieldReport;
    return item.name;
  };

  const visibleNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside
      className={`relative z-40 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-[76px]"
      }`}
    >
      {/* Header / Logo */}
      <div
        className={`flex h-20 items-center border-b border-slate-200 dark:border-slate-800 ${
          isOpen ? "justify-between px-4" : "justify-center"
        }`}
      >
        {isOpen && (
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/nexus-ner-logo.png"
              alt="NEXUS-NER Logo"
              className="h-10 w-10 shrink-0 rounded-lg object-contain shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-wide text-cyan-600 dark:text-cyan-400 truncate">
                NEXUS-NER
              </h1>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Logistics Intelligence
              </p>
            </div>
          </div>
        )}

        {!isOpen && (
          <div className="flex h-10 w-10 items-center justify-center">
            <img
              src="/nexus-ner-logo.png"
              alt="NEXUS-NER Logo"
              className="h-10 w-10 rounded-lg object-contain shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className={`absolute top-24 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-lg transition hover:border-cyan-500/50 hover:bg-slate-100 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-cyan-400 ${
          isOpen ? "-right-4" : "-right-4"
        }`}
      >
        {isOpen ? (
          <ChevronLeft size={16} />
        ) : (
          <ChevronRight size={16} />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {isOpen && (
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Operations
          </p>
        )}

        <div className="space-y-2">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const label = getLabel(item);

            return (
              <NavLink
                key={`${item.name}-${item.path}`}
                to={item.path}
                end={item.path === "/"}
                title={!isOpen ? label : undefined}
                className={({ isActive }) =>
                  `group relative flex h-12 w-full cursor-pointer items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    isOpen ? "gap-3 px-4" : "justify-center px-2"
                  } ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-500 dark:bg-cyan-400" />
                    )}

                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-cyan-600 dark:text-cyan-400"
                          : "text-slate-400 group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-white"
                      }`}
                    />

                    {isOpen && (
                      <>
                        <span className="flex-1 text-left">
                          {label}
                        </span>

                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* System Status */}
      <div
        className={`border-t border-slate-200 dark:border-slate-800 ${
          isOpen ? "p-5" : "p-3"
        }`}
      >
        <div
          className={`flex items-center rounded-lg bg-slate-100 dark:bg-slate-950 ${
            isOpen
              ? "gap-2 px-3 py-3"
              : "justify-center px-2 py-3"
          }`}
          title={!isOpen ? "System Operational" : undefined}
        >
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />

          {isOpen && (
            <div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-300">
                System Operational
              </p>

              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-600">
                All services running
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;