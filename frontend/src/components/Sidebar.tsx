import {
  LayoutDashboard,
  TriangleAlert,
  Truck,
  Route,
  ShieldAlert,
  Bell,
  BarChart3,
  FileText,
} from "lucide-react";

import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    {
      name: "Control Tower",
      path: "/control",
      icon: LayoutDashboard,
    },
    {
      name: "Incidents",
      path: "/incidents",
      icon: TriangleAlert,
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
      path: "/risk",
      icon: ShieldAlert,
    },
    {
      name: "Alerts",
      path: "/alerts",
      icon: Bell,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Field Reports",
      path: "/field-report",
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900">
      {/* Logo */}
      <div className="border-b border-slate-800 p-6">
        <h1 className="text-xl font-bold text-cyan-400">
          NEXUS-NER
        </h1>

        <p className="mt-1 text-xs text-slate-500">
          Logistics Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4" />

                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;