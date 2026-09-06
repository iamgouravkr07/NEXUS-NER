import {
  Activity,
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

const navigation = [
  {
    name: "Control Tower",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Incidents",
    path: "/incidents",
    icon: ShieldAlert,
  },
  {
    name: "Vehicles",
    path: "/vehicles",
    icon: Truck,
  },
  {
    name: "Route Planner",
    path: "/routes",
    icon: Route,
  },
  {
    name: "Road Risk",
    path: "/road-risk",
    icon: Activity,
  },
  {
    name: "Alerts",
    path: "/alerts",
    icon: Bell,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: Activity,
  },
  {
    name: "Field Report",
    path: "/field-report",
    icon: FileText,
  },
];

function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`relative z-40 flex h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white transition-all duration-300 ${
        isOpen ? "w-64" : "w-[76px]"
      }`}
    >
      {/* Header / Logo */}
      <div
        className={`flex h-20 items-center border-b border-slate-800 ${
          isOpen ? "justify-between px-5" : "justify-center"
        }`}
      >
        {isOpen && (
          <div>
            <h1 className="text-xl font-bold tracking-wide text-cyan-400">
              NEXUS-NER
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Logistics Intelligence
            </p>
          </div>
        )}

        {!isOpen && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
            <span className="text-sm font-bold text-cyan-400">
              N
            </span>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className={`absolute top-24 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 shadow-lg transition hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-400 ${
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
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Operations
          </p>
        )}

        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                title={!isOpen ? item.name : undefined}
                className={({ isActive }) =>
                  `group relative flex h-12 w-full cursor-pointer items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    isOpen ? "gap-3 px-4" : "justify-center px-2"
                  } ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400" />
                    )}

                    <Icon
                      size={20}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-cyan-400"
                          : "text-slate-500 group-hover:text-white"
                      }`}
                    />

                    {isOpen && (
                      <>
                        <span className="flex-1 text-left">
                          {item.name}
                        </span>

                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
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
        className={`border-t border-slate-800 ${
          isOpen ? "p-5" : "p-3"
        }`}
      >
        <div
          className={`flex items-center rounded-lg bg-slate-950 ${
            isOpen
              ? "gap-2 px-3 py-3"
              : "justify-center px-2 py-3"
          }`}
          title={!isOpen ? "System Operational" : undefined}
        >
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />

          {isOpen && (
            <div>
              <p className="text-xs font-medium text-slate-300">
                System Operational
              </p>

              <p className="mt-0.5 text-[10px] text-slate-600">
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