import { SyncQueueItem, SyncStatus, DataConflict, SyncAction } from '../types/database';
import { supabase, isSupabaseConfigured } from './supabase';

const DB_NAME = 'H2O_Offline_ERP_DB';
const DB_VERSION = 2;
const STORE_ENTITIES = 'entities';
const STORE_SYNC_QUEUE = 'syncQueue';
const STORE_CONFLICTS = 'conflicts';

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ENTITIES)) {
        db.createObjectStore(STORE_ENTITIES, { keyPath: 'table' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_CONFLICTS)) {
        db.createObjectStore(STORE_CONFLICTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// -------------------------------------------------------------
// IndexedDB Entity Table Persistence
// -------------------------------------------------------------

export async function saveTableToIndexedDB<T>(table: string, data: T): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_ENTITIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTITIES);
    store.put({ table, data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn(`[IndexedDB] Error saving table ${table}:`, err);
  }
}

export async function loadTableFromIndexedDB<T>(table: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_ENTITIES, 'readonly');
      const store = tx.objectStore(STORE_ENTITIES);
      const req = store.get(table);
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Error loading table ${table}:`, err);
    return null;
  }
}

// -------------------------------------------------------------
// Offline Transaction Sync Queue
// -------------------------------------------------------------

export async function enqueueSyncTransaction(
  item: {
    entity_type: string;
    entity_id: string;
    action?: SyncAction;
    operation_type?: SyncAction;
    payload: any;
    organization_id?: string;
    user_id?: string;
    record_id?: string;
  }
): Promise<SyncQueueItem> {
  const localId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const opType = item.operation_type || item.action || 'CREATE';
  
  const syncItem: SyncQueueItem = {
    id: localId,
    local_id: localId,
    record_id: item.record_id || item.entity_id,
    organization_id: item.organization_id || 'org-default',
    user_id: item.user_id || 'system',
    operation_type: opType,
    action: opType,
    entity_type: item.entity_type,
    table_name: item.entity_type,
    entity_id: item.entity_id,
    payload: item.payload,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retry_count: 0,
  };

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    store.put(syncItem);
  } catch (err) {
    console.warn('[IndexedDB] Error enqueueing transaction:', err);
  }

  // Also save to localStorage backup for instant retrieval
  try {
    const existing = JSON.parse(localStorage.getItem('h2o_sync_queue') || '[]');
    existing.push(syncItem);
    localStorage.setItem('h2o_sync_queue', JSON.stringify(existing));
  } catch {}

  return syncItem;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as SyncQueueItem[]);
      req.onerror = () => {
        const stored = JSON.parse(localStorage.getItem('h2o_sync_queue') || '[]');
        resolve(stored);
      };
    });
  } catch {
    const stored = JSON.parse(localStorage.getItem('h2o_sync_queue') || '[]');
    return stored;
  }
}

export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, ...updates });
      }
    };
  } catch (err) {
    console.warn(`[IndexedDB] Error updating sync queue item ${id}:`, err);
  }

  // Backup in localStorage
  try {
    const existing: SyncQueueItem[] = JSON.parse(
      localStorage.getItem('h2o_sync_queue') || '[]'
    );
    const updated = existing.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem('h2o_sync_queue', JSON.stringify(updated));
  } catch {}
}

export async function clearSyncedTransactions(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || []) as SyncQueueItem[];
      for (const item of items) {
        if (item.status === 'synced') {
          store.delete(item.id);
        }
      }
    };
  } catch {}

  try {
    const existing: SyncQueueItem[] = JSON.parse(
      localStorage.getItem('h2o_sync_queue') || '[]'
    );
    const remaining = existing.filter((item) => item.status !== 'synced');
    localStorage.setItem('h2o_sync_queue', JSON.stringify(remaining));
  } catch {}
}

export async function getPendingSyncCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.filter((item) => item.status === 'pending' || item.status === 'failed').length;
}

// -------------------------------------------------------------
// Conflict Protection & Management
// -------------------------------------------------------------

export async function logDataConflict(
  conflict: Omit<DataConflict, 'id' | 'detected_at'>
): Promise<DataConflict> {
  const record: DataConflict = {
    ...conflict,
    id: `conf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    detected_at: new Date().toISOString(),
  };

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_CONFLICTS, 'readwrite');
    const store = tx.objectStore(STORE_CONFLICTS);
    store.put(record);
  } catch (err) {
    console.warn('[IndexedDB] Error saving data conflict:', err);
  }

  try {
    const existing = JSON.parse(localStorage.getItem('h2o_conflicts') || '[]');
    existing.push(record);
    localStorage.setItem('h2o_conflicts', JSON.stringify(existing));
  } catch {}

  return record;
}

export async function getConflictLogs(): Promise<DataConflict[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CONFLICTS, 'readonly');
      const store = tx.objectStore(STORE_CONFLICTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []) as DataConflict[]);
      req.onerror = () => {
        const stored = JSON.parse(localStorage.getItem('h2o_conflicts') || '[]');
        resolve(stored);
      };
    });
  } catch {
    const stored = JSON.parse(localStorage.getItem('h2o_conflicts') || '[]');
    return stored;
  }
}

export async function resolveDataConflict(
  conflictId: string,
  resolutionChoice: 'preserved_local' | 'resolved'
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_CONFLICTS, 'readwrite');
    const store = tx.objectStore(STORE_CONFLICTS);
    const getReq = store.get(conflictId);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, resolution: resolutionChoice });
      }
    };
  } catch {}

  try {
    const existing: DataConflict[] = JSON.parse(
      localStorage.getItem('h2o_conflicts') || '[]'
    );
    const updated = existing.map((c) =>
      c.id === conflictId ? { ...c, resolution: resolutionChoice } : c
    );
    localStorage.setItem('h2o_conflicts', JSON.stringify(updated));
  } catch {}
}

// -------------------------------------------------------------
// Offline Synchronization Engine
// -------------------------------------------------------------

export async function processSyncQueue(): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  conflictsCount: number;
  errorsCount: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, syncedCount: 0, remainingCount: await getPendingSyncCount(), conflictsCount: 0, errorsCount: 0 };
  }

  const queue = await getSyncQueue();
  const eligible = queue.filter(
    (q) => (q.status === 'pending' || q.status === 'failed') && q.retry_count < 5
  );

  if (eligible.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0, conflictsCount: 0, errorsCount: 0 };
  }

  let syncedCount = 0;
  let conflictsCount = 0;
  let errorsCount = 0;

  for (const item of eligible) {
    try {
      await updateSyncQueueItem(item.id, { status: 'syncing' });

      // Conflict Check: Check if remote version timestamp > local item timestamp
      if (item.payload && item.payload._remoteUpdatedAt) {
        const remoteTime = new Date(item.payload._remoteUpdatedAt).getTime();
        const localTime = new Date(item.timestamp).getTime();
        if (remoteTime > localTime) {
          await updateSyncQueueItem(item.id, {
            status: 'conflict',
            error_message: 'Remote record was modified in another session. Requires review.',
          });
          await logDataConflict({
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            local_timestamp: item.timestamp,
            remote_timestamp: item.payload._remoteUpdatedAt,
            local_data: item.payload,
            remote_data: { note: 'Remote record had newer timestamp on server' },
            resolution: 'pending_review',
          });
          conflictsCount++;
          continue;
        }
      }

      // If Supabase is configured and connected, attempt remote sync
      if (isSupabaseConfigured && supabase) {
        const table = item.entity_type.toLowerCase();
        const op = item.operation_type || item.action;

        if (op === 'DELETE') {
          await supabase.from(table).delete().eq('id', item.entity_id);
        } else if (op === 'CREATE' || op === 'UPDATE') {
          // Clean internal metadata tags before push
          const cleanPayload = { ...item.payload };
          delete cleanPayload._remoteUpdatedAt;
          await supabase.from(table).upsert(cleanPayload);
        }
      }

      // Mark successfully synchronized
      await updateSyncQueueItem(item.id, {
        status: 'synced',
        synced_at: new Date().toISOString(),
        error_message: undefined,
      });
      syncedCount++;
    } catch (err: any) {
      console.warn(`[Sync] Failed to sync item ${item.id}:`, err);
      errorsCount++;
      await updateSyncQueueItem(item.id, {
        status: 'failed',
        retry_count: (item.retry_count || 0) + 1,
        error_message: err?.message || 'Sync network or schema error',
      });
    }
  }

  const remaining = await getPendingSyncCount();
  return {
    success: errorsCount === 0,
    syncedCount,
    remainingCount: remaining,
    conflictsCount,
    errorsCount,
  };
}
