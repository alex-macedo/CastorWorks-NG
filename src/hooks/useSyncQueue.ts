import { useState, useEffect, useCallback } from 'react';
import { syncQueue, SyncAction } from '@/utils/syncQueue';
import { useToast } from '@/hooks/use-toast';

export function useSyncQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Syncing queued actions...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Actions will be queued and synced when you're back online.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue size periodically
    const updateQueueSize = async () => {
      const size = await syncQueue.getQueueSize();
      setQueueSize(size);
    };

    updateQueueSize();
    const interval = setInterval(updateQueueSize, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [toast]);

  const queueAction = useCallback(async (type: string, payload: any) => {
    try {
      const id = await syncQueue.addToQueue(type, payload);
      const size = await syncQueue.getQueueSize();
      setQueueSize(size);
      
      if (!isOnline) {
        toast({
          title: "Action queued",
          description: "This action will be synced when you're back online.",
        });
      }
      
      return id;
    } catch (error) {
      console.error('Failed to queue action:', error);
      toast({
        title: "Error",
        description: "Failed to queue action for sync.",
        variant: "destructive",
      });
      throw error;
    }
  }, [isOnline, toast]);

  const getQueuedActions = useCallback(async (): Promise<SyncAction[]> => {
    return syncQueue.getQueue();
  }, []);

  const clearQueue = useCallback(async () => {
    await syncQueue.clearQueue();
    setQueueSize(0);
  }, []);

  return {
    isOnline,
    queueSize,
    isSyncing,
    queueAction,
    getQueuedActions,
    clearQueue,
  };
}
