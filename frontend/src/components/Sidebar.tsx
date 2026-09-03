import {
  Activity,
  Bell,
  FileText,
  LayoutDashboard,
  Map,
  Route,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  {
    name: "Control Tower",
    path: "/control",
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
    icon: Map,
  },
  {
    name: "Field Report",
    path: "/field-report",
    icon: FileText,
  },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900 p-5 text-white">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-cyan-400">
          NEXUS-NER
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Logistics Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom status */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center gap-2 px-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="text-xs text-slate-500">
            System Operational
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;