import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, LogOut, Navigation } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Unauthorized: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = (user?.role || "UNKNOWN").toUpperCase();

  const getSafeDestination = () => {
    switch (role) {
      case "PUBLIC":
        return { label: "View Public Road Risk", path: "/road-risk" };
      case "DRIVER":
        return { label: "Return to Mission Cockpit", path: "/" };
      case "FIELD_OFFICER":
        return { label: "Return to Field Reports", path: "/field-report" };
      case "CONTROL_OPERATOR":
      case "ADMIN":
        return { label: "Return to Control Tower", path: "/" };
      default:
        return { label: "Return to Home", path: "/" };
    }
  };

  const safeDest = getSafeDestination();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
          <ShieldAlert size={36} />
        </div>

        <div className="mt-6 text-center">
          <span className="inline-block rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
            HTTP 403 Forbidden
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            You do not have permission to access this operational area.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Authenticated Account:</span>
            <span className="font-mono font-medium text-slate-200">
              {user?.username || "Session Active"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Active Role:</span>
            <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 border border-cyan-800/50">
              {role}
            </span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed border-t border-slate-800/80 pt-2.5">
            Role-Based Access Control (RBAC) restricts this operational interface to authorized roles.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            to={safeDest.path}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-950/50 transition hover:bg-cyan-500 active:scale-[0.98]"
          >
            <Navigation size={16} />
            <span>{safeDest.label}</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={16} />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
