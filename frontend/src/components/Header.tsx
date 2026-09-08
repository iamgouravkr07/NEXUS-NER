import { useEffect, useState } from "react";
import { Bell, Search, User } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function Header() {
  const [criticalCount, setCriticalCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    async function fetchSummary() {
      try {
        const res = await fetch(`${API_URL}/alerts/summary`);
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

    fetchSummary();
    const interval = window.setInterval(fetchSummary, 10000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6 text-white">
      {/* Left */}
      <div>
        <h2 className="text-lg font-semibold">Control Tower</h2>
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
              Control Operator
            </p>

            <p className="text-xs text-slate-500">
              NEXUS-NER
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;