/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/utils/formatters';
import { useLocalization } from "@/contexts/LocalizationContext";

export default function TelemetryIssues() {
  const { t } = useLocalization();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('admin_events')
          .select('*')
          .eq('event_key', 'approvals.no_client_linked')
          .order('created_at', { ascending: false })
          .limit(200);

        if (mounted) setEvents(data || []);
      } catch (err) {
        console.error('Failed loading telemetry events', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t("admin:telemetryUnlinkedApprovals")}</h1>
      {loading ? (
        <div>{t("commonUI.loading") }</div>
      ) : events.length === 0 ? (
        <div>No recent issues found.</div>
      ) : (
        <div className="grid gap-4">
          {events.map((ev) => (
            <Card key={ev.id}>
              <CardContent>
                <div className="text-sm text-muted-foreground">{formatDate(ev.created_at, 'YYYY-MM-DD HH:mm')}</div>
                <pre className="mt-2 text-xs">{JSON.stringify(ev.payload, null, 2)}</pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
