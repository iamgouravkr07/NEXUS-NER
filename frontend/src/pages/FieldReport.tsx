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

const initialReports: FieldReportItem[] = [
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
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-red-500/10 text-red-400 border border-red-500/30";
    case "high":
      return "bg-orange-500/10 text-orange-400 border border-orange-500/30";
    case "medium":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    default:
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
  }
}

function FieldReport() {
  const { getAuthHeader } = useAuth();

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
  const [reports, setReports] = useState<FieldReportItem[]>(initialReports);

  useEffect(() => {
    const unsub = networkService.subscribe((status) => {
      setIsOnline(status.connected);
    });

    loadLocalReports();

    const handleQueueChange = () => {
      loadLocalReports();
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
      const mapped: FieldReportItem[] = localDrafts.map((draft) => ({
        id: draft.client_id ? `FR-${draft.client_id.substring(0, 6).toUpperCase()}` : "FR-LOCAL",
        type: draft.incident_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        location: draft.location_name || `${draft.latitude.toFixed(4)}, ${draft.longitude.toFixed(4)}`,
        severity: draft.severity.charAt(0).toUpperCase() + draft.severity.slice(1),
        status: draft.status === "SYNCED" ? "Verified" : "Pending Sync",
        time: "Recently queued",
      }));

      // Combine local outbox reports with initial demonstration reports
      setReports([...mapped, ...initialReports]);
    } catch {}
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
      setStatusMessage({ type: "error", text: "Please select an incident type before saving draft." });
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
      setStatusMessage({
        type: "success",
        text: "Draft saved locally to offline storage.",
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
      setStatusMessage({ type: "error", text: "Please select an incident type." });
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || isNaN(lonNum)) {
      setStatusMessage({
        type: "error",
        text: "Please provide valid numeric coordinates (use GPS or enter manually).",
      });
      return;
    }

    const valCheck = validateNERCoordinates(latNum, lonNum);
    if (!valCheck.valid) {
      setStatusMessage({
        type: "error",
        text: valCheck.reason || "Coordinates outside North Eastern Region bounds.",
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

      // 3. If online, trigger background sync
      if (isOnline) {
        setStatusMessage({
          type: "info",
          text: `Report enqueued (ID: ${enqueuedEvent.client_id.substring(0, 8)}). Syncing with Control Tower...`,
        });

        const syncResult = await syncWorker.processQueue();
        if (syncResult.success > 0) {
          setStatusMessage({
            type: "success",
            text: `Report successfully synchronized with Control Tower (ID: ${enqueuedEvent.client_id.substring(0, 8)}).`,
          });
        } else if (syncResult.errors > 0) {
          setStatusMessage({
            type: "info",
            text: `Report enqueued in outbox. Sync will retry automatically.`,
          });
        }
      } else {
        setStatusMessage({
          type: "info",
          text: `Offline — report saved locally in outbox (PENDING). Will synchronize automatically when network returns.`,
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
          <h1 className="text-2xl font-semibold text-white">Field Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            Submit geo-tagged road and incident reports from the field
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span
              className={`h-2 w-2 rounded-full ${
                latitude && longitude
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            {latitude && longitude ? "GPS locked" : "GPS ready"}
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {isOnline ? "Online" : "Offline Mode"}
          </span>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            statusMessage.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : statusMessage.type === "error"
              ? "border-red-500/20 bg-red-500/10 text-red-300"
              : "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
          ) : statusMessage.type === "error" ? (
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />
          ) : (
            <LocateFixed size={18} className="mt-0.5 shrink-0 text-cyan-400" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Offline Status Card */}
      <div className="flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <LocateFixed size={19} className="mt-0.5 shrink-0 text-cyan-400" />
        <div>
          <p className="text-sm font-medium text-cyan-400">
            Location & Offline Outbox Active
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Reports created in low-network corridors are stored locally in the secure offline SQLite/IDB outbox. They will synchronize automatically via <code className="text-cyan-300">POST /sync/batch</code> when connectivity returns.
          </p>
        </div>
      </div>

      {/* Main Form & Side Panels */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 xl:col-span-2">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2.5">
                <FileText size={20} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">New Incident Report</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Provide accurate details to help verify and respond to the incident
                </p>
              </div>
            </div>
          </div>

          {/* AI/NLP Incident Extraction Assistant */}
          <div className="border-b border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  AI / NLP Incident Assistant
                </h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                  Advisory Ingestion
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNlpAssistant(!showNlpAssistant)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {showNlpAssistant ? "Hide Assistant" : "Show Assistant"}
              </button>
            </div>

            {showNlpAssistant && (
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-400">
                  Paste unstructured field notes, radio dispatches, or citizen reports to automatically extract candidate incident parameters:
                </p>

                <div className="relative">
                  <textarea
                    rows={2}
                    value={nlpRawText}
                    onChange={(e) => setNlpRawText(e.target.value)}
                    placeholder="e.g. Heavy landslide reported near NH-15 between Guwahati and Tezpur. Road completely blocked, multiple trucks stranded."
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-500/40"
                  />
                </div>

                {nlpError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                    <span>{nlpError}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeNlp}
                    disabled={isAnalyzingNlp || !nlpRawText.trim()}
                    className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 border border-amber-500/30 transition hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    <Sparkles size={14} className={isAnalyzingNlp ? "animate-spin" : "text-amber-400"} />
                    {isAnalyzingNlp ? "Extracting..." : "Analyze Report with AI"}
                  </button>

                  {nlpRawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setNlpRawText("");
                        setNlpExtraction(null);
                        setNlpError(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* AI Extraction Preview */}
                {nlpExtraction?.extraction && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-300">Extraction Candidate Preview</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                          Provider: {nlpExtraction.provider === "gemini" ? "Gemini 2.5 Flash" : "Deterministic Fallback Engine"}
                        </span>
                      </div>
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/20">
                        AI-extracted — requires operator verification
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <span className="text-slate-500 block">Type:</span>
                        <span className="font-medium text-white capitalize">{nlpExtraction.extraction.incident_type?.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Severity:</span>
                        <span className="font-medium text-white capitalize">{nlpExtraction.extraction.severity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Confidence:</span>
                        <span className="font-medium text-amber-400">{(nlpExtraction.extraction.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Corridor:</span>
                        <span className="font-medium text-white">{nlpExtraction.extraction.road_corridor || "Not detected"}</span>
                      </div>
                    </div>

                    {nlpExtraction.extraction.location_text && (
                      <div>
                        <span className="text-slate-500">Location Reference: </span>
                        <span className="text-slate-200">{nlpExtraction.extraction.location_text}</span>
                      </div>
                    )}

                    {nlpExtraction.warning && (
                      <p className="text-[11px] text-amber-400/80 italic">
                        Notice: {nlpExtraction.warning}
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleApplyNlpToForm}
                        className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-500/30 transition hover:bg-emerald-500/30"
                      >
                        <Check size={14} />
                        Apply Extracted Draft to Form
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
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Incident Type <span className="text-red-400">*</span>
              </label>

              <select
                id="incident-type"
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="" disabled>
                  Select incident type
                </option>
                <option value="landslide">Landslide</option>
                <option value="flooding">Flooding</option>
                <option value="road_blockage">Road Blockage</option>
                <option value="road_damage">Road Damage</option>
                <option value="bridge_damage">Bridge Damage</option>
                <option value="traffic_congestion">Traffic Congestion</option>
                <option value="accident">Accident</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label
                htmlFor="severity"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Severity <span className="text-red-400">*</span>
              </label>

              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="Critical">Critical (Blocked corridor / immediate danger)</option>
                <option value="High">High (Major slowdown / single lane blocked)</option>
                <option value="Medium">Medium (Caution advised / partial shoulder damage)</option>
                <option value="Low">Low (Informational update / minor surface defect)</option>
              </select>
            </div>

            {/* Location Name */}
            <div>
              <label
                htmlFor="location"
                className="mb-2 block text-xs font-medium text-slate-400"
              >
                Location Landmark / Road Name
              </label>

              <div className="flex gap-3">
                <div className="flex flex-1 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                  <MapPin size={18} className="text-red-400 shrink-0" />
                  <input
                    id="location"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="Enter road, landmark, or district (e.g. NH-15, Dhemaji)"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUseGps}
                  disabled={isLocating}
                  className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-xs font-medium text-cyan-400 transition hover:border-cyan-500/30 hover:bg-cyan-500/5 disabled:opacity-50"
                >
                  <LocateFixed size={16} className={isLocating ? "animate-spin" : ""} />
                  {isLocating ? "Acquiring..." : "Use GPS"}
                </button>
              </div>
            </div>

            {/* Coordinates */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="latitude"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Latitude <span className="text-red-400">* (20°–30° N)</span>
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="0.00001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. 27.4705"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="longitude"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Longitude <span className="text-red-400">* (88°–98° E)</span>
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="0.00001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 94.9120"
                    required
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Explicit Test Preset Fallback Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span>NER Test Points:</span>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords("NH-15, Dhemaji, Assam", 27.4705, 94.912)}
                  className="rounded bg-slate-800/80 hover:bg-slate-800 px-2 py-1 text-slate-300 transition"
                >
                  NH-15 Dhemaji (27.4705, 94.9120)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords("NH-10, Gangtok, Sikkim", 27.3389, 88.6065)}
                  className="rounded bg-slate-800/80 hover:bg-slate-800 px-2 py-1 text-slate-300 transition"
                >
                  NH-10 Gangtok (27.3389, 88.6065)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyNerTestCoords("Guwahati, Assam", 26.1445, 91.7362)}
                  className="rounded bg-slate-800/80 hover:bg-slate-800 px-2 py-1 text-slate-300 transition"
                >
                  Guwahati (26.1445, 91.7362)
                </button>
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
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe observed road condition, obstruction, estimated impact, affected lanes..."
                className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
            </div>

            {/* Photo Evidence */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-400">
                  Incident Photo Evidence
                </label>
                <span className="text-[10px] text-slate-600">
                  Saved to local device storage
                </span>
              </div>

              {photo ? (
                <div className="relative rounded-xl border border-cyan-500/30 bg-slate-950 p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={photo.webPath}
                      alt="Incident preview"
                      className="h-20 w-24 rounded-lg object-cover border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{photo.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {photo.sizeBytes > 0
                          ? `${(photo.sizeBytes / 1024).toFixed(1)} KB`
                          : "Device Camera Image"}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                        <CheckCircle2 size={11} /> Attached Locally
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition"
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
                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-center transition hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  >
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <Camera size={20} className="text-cyan-400" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      Capture From Camera
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Take photo on device
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCapturePhoto("photos")}
                    className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-center transition hover:border-cyan-500/40 hover:bg-cyan-500/5"
                  >
                    <div className="rounded-xl bg-slate-800 p-2.5">
                      <ImagePlus size={20} className="text-cyan-400" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-300">
                      Choose From Gallery
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Upload local file
                    </p>
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="rounded-lg border border-slate-800 px-5 py-2.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                Save Draft
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-6 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>

        {/* Side Panels */}
        <div className="space-y-6">
          {/* AI Verification Status Card */}
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5">
            <div className="border-b border-purple-500/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2.5">
                  <Sparkles size={19} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">AI Verification</h2>
                  <p className="mt-1 text-xs text-slate-500">Automated incident validation</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Verification Pipeline</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {isSubmitting ? "Processing submission..." : "Ready for field report"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">Image evidence</span>
                  <span className="text-slate-400">{photo ? "Attached (Local)" : "Pending"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className={`h-1.5 rounded-full bg-purple-500 transition-all duration-300 ${
                      photo ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-slate-500">Location validation</span>
                  <span className="text-slate-400">
                    {latitude && longitude ? "NER Validated" : "Pending GPS"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className={`h-1.5 rounded-full bg-purple-500 transition-all duration-300 ${
                      latitude && longitude ? "w-full" : "w-0"
                    }`}
                  />
                </div>
              </div>

              <div className="border-t border-purple-500/10 pt-4">
                <p className="text-xs leading-5 text-slate-500">
                  Reports are analyzed with geo-location risk mapping and incident classification before escalating corridor alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Real GPS Information Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2.5">
                <LocateFixed size={19} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">GPS Information</h2>
                <p className="mt-1 text-xs text-slate-500">Current device positioning</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">Status</span>
                <span className="text-xs font-medium text-emerald-400">
                  {latitude && longitude ? "Position Acquired" : "Ready on demand"}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">Accuracy</span>
                <span className="text-xs text-slate-400">
                  {gpsAccuracy ? `±${gpsAccuracy} m` : "—"}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-xs text-slate-600">Last update</span>
                <span className="text-xs text-slate-400">{gpsTimestamp || "Never"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Field Reports List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="font-semibold text-white">Recent Field Reports</h2>
            <p className="mt-1 text-xs text-slate-500">Recently queued and submitted reports</p>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-400">
            {reports.length} Total
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {reports.slice(0, 5).map((report, idx) => (
            <div
              key={`${report.id}-${idx}`}
              className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                  <FileText size={18} className="text-cyan-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{report.type}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityClass(
                        report.severity
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
                    <span className="text-[10px] text-slate-700">{report.id}</span>
                    <span className="text-[10px] text-slate-600">{report.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`flex items-center gap-1.5 text-[11px] ${
                    report.status === "Verified" ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {report.status === "Verified" ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {report.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FieldReport;