import { useSyncQueue } from '@/hooks/useSyncQueue';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SyncStatus() {
  const { isOnline, queueSize, isSyncing } = useSyncQueue();

  if (isOnline && queueSize === 0) {
    return null; // Don't show anything when online with empty queue
  }

  return (
    <Badge 
      variant={isOnline ? "default" : "destructive"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2"
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : isOnline ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>Online - {queueSize} queued</span>
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4" />
          <span>Offline - {queueSize} queued</span>
        </>
      )}
    </Badge>
  );
}
