import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  LocateFixed,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { geolocationService } from "../services/geolocation";
import { cameraService } from "../services/camera";
import type { PhotoEvidence } from "../services/camera";
import { getStorage } from "../offline/database";
import type { IncidentQueueRecord } from "../offline/database";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
const PUBLIC_DRAFT_KEY = "public_report_draft";

function dataUrlToFile(dataUrl: string, fileName: string, mimeType: string): File {
  const parts = dataUrl.split(",");
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mimeType });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const { t, formatString } = useLanguage();
  const { getAuthHeader } = useAuth();

  const [reportType, setReportType] = useState("LANDSLIDE");
  const [severityHint, setSeverityHint] = useState("high");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("26.1445");
  const [longitude, setLongitude] = useState("91.7362");
  const [roadId, setRoadId] = useState<number | "">("");
  const [photo, setPhoto] = useState<PhotoEvidence | null>(null);

  const photoDataUrlRef = useRef<string | null>(null);
  const isRestoringRef = useRef<boolean>(true);

  const [roads, setRoads] = useState<Road[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  const saveDraft = useCallback(
    async (
      typeVal: string,
      sevVal: string,
      descVal: string,
      latVal: string,
      lonVal: string,
      roadVal: number | "",
      photoVal: PhotoEvidence | null,
      dataUrlVal: string | null
    ) => {
      if (isRestoringRef.current) return;
      const hasContent =
        descVal.trim().length > 0 ||
        photoVal !== null ||
        roadVal !== "" ||
        latVal !== "26.1445" ||
        lonVal !== "91.7362";

      try {
        const storage = getStorage();
        await storage.init();

        if (!hasContent) {
          const existing = await storage.getIncidentDraft(PUBLIC_DRAFT_KEY);
          if (existing && existing.status === "DRAFT") {
            await storage.insertIncidentDraft({
              ...existing,
              description: "",
              local_photo_path: null,
              photo_metadata: null,
              status: "CLEARED",
            });
          }
          return;
        }

        const metaObj: Record<string, any> = {
          road_id: roadVal !== "" ? roadVal : null,
        };
        if (photoVal) {
          metaObj.id = photoVal.id;
          metaObj.name = photoVal.name;
          metaObj.sizeBytes = photoVal.sizeBytes;
          metaObj.mimeType = photoVal.mimeType;
          metaObj.timestamp = photoVal.timestamp;
          if (dataUrlVal) {
            metaObj.dataUrl = dataUrlVal;
          }
        }

        const draftRecord: IncidentQueueRecord = {
          client_id: PUBLIC_DRAFT_KEY,
          incident_type: typeVal.toLowerCase(),
          severity: sevVal.toLowerCase(),
          description: descVal,
          latitude: parseFloat(latVal) || 26.1445,
          longitude: parseFloat(lonVal) || 91.7362,
          location_name: roadVal !== "" ? `Road #${roadVal}` : null,
          local_photo_path: photoVal?.localUri || (photoVal ? `local_blob://${photoVal.name}` : null),
          photo_metadata: JSON.stringify(metaObj),
          status: "DRAFT",
          created_at: new Date().toISOString(),
        };

        await storage.insertIncidentDraft(draftRecord);
      } catch (err) {
        console.warn("Could not save public report draft:", err);
      }
    },
    []
  );

  // Restore draft on mount
  useEffect(() => {
    async function restoreDraft() {
      try {
        const storage = getStorage();
        await storage.init();

        // 1. Check dedicated public report draft first
        let draft = await storage.getIncidentDraft(PUBLIC_DRAFT_KEY);

        // 2. If not found or inactive, look for any draft in incident_queue with status === 'DRAFT'
        if (!draft || draft.status !== "DRAFT") {
          const drafts = await storage.getIncidentDrafts();
          const candidate =
            drafts.find((d) => d.client_id === PUBLIC_DRAFT_KEY && d.status === "DRAFT") ||
            drafts.find((d) => d.status === "DRAFT");
          if (candidate && candidate.status === "DRAFT") {
            draft = candidate;
          }
        }

        if (draft && draft.status === "DRAFT") {
          if (draft.description) {
            setDescription(draft.description);
          }
          if (draft.incident_type) {
            let normalized = draft.incident_type.toUpperCase().replace(/\s+/g, "_");
            if (normalized === "FLOODING") normalized = "FLOOD";
            if (REPORT_TYPES.some((r) => r.value === normalized)) {
              setReportType(normalized);
            }
          }
          if (draft.severity) {
            const sev = draft.severity.toLowerCase();
            if (SEVERITY_LEVELS.some((s) => s.value === sev)) {
              setSeverityHint(sev);
            }
          }
          if (typeof draft.latitude === "number" && !isNaN(draft.latitude)) {
            setLatitude(draft.latitude.toString());
          }
          if (typeof draft.longitude === "number" && !isNaN(draft.longitude)) {
            setLongitude(draft.longitude.toString());
          }

          let meta: any = null;
          if (draft.photo_metadata) {
            try {
              meta = JSON.parse(draft.photo_metadata);
            } catch {
              meta = null;
            }
          }

          if (meta?.road_id) {
            setRoadId(Number(meta.road_id));
          } else if (draft.location_name && draft.location_name.startsWith("Road #")) {
            const parsed = parseInt(draft.location_name.replace("Road #", ""), 10);
            if (!isNaN(parsed)) setRoadId(parsed);
          }

          if (meta?.dataUrl || draft.local_photo_path) {
            const fileName = meta?.name || "evidence.jpg";
            const mimeType = meta?.mimeType || "image/jpeg";
            let fileObj: File | undefined;
            let previewUrl = draft.local_photo_path || "";

            if (meta?.dataUrl) {
              try {
                fileObj = dataUrlToFile(meta.dataUrl, fileName, mimeType);
                previewUrl = meta.dataUrl;
                photoDataUrlRef.current = meta.dataUrl;
              } catch {
                // Ignore
              }
            } else if (previewUrl.startsWith("data:")) {
              try {
                fileObj = dataUrlToFile(previewUrl, fileName, mimeType);
                photoDataUrlRef.current = previewUrl;
              } catch {
                // Ignore
              }
            }

            setPhoto({
              id: meta?.id || `restored_${Date.now()}`,
              name: fileName,
              webPath: previewUrl,
              localUri: draft.local_photo_path || `local_blob://${fileName}`,
              sizeBytes: meta?.sizeBytes || meta?.size || (fileObj ? fileObj.size : 0),
              mimeType: mimeType,
              timestamp: meta?.timestamp || Date.now(),
              file: fileObj,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to restore public report draft:", err);
      } finally {
        isRestoringRef.current = false;
      }
    }

    restoreDraft();
  }, []);

  // Debounced auto-save when form fields or photo change
  useEffect(() => {
    if (isRestoringRef.current) return;
    const timer = setTimeout(() => {
      saveDraft(
        reportType,
        severityHint,
        description,
        latitude,
        longitude,
        roadId,
        photo,
        photoDataUrlRef.current
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [reportType, severityHint, description, latitude, longitude, roadId, photo, saveDraft]);

  const handleCapturePhoto = async (sourceType: "camera" | "photos") => {
    try {
      const evidence = await cameraService.capturePhoto(sourceType);
      let dataUrl: string | null = null;
      if (evidence.file) {
        try {
          dataUrl = await fileToDataUrl(evidence.file);
        } catch {
          dataUrl = null;
        }
      } else if (evidence.webPath && evidence.webPath.startsWith("data:")) {
        dataUrl = evidence.webPath;
      }
      photoDataUrlRef.current = dataUrl;
      setPhoto(evidence);
      saveDraft(
        reportType,
        severityHint,
        description,
        latitude,
        longitude,
        roadId,
        evidence,
        dataUrl
      );
    } catch (err: any) {
      if (!err?.message?.includes("cancelled")) {
        setErrorMessage(err?.message || "Failed to capture photo.");
      }
    }
  };

  const handleRemovePhoto = () => {
    photoDataUrlRef.current = null;
    setPhoto(null);
    saveDraft(
      reportType,
      severityHint,
      description,
      latitude,
      longitude,
      roadId,
      null,
      null
    );
  };

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
      let res: Response;
      if (photo) {
        const formData = new FormData();
        formData.append("latitude", lat.toString());
        formData.append("longitude", lon.toString());
        formData.append("report_type", reportType);
        formData.append("description", description.trim());
        formData.append("severity_hint", severityHint);
        if (roadId !== "") {
          formData.append("road_id", roadId.toString());
        }
        if (photo.file) {
          formData.append("photo", photo.file, photo.name || "report_photo.jpg");
        } else if (photo.webPath) {
          try {
            const blobRes = await fetch(photo.webPath);
            const blob = await blobRes.blob();
            formData.append("photo", blob, photo.name || "report_photo.jpg");
          } catch {
            // fallback if blob fetch fails
          }
        }

        res = await fetch(`${API_URL}/public-reports/`, {
          method: "POST",
          headers: getAuthHeader(),
          body: formData,
        });
      } else {
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

        res = await fetch(`${API_URL}/public-reports/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setSubmittedReport(data);

      try {
        const storage = getStorage();
        await storage.init();
        const existing = await storage.getIncidentDraft(PUBLIC_DRAFT_KEY);
        if (existing) {
          await storage.insertIncidentDraft({
            ...existing,
            status: "SUBMITTED",
            description: "",
            local_photo_path: null,
            photo_metadata: null,
          });
        }
      } catch {
        // ignore
      }
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
                {t.publicReport.successTitle}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {t.publicReport.refLabel}: <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">#{submittedReport.id}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle size={16} />
              <span>{t.publicReport.reviewNoticeTitle}</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
              {t.publicReport.reviewNoticeDesc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t.publicReport.categoryLabel}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submittedReport.report_type.replace(/_/g, " ")}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t.publicReport.severityLabel}</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 capitalize">{submittedReport.severity_hint || "High"}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 block">{t.publicReport.coordsLabel}</span>
              <span className="font-mono text-cyan-700 dark:text-cyan-300 font-medium">
                {submittedReport.latitude.toFixed(4)}°N, {submittedReport.longitude.toFixed(4)}°E
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 block">{t.incidents.descLabel}</span>
              <span className="text-slate-700 dark:text-slate-300">{submittedReport.description}</span>
            </div>
            {submittedReport.photo_url && (
              <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 block mb-1.5">{t.fieldReport.photoLabel}</span>
                <a
                  href={submittedReport.photo_url.startsWith("http") ? submittedReport.photo_url : `${API_URL}${submittedReport.photo_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block"
                >
                  <img
                    src={submittedReport.photo_url.startsWith("http") ? submittedReport.photo_url : `${API_URL}${submittedReport.photo_url}`}
                    alt="Report evidence"
                    className="h-28 w-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:opacity-90 transition"
                  />
                </a>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/my-reports"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition"
            >
              <FileText size={16} />
              <span>{t.publicReport.viewMyReportsBtn}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                setDescription("");
                setPhoto(null);
                photoDataUrlRef.current = null;
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 transition"
            >
              <span>{t.publicReport.submitAnotherBtn}</span>
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
          <span>{t.publicReport.portalBadge}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{t.publicReport.portalTitle}</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t.publicReport.portalSubtitle}
        </p>
      </div>

      {/* Review Notice */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200/90 leading-relaxed">
          <strong className="text-slate-900 dark:text-white block mb-0.5">{t.publicReport.guardrailTitle}</strong>
          {t.publicReport.guardrailDesc}
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
            {t.publicReport.hazardCategoryLabel} <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          >
            {REPORT_TYPES.map((typeItem) => (
              <option key={typeItem.value} value={typeItem.value}>
                {typeItem.label}
              </option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            {t.publicReport.impactLevelLabel} <span className="text-red-500 dark:text-red-400">*</span>
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
            {t.publicReport.corridorOptionalLabel}
          </label>
          <select
            value={roadId}
            onChange={(e) => setRoadId(e.target.value ? Number(e.target.value) : "")}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="">{t.publicReport.corridorOptionalPlaceholder}</option>
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
              {t.publicReport.locationLabel} <span className="text-red-500 dark:text-red-400">*</span>
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
              <span>{isLocating ? t.publicReport.acquiringGps : t.publicReport.useGpsBtn}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">{t.publicReport.latLabel}</span>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="26.1445"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 block">{t.publicReport.lonLabel}</span>
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
              {formatString(t.publicReport.gpsAccuracy, { accuracy: gpsAccuracy })}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t.publicReport.descriptionLabel} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatString(t.publicReport.charCount, { count: description.length })}
            </span>
          </div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.publicReport.descriptionPlaceholder}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none resize-none leading-relaxed placeholder:text-slate-400"
          />
        </div>

        {/* Photo Evidence (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t.fieldReport.photoLabel}
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {photo ? t.fieldReport.photoAttachedText : ""}
            </span>
          </div>

          {photo ? (
            <div className="relative rounded-xl border border-cyan-300 bg-cyan-50/50 p-3.5 dark:border-cyan-500/30 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <img
                  src={photo.webPath}
                  alt="Incident preview"
                  className="h-16 w-20 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{photo.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {photo.sizeBytes > 0 ? `${(photo.sizeBytes / 1024).toFixed(1)} KB` : "Device Photo"}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 rounded bg-cyan-100 dark:bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-800 dark:text-cyan-400">
                    <CheckCircle2 size={11} /> {t.fieldReport.photoAttachedText}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  title={t.fieldReport.removePhotoBtn}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCapturePhoto("camera")}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3.5 text-center transition hover:border-cyan-500 hover:bg-cyan-50/40 dark:hover:border-cyan-500/50"
              >
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-cyan-600 dark:text-cyan-400 mb-1.5 shadow-sm">
                  <Camera size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t.fieldReport.takePhotoBtn}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.fieldReport.takePhotoSub}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCapturePhoto("photos")}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 p-3.5 text-center transition hover:border-cyan-500 hover:bg-cyan-50/40 dark:hover:border-cyan-500/50"
              >
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-cyan-600 dark:text-cyan-400 mb-1.5 shadow-sm">
                  <ImagePlus size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {t.fieldReport.photoGalleryBtn}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t.fieldReport.uploadGallerySub}
                </span>
              </button>
            </div>
          )}
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
          <span>{isSubmitting ? t.publicReport.submittingBtn : t.publicReport.submitBtn}</span>
        </button>
      </form>
    </div>
  );
}
