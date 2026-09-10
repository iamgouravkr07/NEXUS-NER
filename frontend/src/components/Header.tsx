import { useEffect, useState } from "react";
import { Bell, Search, User, LogOut, UploadCloud } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { syncQueue } from "../offline/syncQueue";
import { useWebSocket } from "../hooks/useWebSocket";

function Header() {
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
  const { user, logout, apiUrl } = useAuth();
  const { isLive, subscribe } = useWebSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    let mounted = true;

    async function fetchSummary() {
      try {
        const res = await fetch(`${apiUrl}/alerts/summary`);
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
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 text-white">
      {/* Left */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold">Control Tower</h2>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Polling
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          North Eastern Region Logistics Intelligence
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 md:flex">
          <Search size={17} className="text-slate-500" />

          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>

        {/* Outbox Pending */}
        <Link
          to="/field-report"
          title={
            pendingOutboxCount > 0
              ? `${pendingOutboxCount} offline reports queued in outbox`
              : "Offline Outbox (All synced)"
          }
          className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <UploadCloud size={20} className={pendingOutboxCount > 0 ? "text-amber-400" : ""} />

          {pendingOutboxCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950 shadow-sm ring-2 ring-slate-950">
              {pendingOutboxCount > 99 ? "99+" : pendingOutboxCount}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <Link
          to="/alerts"
          title={
            criticalCount > 0
              ? `${criticalCount} Critical Alerts requiring attention`
              : "View Alerts & Notifications"
          }
          className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <Bell size={20} />

          {criticalCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-950">
              {criticalCount > 99 ? "99+" : criticalCount}
            </span>
          )}
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
            <User size={19} />
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">
              {user?.username || "Control Operator"}
            </p>

            <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
              {user?.role || "OPERATOR"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of NEXUS-NER"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-red-400"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;