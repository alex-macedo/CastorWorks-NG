import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, OfflineData } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-helpers';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:7',message:'Hook initialized',data:{navigatorOnline:navigator.onLine,initialIsOnline:navigator.onLine && typeof navigator.onLine !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    // Start with navigator.onLine as initial state (will be verified by connectivity check)
    return navigator.onLine && typeof navigator.onLine !== 'undefined';
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check actual connectivity to Supabase server
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:16',message:'checkConnectivity called',data:{navigatorOnline:navigator.onLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    // NOTE: navigator.onLine can be unreliable, especially on mobile browsers.
    // Always perform actual connectivity check regardless of navigator.onLine value.
    // We'll use navigator.onLine as a hint, but verify with actual network request.

    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:26',message:'Starting connectivity check',data:{supabaseUrl:import.meta.env.VITE_SUPABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      // Use Supabase client to check connectivity - this handles CORS and auth properly
      // Try to get the current session - this is a lightweight operation
      // that will fail fast if there's no connectivity
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:32',message:'Connectivity check timeout',data:{timeoutMs:5000},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          reject(new Error('Connectivity check timeout'));
        }, 5000);
      });
      
      const sessionPromise = supabase.auth.getSession();
      
      // #region agent log
      const checkStartTime = Date.now();
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:35',message:'Before Promise.race',data:{checkStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      
      // #region agent log
      const checkDuration = Date.now() - checkStartTime;
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:40',message:'Connectivity check succeeded',data:{checkDuration,hasSession:!!result?.data?.session},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      // If we got here without throwing, we have connectivity
      // (Even if session is null, the request succeeded)
      return true;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:48',message:'Connectivity check error',data:{errorName:error?.name,errorMessage:error?.message,errorCode:error?.code,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      // Check if it's a network error (no internet) vs other error (server issue)
      const isNetworkError = 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('timeout') ||
        error?.name === 'AbortError' ||
        error?.code === 'NETWORK_ERROR';
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:58',message:'Error classification',data:{isNetworkError,willReturnOffline:isNetworkError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      
      if (isNetworkError) {
        // Clear network error means offline
        console.debug('[OfflineStatus] Network error detected:', error);
        return false;
      }
      
      // Other errors (auth errors, server errors, etc.) mean we have connectivity
      // but something else is wrong - still consider online
      console.debug('[OfflineStatus] Connectivity check returned error but network is available:', error);
      return true;
    }
  }, []);

  // Update online status
  const updatePendingCount = useCallback(async () => {
    const unsynced = await offlineStorage.getUnsynced();
    setPendingCount(unsynced.length);
  }, []);

  const syncPendingData = useCallback(async () => {
    if (!navigator.onLine || syncing) return;

    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncing(false);
        return;
      }

      const unsynced = await offlineStorage.getUnsynced();
      if (unsynced.length === 0) {
        setSyncing(false);
        return;
      }

      let successCount = 0;
      let failedCount = 0;

      for (const item of unsynced) {
        try {
          await syncItem(item, user.id);
          await offlineStorage.removeItem(item.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
          failedCount++;
        }
      }

      await updatePendingCount();
      setLastSyncTime(new Date());

      if (successCount > 0) {
        toast.success(
          'Sync complete',
          `${successCount} item(s) synced successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`
        );
      }

      if (failedCount > 0 && successCount === 0) {
        toast.error('Sync failed', 'Unable to sync pending changes. Will retry later.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync error', 'An error occurred while syncing data');
    } finally {
      setSyncing(false);
    }
  }, [syncing, updatePendingCount]);

  useEffect(() => {
    let mounted = true;

    const handleOnline = async () => {
      // When browser says online, verify actual connectivity
      const actuallyOnline = await checkConnectivity();
      if (mounted) {
        setIsOnline(actuallyOnline);
        if (actuallyOnline) {
          toast.success('Back online', 'Syncing pending changes...');
          syncPendingData();
        } else {
          // Browser says online but can't reach server
          console.warn('[OfflineStatus] Browser reports online but cannot reach Supabase');
        }
      }
    };

    const handleOffline = () => {
      if (mounted) {
        setIsOnline(false);
        toast.warning('Offline mode', 'Changes will be saved locally');
      }
    };

    // Initial connectivity check
    const initialCheck = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:144',message:'Initial check starting',data:{navigatorOnline:navigator.onLine},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Always perform actual connectivity check, regardless of navigator.onLine
      // navigator.onLine can be unreliable, especially on mobile browsers
      const actuallyOnline = await checkConnectivity();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:148',message:'Initial check result',data:{actuallyOnline,willSetIsOnline:mounted ? actuallyOnline : 'unmounted'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      if (mounted) {
        setIsOnline(actuallyOnline);
        if (import.meta.env.DEV) {
          console.log('[OfflineStatus] Initial connectivity check:', {
            navigatorOnline: navigator.onLine,
            actuallyOnline,
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL
          });
        }
      }
    };

    initialCheck();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check (every 30 seconds) to catch cases where
    // navigator.onLine is wrong or network conditions change
    // Always perform actual connectivity check, regardless of navigator.onLine
    const connectivityInterval = setInterval(async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:171',message:'Periodic check triggered',data:{navigatorOnline:navigator.onLine,currentIsOnline:isOnline},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // Always check actual connectivity, navigator.onLine can be unreliable
      const actuallyOnline = await checkConnectivity();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:175',message:'Periodic check result',data:{actuallyOnline,willUpdate:mounted},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      if (mounted) {
        setIsOnline(actuallyOnline);
      }
    }, 30000);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
    };
  }, [syncPendingData, checkConnectivity, isOnline]);

  // Check pending count on mount and periodically
  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  const syncItem = async (item: OfflineData, userId: string) => {
    switch (item.type) {
      case 'activity_log':
        await supabase.from('site_activity_logs').insert([{
          ...item.data,
          supervisor_id: userId,
        }]);
        break;

      case 'issue':
        await supabase.from('site_issues').insert([{
          ...item.data,
          reported_by: userId,
        }]);
        break;

      case 'time_log':
        // Time logs are arrays of entries
        await supabase.from('time_logs').insert(item.data);
        break;

      case 'inspection':
        await supabase.from('quality_inspections').insert([{
          ...item.data,
          inspector_id: userId,
        }]);
        break;

      default:
        throw new Error(`Unknown item type: ${item.type}`);
    }
  };

  const manualSync = () => {
    if (!syncing) {
      syncPendingData();
    }
  };

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/00cdee38-f7cd-4531-b113-7b22603d23a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useOfflineStatus.tsx:234',message:'Hook return value',data:{isOnline,pendingCount,syncing},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
  }, [isOnline, pendingCount, syncing]);
  // #endregion

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncTime,
    manualSync,
    updatePendingCount,
  };
}
