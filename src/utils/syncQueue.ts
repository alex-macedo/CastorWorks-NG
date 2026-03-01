import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

interface SyncQueueDB extends DBSchema {
  'sync-queue': {
    key: string;
    value: SyncAction;
    indexes: { 'by-timestamp': number };
  };
}

const STORE_NAME = 'sync-queue' as const;

class SyncQueueManager {
  private dbName = 'sync-queue-db';
  private db: IDBPDatabase<SyncQueueDB> | null = null;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<SyncQueueDB>(this.dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    return this.db;
  }

  async addToQueue(type: string, payload: any): Promise<string> {
    const db = await this.init();
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const action: SyncAction = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    await db.add(STORE_NAME, action);
    
    // Register background sync if available
    if ('serviceWorker' in navigator && 'sync' in (navigator.serviceWorker as any)) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-queue');
    }

    return id;
  }

  async getQueue(): Promise<SyncAction[]> {
    const db = await this.init();
    return db.getAllFromIndex(STORE_NAME, 'by-timestamp');
  }

  async removeFromQueue(id: string): Promise<void> {
    const db = await this.init();
    await db.delete(STORE_NAME, id);
  }

  async updateRetries(id: string): Promise<void> {
    const db = await this.init();
    const action = await db.get(STORE_NAME, id);
    
    if (action) {
      action.retries += 1;
      await db.put(STORE_NAME, action);
    }
  }

  async clearQueue(): Promise<void> {
    const db = await this.init();
    await db.clear(STORE_NAME);
  }

  async getQueueSize(): Promise<number> {
    const db = await this.init();
    return db.count(STORE_NAME);
  }
}

export const syncQueue = new SyncQueueManager();
export type { SyncAction };
