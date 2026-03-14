import { serve } from 'https://deno.land/std@0.180.0/http/server.ts';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { sendEmailViaHostinger, sendWhatsAppViaTwilio } from '../_shared/providers/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

serve(async (_req: Request) => {
  try {
    // Basic handler: find due reminders and log found count
    const now = new Date().toISOString();
    // Query candidates where scheduled_at_utc <= now
    const { data, error } = await supabase
      .from('payment_reminder_due_candidates')
      .select('*')
      .lte('scheduled_at_utc', now);

    if (error) {
      console.error('Error querying reminder candidates', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const candidates = data ?? [];
    console.log(`Found ${candidates.length} reminders due`);

    // For each candidate we will insert a reminder_log (pending) and (for now) mark next_run_at
    for (const rem of candidates) {
      try {
        // Determine recipient info from invoice / client
        const { data: invoiceData } = await supabase.from('invoices').select('id,client_contact,client_email,client_phone').eq('id', rem.invoice_id).limit(1).single();

        let recipient = null;
        let sendResult = null;

        if (rem.reminder_type === 'email' && invoiceData?.client_email) {
          recipient = invoiceData.client_email;
          const fromEmail = Deno.env.get('HOSTINGER_EMAIL_ACCOUNT') || Deno.env.get('HOSTINGER_SMTP_USER');
          if (fromEmail) {
            const subject = `Payment reminder: Invoice ${rem.invoice_number ?? rem.invoice_id}`;
            const html = `<p>Dear customer,</p><p>This is a reminder that invoice ${rem.invoice_number ?? rem.invoice_id} is due on ${rem.due_date}.</p>`;
            const hostingerResult = await sendEmailViaHostinger({
              fromEmail,
              fromName: 'CastorWorks',
              html,
              subject,
              to: recipient,
            });
            sendResult = { ok: true, data: hostingerResult };
          }
        } else if (rem.reminder_type === 'whatsapp' && invoiceData?.client_phone) {
          recipient = invoiceData.client_phone;
          const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
          const token = Deno.env.get('TWILIO_AUTH_TOKEN');
          const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM') || Deno.env.get('TWILIO_FROM_NUMBER') || '';
          if (sid && token && fromNumber) {
            const body = `Reminder: Invoice ${rem.invoice_number ?? rem.invoice_id} is due on ${rem.due_date}. Please pay at your convenience.`;
            sendResult = await sendWhatsAppViaTwilio(sid, token, fromNumber, recipient, body);
          }
        }

        await supabase.from('reminder_logs').insert({
          reminder_id: rem.id,
          invoice_id: rem.invoice_id,
          project_id: rem.project_id,
          channel: rem.reminder_type,
          recipient,
          status: sendResult?.ok ? 'sent' : 'failed',
          response: sendResult?.data ?? {},
        });

        // Update next_run_at to avoid duplicate runs (this simple approach sets to now)
        await supabase.from('payment_reminders').update({ next_run_at: new Date().toISOString() }).eq('id', rem.id);
      } catch (err) {
        console.error('Error processing reminder', rem.id, err);
      }
    }

    return new Response(JSON.stringify({ processed: candidates.length }), { status: 200 });
  } catch (err) {
    console.error('Unexpected error', err);
    return new Response(JSON.stringify({ error: 'unexpected' }), { status: 500 });
  }
});
