import React, { Component, type ReactNode } from "react";
import { WifiOff, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("MapErrorBoundary caught an unhandled map rendering exception:", error, errorInfo);
  }

  public resetErrorBoundary = () => {
    this.state = { hasError: false, error: null };
    try {
      this.setState({ hasError: false, error: null });
    } catch {}
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  public render() {
    if (this.state.hasError) {
      const msg = this.props.fallbackMessage || "Map tiles unavailable — offline mode";
      return (
        <div
          data-testid="map-error-boundary-fallback"
          className="flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-6 text-center"
        >
          <div className="rounded-full bg-amber-500/10 p-3 mb-3 border border-amber-500/20">
            <WifiOff size={28} className="text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-white">Map View Degraded</p>
          <p className="mt-1 text-xs text-amber-400 font-medium">{msg}</p>
          <p className="mt-2 text-[11px] text-slate-500 max-w-sm">
            Core routing calculations, vehicle tracking records, and operational field reporting remain fully functional.
          </p>
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition"
          >
            <RotateCcw size={13} />
            <span>Retry Map</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
