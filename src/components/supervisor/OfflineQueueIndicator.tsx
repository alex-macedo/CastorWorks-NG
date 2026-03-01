import { useEffect, useState } from 'react';
import { offlineStorage, OfflineData } from '@/lib/offlineStorage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Clock, FileText, AlertTriangle, ClipboardCheck, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useLocalization } from '@/contexts/LocalizationContext';

export function OfflineQueueIndicator() {
  const { pendingCount, isOnline, syncing } = useOfflineStatus();
  const { t } = useLocalization();
  const [queuedItems, setQueuedItems] = useState<OfflineData[]>([]);

  const loadQueuedItems = async () => {
    const items = await offlineStorage.getUnsynced();
    setQueuedItems(items);
  };

  useEffect(() => {
    loadQueuedItems();
    const interval = setInterval(() => {
       
      loadQueuedItems();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (pendingCount === 0) {
    return null;
  }

  const getTypeIcon = (type: OfflineData['type']) => {
    switch (type) {
      case 'activity_log': return <FileText className="h-4 w-4" />;
      case 'issue': return <AlertTriangle className="h-4 w-4" />;
      case 'time_log': return <Users className="h-4 w-4" />;
      case 'inspection': return <ClipboardCheck className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: OfflineData['type']) => {
    switch (type) {
      case 'activity_log': return t('supervisor.offlineQueue.activityLog');
      case 'issue': return t('supervisor.offlineQueue.issueReport');
      case 'time_log': return t('supervisor.offlineQueue.timeLog');
      case 'inspection': return t('supervisor.offlineQueue.inspection');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="h-14 w-full border-2 border-orange-500/50 hover:border-orange-500"
        >
          <Clock className="h-5 w-5 mr-2 text-orange-600" />
          <div className="flex flex-col items-start flex-1">
            <span className="font-semibold">
              {t('supervisor.offlineQueue.itemsPendingSync', { count: pendingCount })}
            </span>
            <span className="text-xs text-muted-foreground">
              {isOnline ? syncing ? t('supervisor.offlineQueue.syncingNow') : t('supervisor.offlineQueue.tapToViewQueue') : t('supervisor.offlineQueue.willSyncWhenOnline')}
            </span>
          </div>
          <Badge variant="secondary" className="ml-2">
            {pendingCount}
          </Badge>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Sync Queue
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-sm text-orange-900 dark:text-orange-100">
              {isOnline 
                ? syncing
                  ? t('supervisor.offlineQueue.syncingToCloud')
                  : t('supervisor.offlineQueue.autoSyncWhenPossible')
                : t('supervisor.offlineQueue.offlineMessage')}
            </p>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {queuedItems.map((item) => (
                <Card key={item.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <CardTitle className="text-base">
                          {getTypeLabel(item.type)}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {t('supervisor.offlineQueue.queued')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-2">
                      <div className="text-sm">
                        {item.type === 'activity_log' && (
                          <div>
                            <p className="text-muted-foreground">
                              {t('supervisor.offlineQueue.date')}: {item.data.activity_date}
                            </p>
                            <p className="text-muted-foreground">
                              {t('supervisor.offlineQueue.crew')}: {item.data.crew_count} • {item.data.weather_conditions}
                            </p>
                          </div>
                        )}
                        {item.type === 'issue' && (
                          <div>
                            <p className="font-medium">{item.data.title}</p>
                            <p className="text-muted-foreground">
                              {item.data.issue_type} • {item.data.severity}
                            </p>
                          </div>
                        )}
                        {item.type === 'time_log' && (
                          <div>
                            <p className="text-muted-foreground">
                              {t('supervisor.offlineQueue.crewEntries', { count: item.data.length })}
                            </p>
                          </div>
                        )}
                        {item.type === 'inspection' && (
                          <div>
                            <p className="text-muted-foreground">
                              {t('supervisor.offlineQueue.phase')}: {item.data.phase_id || t('supervisor.none')}
                            </p>
                            <p className="text-muted-foreground">
                              {t('supervisor.offlineQueue.status')}: {item.data.overall_status}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
