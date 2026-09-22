import { useEffect, useState } from "react";
import { Bell, Search, User, LogOut, UploadCloud, Sun, Moon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import LanguageSelector from "./LanguageSelector";
import { syncQueue } from "../offline/syncQueue";
import { useWebSocket } from "../hooks/useWebSocket";

function Header() {
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
  const { user, logout, apiUrl, getAuthHeader } = useAuth();
  const { t } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const { isLive, subscribe } = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    let mounted = true;

    async function fetchSummary() {
      if (!user || user.role === "PUBLIC") return;
      try {
        const res = await fetch(`${apiUrl}/alerts/summary`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setCriticalCount(data.critical || 0);
          }
        }
      } catch {
        // Fallback gracefully on network error
      }
    }

    async function updatePending() {
      try {
        const count = await syncQueue.countPending();
        if (mounted) {
          setPendingOutboxCount(count);
        }
      } catch {}
    }

    fetchSummary();
    updatePending();

    // Subscribe to real-time WebSocket alert creation
    const unsubscribe = subscribe((event) => {
      if (
        event.type === "alert.created" &&
        event.data?.severity?.toLowerCase() === "critical"
      ) {
        if (mounted) {
          setCriticalCount((prev) => prev + 1);
        }
      }
    });

    const interval = window.setInterval(fetchSummary, 10000);
    const handleQueueChange = () => {
      updatePending();
    };
    window.addEventListener("nexus:sync_queue_changed", handleQueueChange);

    return () => {
      mounted = false;
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("nexus:sync_queue_changed", handleQueueChange);
    };
  }, [apiUrl, subscribe]);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-colors duration-150">
      {/* Left */}
      <div className="min-w-0 shrink">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h2 className="text-base sm:text-lg font-semibold truncate text-slate-900 dark:text-white">{t.nav.controlTower}</h2>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              {t.nav.live}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              {t.nav.polling}
            </span>
          )}
        </div>
        <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 truncate">
          North Eastern Region Logistics Intelligence
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Selector */}
        <LanguageSelector variant="compact" />

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
        >
          {isDark ? (
            <Sun size={19} className="text-amber-400 hover:rotate-45 transition-transform" />
          ) : (
            <Moon size={19} className="text-slate-700 hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Search (Desktop only) */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 lg:flex dark:border-slate-800 dark:bg-slate-900">
          <Search size={17} className="text-slate-400 dark:text-slate-500" />

          <input
            type="text"
            placeholder={t.nav.searchPlaceholder}
            className="w-32 xl:w-40 bg-transparent text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

        {/* Outbox Pending */}
        <Link
          to="/field-report"
          aria-label="Offline Outbox"
          title={
            pendingOutboxCount > 0
              ? `${pendingOutboxCount} offline reports queued in outbox`
              : "Offline Outbox (All synced)"
          }
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
        >
          <UploadCloud size={19} className={pendingOutboxCount > 0 ? "text-amber-500 dark:text-amber-400" : ""} />

          {pendingOutboxCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950 shadow-sm ring-2 ring-white dark:ring-slate-950">
              {pendingOutboxCount > 99 ? "99+" : pendingOutboxCount}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <Link
          to="/alerts"
          aria-label="Alerts and Notifications"
          title={
            criticalCount > 0
              ? `${criticalCount} Critical Alerts requiring attention`
              : "View Alerts & Notifications"
          }
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
        >
          <Bell size={19} />

          {criticalCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950">
              {criticalCount > 99 ? "99+" : criticalCount}
            </span>
          )}
        </Link>

        {/* User */}
        <div className="flex items-center gap-2 sm:gap-2.5 border-l border-slate-200 pl-2 sm:pl-3 dark:border-slate-800">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <User size={18} />
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-medium text-slate-900 dark:text-white leading-tight">
              {user?.username || "Control Operator"}
            </p>

            <p className="text-[9px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              {user?.role || "OPERATOR"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            aria-label="Sign Out"
            title={t.nav.logout}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;