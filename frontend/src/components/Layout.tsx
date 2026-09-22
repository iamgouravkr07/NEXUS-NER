import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { NetworkBanner } from "./NetworkBanner";
import { MobileBottomNav } from "./MobileBottomNav";

function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex flex-col transition-colors duration-150">
      <div className="flex min-h-screen flex-1">
        {/* Desktop Sidebar (hidden on mobile, mobile bottom nav takes over) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <Header />

          {/* Real-time Network & Sync Banner */}
          <NetworkBanner />

          {/* Current Page Content */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav />
    </div>
  );
}

export default Layout;