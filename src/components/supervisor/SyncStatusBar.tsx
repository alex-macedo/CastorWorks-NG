import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SyncStatusBar() {
  const { isOnline, pendingCount, syncing, manualSync } = useOfflineStatus();
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const lastSyncTime: Date | null = null; // This will be implemented later with persistence

  // Don't show if online and fully synced
  if (isOnline && pendingCount === 0 && !syncing) {
    return null;
  }

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-colors",
        isOnline 
          ? pendingCount > 0 
            ? "bg-blue-500/90 border-blue-600" 
            : "bg-green-500/90 border-green-600"
          : "bg-orange-500/90 border-orange-600"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <div className="flex items-center gap-3">
          {syncing ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : isOnline ? (
            pendingCount > 0 ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )
          ) : (
            <CloudOff className="h-5 w-5" />
          )}
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {syncing 
                  ? t('supervisor.sync.syncing')
                  : isOnline 
                    ? pendingCount > 0 
                      ? t('supervisor.sync.pendingSync')
                      : t('supervisor.sync.allSynced')
                    : t('supervisor.sync.offlineMode')}
              </span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {pendingCount}
                </Badge>
              )}
            </div>
            <span className="text-xs opacity-90">
              {syncing
                ? t('supervisor.sync.syncingItems', { count: pendingCount })
                : isOnline
                  ? pendingCount > 0
                    ? t('supervisor.sync.tapToSync')
                    : lastSyncTime 
                      ? t('supervisor.sync.lastSynced', { time: formatLastSync(lastSyncTime, formatDate, t) })
                      : t('supervisor.sync.allChangesSaved')
                  : t('supervisor.sync.workingOffline')}
            </span>
          </div>
        </div>

        {isOnline && pendingCount > 0 && !syncing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={manualSync}
            className="h-8 text-white hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('supervisor.sync.syncButton')}
          </Button>
        )}
      </div>
    </div>
  );
}

function formatLastSync(date: Date, formatDateFn: (date: any) => string, t: (key: string, params?: any) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t('supervisor.sync.justNow');
  if (diffMins === 1) return t('supervisor.sync.oneMinAgo');
  if (diffMins < 60) return t('supervisor.sync.minutesAgo', { minutes: diffMins });

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return t('supervisor.sync.oneHourAgo');
  if (diffHours < 24) return t('supervisor.sync.hoursAgo', { hours: diffHours });

  return formatDateFn(date);
}
