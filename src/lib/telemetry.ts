import { supabase } from '@/integrations/supabase/client';

export async function logAdminEvent(event: string, details?: Record<string, any>) {
  try {
    // Local debug
    console.debug('[telemetry] event=', event, details || {});

    // Fire-and-forget: record server-side via Supabase Function
    try {
      await supabase.functions.invoke('record_admin_event', {
        body: { event_key: event, payload: details || {} },
      });
    } catch (err) {
      // do not fail the caller
      console.debug('[telemetry] record failed', err);
    }
  } catch (err) {
    // swallow
  }
}
