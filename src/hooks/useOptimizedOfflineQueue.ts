import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offlineStorage';
import { createAdaptivePoller, POLLING_INTERVALS } from '@/utils/optimizedPolling';

/**
 * Optimized version of useOfflineQueue with smart polling
 * Reduced from 5s to 30s interval with adaptive behavior
 */
export function useOptimizedOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const updateQueueCount = useCallback(async () => {
    try {
      const unsynced = await offlineStorage.getUnsynced();
      setQueueCount(unsynced.length);
    } catch (error) {
      console.error('Failed to get offline queue count:', error);
      setQueueCount(0);
    }
  }, []);

  useEffect(() => {
    // Initial count
    const initialTimer = window.setTimeout(() => {
      void updateQueueCount();
    }, 0);

    // Update on online/offline status change
    const handleOnline = () => {
      setIsOnline(true);
      void updateQueueCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      void updateQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Create adaptive poller with optimized 30s interval (was 5s)
    const poller = createAdaptivePoller(updateQueueCount, {
      interval: POLLING_INTERVALS.OFFLINE_SYNC,
      pauseWhenHidden: true, // Pause polling when tab is hidden
      reducedBatteryInterval: POLLING_INTERVALS.OFFLINE_SYNC * 2, // 60s on low battery
    });

    poller.start();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      poller.stop();
      window.clearTimeout(initialTimer);
    };
  }, [updateQueueCount]);

  return {
    queueCount,
    isOnline,
    refreshQueueCount: updateQueueCount,
  };
}
