import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'FAILED_TERMINAL';

export interface SyncQueueRecord {
  client_id: string;
  batch_id: string | null;
  event_type: string;
  client_timestamp: string;
  latitude: number | null;
  longitude: number | null;
  payload_json: string;
  status: SyncStatus;
  retry_count: number;
  last_error: string | null;
  server_entity_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentQueueRecord {
  id?: number;
  client_id: string;
  incident_type: string;
  severity: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  local_photo_path: string | null;
  photo_metadata?: string | null;
  status: string;
  created_at: string;
}

export interface VehicleUpdateRecord {
  id?: number;
  client_id: string;
  vehicle_id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed_kmh?: number | null;
  status: string;
}

export interface RouteCacheRecord {
  corridor_key: string;
  origin_name: string;
  destination_name: string;
  geometry_geojson: string;
  distance_km: number;
  duration_minutes: number;
  risk_score: number;
  cached_at: string;
  expires_at: string;
}

export interface StorageAdapter {
  init(): Promise<void>;
  // sync_queue
  insertSyncEvent(record: SyncQueueRecord): Promise<void>;
  updateSyncEvent(record: SyncQueueRecord): Promise<void>;
  getSyncEvent(clientId: string): Promise<SyncQueueRecord | null>;
  getPendingSyncEvents(limit?: number): Promise<SyncQueueRecord[]>;
  getAllSyncEvents(): Promise<SyncQueueRecord[]>;
  countPendingSyncEvents(): Promise<number>;
  // incident_queue
  insertIncidentDraft(record: IncidentQueueRecord): Promise<void>;
  getIncidentDrafts(): Promise<IncidentQueueRecord[]>;
  getIncidentDraft(clientId: string): Promise<IncidentQueueRecord | null>;
  // vehicle_updates
  insertVehicleUpdate(record: VehicleUpdateRecord): Promise<void>;
  getVehicleUpdates(): Promise<VehicleUpdateRecord[]>;
  // route_cache
  setCachedRoute(record: RouteCacheRecord): Promise<void>;
  getCachedRoute(corridorKey: string): Promise<RouteCacheRecord | null>;
  getAllCachedRoutes(): Promise<RouteCacheRecord[]>;
}

// -------------------------------------------------------------
// IndexedDB Browser Fallback Implementation
// -------------------------------------------------------------
const DB_NAME = 'nexus_offline_idb';
const DB_VERSION = 1;

class IndexedDBStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('sync_queue')) {
          const store = db.createObjectStore('sync_queue', { keyPath: 'client_id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }

        if (!db.objectStoreNames.contains('incident_queue')) {
          const store = db.createObjectStore('incident_queue', { keyPath: 'client_id' });
          store.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('vehicle_updates')) {
          db.createObjectStore('vehicle_updates', { keyPath: 'client_id' });
        }

        if (!db.objectStoreNames.contains('route_cache')) {
          db.createObjectStore('route_cache', { keyPath: 'corridor_key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async insertSyncEvent(record: SyncQueueRecord): Promise<void> {
    const store = await this.getStore('sync_queue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateSyncEvent(record: SyncQueueRecord): Promise<void> {
    return this.insertSyncEvent(record);
  }

  async getSyncEvent(clientId: string): Promise<SyncQueueRecord | null> {
    const store = await this.getStore('sync_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(clientId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getPendingSyncEvents(limit = 50): Promise<SyncQueueRecord[]> {
    const store = await this.getStore('sync_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const results: SyncQueueRecord[] = [];
      const req = store.openCursor();
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const item: SyncQueueRecord = cursor.value;
          // Return both PENDING and retryable FAILED events (excluding FAILED_TERMINAL)
          if ((item.status === 'PENDING' || item.status === 'FAILED') && results.length < limit) {
            results.push(item);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAllSyncEvents(): Promise<SyncQueueRecord[]> {
    const store = await this.getStore('sync_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async countPendingSyncEvents(): Promise<number> {
    const pending = await this.getPendingSyncEvents(1000);
    return pending.length;
  }

  async insertIncidentDraft(record: IncidentQueueRecord): Promise<void> {
    const store = await this.getStore('incident_queue', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getIncidentDrafts(): Promise<IncidentQueueRecord[]> {
    const store = await this.getStore('incident_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getIncidentDraft(clientId: string): Promise<IncidentQueueRecord | null> {
    const store = await this.getStore('incident_queue', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(clientId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async insertVehicleUpdate(record: VehicleUpdateRecord): Promise<void> {
    const store = await this.getStore('vehicle_updates', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getVehicleUpdates(): Promise<VehicleUpdateRecord[]> {
    const store = await this.getStore('vehicle_updates', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async setCachedRoute(record: RouteCacheRecord): Promise<void> {
    const store = await this.getStore('route_cache', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getCachedRoute(corridorKey: string): Promise<RouteCacheRecord | null> {
    const store = await this.getStore('route_cache', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(corridorKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllCachedRoutes(): Promise<RouteCacheRecord[]> {
    const store = await this.getStore('route_cache', 'readonly');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

// -------------------------------------------------------------
// Capacitor SQLite Native Android Implementation
// -------------------------------------------------------------
const SQLITE_DB_NAME = 'nexus_offline';

class CapacitorSQLiteStorageAdapter implements StorageAdapter {
  private sqlite: SQLiteConnection | null = null;
  private db: any = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.sqlite = new SQLiteConnection(CapacitorSQLite);
      const isConn = (await this.sqlite.isConnection(SQLITE_DB_NAME, false)).result;
      if (isConn) {
        this.db = await this.sqlite.retrieveConnection(SQLITE_DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          SQLITE_DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }
      await this.db.open();

      const schema = `
        CREATE TABLE IF NOT EXISTS sync_queue (
          client_id TEXT PRIMARY KEY,
          batch_id TEXT,
          event_type TEXT NOT NULL,
          client_timestamp TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          payload_json TEXT NOT NULL,
          status TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          server_entity_id INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS incident_queue (
          client_id TEXT PRIMARY KEY,
          incident_type TEXT NOT NULL,
          severity TEXT NOT NULL,
          description TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          location_name TEXT,
          local_photo_path TEXT,
          photo_metadata TEXT,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicle_updates (
          client_id TEXT PRIMARY KEY,
          vehicle_id INTEGER NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          timestamp TEXT NOT NULL,
          speed_kmh REAL,
          status TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS route_cache (
          corridor_key TEXT PRIMARY KEY,
          origin_name TEXT NOT NULL,
          destination_name TEXT NOT NULL,
          geometry_geojson TEXT NOT NULL,
          distance_km REAL NOT NULL,
          duration_minutes INTEGER NOT NULL,
          risk_score REAL NOT NULL,
          cached_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
      `;
      await this.db.execute(schema);
    })();

    return this.initPromise;
  }

  async insertSyncEvent(record: SyncQueueRecord): Promise<void> {
    await this.init();
    const query = `
      INSERT OR REPLACE INTO sync_queue (
        client_id, batch_id, event_type, client_timestamp,
        latitude, longitude, payload_json, status,
        retry_count, last_error, server_entity_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      record.client_id,
      record.batch_id,
      record.event_type,
      record.client_timestamp,
      record.latitude,
      record.longitude,
      record.payload_json,
      record.status,
      record.retry_count,
      record.last_error,
      record.server_entity_id,
      record.created_at,
      record.updated_at
    ];
    await this.db.run(query, values);
  }

  async updateSyncEvent(record: SyncQueueRecord): Promise<void> {
    return this.insertSyncEvent(record);
  }

  async getSyncEvent(clientId: string): Promise<SyncQueueRecord | null> {
    await this.init();
    const res = await this.db.query('SELECT * FROM sync_queue WHERE client_id = ?;', [clientId]);
    return (res.values && res.values.length > 0) ? (res.values[0] as SyncQueueRecord) : null;
  }

  async getPendingSyncEvents(limit = 50): Promise<SyncQueueRecord[]> {
    await this.init();
    const res = await this.db.query(
      `SELECT * FROM sync_queue 
       WHERE status IN ('PENDING', 'FAILED') 
       ORDER BY created_at ASC 
       LIMIT ?;`,
      [limit]
    );
    return (res.values as SyncQueueRecord[]) || [];
  }

  async getAllSyncEvents(): Promise<SyncQueueRecord[]> {
    await this.init();
    const res = await this.db.query('SELECT * FROM sync_queue ORDER BY created_at DESC;');
    return (res.values as SyncQueueRecord[]) || [];
  }

  async countPendingSyncEvents(): Promise<number> {
    await this.init();
    const res = await this.db.query("SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('PENDING', 'FAILED');");
    return (res.values && res.values.length > 0) ? Number(res.values[0].count) : 0;
  }

  async insertIncidentDraft(record: IncidentQueueRecord): Promise<void> {
    await this.init();
    const query = `
      INSERT OR REPLACE INTO incident_queue (
        client_id, incident_type, severity, description,
        latitude, longitude, location_name, local_photo_path,
        photo_metadata, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      record.client_id,
      record.incident_type,
      record.severity,
      record.description,
      record.latitude,
      record.longitude,
      record.location_name,
      record.local_photo_path,
      record.photo_metadata || null,
      record.status,
      record.created_at
    ];
    await this.db.run(query, values);
  }

  async getIncidentDrafts(): Promise<IncidentQueueRecord[]> {
    await this.init();
    const res = await this.db.query('SELECT * FROM incident_queue ORDER BY created_at DESC;');
    return (res.values as IncidentQueueRecord[]) || [];
  }

  async getIncidentDraft(clientId: string): Promise<IncidentQueueRecord | null> {
    await this.init();
    const res = await this.db.query('SELECT * FROM incident_queue WHERE client_id = ?;', [clientId]);
    return (res.values && res.values.length > 0) ? (res.values[0] as IncidentQueueRecord) : null;
  }

  async insertVehicleUpdate(record: VehicleUpdateRecord): Promise<void> {
    await this.init();
    const query = `
      INSERT OR REPLACE INTO vehicle_updates (
        client_id, vehicle_id, latitude, longitude, timestamp, speed_kmh, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      record.client_id,
      record.vehicle_id,
      record.latitude,
      record.longitude,
      record.timestamp,
      record.speed_kmh ?? null,
      record.status
    ];
    await this.db.run(query, values);
  }

  async getVehicleUpdates(): Promise<VehicleUpdateRecord[]> {
    await this.init();
    const res = await this.db.query('SELECT * FROM vehicle_updates ORDER BY timestamp DESC;');
    return (res.values as VehicleUpdateRecord[]) || [];
  }

  async setCachedRoute(record: RouteCacheRecord): Promise<void> {
    await this.init();
    const query = `
      INSERT OR REPLACE INTO route_cache (
        corridor_key, origin_name, destination_name, geometry_geojson,
        distance_km, duration_minutes, risk_score, cached_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      record.corridor_key,
      record.origin_name,
      record.destination_name,
      record.geometry_geojson,
      record.distance_km,
      record.duration_minutes,
      record.risk_score,
      record.cached_at,
      record.expires_at
    ];
    await this.db.run(query, values);
  }

  async getCachedRoute(corridorKey: string): Promise<RouteCacheRecord | null> {
    await this.init();
    const res = await this.db.query('SELECT * FROM route_cache WHERE corridor_key = ?;', [corridorKey]);
    return (res.values && res.values.length > 0) ? (res.values[0] as RouteCacheRecord) : null;
  }

  async getAllCachedRoutes(): Promise<RouteCacheRecord[]> {
    await this.init();
    const res = await this.db.query('SELECT * FROM route_cache ORDER BY cached_at DESC;');
    return (res.values as RouteCacheRecord[]) || [];
  }
}

// -------------------------------------------------------------
// Singleton Factory
// -------------------------------------------------------------
let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    // Check if running on native device with Capacitor SQLite available
    if (Capacitor.isNativePlatform()) {
      storageInstance = new CapacitorSQLiteStorageAdapter();
    } else {
      storageInstance = new IndexedDBStorageAdapter();
    }
  }
  return storageInstance;
}
