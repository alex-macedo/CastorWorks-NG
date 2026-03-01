import { useEffect } from 'react';
import { syncService } from '@/lib/syncService';

/**
 * AutoSync component - Automatically syncs offline data when the app loads
 * and when the connection is restored
 */
export function AutoSync() {
  useEffect(() => {
    // Sync immediately on mount if online
    if (navigator.onLine) {
      console.log('[AutoSync] App loaded, syncing offline data...');
      syncService.syncAll();
    }

    // Set up periodic sync check every 30 seconds
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncService.syncAll();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(syncInterval);
  }, []);

  return null; // This component doesn't render anything
}
