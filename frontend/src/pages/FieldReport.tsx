import {
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  LocateFixed,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

const recentReports = [
  {
    id: "FR-021",
    type: "Landslide",
    location: "NH-15, Dhemaji, Assam",
    severity: "Critical",
    status: "Verified",
    time: "12 min ago",
  },
  {
    id: "FR-020",
    type: "Road Blockage",
    location: "NH-10, Gangtok, Sikkim",
    severity: "High",
    status: "Under Review",
    time: "31 min ago",
  },
  {
    id: "FR-019",
    type: "Flooding",
    location: "Shillong, Meghalaya",
    severity: "Medium",
    status: "Verified",
    time: "1 hr ago",
  },
];

function severityClass(severity: string) {
  switch (severity) {
    case "Critical":
      return "bg-red-500/10 text-red-400";

    case "High":
      return "bg-orange-500/10 text-orange-400";

    case "Medium":
      return "bg-amber-500/10 text-amber-400";

    default:
      return "bg-emerald-500/10 text-emerald-400";
  }
}

function FieldReport() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Field Report
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Submit geo-tagged road and incident reports from the
            field
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          GPS ready
        </div>
      </div>

      {/* Offline Status */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <LocateFixed
          size={19}
          className="mt-0.5 shrink-0 text-cyan-400"
        />

        <div>
          <p className="text-sm font-medium text-cyan-400">
            Location services available
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Your current location can be attached automatically
            to this report. Reports can later be queued for
            synchronization when connectivity is unavailable.
          </p>
        </div>

        <span className="ml-auto hidden rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400 sm:block">
          Online
        </span>
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 xl:col-span-2">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5">
                <FileText
                  size={20}
                  className="text-cyan-400"
                />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  New Incident Report
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Provide accurate details to help verify and
                  respond to the incident
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5">
            {/* Incident Type */}
            <div>
              <label
                htmlFor="incident-type"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Incident Type
              </label>

              <select
                id="incident-type"
                defaultValue=""
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400 outline-none focus:border-cyan-500/50"
              >
                <option value="" disabled>
                  Select incident type
                </option>
                <option>Landslide</option>
                <option>Flooding</option>
                <option>Road Blockage</option>
                <option>Road Damage</option>
                <option>Bridge Damage</option>
                <option>Traffic Congestion</option>
                <option>Accident</option>
                <option>Other</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Severity
              </label>

              <select
                id="severity"
                defaultValue="Medium"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400 outline-none focus:border-cyan-500/50"
              >
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Location
              </label>

              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                  <MapPin
                    size={18}
                    className="text-red-400"
                  />

                  <input
                    id="location"
                    type="text"
                    placeholder="Enter road, district or landmark"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-medium text-cyan-400 transition hover:border-cyan-500/30 hover:bg-cyan-500/5"
                >
                  <LocateFixed size={16} />
                  Use GPS
                </button>
              </div>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="latitude"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Latitude
                </label>

                <input
                  id="latitude"
                  type="text"
                  placeholder="e.g. 27.4705"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label
                  htmlFor="longitude"
                  className="mb-2 block text-xs font-medium text-slate-400"
                >
                  Longitude
                </label>

                <input
                  id="longitude"
                  type="text"
                  placeholder="e.g. 94.9120"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Incident Description
              </label>

              <textarea
                id="description"
                rows={5}
                placeholder="Describe what you observed, road condition, obstruction, estimated impact, and any other useful information..."
                className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-400">
                  Incident Photos
                </label>

                <span className="text-[10px] text-slate-600">
                  JPG, PNG · Max 10 MB
                </span>
              </div>

              <div className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-8 text-center transition hover:border-cyan-500/40 hover:bg-cyan-500/5">
                <div className="rounded-xl bg-slate-800 p-3">
                  <ImagePlus
                    size={24}
                    className="text-cyan-400"
                  />
                </div>

                <p className="mt-3 text-sm font-medium text-slate-300">
                  Upload incident photos
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Add photos to help AI verify the reported
                  incident
                </p>

                <button
                  type="button"
                  className="mt-4 flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                >
                  <Upload size={15} />
                  Choose Photos
                </button>
              </div>
            </div>

            {/* Camera */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950 py-3 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              <Camera size={16} />
              Capture Photo From Camera
            </button>

            {/* Submit */}
            <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-slate-800 px-5 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Save Draft
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <Send size={15} />
                Submit Report
              </button>
            </div>
          </div>
        </div>

        {/* AI Verification */}
        <div className="space-y-6">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5">
            <div className="border-b border-purple-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2.5">
                  <Sparkles
                    size={19}
                    className="text-purple-400"
                  />
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    AI Verification
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Automated incident validation
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={18}
                    className="text-purple-400"
                  />

                  <div>
                    <p className="text-sm font-medium text-white">
                      Verification Pipeline
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Waiting for report submission
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Image classification
                  </span>

                  <span className="text-slate-600">
                    Pending
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 w-0 rounded-full bg-purple-500" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Severity estimation
                  </span>

                  <span className="text-slate-600">
                    Pending
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 w-0 rounded-full bg-purple-500" />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Location validation
                  </span>

                  <span className="text-slate-600">
                    Pending
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 w-0 rounded-full bg-purple-500" />
                </div>
              </div>

              <div className="border-t border-purple-500/10 pt-4">
                <p className="text-xs leading-5 text-slate-500">
                  AI verification will analyze submitted images,
                  incident descriptions and geo-location data to
                  estimate confidence and reduce false reports.
                </p>
              </div>
            </div>
          </div>

          {/* GPS Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <LocateFixed
                  size={19}
                  className="text-emerald-400"
                />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  GPS Information
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Current device positioning
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">
                  Status
                </span>

                <span className="text-xs font-medium text-emerald-400">
                  Available
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">
                  Accuracy
                </span>

                <span className="text-xs text-slate-400">
                  ±12 m
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">
                  Last update
                </span>

                <span className="text-xs text-slate-400">
                  Just now
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">
              Recent Field Reports
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Recently submitted reports from field teams
            </p>
          </div>

          <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-400">
            3 Recent
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                  <FileText
                    size={18}
                    className="text-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {report.type}
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(
                        report.severity,
                      )}`}
                    >
                      {report.severity}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin size={13} />
                      {report.location}
                    </span>

                    <span className="text-[10px] text-slate-700">
                      {report.id}
                    </span>

                    <span className="text-[10px] text-slate-600">
                      {report.time}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`flex items-center gap-1.5 text-[11px] ${
                    report.status === "Verified"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {report.status === "Verified" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}

                  {report.status}
                </span>

                <button
                  type="button"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
                >
                  View Report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-start gap-3">
          <Sparkles
            size={18}
            className="mt-0.5 shrink-0 text-cyan-400"
          />

          <div>
            <p className="text-sm font-medium text-white">
              Field intelligence workflow
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Field teams can submit an incident with location,
              photos and observations. The backend will later send
              the report through AI verification before updating
              the regional incident and road-risk systems.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FieldReport;