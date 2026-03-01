import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";

import { useLocalization } from "@/contexts/LocalizationContext";
interface CalendarSyncButtonProps {
  projectId?: string;
}

export function CalendarSyncButton({ projectId }: CalendarSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();
  const { formatDateTime } = useDateFormat();

  const handleSync = async () => {
    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-calendar-events', {
        body: { projectId }
      });

      if (error) throw error;

      setLastSync(new Date());
      toast({
        title: 'Calendar synced',
        description: `${data?.eventsCount || 0} events synchronized with Google Calendar`,
      });
    } catch (error: any) {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync
        </CardTitle>
        <CardDescription>
          Sync project activities with Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {lastSync ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{t("ui.lastSynced")}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(lastSync)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not synced yet
              </p>
            )}
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Syncs project milestones and activities</p>
          <p>• Updates automatically on activity changes</p>
          <p>• Requires Google Calendar integration enabled</p>
        </div>
      </CardContent>
    </Card>
  );
}
