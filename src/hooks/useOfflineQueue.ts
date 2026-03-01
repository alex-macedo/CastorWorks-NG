import { useState, useEffect } from 'react';
import { offlineStorage, OfflineData } from '@/lib/offlineStorage';

export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const updateQueueCount = async () => {
    try {
      const unsynced = await offlineStorage.getUnsynced();
      setQueueCount(unsynced.length);
    } catch (error) {
      console.error('Failed to get offline queue count:', error);
      setQueueCount(0);
    }
  };

  useEffect(() => {
    // Initial count
    updateQueueCount();

    // Update on online/offline status change
    const handleOnline = () => {
      setIsOnline(true);
      updateQueueCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll for queue changes every 5 seconds
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    queueCount,
    isOnline,
    refreshQueueCount: updateQueueCount,
  };
}
