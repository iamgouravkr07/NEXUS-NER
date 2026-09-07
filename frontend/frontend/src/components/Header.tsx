import { Bell, Search } from "lucide-react";

function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div>
        <h1 className="text-lg font-semibold text-white">
          Control Tower
        </h1>
        <p className="text-xs text-slate-500">
          NEXUS-NER Logistics Intelligence Platform
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 md:flex">
          <Search size={16} className="text-slate-500" />

          <input
            type="text"
            placeholder="Search..."
            className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <Bell size={19} />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            AK
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">
              Operator
            </p>

            <p className="text-xs text-slate-500">
              Control Center
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;