import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <Header />

          {/* Current Page */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  );
}

export default Layout;