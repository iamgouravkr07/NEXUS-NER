import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { networkService } from '../services/network';
import type { AppNetworkStatus } from '../services/network';
import { syncQueue } from '../offline/syncQueue';
import { syncWorker } from '../offline/syncWorker';

export const NetworkBanner: React.FC = () => {
  const [network, setNetwork] = useState<AppNetworkStatus>(networkService.getStatus());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = async () => {
    try {
      const count = await syncQueue.countPending();
      setPendingCount(count);
    } catch {}
  };

  useEffect(() => {
    refreshPendingCount();

    const unsubscribeNetwork = networkService.subscribe((status) => {
      setNetwork(status);
      refreshPendingCount();
    });

    const handleQueueChange = () => {
      refreshPendingCount();
    };

    window.addEventListener('nexus:sync_queue_changed', handleQueueChange);

    return () => {
      unsubscribeNetwork();
      window.removeEventListener('nexus:sync_queue_changed', handleQueueChange);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing || !network.connected) return;
    setIsSyncing(true);
    try {
      await syncWorker.processQueue();
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Offline Banner
  if (!network.connected) {
    return (
      <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-400">
        <div className="flex items-center gap-2">
          <WifiOff size={16} className="shrink-0" />
          <span className="font-semibold uppercase tracking-wider">Offline Mode</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300">
            {pendingCount > 0
              ? `${pendingCount} event${pendingCount > 1 ? 's' : ''} queued locally in outbox`
              : 'Local storage active — reports will queue offline'}
          </span>
        </div>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium">
          No Internet
        </span>
      </div>
    );
  }

  // 2. Online with Pending Outbox Items
  if (pendingCount > 0) {
    return (
      <div className="flex items-center justify-between bg-cyan-500/10 border-b border-cyan-500/20 px-4 py-2 text-xs text-cyan-400">
        <div className="flex items-center gap-2">
          <RefreshCw size={15} className={`shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="font-semibold uppercase tracking-wider">Outbox Pending</span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300">
            {pendingCount} event{pendingCount > 1 ? 's' : ''} ready to synchronize
          </span>
        </div>
        <button
          type="button"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    );
  }

  // 3. Online & Fully Synced (Subtle compact banner)
  return (
    <div className="flex items-center justify-between bg-slate-900/50 border-b border-slate-800/80 px-4 py-1.5 text-[11px] text-slate-400">
      <div className="flex items-center gap-2">
        <Wifi size={13} className="text-emerald-400 shrink-0" />
        <span className="font-medium text-emerald-400">Online</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400 flex items-center gap-1">
          <CheckCircle2 size={12} className="text-emerald-500" />
          Offline outbox clear
        </span>
      </div>
      <span className="text-[10px] text-slate-500">Auto-sync active</span>
    </div>
  );
};
