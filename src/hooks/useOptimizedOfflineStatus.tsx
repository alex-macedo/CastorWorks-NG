import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-helpers';
import { createAdaptivePoller, POLLING_INTERVALS } from '@/utils/optimizedPolling';

/**
 * Optimized version of useOfflineStatus with smart polling
 * Reduced from 5s to 60s interval with adaptive behavior
 */
export function useOptimizedOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Update online status
  const updatePendingCount = useCallback(async () => {
    const unsynced = await offlineStorage.getUnsynced();
    setPendingCount(unsynced.length);
  }, []);

  const syncPendingData = useCallback(async () => {
    if (!navigator.onLine || syncing) return;

    setSyncing(true);
    try {
      const unsynced = await offlineStorage.getUnsynced();

      for (const item of unsynced) {
        try {
          // Determine the correct table based on type
          let table = '';
          switch (item.type) {
            case 'activity_log':
              table = 'supervisor_activity_logs';
              break;
            case 'issue':
              table = 'supervisor_issues';
              break;
            case 'time_log':
              table = 'supervisor_time_logs';
              break;
            case 'inspection':
              table = 'supervisor_inspections';
              break;
            default:
              console.warn('Unknown offline item type:', item.type);
              continue;
          }

          // Upload to Supabase
          const { error } = await supabase.from(table).insert(item.data);

          if (error) {
            console.error('Failed to sync item:', error);
            continue;
          }

          // Mark as synced
          await offlineStorage.markSynced(item.id);
        } catch (error) {
          console.error('Error syncing item:', error);
        }
      }

      setLastSyncTime(new Date());
      await updatePendingCount();

      if (unsynced.length > 0) {
        toast.success('Sync complete', `Synced ${unsynced.length} items`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed', 'Please try again later');
    } finally {
      setSyncing(false);
    }
  }, [syncing, updatePendingCount]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online', 'Syncing pending changes...');
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Offline mode', 'Changes will be saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingData]);

  // Check pending count on mount and periodically with optimized interval
  useEffect(() => {
    updatePendingCount();

    // Create adaptive poller with optimized 60s interval (was 5s)
    const poller = createAdaptivePoller(updatePendingCount, {
      interval: POLLING_INTERVALS.OFFLINE_STATUS,
      pauseWhenHidden: true, // Pause polling when tab is hidden
      reducedBatteryInterval: POLLING_INTERVALS.OFFLINE_STATUS * 2, // 120s on low battery
    });

    poller.start();

    return () => {
      poller.stop();
    };
  }, [updatePendingCount]);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncTime,
    syncPendingData,
    updatePendingCount,
  };
}
