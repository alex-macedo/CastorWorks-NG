import { openDB, IDBPDatabase } from 'idb';

interface OfflineData {
  id: string;
  type: 'activity_log' | 'issue' | 'time_log' | 'inspection';
  data: any;
  timestamp: number;
  synced: number; // 0 = false, 1 = true (for IndexedDB compatibility)
}

class OfflineStorage {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB('supervisor-offline-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('offline-queue', { keyPath: 'id' });
        store.createIndex('by-synced', 'synced');
        store.createIndex('by-type', 'type');
      },
    });
  }

  async addToQueue(
    type: OfflineData['type'],
    data: any
  ): Promise<string> {
    const db = await this.dbPromise;
    const id = crypto.randomUUID();
    const item: OfflineData = {
      id,
      type,
      data,
      timestamp: Date.now(),
      synced: 0, // 0 = false
    };
    await db.add('offline-queue', item);
    return id;
  }

  async getUnsynced(): Promise<OfflineData[]> {
    const db = await this.dbPromise;
    const tx = db.transaction('offline-queue', 'readonly');
    const index = tx.store.index('by-synced');
    const items = [];
    
    // Use 0 instead of false for IndexedDB compatibility
    let cursor = await index.openCursor(IDBKeyRange.only(0));
    while (cursor) {
      items.push(cursor.value as OfflineData);
      cursor = await cursor.continue();
    }
    return items;
  }

  async markAsSynced(id: string): Promise<void> {
    const db = await this.dbPromise;
    const item = await db.get('offline-queue', id) as OfflineData | undefined;
    if (item) {
      item.synced = 1; // 1 = true
      await db.put('offline-queue', item);
    }
  }

  async removeItem(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete('offline-queue', id);
  }

  async clearSynced(): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('offline-queue', 'readwrite');
    const index = tx.store.index('by-synced');
    // Use 1 instead of true for IndexedDB compatibility
    let cursor = await index.openCursor(IDBKeyRange.only(1));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async getAll(): Promise<OfflineData[]> {
    const db = await this.dbPromise;
    return db.getAll('offline-queue') as Promise<OfflineData[]>;
  }

  async getByType(type: OfflineData['type']): Promise<OfflineData[]> {
    const db = await this.dbPromise;
    const tx = db.transaction('offline-queue', 'readonly');
    const index = tx.store.index('by-type');
    const items = [];
    let cursor = await index.openCursor(IDBKeyRange.only(type));
    while (cursor) {
      items.push(cursor.value as OfflineData);
      cursor = await cursor.continue();
    }
    return items;
  }
}

export const offlineStorage = new OfflineStorage();
export type { OfflineData };
