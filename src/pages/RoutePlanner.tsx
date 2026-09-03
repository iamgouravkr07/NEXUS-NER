import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  Truck,
} from "lucide-react";

const routeOptions = [
  {
    id: "R-001",
    name: "Recommended Route",
    path: "Guwahati → Tezpur → Itanagar",
    distance: "387 km",
    eta: "8h 25m",
    risk: "Low",
    status: "Recommended",
  },
  {
    id: "R-002",
    name: "Alternative Route",
    path: "Guwahati → Bongaigaon → Itanagar",
    distance: "421 km",
    eta: "9h 10m",
    risk: "Medium",
    status: "Alternative",
  },
  {
    id: "R-003",
    name: "Risky Route",
    path: "Guwahati → North Lakhimpur → Itanagar",
    distance: "352 km",
    eta: "7h 40m",
    risk: "High",
    status: "Avoid",
  },
];

function riskStyles(risk: string) {
  switch (risk) {
    case "Low":
      return "bg-emerald-500/10 text-emerald-400";

    case "Medium":
      return "bg-amber-500/10 text-amber-400";

    case "High":
      return "bg-red-500/10 text-red-400";

    default:
      return "bg-slate-500/10 text-slate-400";
  }
}

function RoutePlanner() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Route Planner
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Find safer and more efficient routes across the North
          Eastern Region
        </p>
      </div>

      {/* Route Search */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-lg bg-cyan-500/10 p-2.5">
            <Route
              size={21}
              className="text-cyan-400"
            />
          </div>

          <div>
            <h2 className="font-semibold text-white">
              Plan a Route
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Route recommendations consider road risk and
              accessibility
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-end">
          {/* Start */}
          <div>
            <label
              htmlFor="start-location"
              className="mb-2 block text-xs font-medium text-slate-400"
            >
              Starting Point
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <MapPin
                size={18}
                className="text-emerald-400"
              />

              <input
                id="start-location"
                type="text"
                placeholder="Enter starting location"
                defaultValue="Guwahati, Assam"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden justify-center lg:flex">
            <ArrowRight
              size={20}
              className="text-slate-600"
            />
          </div>

          {/* Destination */}
          <div>
            <label
              htmlFor="destination"
              className="mb-2 block text-xs font-medium text-slate-400"
            >
              Destination
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
              <MapPin
                size={18}
                className="text-red-400"
              />

              <input
                id="destination"
                type="text"
                placeholder="Enter destination"
                defaultValue="Itanagar, Arunachal Pradesh"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            <Navigation size={17} />
            Find Routes
          </button>
        </div>

        {/* Options */}
        <div className="mt-5 flex flex-wrap gap-5 border-t border-slate-800 pt-5">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              defaultChecked
              className="accent-cyan-400"
            />
            Avoid high-risk roads
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              defaultChecked
              className="accent-cyan-400"
            />
            Avoid active incidents
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="accent-cyan-400"
            />
            Prefer shortest route
          </label>
        </div>
      </div>

      {/* Route Results */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Route Visualization */}
        <div className="min-h-[480px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold text-white">
                Route Visualization
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Recommended path based on current road conditions
              </p>
            </div>

            <span className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Route Available
            </span>
          </div>

          {/* Map Placeholder */}
          <div className="relative flex h-[400px] items-center justify-center bg-slate-950">
            {/* Decorative route */}
            <div className="absolute left-[18%] top-[65%] h-1 w-[64%] rotate-[-20deg] rounded-full bg-cyan-400/80" />

            <div className="absolute left-[18%] top-[65%] h-4 w-4 rounded-full border-2 border-emerald-400 bg-slate-950" />

            <div className="absolute right-[17%] top-[25%] h-4 w-4 rounded-full border-2 border-red-400 bg-slate-950" />

            <div className="relative z-10 text-center">
              <Route
                size={40}
                className="mx-auto text-cyan-400"
              />

              <p className="mt-3 font-medium text-slate-300">
                Route Map
              </p>

              <p className="mt-1 text-xs text-slate-600">
                OSRM / routing service will be connected here
              </p>
            </div>

            {/* Start Label */}
            <div className="absolute bottom-[27%] left-[13%] rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2">
              <p className="text-[10px] text-slate-500">
                START
              </p>

              <p className="text-xs font-medium text-white">
                Guwahati
              </p>
            </div>

            {/* Destination Label */}
            <div className="absolute right-[10%] top-[17%] rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2">
              <p className="text-[10px] text-slate-500">
                DESTINATION
              </p>

              <p className="text-xs font-medium text-white">
                Itanagar
              </p>
            </div>
          </div>
        </div>

        {/* Route Summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="font-semibold text-white">
              Route Summary
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Best available route
            </p>
          </div>

          <div className="space-y-5 p-5">
            {/* Distance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/10 p-2">
                  <Navigation
                    size={17}
                    className="text-cyan-400"
                  />
                </div>

                <span className="text-sm text-slate-400">
                  Distance
                </span>
              </div>

              <span className="text-sm font-semibold text-white">
                387 km
              </span>
            </div>

            {/* ETA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Clock3
                    size={17}
                    className="text-purple-400"
                  />
                </div>

                <span className="text-sm text-slate-400">
                  Estimated Time
                </span>
              </div>

              <span className="text-sm font-semibold text-white">
                8h 25m
              </span>
            </div>

            {/* Risk */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <ShieldCheck
                    size={17}
                    className="text-emerald-400"
                  />
                </div>

                <span className="text-sm text-slate-400">
                  Route Risk
                </span>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Low
              </span>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Route Path */}
            <div>
              <p className="mb-3 text-xs font-medium text-slate-500">
                Route Path
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                  <span className="text-sm text-slate-300">
                    Guwahati
                  </span>
                </div>

                <div className="ml-1 h-5 border-l border-dashed border-slate-700" />

                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />

                  <span className="text-sm text-slate-300">
                    Tezpur
                  </span>
                </div>

                <div className="ml-1 h-5 border-l border-dashed border-slate-700" />

                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

                  <span className="text-sm text-slate-300">
                    Itanagar
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full rounded-lg bg-cyan-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Use This Route
            </button>
          </div>
        </div>
      </div>

      {/* Alternative Routes */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Available Routes
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Compare routes based on distance, ETA and road risk
          </p>
        </div>

        <div className="divide-y divide-slate-800">
          {routeOptions.map((route) => (
            <div
              key={route.id}
              className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
                  <Truck size={19} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {route.name}
                    </p>

                    {route.status === "Recommended" && (
                      <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-400">
                        Recommended
                      </span>
                    )}

                    {route.status === "Avoid" && (
                      <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400">
                        Avoid
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {route.path}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Distance
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {route.distance}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    ETA
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    {route.eta}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase text-slate-600">
                    Risk
                  </p>

                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${riskStyles(
                      route.risk,
                    )}`}
                  >
                    {route.risk}
                  </span>
                </div>

                <button
                  type="button"
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligence Note */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-cyan-400"
        />

        <div>
          <p className="text-sm font-medium text-cyan-400">
            Risk-aware routing
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Route recommendations will combine road accessibility,
            active incidents, weather conditions and predicted risk
            scores when the routing backend is connected.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoutePlanner;