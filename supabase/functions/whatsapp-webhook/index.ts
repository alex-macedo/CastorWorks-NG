/**
 * WhatsApp Webhook Handler
 *
 * Handles incoming webhooks from WhatsApp Cloud API for:
 * - Message status updates (sent, delivered, read, failed)
 * - Message received (for two-way communication + CastorMind AI Auto-Responder)
 * - Webhook verification (required by Meta)
 *
 * WA-8.1: AI Auto-Responder - CastorMind AI answers incoming queries based on project data
 */

// deno-lint-ignore no-import-prefix
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// deno-lint-ignore no-import-prefix
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleAiAutoRespond } from '../_shared/whatsappAiAutoRespond.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: 'whatsapp';
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
            error_data?: {
              details: string;
            };
          }>;
        }>;
      }>;
    };
    field: string;
  }>;
}

interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Webhook verification (GET request from Meta)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge: challenge?.substring(0, 20) });

      // Verify the webhook token
      if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 200,
        });
      } else {
        console.error('Webhook verification failed:', { mode, tokenMatch: token === WHATSAPP_WEBHOOK_VERIFY_TOKEN });
        return new Response('Verification failed', {
          headers: corsHeaders,
          status: 403,
        });
      }
    }

    // Handle webhook events (POST request from Meta)
    if (req.method === 'POST') {
      const payload: WebhookPayload = await req.json();
      console.log('Webhook received:', JSON.stringify(payload, null, 2));

      // Verify this is a WhatsApp webhook
      if (payload.object !== 'whatsapp_business_account') {
        console.warn('Invalid webhook object:', payload.object);
        return new Response('Invalid webhook object', {
          headers: corsHeaders,
          status: 400,
        });
      }

      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Process each entry
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const value = change.value;

          // Handle message status updates
          if (value.messages) {
            for (const message of value.messages) {
              // Handle status updates (sent, delivered, read, failed)
              if (message.statuses && message.statuses.length > 0) {
                for (const status of message.statuses) {
                  await handleStatusUpdate(supabaseClient, status);
                }
              }

              // Handle incoming messages (for two-way communication, opt-out, and AI auto-respond)
              if (message.text && message.from) {
                const messageText = message.text.body.trim().toUpperCase();
                const phoneNumberId = value.metadata?.phone_number_id;

                // Handle opt-out keywords
                if (messageText === 'STOP' || messageText === 'UNSUBSCRIBE' || messageText === 'CANCELAR') {
                  await handleOptOut(supabaseClient, message.from);
                } else {
                  await handleIncomingMessage(supabaseClient, {
                    from: message.from,
                    messageId: message.id,
                    text: message.text.body,
                    timestamp: message.timestamp,
                    phoneNumberId,
                  });
                }
              }
            }
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    return new Response('Method not allowed', {
      headers: corsHeaders,
      status: 405,
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Handle message status updates (sent, delivered, read, failed)
 */
async function handleStatusUpdate(
  // deno-lint-ignore no-explicit-any
  supabase: any, // SupabaseClient type
  status: {
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
    errors?: Array<{
      code: number;
      title: string;
      message: string;
    }>;
  }
) {
  console.log('Processing status update:', status);

  // Find recipient by WhatsApp message ID
  const { data: recipient, error: findError } = await supabase
    .from('campaign_recipients')
    .select('id, campaign_id, status')
    .eq('whatsapp_message_id', status.id)
    .single();

  if (findError || !recipient) {
    console.warn('Recipient not found for message ID:', status.id);
    return;
  }

  // Map WhatsApp status to our status
  let newStatus: string;
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  switch (status.status) {
    case 'sent':
      newStatus = 'sent';
      updateData.sent_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      break;
    case 'delivered':
      newStatus = 'delivered';
      updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      break;
    case 'read':
      newStatus = 'delivered'; // We don't have a 'read' status, use 'delivered'
      updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      break;
    case 'failed':
      newStatus = 'failed';
      updateData.failed_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
      updateData.error_message = status.errors?.[0]?.message || 'Message delivery failed';
      updateData.error_code = status.errors?.[0]?.code?.toString() || '';
      break;
    default:
      console.warn('Unknown status:', status.status);
      return;
  }

  updateData.status = newStatus;
  updateData.whatsapp_status = status.status;
  updateData.whatsapp_timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();

  // Update recipient status
  const { error: updateError } = await supabase
    .from('campaign_recipients')
    .update(updateData)
    .eq('id', recipient.id);

  if (updateError) {
    console.error('Failed to update recipient status:', updateError);
    return;
  }

  // Log the status update
  await supabase.from('campaign_logs').insert({
    campaign_id: recipient.campaign_id,
    recipient_id: recipient.id,
    log_level: status.status === 'failed' ? 'error' : 'success',
    event_type: `message_${status.status}`,
    message: `Message ${status.status} for recipient`,
    metadata: {
      whatsapp_message_id: status.id,
      status: status.status,
      timestamp: status.timestamp,
      errors: status.errors,
    },
  });

  console.log(`Updated recipient ${recipient.id} status to ${newStatus}`);
}

/**
 * Handle incoming messages: log and optionally AI auto-respond (WA-8.1)
 */
async function handleIncomingMessage(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  message: {
    from: string;
    messageId: string;
    text: string;
    timestamp: string;
    phoneNumberId?: string;
  }
) {
  console.log('Processing incoming message:', message)

  // Note: campaign_logs requires campaign_id; use whatsapp_ai_auto_responder_logs via handleAiAutoRespond

  // WA-8.1: CastorMind AI Auto-Responder (if enabled)
  try {
    const result = await handleAiAutoRespond(supabase, {
      fromPhone: message.from,
      text: message.text,
      phoneNumberId: message.phoneNumberId,
    });
    if (result.sent) {
      console.log('[WhatsApp AI Auto-Respond] Reply sent to', message.from);
    } else if (result.error) {
      console.warn('[WhatsApp AI Auto-Respond]', result.error);
    }
  } catch (err) {
    console.error('[WhatsApp AI Auto-Respond] Error:', err);
  }
}

/**
 * Handle opt-out request (STOP, UNSUBSCRIBE, CANCELAR)
 */
async function handleOptOut(
  // deno-lint-ignore no-explicit-any
  supabase: any, // SupabaseClient type
  phoneNumber: string
) {
  console.log('Processing opt-out request from:', phoneNumber);

  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

  // Check if record exists
  const { data: existing } = await supabase
    .from('whatsapp_opt_ins')
    .select('id, opted_in')
    .eq('phone_number', phoneWithPlus)
    .single();

  if (existing) {
    // Update existing record
    await supabase
      .from('whatsapp_opt_ins')
      .update({
        opted_in: false,
        opted_out_at: new Date().toISOString(),
        source: 'webhook',
        notes: 'User sent STOP/UNSUBSCRIBE message',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    // Create new record
    await supabase.from('whatsapp_opt_ins').insert({
      phone_number: phoneWithPlus,
      opted_in: false,
      opted_out_at: new Date().toISOString(),
      source: 'webhook',
      notes: 'User sent STOP/UNSUBSCRIBE message',
    });
  }

  // Log opt-out
  await supabase.from('campaign_logs').insert({
    log_level: 'info',
    event_type: 'opt_out',
    message: `User ${phoneWithPlus} opted out via WhatsApp`,
    metadata: {
      phone_number: phoneWithPlus,
      source: 'webhook',
    },
  });

  console.log(`Opt-out recorded for ${phoneWithPlus}`);
}
