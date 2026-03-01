import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, RefreshCw, CloudOff, Cloud } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncing, manualSync } = useOfflineStatus();

  // Only show when actually offline - don't show for pending items when online
  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <Card className="border-2 mb-4">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Cloud className="h-5 w-5 text-green-600" />
            ) : (
              <CloudOff className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
                {pendingCount > 0 && (
                  <Badge variant="secondary">
                    {pendingCount} pending
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? pendingCount > 0 
                    ? 'Syncing pending changes...'
                    : 'All changes saved to cloud'
                  : 'Your changes are saved locally and will sync when back online'}
              </p>
            </div>
          </div>
          
          {isOnline && pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={manualSync}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
