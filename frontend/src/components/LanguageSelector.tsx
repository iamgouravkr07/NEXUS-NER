import React from "react";
import { Globe } from "lucide-react";
import { useLanguage, LANGUAGE_OPTIONS } from "../context/LanguageContext";

interface LanguageSelectorProps {
  variant?: "compact" | "full";
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = "compact",
  className = "",
}) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs ${className}`}
      role="group"
      aria-label="Language Selector"
    >
      <Globe size={14} className="ml-1 mr-0.5 text-cyan-400 shrink-0" />
      <div className="flex gap-0.5">
        {LANGUAGE_OPTIONS.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => setLanguage(opt.code)}
              type="button"
              title={`${opt.label} (${opt.nativeLabel})`}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition ${
                isActive
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {variant === "full" ? opt.nativeLabel : opt.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguageSelector;
