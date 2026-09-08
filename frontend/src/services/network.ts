import { Capacitor } from '@capacitor/core';
import { Network, type ConnectionStatus } from '@capacitor/network';
import { syncWorker } from '../offline/syncWorker';

export interface AppNetworkStatus {
  connected: boolean;
  connectionType: string;
}

type NetworkListener = (status: AppNetworkStatus) => void;

class NetworkService {
  private currentStatus: AppNetworkStatus = {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  };
  private listeners: Set<NetworkListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (Capacitor.isNativePlatform()) {
      try {
        const status: ConnectionStatus = await Network.getStatus();
        this.currentStatus = {
          connected: status.connected,
          connectionType: status.connectionType,
        };

        await Network.addListener(
          'networkStatusChange',
          (status: ConnectionStatus) => {
            this.handleStatusChange({
              connected: status.connected,
              connectionType: status.connectionType,
            });
          }
        );
      } catch {
        this.setupBrowserFallback();
      }
    } else {
      this.setupBrowserFallback();
    }
  }

  private setupBrowserFallback(): void {
    if (typeof window === 'undefined') return;

    this.currentStatus = {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none',
    };

    window.addEventListener('online', () => {
      this.handleStatusChange({ connected: true, connectionType: 'wifi' });
    });

    window.addEventListener('offline', () => {
      this.handleStatusChange({ connected: false, connectionType: 'none' });
    });
  }

  private handleStatusChange(newStatus: AppNetworkStatus): void {
    const wasOffline = !this.currentStatus.connected;
    this.currentStatus = newStatus;

    // Notify all UI listeners
    for (const listener of this.listeners) {
      try {
        listener(newStatus);
      } catch {}
    }

    // Wake the SyncWorker on offline -> online transition
    if (wasOffline && newStatus.connected) {
      syncWorker.processQueue().catch(() => {});
    }
  }

  getStatus(): AppNetworkStatus {
    return { ...this.currentStatus };
  }

  async checkStatus(): Promise<AppNetworkStatus> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus();
        this.currentStatus = {
          connected: status.connected,
          connectionType: status.connectionType,
        };
      } catch {}
    } else if (typeof navigator !== 'undefined') {
      this.currentStatus = {
        connected: navigator.onLine,
        connectionType: navigator.onLine ? 'wifi' : 'none',
      };
    }
    return { ...this.currentStatus };
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Send immediate current state
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkService = new NetworkService();
