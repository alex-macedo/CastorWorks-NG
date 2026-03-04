/**
 * Edge Function: execute-trial-emails
 * Processes trial_reminder_due_candidates and trial_expiration_email_queue.
 * Invoke daily via Supabase cron or external scheduler: POST /functions/v1/execute-trial-emails (no body).
 */

import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { sendEmailViaResend } from '../_shared/providers/index.ts';
import { trialEmailCopy } from '../_shared/trialEmailCopy.ts';
import {
  buildTrialReminderHtml,
  buildTrialExpirationHtml,
} from '../_shared/trialEmailTemplates.ts';
import type { TrialEmailLocale } from '../_shared/trialEmailCopy.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function formatExpiryDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

function resolveLocale(settings: Record<string, unknown> | null): TrialEmailLocale {
  const loc = settings?.locale as string | undefined;
  if (loc === 'pt-BR' || loc === 'es-ES' || loc === 'fr-FR' || loc === 'en-US') {
    return loc;
  }
  return 'en-US';
}

serve(async (_req: Request) => {
  const results = { remindersSent: 0, expirationSent: 0, errors: [] as string[] };

  try {
    if (!RESEND_API_KEY) {
      results.errors.push('RESEND_API_KEY not configured');
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Process trial reminders
    const { data: reminderCandidates, error: remErr } = await supabase
      .from('trial_reminder_due_candidates')
      .select('tenant_id, reminder_days, recipient_email, trial_ends_at, tenant_name, settings');

    if (remErr) {
      results.errors.push(`Reminder query: ${remErr.message}`);
    } else if (reminderCandidates?.length) {
      for (const c of reminderCandidates) {
        try {
          const locale = resolveLocale((c.settings as Record<string, unknown>) ?? null);
          const expiryDate = formatExpiryDate(c.trial_ends_at ?? '');
          const emailType =
            c.reminder_days === 7
              ? 'reminder_7d'
              : c.reminder_days === 3
                ? 'reminder_3d'
                : 'reminder_1d';
          const subject = trialEmailCopy[locale][emailType].subject;
          const html = buildTrialReminderHtml(
            c.tenant_name ?? 'Your workspace',
            c.reminder_days ?? 7,
            expiryDate,
            locale,
            trialEmailCopy
          );
          const sendResult = await sendEmailViaResend(
            RESEND_API_KEY,
            c.recipient_email ?? '',
            subject,
            html
          );
          const status = sendResult?.ok ? 'sent' : 'failed';
          await supabase.from('trial_email_logs').insert({
            tenant_id: c.tenant_id,
            email_type: emailType,
            recipient_email: c.recipient_email,
            status
          });
          if (sendResult?.ok) results.remindersSent++;
        } catch (err) {
          results.errors.push(
            `Reminder tenant ${c.tenant_id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    // 2. Process expiration queue
    const { data: queueRows, error: queueErr } = await supabase
      .from('trial_expiration_email_queue')
      .select('id, tenant_id')
      .is('processed_at', null);

    if (queueErr) {
      results.errors.push(`Queue query: ${queueErr.message}`);
    } else if (queueRows?.length) {
      for (const row of queueRows) {
        try {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, primary_contact_email, opt_out_trial_emails, settings')
            .eq('id', row.tenant_id)
            .single();

          if (!tenant) {
            await supabase
              .from('trial_expiration_email_queue')
              .update({ processed_at: new Date().toISOString() })
              .eq('id', row.id);
            continue;
          }

          if (tenant.opt_out_trial_emails) {
            await supabase
              .from('trial_expiration_email_queue')
              .update({ processed_at: new Date().toISOString() })
              .eq('id', row.id);
            continue;
          }

          let recipient: string | null = tenant.primary_contact_email ?? null;
          if (!recipient) {
            const { data: ownerRow } = await supabase
              .from('tenant_users')
              .select('user_id')
              .eq('tenant_id', row.tenant_id)
              .eq('is_owner', true)
              .limit(1)
              .single();
            if (ownerRow?.user_id) {
              const { data: profile } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('user_id', ownerRow.user_id)
                .single();
              recipient = profile?.email ?? null;
            }
          }

          if (!recipient) {
            await supabase
              .from('trial_expiration_email_queue')
              .update({ processed_at: new Date().toISOString() })
              .eq('id', row.id);
            continue;
          }

          const locale = resolveLocale(tenant.settings as Record<string, unknown> ?? null);
          const subject = trialEmailCopy[locale].expiration.subject;
          const html = buildTrialExpirationHtml(
            tenant.name ?? 'Your workspace',
            locale,
            trialEmailCopy
          );
          const sendResult = await sendEmailViaResend(RESEND_API_KEY, recipient, subject, html);
          const status = sendResult?.ok ? 'sent' : 'failed';
          await supabase.from('trial_email_logs').insert({
            tenant_id: row.tenant_id,
            email_type: 'expiration',
            recipient_email: recipient,
            status
          });
          if (sendResult?.ok) results.expirationSent++;
          await supabase
            .from('trial_expiration_email_queue')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', row.id);
        } catch (err) {
          results.errors.push(
            `Expiration queue ${row.id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    results.errors.push(err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify(results), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
