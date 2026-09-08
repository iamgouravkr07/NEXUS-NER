import { v4 as uuidv4 } from 'uuid';
import { syncQueue } from './syncQueue';
import type { SyncQueueRecord } from './database';

const BACKOFF_SCHEDULE_MS = [5000, 15000, 45000, 120000, 300000];
const MAX_RETRIES = 5;

// Helper to resolve API base URL
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl) return envUrl.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000';
}

export class SyncWorker {
  private isSyncing = false;
  private timerId: number | null = null;

  private isEligible(record: SyncQueueRecord): boolean {
    if (record.status === 'PENDING') return true;
    if (record.status === 'FAILED') {
      if (record.retry_count >= MAX_RETRIES) return false;
      const index = Math.max(0, Math.min(record.retry_count - 1, BACKOFF_SCHEDULE_MS.length - 1));
      const requiredDelay = BACKOFF_SCHEDULE_MS[index];
      const elapsed = Date.now() - new Date(record.updated_at).getTime();
      return elapsed >= requiredDelay;
    }
    return false;
  }

  private isTerminalError(errorMsg?: string | null): boolean {
    if (!errorMsg) return false;
    const lower = errorMsg.toLowerCase();
    return (
      lower.includes('not authorized') ||
      lower.includes('permission') ||
      lower.includes('outside north eastern region bounds') ||
      lower.includes('invalid severity') ||
      lower.includes('unsupported event_type')
    );
  }

  async processQueue(): Promise<{ processed: number; success: number; errors: number }> {
    if (this.isSyncing) {
      return { processed: 0, success: 0, errors: 0 };
    }

    // Require authentication token
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_token') : null;
    if (!token) {
      return { processed: 0, success: 0, errors: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let success = 0;
    let errors = 0;

    try {
      const candidates = await syncQueue.getPending(100);
      const eligible = candidates.filter((item) => this.isEligible(item)).slice(0, 50);

      if (eligible.length === 0) {
        return { processed: 0, success: 0, errors: 0 };
      }

      const batchId = uuidv4();
      const clientIds = eligible.map((e) => e.client_id);
      await syncQueue.markSyncing(clientIds, batchId);

      const eventsPayload = eligible.map((item) => {
        let parsedPayload = {};
        try {
          parsedPayload = JSON.parse(item.payload_json);
        } catch {
          parsedPayload = {};
        }

        return {
          client_id: item.client_id,
          event_type: item.event_type,
          timestamp: item.client_timestamp,
          latitude: item.latitude,
          longitude: item.longitude,
          payload: parsedPayload,
        };
      });

      const batchRequest = {
        batch_id: batchId,
        client_device_id: 'nexus-mobile-client',
        events: eventsPayload,
      };

      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(batchRequest),
      });

      if (!response.ok) {
        // If HTTP 401/403, could be expired token or unauthorized role
        const statusText = `HTTP ${response.status}: ${response.statusText}`;
        for (const item of eligible) {
          if (response.status === 401 || response.status === 403) {
            await syncQueue.markTerminalFailure(item.client_id, statusText);
          } else {
            await syncQueue.markFailed(item.client_id, statusText);
          }
          errors += 1;
        }
        return { processed: eligible.length, success: 0, errors };
      }

      const data = await response.json();
      processed = data.processed_count || eligible.length;

      // Process per-event results
      const results: Array<{
        client_id: string;
        event_type: string;
        status: string;
        server_entity_id?: number | null;
        error?: string | null;
      }> = data.results || [];

      const resultMap = new Map(results.map((r) => [r.client_id, r]));

      for (const item of eligible) {
        const result = resultMap.get(item.client_id);
        if (!result) {
          await syncQueue.markFailed(item.client_id, 'No result returned from server');
          errors += 1;
          continue;
        }

        if (result.status === 'success' || result.status === 'already_synced') {
          await syncQueue.markSynced(item.client_id, result.server_entity_id);
          success += 1;
        } else {
          const errMsg = result.error || 'Server processing error';
          if (this.isTerminalError(errMsg)) {
            await syncQueue.markTerminalFailure(item.client_id, errMsg);
          } else {
            await syncQueue.markFailed(item.client_id, errMsg);
          }
          errors += 1;
        }
      }
    } catch (networkError: any) {
      // Offline, network drop, timeout: mark in-flight events as FAILED so they can retry
      const errMsg = networkError?.message || 'Network communication failure';
      const candidates = await syncQueue.getPending(50);
      for (const item of candidates) {
        if (item.status === 'SYNCING') {
          await syncQueue.markFailed(item.client_id, errMsg);
          errors += 1;
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { processed, success, errors };
  }

  startPeriodicSync(intervalMs = 30000): void {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => {
      this.processQueue().catch(() => {});
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const syncWorker = new SyncWorker();
