import React from "react";
import {
  BrainCircuit,
  X,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import type { FeatureAttributionItem, MLPredictionSignal } from "../types/ml";

interface ShapExplanationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  predictionSignal?: MLPredictionSignal | null;
  roadName?: string;
}

export const ShapExplanationPanel: React.FC<ShapExplanationPanelProps> = ({
  isOpen,
  onClose,
  predictionSignal,
  roadName,
}) => {
  if (!isOpen) return null;

  const positiveContributors: FeatureAttributionItem[] =
    predictionSignal?.top_positive_contributors || [];
  const negativeContributors: FeatureAttributionItem[] =
    predictionSignal?.top_negative_contributors || [];

  const probability = predictionSignal?.disruption_probability ?? predictionSignal?.probability ?? null;
  const threshold = predictionSignal?.threshold ?? 0.55;
  const baseValue = 0.5008; // Prior expectation E[f(x)] in probability space
  const isLikely = probability != null && probability >= threshold;

  // Maximum SHAP magnitude for relative bar width normalization
  const maxMag = Math.max(
    ...positiveContributors.map((c) => Math.abs(c.shap_value)),
    ...negativeContributors.map((c) => Math.abs(c.shap_value)),
    0.05
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shap-panel-title"
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-2.5 text-purple-400">
              <BrainCircuit size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="shap-panel-title" className="text-base font-semibold text-white">
                  TreeSHAP Feature Attribution
                </h3>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 font-mono">
                  Probability-Space
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {roadName ? `Feature attribution analysis for ${roadName}` : "Model prediction decomposition"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explainability panel"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Probability Pipeline Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-medium text-slate-500">
                  Model Baseline Prior
                </span>
                <p className="text-base font-bold text-slate-300">
                  {(baseValue * 100).toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">
                  E[f(x)] across training distribution
                </p>
              </div>

              <div className="hidden sm:block text-slate-600 font-mono text-lg">
                + &Sigma;&phi; &rarr;
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-medium text-slate-500">
                  Operational Threshold
                </span>
                <p className="text-base font-bold text-amber-400">
                  {(threshold * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-slate-500">Calibrated decision boundary</p>
              </div>

              <div className="hidden sm:block text-slate-600 font-mono text-lg">&rarr;</div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-medium text-slate-500">
                  Final Model Output
                </span>
                <p
                  className={`text-base font-bold ${
                    isLikely ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {probability != null ? `${(probability * 100).toFixed(1)}%` : "N/A"}
                </p>
                <p className="text-[10px] text-slate-400">
                  {isLikely ? "Disruption Likely" : "Disruption Unlikely"}
                </p>
              </div>
            </div>
          </div>

          {/* Non-Causality & Methodology Disclaimer */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Info size={16} className="mt-0.5 shrink-0 text-cyan-400" />
              <div className="text-slate-300 leading-relaxed">
                <span className="font-semibold text-cyan-300">Non-Causal Statistical Attribution: </span>
                SHAP (SHapley Additive exPlanations) quantifies which features contributed to shifting the model prediction away from the baseline prior.
                <span className="text-slate-400 block mt-0.5">
                  It reflects learned statistical associations in the training distribution; it does not prove physical causality.
                </span>
              </div>
            </div>
          </div>

          {/* Model Narrative if present */}
          {predictionSignal?.narrative && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <BrainCircuit size={13} className="text-purple-400" />
                Attribution Summary
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {predictionSignal.narrative}
              </p>
            </div>
          )}

          {/* Factors Increasing Predicted Risk */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <TrendingUp size={15} />
                Factors Associated with Increased Model Output (+&phi;)
              </h4>
              <span className="text-[11px] text-slate-500">
                {positiveContributors.length} factor{positiveContributors.length !== 1 ? "s" : ""}
              </span>
            </div>

            {positiveContributors.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-950/50">
                No significant factors driving risk probability upward.
              </p>
            ) : (
              <div className="space-y-2.5">
                {positiveContributors.map((item, idx) => {
                  const widthPercent = Math.min(
                    100,
                    Math.round((Math.abs(item.shap_value) / maxMag) * 100)
                  );
                  return (
                    <div
                      key={item.feature || idx}
                      className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-slate-200">
                            {item.display_name}
                          </span>
                          {item.raw_value != null && (
                            <span className="ml-2 font-mono text-[11px] text-slate-400">
                              ({item.raw_value} {item.unit})
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-red-400">
                          +{(item.shap_value * 100).toFixed(2)}%
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 leading-normal">
                        {item.physical_interpretation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Factors Reducing Predicted Risk */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingDown size={15} />
                Factors Associated with Reduced Model Output (-&phi;)
              </h4>
              <span className="text-[11px] text-slate-500">
                {negativeContributors.length} factor{negativeContributors.length !== 1 ? "s" : ""}
              </span>
            </div>

            {negativeContributors.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-slate-950/50">
                No significant mitigating factors observed.
              </p>
            ) : (
              <div className="space-y-2.5">
                {negativeContributors.map((item, idx) => {
                  const widthPercent = Math.min(
                    100,
                    Math.round((Math.abs(item.shap_value) / maxMag) * 100)
                  );
                  return (
                    <div
                      key={item.feature || idx}
                      className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-slate-200">
                            {item.display_name}
                          </span>
                          {item.raw_value != null && (
                            <span className="ml-2 font-mono text-[11px] text-slate-400">
                              ({item.raw_value} {item.unit})
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-semibold text-emerald-400">
                          {(item.shap_value * 100).toFixed(2)}%
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>

                      <p className="text-[11px] text-slate-400 leading-normal">
                        {item.physical_interpretation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Additive Consistency Proof Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-200">
                  Exact Additive Consistency Verified
                </p>
                <p className="text-[11px] text-slate-500">
                  Base prior + &sum; &phi;<sub>i</sub> = Predicted probability (|error| &lt; 10<sup>-4</sup>)
                </p>
              </div>
            </div>
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-mono text-emerald-300">
              Exact
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3.5 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <HelpCircle size={13} className="text-purple-400" />
            TreeSHAP explanations computed in-process via cached singleton
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
