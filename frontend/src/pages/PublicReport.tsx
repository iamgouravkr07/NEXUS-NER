import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LocateFixed,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { geolocationService } from "../services/geolocation";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

const REPORT_TYPES = [
  { value: "LANDSLIDE", label: "Landslide / Rockfall" },
  { value: "FLOOD", label: "Flooding / Waterlogging" },
  { value: "ROAD_BLOCKAGE", label: "Road Blockage / Tree Fall" },
  { value: "ROAD_DAMAGE", label: "Pothole / Road Surface Damage" },
  { value: "ACCIDENT", label: "Vehicular Collision / Accident" },
  { value: "DEBRIS", label: "Debris / Mud Accumulation" },
  { value: "BRIDGE_DAMAGE", label: "Bridge / Culvert Structural Damage" },
  { value: "HEAVY_CONGESTION", label: "Severe Gridlock / Congestion" },
  { value: "OTHER", label: "Other Hazard" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "Low — Passable with Caution" },
  { value: "medium", label: "Medium — Significant Delay / Hazard" },
  { value: "high", label: "High — Major Impassable Section" },
  { value: "critical", label: "Critical — Total Disruption / Emergency" },
];

type Road = {
  id: number;
  road_name: string;
};

export default function PublicReport() {
  const { getAuthHeader } = useAuth();

  const [reportType, setReportType] = useState("LANDSLIDE");
  const [severityHint, setSeverityHint] = useState("high");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("26.1445");
  const [longitude, setLongitude] = useState("91.7362");
  const [roadId, setRoadId] = useState<number | "">("");

  const [roads, setRoads] = useState<Road[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  // Load road list for reference
  useEffect(() => {
    async function loadRoads() {
      try {
        const res = await fetch(`${API_URL}/roads/`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setRoads(data);
          }
        }
      } catch {
        // roads selector remains optional
      }
    }
    loadRoads();
  }, [getAuthHeader]);

  const handleAcquireGps = async () => {
    setIsLocating(true);
    setErrorMessage("");
    try {
      const pos = await geolocationService.getCurrentPosition(10000, 30000);
      setLatitude(pos.latitude.toFixed(6));
      setLongitude(pos.longitude.toFixed(6));
      setGpsAccuracy(Math.round(pos.accuracy));
      if (!pos.isWithinNER) {
        setErrorMessage(
          `Acquired location (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}) is outside Northeast Region bounds [20-30°N, 88-98°E]. Please enter coordinates manually.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not acquire GPS fix. Please verify location permissions.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      setErrorMessage("Please specify valid numerical coordinates.");
      return;
    }

    if (lat < 20.0 || lat > 30.0 || lon < 88.0 || lon > 98.0) {
      setErrorMessage("Coordinates must fall within Northeast Region bounds [20-30°N, 88-98°E].");
      return;
    }

    if (description.trim().length < 5) {
      setErrorMessage("Please provide at least 5 characters describing the road condition.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        latitude: lat,
        longitude: lon,
        report_type: reportType,
        description: description.trim(),
        severity_hint: severityHint,
      };
      if (roadId !== "") {
        payload.road_id = Number(roadId);
      }

      const res = await fetch(`${API_URL}/public-reports/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSubmittedReport(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedReport) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-md dark:shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Report Submitted Successfully
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Report Reference: <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">#{submittedReport.id}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle size={16} />
              <span>Status: UNVERIFIED (Under Review)</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
              Your observation has been queued for verification by NEXUS-NER field officers and dispatch operators.
              It will not officially affect convoy routing or road status until verified by authorized personnel.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Category</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submittedReport.report_type.replace(/_/g, " ")}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Perceived Severity</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 capitalize">{submittedReport.severity_hint || "High"}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 block">Coordinates</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300 font-medium">
                {submittedReport.latitude.toFixed(4)}°N, {submittedReport.longitude.toFixed(4)}°E
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 block">Description</span>
              <span className="text-slate-700 dark:text-slate-300">{submittedReport.description}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/my-reports"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition"
            >
              <FileText size={16} />
              <span>View My Reports</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                setDescription("");
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <span>Submit Another Report</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400 mb-2">
          <ShieldCheck size={14} />
          <span>Citizen Road Observation Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Citizen Road Condition Report</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Help NEXUS-NER keep logistics and emergency transit corridors safe across the North Eastern Region.
        </p>
      </div>

      {/* Review Notice */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200/90 leading-relaxed">
          <strong className="text-slate-900 dark:text-white block mb-0.5">Verification Guardrail (Initial Status: UNVERIFIED):</strong>
          All citizen reports are received in UNVERIFIED status and reviewed by Field Officers and Control Operators. Submitting a report does not immediately block roads or create official incidents.
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 sm:p-7 shadow-sm dark:shadow-xl space-y-5">
        {/* Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Hazard / Problem Category <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Perceived Impact Level <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={severityHint}
            onChange={(e) => setSeverityHint(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          >
            {SEVERITY_LEVELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Corridor / Road (Optional) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Affected Highway / Corridor (Optional)
          </label>
          <select
            value={roadId}
            onChange={(e) => setRoadId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">-- Select corridor or leave unspecified --</option>
            {roads.map((r) => (
              <option key={r.id} value={r.id}>
                {r.road_name} (ID #{r.id})
              </option>
            ))}
          </select>
        </div>

        {/* Location Coordinates */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Location Coordinates (NER Region) <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={isLocating}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300 transition"
            >
              {isLocating ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <LocateFixed size={13} />
              )}
              <span>{isLocating ? "Acquiring..." : "Use Device GPS"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Latitude [20° - 30°N]</span>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="26.1445"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">Longitude [88° - 98°E]</span>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="91.7362"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
          {gpsAccuracy !== null && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              ✓ Acquired from device sensors (accuracy ±{gpsAccuracy}m)
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Description & Visual Observations <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">{description.length}/2000</span>
          </div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you see: e.g. Mudslide blocking both lanes approx 5km east of bridge. Heavy rain ongoing, vehicles queuing up."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none leading-relaxed placeholder:text-slate-400"
          />
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          <span>{isSubmitting ? "Submitting Observation..." : "Submit Road Problem Report"}</span>
        </button>
      </form>
    </div>
  );
}
