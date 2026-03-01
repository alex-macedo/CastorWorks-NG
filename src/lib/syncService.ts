import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, OfflineData } from './offlineStorage';

class SyncService {
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline() {
    this.notifyListeners();
    this.syncAll();
  }

  private handleOffline() {
    this.notifyListeners();
  }

  onStatusChange(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  async syncAll(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    if (!navigator.onLine) {
      return;
    }

    this.syncInProgress = true;

    try {
      const unsynced = await offlineStorage.getUnsynced();

      for (const item of unsynced) {
        try {
          await this.syncItem(item);
          await offlineStorage.markAsSynced(item.id);

        } catch (error) {
          console.error(`[SyncService] Failed to sync item ${item.id}:`, error);
          // Continue with other items even if one fails
        }
      }

      // Clean up synced items
      await offlineStorage.clearSynced();

      this.notifyListeners();
    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: OfflineData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    switch (item.type) {
      case 'activity_log':
        await supabase.from('site_activity_logs').insert([{
          ...item.data,
          supervisor_id: user.id,
        }]);
        break;

      case 'issue':
        await supabase.from('site_issues').insert([{
          ...item.data,
          reported_by: user.id,
        }]);
        break;

      case 'time_log':
        await supabase.from('crew_time_logs').insert(
          item.data.map((entry: any) => ({
            ...entry,
            supervisor_id: user.id,
          }))
        );
        break;

      case 'inspection':
        await supabase.from('quality_inspections').insert([{
          ...item.data,
          inspector_id: user.id,
        }]);
        break;

      default:
        throw new Error(`Unknown item type: ${item.type}`);
    }
  }

  async getPendingCount(): Promise<number> {
    const unsynced = await offlineStorage.getUnsynced();
    return unsynced.length;
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const syncService = new SyncService();
