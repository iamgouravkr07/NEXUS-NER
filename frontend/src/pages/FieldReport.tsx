import { useEffect, useState } from "react";
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
  X,
  AlertTriangle,
  RefreshCw,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";
import { syncQueue } from "../offline/syncQueue";
import { syncWorker } from "../offline/syncWorker";
import { getStorage } from "../offline/database";
import type { IncidentQueueRecord } from "../offline/database";
import { geolocationService, validateNERCoordinates } from "../services/geolocation";
import { cameraService } from "../services/camera";
import type { PhotoEvidence } from "../services/camera";
import { networkService } from "../services/network";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

interface FieldReportItem {
  id: string;
  type: string;
  location: string;
  severity: string;
  status: string;
  time: string;
}


function severityClass(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400";
    case "high":
      return "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400";
    case "medium":
      return "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400";
    default:
      return "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";
  }
}

function FieldReport() {
  const { getAuthHeader } = useAuth();
  const { t } = useLanguage();

  // Form State
  const [incidentType, setIncidentType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("Medium");
  const [locationName, setLocationName] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [photo, setPhoto] = useState<PhotoEvidence | null>(null);

  // AI / NLP Extraction State
  const [nlpRawText, setNlpRawText] = useState<string>("");
  const [isAnalyzingNlp, setIsAnalyzingNlp] = useState<boolean>(false);
  const [nlpExtraction, setNlpExtraction] = useState<any | null>(null);
  const [nlpError, setNlpError] = useState<string | null>(null);
  const [showNlpAssistant, setShowNlpAssistant] = useState<boolean>(true);

  // Status & Hardware State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsTimestamp, setGpsTimestamp] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(networkService.getStatus().connected);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  const handleAnalyzeNlp = async () => {
    if (!nlpRawText.trim()) {
      setNlpError("Please enter unstructured field report or citizen text to extract.");
      return;
    }
    setIsAnalyzingNlp(true);
    setNlpError(null);
    try {
      const res = await fetch(`${API_URL}/incidents/extract-from-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ text: nlpRawText }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Extraction failed (${res.status})`);
      }
      const data = await res.json();
      setNlpExtraction(data);
    } catch (err: any) {
      setNlpError(err.message || "Failed to analyze incident text.");
    } finally {
      setIsAnalyzingNlp(false);
    }
  };

  const handleApplyNlpToForm = () => {
    if (!nlpExtraction?.extraction) return;
    const ext = nlpExtraction.extraction;

    const typeMap: Record<string, string> = {
      landslide: "landslide",
      flood: "flooding",
      heavy_rain: "flooding",
      road_damage: "road_damage",
      bridge_damage: "bridge_damage",
      traffic_congestion: "traffic_congestion",
      accident: "accident",
      blockage: "road_blockage",
      other: "other",
    };
    setIncidentType(typeMap[ext.incident_type] || "other");

    const sevMap: Record<string, string> = {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    };
    setSeverity(sevMap[ext.severity] || "Medium");

    if (ext.location_text) {
      setLocationName(ext.location_text);
    }
    if (ext.description) {
      setDescription(ext.description);
    }
    if (typeof ext.latitude === "number" && typeof ext.longitude === "number") {
      setLatitude(ext.latitude.toFixed(5));
      setLongitude(ext.longitude.toFixed(5));
    }
    setStatusMessage({
      type: "info",
      text: "AI-extracted candidate applied to form. Please review and verify all fields before submitting.",
    });
  };

  // Reports list
  const [reports, setReports] = useState<FieldReportItem[]>([]);

  // Phase 7D: Incoming Citizen Reports queue
  const [publicReports, setPublicReports] = useState<any[]>([]);
  const [loadingPublicReports, setLoadingPublicReports] = useState(false);
  const [publicReportActionId, setPublicReportActionId] = useState<number | null>(null);

  const loadPublicReports = async () => {
    setLoadingPublicReports(true);
    try {
      const res = await fetch(`${API_URL}/public-reports/?status_filter=UNVERIFIED`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setPublicReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load incoming public reports:", err);
    } finally {
      setLoadingPublicReports(false);
    }
  };

  const handleVerifyPublicReport = async (reportId: number) => {
    setPublicReportActionId(reportId);
    try {
      const res = await fetch(`${API_URL}/public-reports/${reportId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          verification_notes: "Verified by Field Command inspection",
          severity: "high",
        }),
      });
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `Citizen Report #${reportId} verified and promoted to Official Incident!`,
        });
        loadPublicReports();
        loadLocalReports();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMessage({
          type: "error",
          text: err.detail || `Failed to verify report #${reportId}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to verify report",
      });
    } finally {
      setPublicReportActionId(null);
    }
  };

  const handleRejectPublicReport = async (reportId: number) => {
    setPublicReportActionId(reportId);
    try {
      const res = await fetch(`${API_URL}/public-reports/${reportId}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          rejection_reason: "Ground assessment did not confirm critical obstruction",
        }),
      });
      if (res.ok) {
        setStatusMessage({
          type: "info",
          text: `Citizen Report #${reportId} rejected and archived.`,
        });
        loadPublicReports();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMessage({
          type: "error",
          text: err.detail || `Failed to reject report #${reportId}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to reject report",
      });
    } finally {
      setPublicReportActionId(null);
    }
  };

  const updatePendingCount = async () => {
    try {
      const count = await syncQueue.countPending();
      setPendingCount(count);
    } catch {}
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await syncWorker.processQueue();
      await loadLocalReports();
      await updatePendingCount();
      if (res.success > 0) {
        setStatusMessage({
          type: "success",
          text: `${t.fieldReport.reportSyncedSuccess} (${res.success} synced)`,
        });
      } else if (res.errors > 0) {
        setStatusMessage({
          type: "info",
          text: `${t.fieldReport.reportEnqueuedRetry} (${res.errors} pending)`,
        });
      } else {
        setStatusMessage({
          type: "info",
          text: t.fieldReport.allSynced,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Sync error: ${err?.message || "Failed to reach server"}`,
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    const unsub = networkService.subscribe((status) => {
      setIsOnline(status.connected);
    });

    loadLocalReports();
    loadPublicReports();
    updatePendingCount();

    const handleQueueChange = () => {
      loadLocalReports();
      loadPublicReports();
      updatePendingCount();
    };
    window.addEventListener("nexus:sync_queue_changed", handleQueueChange);

    return () => {
      unsub();
      window.removeEventListener("nexus:sync_queue_changed", handleQueueChange);
    };
  }, []);

  const loadLocalReports = async () => {
    try {
      const storage = getStorage();
      await storage.init();
      const localDrafts = await storage.getIncidentDrafts();
      const mappedLocal: FieldReportItem[] = localDrafts.map((draft) => ({
        id: draft.client_id ? `FR-${draft.client_id.substring(0, 6).toUpperCase()}` : "FR-LOCAL",
        type: draft.incident_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location: draft.location_name || `${draft.latitude.toFixed(4)}, ${draft.longitude.toFixed(4)}`,
        severity: draft.severity.charAt(0).toUpperCase() + draft.severity.slice(1),
        status: draft.status === "SYNCED" ? "Verified" : "Pending Sync",
        time: "Recently queued",
      }));

      // Load genuine server incidents
      let serverIncidents: FieldReportItem[] = [];
      try {
        const res = await fetch(`${API_URL}/incidents/`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            serverIncidents = data.map((inc: any) => ({
              id: `INC-#${inc.id}`,
              type: (inc.incident_type || "Incident").replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              location: inc.title || `${inc.latitude ? Number(inc.latitude).toFixed(4) : "26.4046"}, ${inc.longitude ? Number(inc.longitude).toFixed(4) : "91.9253"}`,
              severity: (inc.severity || "medium").charAt(0).toUpperCase() + (inc.severity || "medium").slice(1),
              status: inc.status === "verified" ? "Verified" : "Reported",
              time: inc.created_at ? new Date(inc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active",
            }));
          }
        }
      } catch {
        // Offline or backend unreachable
      }

      setReports([...mappedLocal, ...serverIncidents]);
    } catch {
      setReports([]);
    }
  };

  // On-demand GPS acquisition
  const handleUseGps = async () => {
    setIsLocating(true);
    setStatusMessage(null);
    try {
      const pos = await geolocationService.getCurrentPosition(10000);
      setLatitude(pos.latitude.toFixed(5));
      setLongitude(pos.longitude.toFixed(5));
      setGpsAccuracy(Math.round(pos.accuracy));
      setGpsTimestamp("Just now");

      if (!pos.isWithinNER) {
        setStatusMessage({
          type: "error",
          text: `Warning: Acquired coordinates (${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}) are outside the North Eastern Region bounds [20-30°N, 88-98°E].`,
        });
      } else {
        setStatusMessage({
          type: "info",
          text: `GPS lock acquired (accuracy ±${Math.round(pos.accuracy)}m).`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "Could not acquire GPS fix. Please verify device permissions.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Explicitly labeled NER test coordinate setter for quick testing / emulators
  const handleApplyNerTestCoords = (label: string, lat: number, lon: number) => {
    setLatitude(lat.toFixed(5));
    setLongitude(lon.toFixed(5));
    setLocationName(label);
    setGpsAccuracy(12);
    setGpsTimestamp("NER Test Preset");
    setStatusMessage({
      type: "info",
      text: `Applied test coordinates for ${label}.`,
    });
  };

  // Photo capture
  const handleCapturePhoto = async (sourceType: "camera" | "photos") => {
    try {
      const evidence = await cameraService.capturePhoto(sourceType);
      setPhoto(evidence);
      setStatusMessage({
        type: "info",
        text: `Photo captured: ${evidence.name} (stored locally).`,
      });
    } catch (err: any) {
      if (!err?.message?.includes("cancelled")) {
        setStatusMessage({
          type: "error",
          text: err?.message || "Failed to capture photo.",
        });
      }
    }
  };

  // Save Draft locally
  const handleSaveDraft = async () => {
    if (!incidentType) {
      setStatusMessage({ type: "error", text: t.fieldReport.errSelectType });
      return;
    }

    const latNum = parseFloat(latitude) || 26.1445;
    const lonNum = parseFloat(longitude) || 91.7362;

    try {
      const storage = getStorage();
      await storage.init();
      const draftRecord: IncidentQueueRecord = {
        client_id: `draft_${Date.now()}`,
        incident_type: incidentType,
        severity: severity.toLowerCase(),
        description: description || "Local draft observation",
        latitude: latNum,
        longitude: lonNum,
        location_name: locationName || "Unspecified NER location",
        local_photo_path: photo?.localUri || null,
        photo_metadata: photo ? JSON.stringify({ name: photo.name, size: photo.sizeBytes }) : null,
        status: "DRAFT",
        created_at: new Date().toISOString(),
      };
      await storage.insertIncidentDraft(draftRecord);
      await loadLocalReports();
      await updatePendingCount();
      setStatusMessage({
        type: "success",
        text: t.fieldReport.draftSavedSuccess,
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Failed to save draft: ${err?.message}`,
      });
    }
  };

  // Submit report into persistent Sync Queue
  const handleSubmitReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!incidentType) {
      setStatusMessage({ type: "error", text: t.fieldReport.errSelectType });
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setStatusMessage({
        type: "error",
        text: t.fieldReport.errInvalidCoords,
      });
      return;
    }

    const valCheck = validateNERCoordinates(latNum, lonNum);
    if (!valCheck.valid) {
      setStatusMessage({
        type: "error",
        text: t.fieldReport.errOutsideNer,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // 1. Enqueue event locally via syncQueue
      const payload: Record<string, any> = {
        incident_type: incidentType.toLowerCase().replace(/\s+/g, "_"),
        severity: severity.toLowerCase(),
        description: description || `Field report: ${incidentType} at (${latNum.toFixed(4)}, ${lonNum.toFixed(4)})`,
        location_name: locationName || null,
        latitude: latNum,
        longitude: lonNum,
      };

      if (photo) {
        payload.photo_metadata = {
          name: photo.name,
          size_bytes: photo.sizeBytes,
          timestamp: photo.timestamp,
        };
      }

      const enqueuedEvent = await syncQueue.enqueue(
        "incident_report",
        payload,
        latNum,
        lonNum
      );

      // 2. Also record in local incident_queue table
      const storage = getStorage();
      await storage.init();
      await storage.insertIncidentDraft({
        client_id: enqueuedEvent.client_id,
        incident_type: payload.incident_type,
        severity: payload.severity,
        description: payload.description,
        latitude: latNum,
        longitude: lonNum,
        location_name: locationName || null,
        local_photo_path: photo?.localUri || null,
        photo_metadata: photo ? JSON.stringify(payload.photo_metadata) : null,
        status: isOnline ? "QUEUED" : "DRAFT",
        created_at: new Date().toISOString(),
      });

      await loadLocalReports();
      await updatePendingCount();

      // 3. If online, trigger background sync
      if (isOnline) {
        setStatusMessage({
          type: "info",
          text: t.fieldReport.reportSyncingOnline,
        });

        const syncResult = await syncWorker.processQueue();
        await loadLocalReports();
        await updatePendingCount();
        if (syncResult.success > 0) {
          setStatusMessage({
            type: "success",
            text: `${t.fieldReport.reportSyncedSuccess} (ID: ${enqueuedEvent.client_id.substring(0, 8)})`,
          });
        } else if (syncResult.errors > 0) {
          setStatusMessage({
            type: "info",
            text: t.fieldReport.reportEnqueuedRetry,
          });
        }
      } else {
        setStatusMessage({
          type: "info",
          text: t.fieldReport.reportQueuedOffline,
        });
      }

      // 4. Reset form fields
      setIncidentType("");
      setDescription("");
      setPhoto(null);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: `Error queuing report: ${err?.message || "Unknown storage error"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t.fieldReport.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t.fieldReport.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector */}
          <LanguageSelector variant="full" />

          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <span
              className={`h-2 w-2 rounded-full ${
                latitude && longitude
                  ? "bg-emerald-500 animate-pulse dark:bg-emerald-400"
                  : "bg-amber-500 dark:bg-amber-400"
              }`}
            />
            {latitude && longitude ? t.nav.gpsLocked : t.nav.gpsReady}
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
            }`}
          >
            {isOnline ? t.nav.online : t.nav.offlineMode}
          </span>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            statusMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : statusMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              : "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : statusMessage.type === "error" ? (
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          ) : (
            <LocateFixed size={18} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Offline Status & Outbox Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/5">
        <div className="flex items-start gap-3">
          <LocateFixed size={20} className="mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-cyan-900 dark:text-cyan-400">
                {t.fieldReport.outboxActiveTitle}
              </p>
              {pendingCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400">
                  {pendingCount} {t.fieldReport.pendingOutboxBadge}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400">
                  <Check size={11} /> {t.fieldReport.allSynced}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {t.fieldReport.outboxActiveDesc}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isManualSyncing}
            className="flex items-center gap-2 rounded-lg bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 px-3.5 py-2 text-xs font-semibold text-cyan-800 transition disabled:opacity-50 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/20 dark:border-cyan-500/30 dark:text-cyan-300"
          >
            <RefreshCw size={14} className={isManualSyncing ? "animate-spin" : ""} />
            {isManualSyncing ? t.fieldReport.syncingBtn : t.fieldReport.syncNowBtn}
          </button>
        </div>
      </div>

      {/* Main Form & Side Panels */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-cyan-700 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{t.fieldReport.formTitle}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t.fieldReport.formSubtitle}
                </p>
              </div>
            </div>
          </div>

          {/* AI/NLP Incident Extraction Assistant */}
          <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500 dark:text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t.fieldReport.aiAssistantTitle}
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                  {t.fieldReport.advisoryIngestionBadge}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNlpAssistant(!showNlpAssistant)}
                className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                {showNlpAssistant ? t.fieldReport.hideAssistant : t.fieldReport.showAssistant}
              </button>
            </div>

            {showNlpAssistant && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t.fieldReport.aiAssistantSubtitle}:
                </p>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={nlpRawText}
                    onChange={(e) => setNlpRawText(e.target.value)}
                    placeholder={t.fieldReport.aiInputPlaceholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>

                {nlpError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <AlertTriangle size={14} className="shrink-0 text-red-600 dark:text-red-400" />
                    <span>{nlpError}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeNlp}
                    disabled={isAnalyzingNlp || !nlpRawText.trim()}
                    className="flex items-center gap-2 rounded-lg bg-amber-100 px-3.5 py-2 text-xs font-semibold text-amber-800 border border-amber-300 transition hover:bg-amber-200 disabled:opacity-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/20"
                  >
                    <Sparkles size={14} className={isAnalyzingNlp ? "animate-spin" : "text-amber-600 dark:text-amber-400"} />
                    {isAnalyzingNlp ? t.fieldReport.aiExtractingBtn : t.fieldReport.aiExtractBtn}
                  </button>

                  {nlpRawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setNlpRawText("");
                        setNlpExtraction(null);
                        setNlpError(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {t.common.clear}
                    </button>
                  )}
                </div>

                {/* AI Extraction Preview */}
                {nlpExtraction?.extraction && (
                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs space-y-3 dark:border-amber-500/30 dark:bg-amber-500/5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2 dark:border-amber-500/10">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-900 dark:text-amber-300">{t.incidents.candidateTitle}</span>
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {t.fieldReport.aiProvider}: {nlpExtraction.provider === "gemini" ? "Gemini 2.5 Flash" : "Deterministic Fallback Engine"}
                        </span>
                      </div>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                        {t.fieldReport.aiDisclaimer}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">{t.incidents.typeLabel}:</span>
                        <span className="font-semibold text-slate-900 capitalize dark:text-white">{nlpExtraction.extraction.incident_type?.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">{t.incidents.severityLabel}:</span>
                        <span className="font-semibold text-slate-900 capitalize dark:text-white">{nlpExtraction.extraction.severity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">{t.fieldReport.aiConfidence}:</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">{(nlpExtraction.extraction.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">{t.incidents.corridorLabel}:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{nlpExtraction.extraction.road_corridor || t.roads.notAvailable}</span>
                      </div>
                    </div>

                    {nlpExtraction.extraction.location_text && (
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">{t.incidents.locationRefLabel}: </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{nlpExtraction.extraction.location_text}</span>
                      </div>
                    )}

                    {nlpExtraction.warning && (
                      <p className="text-[11px] text-amber-800 italic dark:text-amber-400/80">
                        {t.incidents.noticeLabel}: {nlpExtraction.warning}
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleApplyNlpToForm}
                        className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-300 transition hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30"
                      >
                        <Check size={14} />
                        {t.fieldReport.aiApplyDraftBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-6 p-5">
            {/* Incident Type */}
            <div>
              <label
                htmlFor="incident-type"
                className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {t.fieldReport.incidentTypeLabel} <span className="text-red-500">*</span>
              </label>

              <select
                id="incident-type"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="" disabled>
                  {t.fieldReport.selectTypePrompt}
                </option>
                <option value="landslide">{t.fieldReport.typeLandslide}</option>
                <option value="flooding">{t.fieldReport.typeFlood}</option>
                <option value="road_blockage">{t.fieldReport.typeRoadBlockage}</option>
                <option value="road_damage">{t.fieldReport.typeRoadDamage}</option>
                <option value="weather_disruption">{t.fieldReport.typeWeatherDisruption}</option>
                <option value="bridge_damage">{t.fieldReport.typeRoadDamage} - Bridge</option>
                <option value="traffic_congestion">{t.fieldReport.typeRoadBlockage} - Traffic</option>
                <option value="accident">Accident</option>
                <option value="other">{t.fieldReport.typeOther}</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {t.fieldReport.severityLabel} <span className="text-red-500">*</span>
              </label>

              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                <option value="Critical">{t.fieldReport.sevCritical}</option>
                <option value="High">{t.fieldReport.sevHigh}</option>
                <option value="Medium">{t.fieldReport.sevMedium}</option>
                <option value="Low">{t.fieldReport.sevLow}</option>
              </select>
            </div>

            {/* Location Name */}
            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {t.fieldReport.locationLabel}
              </label>

              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <MapPin size={18} className="text-red-500 shrink-0" />
                  <input
                    id="location"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder={t.fieldReport.locationNamePlaceholder}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={isLocating}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-cyan-400 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/5"
                >
                  <LocateFixed size={16} className={isLocating ? "animate-spin" : ""} />
                  {isLocating ? t.fieldReport.locatingBtn : t.fieldReport.useGpsBtn}
                </button>
              </div>
            </div>

            {/* Coordinates */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="latitude"
                    className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    {t.fieldReport.latitudeLabel} <span className="text-red-500">* (20°–30° N)</span>
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="0.00001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 27.4705"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="longitude"
                    className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    {t.fieldReport.longitudeLabel} <span className="text-red-500">* (88°–98° E)</span>
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="0.00001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 94.9120"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Explicit Test Preset Fallback Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span>{t.fieldReport.nerPresetsLabel}:</span>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords(t.fieldReport.presetGuwahati, 26.1445, 91.7362)}
                  className="rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-700 transition dark:border-transparent dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  {t.fieldReport.presetGuwahati} (26.1445, 91.7362)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords(t.fieldReport.presetShillong, 25.5788, 91.8933)}
                  className="rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-700 transition dark:border-transparent dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  {t.fieldReport.presetShillong} (25.5788, 91.8933)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords(t.fieldReport.presetTezpur, 26.6528, 92.7926)}
                  className="rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-700 transition dark:border-transparent dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  {t.fieldReport.presetTezpur} (26.6528, 92.7926)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords(t.fieldReport.presetGangtok, 27.3389, 88.6065)}
                  className="rounded border border-slate-200 bg-slate-100 hover:bg-slate-200 px-2 py-1 text-slate-700 transition dark:border-transparent dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  {t.fieldReport.presetGangtok} (27.3389, 88.6065)
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                {t.fieldReport.descriptionLabel}
              </label>

              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.fieldReport.descriptionPlaceholder}
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500/50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600"
              />
            </div>

            {/* Photo Evidence */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t.fieldReport.photoLabel}
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.fieldReport.photoAttachedText}
                </span>
              </div>

              {photo ? (
                <div className="relative rounded-xl border border-cyan-300 bg-cyan-50/50 p-4 dark:border-cyan-500/30 dark:bg-slate-950">
                  <div className="flex items-center gap-4">
                    <img
                      src={photo.webPath}
                      alt="Incident preview"
                      className="h-20 w-24 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{photo.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {photo.sizeBytes > 0
                          ? `${(photo.sizeBytes / 1024).toFixed(1)} KB`
                          : "Device Camera Image"}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400">
                        <CheckCircle2 size={11} /> {t.fieldReport.photoAttachedText}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      title={t.fieldReport.removePhotoBtn}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleCapturePhoto("camera")}
                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-cyan-400 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/5"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-transparent dark:bg-slate-800">
                      <Camera size={20} className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-300">
                      {t.fieldReport.takePhotoBtn}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.fieldReport.takePhotoSub}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCapturePhoto("photos")}
                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-cyan-400 hover:bg-cyan-50/50 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/5"
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-transparent dark:bg-slate-800">
                      <ImagePlus size={20} className="text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-800 dark:text-slate-300">
                      {t.fieldReport.photoGalleryBtn}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.fieldReport.uploadGallerySub}
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {t.fieldReport.saveDraftBtn}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                {isSubmitting ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {isSubmitting ? t.fieldReport.submittingBtn : t.fieldReport.submitReportBtn}
              </button>
            </div>
          </form>
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          {/* AI Verification Status Card */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 shadow-sm dark:border-purple-500/20 dark:bg-purple-500/5">
            <div className="border-b border-purple-200 px-5 py-4 dark:border-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-purple-200 bg-purple-100 p-2.5 text-purple-700 dark:border-transparent dark:bg-purple-500/10 dark:text-purple-400">
                  <Sparkles size={19} />
                </div>
                <div>
                  <h2 className="font-semibold text-purple-900 dark:text-white">{t.fieldReport.aiVerificationTitle}</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t.fieldReport.aiVerificationSub}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-purple-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.fieldReport.verificationPipeline}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {isSubmitting ? t.fieldReport.processingSubmission : t.fieldReport.readyForReport}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{t.fieldReport.imageEvidence}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{photo ? t.fieldReport.attachedLocal : t.fieldReport.pendingStatus}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-1.5 rounded-full bg-purple-500 transition-all duration-300 ${
                      photo ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{t.fieldReport.locationValidation}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {latitude && longitude ? t.fieldReport.nerValidated : t.fieldReport.pendingGps}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-1.5 rounded-full bg-purple-500 transition-all duration-300 ${
                      latitude && longitude ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>

              <div className="border-t border-purple-200 pt-4 dark:border-purple-500/10">
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">
                  {t.fieldReport.verificationDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Real GPS Information Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700 dark:border-transparent dark:bg-emerald-500/10 dark:text-emerald-400">
                <LocateFixed size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{t.fieldReport.gpsInfoTitle}</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.fieldReport.gpsInfoSub}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.fieldReport.gpsStatusLabel}</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {latitude && longitude ? t.fieldReport.positionAcquired : t.fieldReport.readyOnDemand}
                </span>
              </div>

              <div className="flex justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.fieldReport.accuracyLabel}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {gpsAccuracy ? `±${gpsAccuracy} m` : "—"}
                </span>
              </div>

              <div className="flex justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-transparent dark:bg-slate-950">
                <span className="text-xs text-slate-500 dark:text-slate-400">{t.fieldReport.lastUpdateLabel}</span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{gpsTimestamp || t.fieldReport.neverLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INCOMING PUBLIC REPORTS (Phase 7D Citizen Review Queue) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{t.fieldReport.publicQueueTitle}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t.fieldReport.publicQueueSub}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadPublicReports}
            disabled={loadingPublicReports}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
          >
            <RefreshCw size={13} className={loadingPublicReports ? "animate-spin" : ""} />
            <span>{t.common.refresh}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {publicReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400/80" />
              <span>{t.fieldReport.emptyPublicQueue}</span>
            </div>
          ) : (
            publicReports.map((p) => (
              <div key={p.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4 dark:hover:bg-slate-800/30">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400">
                      #{p.id}
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 uppercase tracking-wide dark:border-transparent dark:bg-slate-800 dark:text-white">
                      {p.report_type.replace(/_/g, " ")}
                    </span>
                    {p.severity_hint && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 capitalize dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300">
                        {t.publicReport.impactLevelLabel}: {p.severity_hint}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t.myReports.submittedOn}: {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    {p.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-cyan-600 dark:text-cyan-400" />
                      {p.latitude.toFixed(4)}°N, {p.longitude.toFixed(4)}°E
                    </span>
                    {p.road_name && (
                      <span className="text-slate-700 font-sans font-medium dark:text-slate-300">
                        • {t.common.corridor}: {p.road_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions: Verify & Reject */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleVerifyPublicReport(p.id)}
                    disabled={publicReportActionId === p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>{publicReportActionId === p.id ? t.fieldReport.processingBtn : t.fieldReport.verifyPublicBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRejectPublicReport(p.id)}
                    disabled={publicReportActionId === p.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition disabled:opacity-50 dark:border-red-500/40 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-300"
                  >
                    <X size={14} />
                    <span>{t.fieldReport.rejectPublicBtn}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Field Reports List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t.fieldReport.recentReportsTitle}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.fieldReport.recentReportsSubtitle}</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold text-cyan-800 dark:border-transparent dark:bg-cyan-500/10 dark:text-cyan-400">
            {reports.length} {t.fieldReport.totalReportsCount}
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              {t.fieldReport.noReportsYet}
            </div>
          ) : (
            reports.slice(0, 5).map((report, idx) => {
              const normType = report.type.toLowerCase();
              let displayType = report.type;
              if (normType.includes("landslide")) displayType = t.fieldReport.typeLandslide;
              else if (normType.includes("flood")) displayType = t.fieldReport.typeFlood;
              else if (normType.includes("block")) displayType = t.fieldReport.typeRoadBlockage;
              else if (normType.includes("damage")) displayType = t.fieldReport.typeRoadDamage;
              else if (normType.includes("weather")) displayType = t.fieldReport.typeWeatherDisruption;

              const normSev = report.severity.toLowerCase();
              let displaySev = report.severity;
              if (normSev === "critical") displaySev = t.fieldReport.sevCritical;
              else if (normSev === "high") displaySev = t.fieldReport.sevHigh;
              else if (normSev === "medium") displaySev = t.fieldReport.sevMedium;
              else if (normSev === "low") displaySev = t.fieldReport.sevLow;

              const isVerified = report.status === "Verified";
              const isDraft = report.status === "DRAFT" || report.status === "Local Draft";
              const displayStatus = isVerified
                ? t.fieldReport.statusVerified
                : isDraft
                ? t.fieldReport.statusDraft
                : t.fieldReport.statusPendingSync;

              return (
                <div
                  key={`${report.id}-${idx}`}
                  className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 dark:hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-cyan-700 dark:border-transparent dark:bg-slate-800 dark:text-cyan-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{displayType}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(
                            report.severity
                          )}`}
                        >
                          {displaySev}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <MapPin size={13} />
                          {report.location}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{report.id}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{report.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`flex items-center gap-1.5 text-[11px] font-semibold ${
                        isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <ShieldCheck size={14} />
                      )}
                      {displayStatus}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default FieldReport;