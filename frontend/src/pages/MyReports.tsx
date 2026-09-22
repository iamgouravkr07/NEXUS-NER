import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

type CitizenReport = {
  id: number;
  reporter_user_id: number;
  latitude: number;
  longitude: number;
  road_id?: number | null;
  road_name?: string | null;
  report_type: string;
  description: string;
  severity_hint?: string | null;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
  converted_incident_id?: number | null;
  rejection_reason?: string | null;
  verification_notes?: string | null;
};

export default function MyReports() {
  const { getAuthHeader } = useAuth();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMyReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/public-reports/mine`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        throw new Error(`Failed to load reports (HTTP ${res.status})`);
      }
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Could not retrieve your reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyReports();
  }, []);

  const renderStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-bold">
            <CheckCircle2 size={13} />
            <span>Verified — Incident Active</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400 px-2.5 py-0.5 text-xs font-bold">
            <XCircle size={13} />
            <span>Rejected</span>
          </span>
        );
      case "UNVERIFIED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 px-2.5 py-0.5 text-xs font-bold">
            <Clock3 size={13} />
            <span>UNVERIFIED (Under Review)</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">My Submitted Reports</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Track operational verification and status of your citizen hazard submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMyReports}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            to="/report-problem"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition"
          >
            <Plus size={15} />
            <span>New Report</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-none">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-cyan-600 dark:text-cyan-400" />
          <p className="text-sm">Loading your citizen reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center space-y-4 shadow-sm dark:shadow-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <FileText size={26} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Submitted Reports Found</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1">
              You haven't reported any road hazards or disruptions yet. Notice something on the road?
            </p>
          </div>
          <Link
            to="/report-problem"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition"
          >
            <Plus size={15} />
            <span>Report a Road Hazard</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm dark:shadow-xl space-y-3.5"
            >
              {/* Top Row: Ref, Type, Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400">
                    #{report.id}
                  </span>
                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                    {report.report_type.replace(/_/g, " ")}
                  </span>
                  {report.severity_hint && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                      ({report.severity_hint} severity)
                    </span>
                  )}
                </div>
                {renderStatusBadge(report.status)}
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {report.description}
              </p>

              {/* Rejection / Verification Feedback Banner */}
              {report.status === "REJECTED" && report.rejection_reason && (
                <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-2.5 text-xs text-red-800 dark:text-red-300">
                  <span className="font-semibold block text-[11px] text-red-900 dark:text-red-200">Reviewer Feedback:</span>
                  {report.rejection_reason}
                </div>
              )}
              {report.status === "VERIFIED" && report.converted_incident_id && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Linked to Official Incident: <strong>#{report.converted_incident_id}</strong></span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Active in Risk Engine</span>
                </div>
              )}

              {/* Bottom Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono">
                    <MapPin size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                    {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                  </span>
                  {report.road_name && (
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Corridor: {report.road_name}
                    </span>
                  )}
                </div>
                <span>
                  Submitted {new Date(report.created_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
