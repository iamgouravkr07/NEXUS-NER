import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrainCircuit, X, Database, ShieldAlert, CheckCircle2 } from "lucide-react";
import { mlClient } from "../api/mlClient";
import type { ModelMetadataResponse } from "../types/ml";
import { useLanguage } from "../context/LanguageContext";

interface ModelInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata?: ModelMetadataResponse | null;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({
  isOpen,
  onClose,
  metadata: initialMetadata,
}) => {
  const { t } = useLanguage();
  const [metadata, setMetadata] = useState<ModelMetadataResponse | null>(
    initialMetadata || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !metadata) {
      setLoading(true);
      setError(null);
      mlClient
        .getModelInfo()
        .then((data) => setMetadata(data))
        .catch((err) => setError(err.message || "Failed to load model metadata"))
        .finally(() => setLoading(false));
    }
  }, [isOpen, metadata]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="model-info-title"
      style={{ zIndex: 99999 }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-600 dark:text-purple-400">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h3 id="model-info-title" className="text-base font-semibold text-slate-900 dark:text-white">
                {t.modelInfo.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.modelInfo.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500 dark:text-slate-400">
              <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              Loading model specifications...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          {metadata && (
            <>
              {/* Architecture grid */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Primary Model
                  </span>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {metadata.primary_model || "Random Forest"}
                  </p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400">v{metadata.model_version}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Baseline Model
                  </span>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {metadata.baseline_model || "Logistic Regression"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Benchmarked</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Forecast Horizon
                  </span>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    Next {metadata.prediction_horizon_hours || 6} Hours
                  </p>
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400">Operational Window</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Decision Threshold
                  </span>
                  <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                    {metadata.operational_thresholds?.disruption
                      ? `${Math.round(metadata.operational_thresholds.disruption * 100)}%`
                      : "55%"}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Calibrated (PR-AUC)</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Explainability
                  </span>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">TreeSHAP</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Probability-space</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/70">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-500">
                    Feature Dimensions
                  </span>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">19 Raw / 24 Encoded</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Zero Target Leakage</p>
                </div>
              </div>

              {/* Data Provenance Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <Database size={15} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Dataset Provenance & Formulation</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 sm:grid-cols-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Dataset Tag</span>
                    <span className="font-mono text-slate-800 dark:text-slate-300">{metadata.provenance}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Synthetic Generation</span>
                    <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
                      {metadata.is_synthetic ? "True (Prototype)" : "False"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Target Column</span>
                    <span className="font-mono text-slate-800 dark:text-slate-300">{metadata.target_variable}</span>
                  </div>
                </div>
              </div>

              {/* SIH Transparency & Data Honesty Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-amber-800 dark:text-amber-300">
                      {t.modelInfo.sihDeclarationTitle}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {metadata.data_honesty_notice ||
                        t.modelInfo.sihDeclarationDesc}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
                      Deterministic operational risk remains the authoritative basis for road status and routing decisions.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            Random Forest Artifact Verified & Frozen
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
