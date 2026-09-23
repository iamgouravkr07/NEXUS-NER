import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, LogOut, Navigation } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export const Unauthorized: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const role = (user?.role || "UNKNOWN").toUpperCase();

  const getSafeDestination = () => {
    switch (role) {
      case "PUBLIC":
        return { label: t.auth.viewRoadRiskBtn, path: "/road-risk" };
      case "DRIVER":
        return { label: t.auth.returnMissionCockpitBtn, path: "/" };
      case "FIELD_OFFICER":
        return { label: t.auth.returnFieldReportsBtn, path: "/field-report" };
      case "CONTROL_OPERATOR":
      case "ADMIN":
        return { label: t.auth.returnControlTowerBtn, path: "/" };
      default:
        return { label: t.auth.returnHomeBtn, path: "/" };
    }
  };

  const safeDest = getSafeDestination();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <ShieldAlert size={36} />
        </div>

        <div className="mt-6 text-center">
          <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
            {t.auth.http403Forbidden}
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.auth.unauthorizedTitle}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t.auth.unauthorizedDesc}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t.auth.authenticatedAccount}</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {user?.username || "Session Active"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{t.auth.activeRole}</span>
            <span className="rounded border border-cyan-200 bg-cyan-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-800 dark:border-cyan-800/50 dark:bg-cyan-950/80 dark:text-cyan-300">
              {role}
            </span>
          </div>
          <p className="mt-3 border-t border-slate-200 pt-2.5 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
            {t.auth.rbacNotice}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Link
            to={safeDest.path}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-500 active:scale-[0.98] dark:shadow-cyan-950/50"
          >
            <Navigation size={16} />
            <span>{safeDest.label}</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <LogOut size={16} />
            <span>{t.auth.signOutBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
