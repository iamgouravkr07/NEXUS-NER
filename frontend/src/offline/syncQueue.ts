import { v4 as uuidv4 } from 'uuid';
import { getStorage, type SyncQueueRecord } from './database';

export class SyncQueue {
  private notifyListeners(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus:sync_queue_changed'));
    }
  }

  async enqueue(
    eventType: string,
    payload: Record<string, any>,
    latitude?: number | null,
    longitude?: number | null
  ): Promise<SyncQueueRecord> {
    const storage = getStorage();
    await storage.init();

    const now = new Date().toISOString();
    const record: SyncQueueRecord = {
      client_id: uuidv4(),
      batch_id: null,
      event_type: eventType,
      client_timestamp: now,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      payload_json: JSON.stringify(payload),
      status: 'PENDING',
      retry_count: 0,
      last_error: null,
      server_entity_id: null,
      created_at: now,
      updated_at: now,
    };

    await storage.insertSyncEvent(record);
    this.notifyListeners();
    return record;
  }

  async getPending(limit = 50): Promise<SyncQueueRecord[]> {
    const storage = getStorage();
    await storage.init();
    return storage.getPendingSyncEvents(limit);
  }

  async markSyncing(clientIds: string[], batchId: string): Promise<void> {
    const storage = getStorage();
    await storage.init();
    const now = new Date().toISOString();

    for (const id of clientIds) {
      const record = await storage.getSyncEvent(id);
      if (record) {
        record.status = 'SYNCING';
        record.batch_id = batchId;
        record.updated_at = now;
        await storage.updateSyncEvent(record);
      }
    }
    this.notifyListeners();
  }

  async markSynced(clientId: string, serverEntityId?: number | null): Promise<void> {
    const storage = getStorage();
    await storage.init();
    const record = await storage.getSyncEvent(clientId);
    if (record) {
      record.status = 'SYNCED';
      record.server_entity_id = serverEntityId ?? null;
      record.last_error = null;
      record.updated_at = new Date().toISOString();
      await storage.updateSyncEvent(record);
      this.notifyListeners();
    }
  }

  async markFailed(clientId: string, errorMessage: string): Promise<void> {
    const storage = getStorage();
    await storage.init();
    const record = await storage.getSyncEvent(clientId);
    if (record) {
      record.status = 'FAILED';
      record.retry_count += 1;
      record.last_error = errorMessage;
      record.updated_at = new Date().toISOString();
      await storage.updateSyncEvent(record);
      this.notifyListeners();
    }
  }

  async markTerminalFailure(clientId: string, errorMessage: string): Promise<void> {
    const storage = getStorage();
    await storage.init();
    const record = await storage.getSyncEvent(clientId);
    if (record) {
      record.status = 'FAILED_TERMINAL';
      record.last_error = errorMessage;
      record.updated_at = new Date().toISOString();
      await storage.updateSyncEvent(record);
      this.notifyListeners();
    }
  }

  async retry(clientId: string): Promise<void> {
    const storage = getStorage();
    await storage.init();
    const record = await storage.getSyncEvent(clientId);
    if (record && (record.status === 'FAILED' || record.status === 'FAILED_TERMINAL')) {
      record.status = 'PENDING';
      record.retry_count = 0;
      record.last_error = null;
      record.updated_at = new Date().toISOString();
      await storage.updateSyncEvent(record);
      this.notifyListeners();
    }
  }

  async countPending(): Promise<number> {
    const storage = getStorage();
    await storage.init();
    return storage.countPendingSyncEvents();
  }

  async getAll(): Promise<SyncQueueRecord[]> {
    const storage = getStorage();
    await storage.init();
    return storage.getAllSyncEvents();
  }
}

export const syncQueue = new SyncQueue();
