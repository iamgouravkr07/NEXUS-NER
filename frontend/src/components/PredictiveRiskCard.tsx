import React, { useState } from "react";
import {
  BrainCircuit,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { PredictiveRiskResult } from "../types/ml";
import {
  formatPredictiveSignalLabel,
  getPredictiveSignalBadgeStyle,
} from "../types/ml";
import { ShapExplanationPanel } from "./ShapExplanationPanel";
import { ModelInfoModal } from "./ModelInfoModal";

interface PredictiveRiskCardProps {
  result?: PredictiveRiskResult | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  roadName?: string;
  compact?: boolean;
}

export const PredictiveRiskCard: React.FC<PredictiveRiskCardProps> = ({
  result,
  loading = false,
  error = null,
  onRefresh,
  roadName = "Monitored Corridor",
  compact = false,
}) => {
  const [showShapModal, setShowShapModal] = useState(false);
  const [showModelInfoModal, setShowModelInfoModal] = useState(false);

  // Extract signals
  const mlSignal = result?.ml_prediction;
  const isAvailable = mlSignal?.available === true;
  const probability = mlSignal?.disruption_probability ?? mlSignal?.probability ?? null;
  const threshold = mlSignal?.threshold ?? 0.55;
  const isDisrupted = probability != null && probability >= threshold;

  const detScore = result?.deterministic_risk_score ?? null;
  const detLevel = result?.deterministic_risk_level ?? "Normal";

  const combined = result?.combined_assessment;
  const signalStyle = getPredictiveSignalBadgeStyle(combined?.predictive_signal);

  // Top contributors preview (up to 3)
  const topContributors = [
    ...(mlSignal?.top_positive_contributors || []),
    ...(mlSignal?.top_negative_contributors || []),
  ].slice(0, 3);

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg backdrop-blur space-y-4">
        {/* Card Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-400">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                  Predictive Disruption Risk
                </h3>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                  Advisory Signal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {roadName} &bull; Next 6-Hour Forecast Horizon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowModelInfoModal(true)}
              aria-label="View model and dataset information"
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Info size={13} className="text-cyan-400" />
              <span>Model Info</span>
            </button>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                aria-label="Refresh risk prediction"
                className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-purple-400" : ""} />
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400 space-x-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span>Evaluating corridor disruption probability with TreeSHAP...</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-semibold">
              <AlertTriangle size={15} />
              <span>Predictive Risk Service Unavailable</span>
            </div>
            <p className="text-slate-300 text-[11px]">{error}</p>
            <p className="text-slate-400 text-[11px]">
              Deterministic operational risk continues normally.
            </p>
          </div>
        )}

        {/* Normal Loaded Content */}
        {!loading && !error && (
          <>
            {/* Deterministic vs ML Two-Column Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Column 1: Authoritative Deterministic Risk */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Operational Risk (Deterministic)
                  </span>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                    Authoritative
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">
                    {detScore != null ? detScore.toFixed(0) : "—"}
                  </span>
                  <span className="text-xs text-slate-500">/ 100</span>
                  <span className="ml-auto text-xs font-semibold capitalize text-slate-300">
                    {detLevel}
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (detScore ?? 0) >= 65
                        ? "bg-red-500"
                        : (detScore ?? 0) >= 40
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, detScore ?? 0))}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  Ground truth based on physical incidents, road closure status, and real-time weather alerts.
                </p>
              </div>

              {/* Column 2: ML Disruption Prediction */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">
                    ML Disruption Likelihood
                  </span>
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300 font-mono">
                    Threshold: 55%
                  </span>
                </div>

                {isAvailable && probability != null ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-2xl font-bold ${
                          isDisrupted ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {(probability * 100).toFixed(1)}%
                      </span>
                      <span className="ml-auto text-xs font-semibold">
                        {isDisrupted ? (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertTriangle size={13} />
                            Disruption Likely
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={13} />
                            Disruption Unlikely
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDisrupted ? "bg-red-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, probability * 100)}%` }}
                      />
                      {/* Threshold marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                        style={{ left: "55%" }}
                        title="Operational Decision Threshold (55%)"
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 leading-tight">
                      Supervised Random Forest v1.0 probabilistic estimation for the next 6-hour window.
                    </p>
                  </>
                ) : (
                  /* Safe Degradation / Unavailable State */
                  <div className="py-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <AlertCircle size={15} />
                      <span>Prediction Unavailable</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      {mlSignal?.reason ||
                        "Corridor weather/terrain features incomplete at observation time."}
                    </p>
                    <p className="text-[10px] text-slate-500 italic">
                      Deterministic operational risk remains fully operational.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Combined Operational Assessment Banner */}
            {combined && (
              <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${signalStyle.badge}`}>
                <span className={`mt-0.5 h-2.5 w-2.5 rounded-full shrink-0 ${signalStyle.dot}`} />
                <div className="text-xs space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      Combined Assessment:
                    </span>
                    <span className={`font-medium ${signalStyle.text}`}>
                      {formatPredictiveSignalLabel(combined.predictive_signal)}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {combined.advisory}
                  </p>
                </div>
              </div>
            )}

            {/* Top SHAP Contributors Preview (if available) */}
            {isAvailable && topContributors.length > 0 && !compact && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BrainCircuit size={13} className="text-purple-400" />
                    Key Model Feature Attributions (TreeSHAP)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShapModal(true)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition"
                  >
                    <span>Why is the model predicting this?</span>
                    <ExternalLink size={11} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {topContributors.map((c, i) => {
                    const isPos = c.shap_value > 0;
                    return (
                      <div
                        key={c.feature || i}
                        className={`rounded-lg border p-2.5 text-xs ${
                          isPos
                            ? "border-red-500/20 bg-red-500/[0.04]"
                            : "border-emerald-500/20 bg-emerald-500/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="truncate font-medium text-slate-200">
                            {c.display_name}
                          </span>
                          <span
                            className={`font-mono font-semibold ml-1 shrink-0 ${
                              isPos ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {isPos ? "+" : ""}
                            {(c.shap_value * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                          {isPos ? (
                            <TrendingUp size={11} className="text-red-400 shrink-0" />
                          ) : (
                            <TrendingDown size={11} className="text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {c.raw_value != null ? `${c.raw_value} ${c.unit}` : c.feature}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SHAP Explanation Modal */}
      <ShapExplanationPanel
        isOpen={showShapModal}
        onClose={() => setShowShapModal(false)}
        predictionSignal={mlSignal}
        roadName={roadName}
      />

      {/* Model Info Modal */}
      <ModelInfoModal
        isOpen={showModelInfoModal}
        onClose={() => setShowModelInfoModal(false)}
      />
    </>
  );
};
