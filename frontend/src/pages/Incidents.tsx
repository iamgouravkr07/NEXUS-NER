import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

type IncidentSeverity = "Critical" | "High" | "Medium" | "Low";
type IncidentStatus = "Active" | "Verified" | "Investigating";

type Incident = {
  id: string;
  type: string;
  location: string;
  road: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  confidence: number;
  reportedAt: string;
  description: string;
};

const incidents: Incident[] = [
  {
    id: "INC-001",
    type: "Landslide",
    location: "Tawang, Arunachal Pradesh",
    road: "NH-13",
    severity: "Critical",
    status: "Active",
    confidence: 94,
    reportedAt: "12 min ago",
    description: "Major debris blocking one lane of the highway.",
  },
  {
    id: "INC-002",
    type: "Road Blockage",
    location: "Gangtok, Sikkim",
    road: "NH-10",
    severity: "High",
    status: "Verified",
    confidence: 91,
    reportedAt: "28 min ago",
    description: "Traffic movement restricted due to road obstruction.",
  },
  {
    id: "INC-003",
    type: "Flooding",
    location: "Shillong, Meghalaya",
    road: "NH-6",
    severity: "Medium",
    status: "Investigating",
    confidence: 82,
    reportedAt: "43 min ago",
    description: "Water accumulation reported near the roadway.",
  },
  {
    id: "INC-004",
    type: "Heavy Rainfall",
    location: "Dibrugarh, Assam",
    road: "NH-15",
    severity: "Medium",
    status: "Active",
    confidence: 88,
    reportedAt: "1 hr ago",
    description: "Heavy rainfall reducing visibility and road safety.",
  },
  {
    id: "INC-005",
    type: "Vehicle Breakdown",
    location: "Imphal, Manipur",
    road: "NH-2",
    severity: "Low",
    status: "Verified",
    confidence: 97,
    reportedAt: "1 hr ago",
    description: "Logistics vehicle stopped on the roadside.",
  },
  {
    id: "INC-006",
    type: "Bridge Damage",
    location: "Aizawl, Mizoram",
    road: "NH-306",
    severity: "High",
    status: "Active",
    confidence: 89,
    reportedAt: "2 hrs ago",
    description: "Structural damage reported on a bridge section.",
  },
];

function severityStyles(severity: IncidentSeverity) {
  switch (severity) {
    case "Critical":
      return "bg-red-500/10 text-red-400 border-red-500/20";

    case "High":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";

    case "Medium":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";

    case "Low":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
}

function statusStyles(status: IncidentStatus) {
  switch (status) {
    case "Active":
      return "bg-red-500/10 text-red-400";

    case "Verified":
      return "bg-emerald-500/10 text-emerald-400";

    case "Investigating":
      return "bg-amber-500/10 text-amber-400";
  }
}

function IncidentIcon({ severity }: { severity: IncidentSeverity }) {
  if (severity === "Critical") {
    return <ShieldAlert size={18} />;
  }

  if (severity === "High") {
    return <TriangleAlert size={18} />;
  }

  return <AlertTriangle size={18} />;
}

function Incidents() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Incidents
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Monitor and manage reported incidents across the North
            Eastern Region
          </p>
        </div>

        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
        >
          <MapPin size={17} />
          Report Incident
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Total Incidents
            </p>

            <AlertTriangle
              size={20}
              className="text-slate-400"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            24
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Reported today
          </p>
        </div>

        <div className="rounded-xl border border-red-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Critical
            </p>

            <ShieldAlert
              size={20}
              className="text-red-400"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-red-400">
            2
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Immediate attention
          </p>
        </div>

        <div className="rounded-xl border border-orange-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              High Risk
            </p>

            <TriangleAlert
              size={20}
              className="text-orange-400"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-orange-400">
            5
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Requiring monitoring
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Verified
            </p>

            <CheckCircle2
              size={20}
              className="text-emerald-400"
            />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            17
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Confirmed incidents
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <Search
              size={18}
              className="text-slate-500"
            />

            <input
              type="text"
              placeholder="Search incidents..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600 lg:w-72"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400"
            >
              All
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              Critical
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              High
            </button>

            <button
              type="button"
              className="rounded-lg px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-800 hover:text-white"
            >
              Active
            </button>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr>
                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Incident
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Location
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Severity
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Confidence
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Reported
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {incidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="transition hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-lg border p-2 ${severityStyles(
                          incident.severity,
                        )}`}
                      >
                        <IncidentIcon
                          severity={incident.severity}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {incident.type}
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                          {incident.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-300">
                      {incident.location}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      {incident.road}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityStyles(
                        incident.severity,
                      )}`}
                    >
                      {incident.severity}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(
                        incident.status,
                      )}`}
                    >
                      {incident.status}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-400"
                          style={{
                            width: `${incident.confidence}%`,
                          }}
                        />
                      </div>

                      <span className="text-xs text-slate-400">
                        {incident.confidence}%
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 size={14} />
                      {incident.reportedAt}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-600">
            Showing {incidents.length} of 24 incidents
          </p>

          <button
            type="button"
            className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-700 hover:text-white"
          >
            View More
          </button>
        </div>
      </div>
    </div>
  );
}

export default Incidents;