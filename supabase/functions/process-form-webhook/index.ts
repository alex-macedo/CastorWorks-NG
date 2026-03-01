import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const processWebhookSchema = z.object({
  formId: z.string().uuid(),
  responseId: z.string().uuid(),
  event: z.enum(['response.completed', 'response.started', 'response.updated']),
});

interface WebhookPayload {
  event: string;
  formId: string;
  responseId: string;
  response: any;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const validated = processWebhookSchema.parse(requestData);
    const { formId, responseId, event } = validated;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch configured webhooks for this form and event
    const { data: webhooks, error: webhooksError } = await supabase
      .from('form_webhooks')
      .select('*')
      .eq('form_id', formId)
      .eq('is_active', true);

    if (webhooksError) {
      throw new Error(`Failed to fetch webhooks: ${webhooksError.message}`);
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active webhooks configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter webhooks by event
    const relevantWebhooks = webhooks.filter(webhook => {
      const events = webhook.events as string[];
      return events.includes(event);
    });

    if (relevantWebhooks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No webhooks configured for this event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch response data
    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .select(`
        *,
        answers:form_response_answers(
          *,
          question:form_questions(*)
        )
      `)
      .eq('id', responseId)
      .single();

    if (responseError || !response) {
      throw new Error('Response not found');
    }

    // Build webhook payload
    const payload: WebhookPayload = {
      event,
      formId,
      responseId,
      response,
      timestamp: new Date().toISOString(),
    };

    const results = [];

    // Process each webhook
    for (const webhook of relevantWebhooks) {
      const result = await deliverWebhook(webhook, payload, supabase);
      results.push({
        webhookId: webhook.id,
        url: webhook.url,
        ...result,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function deliverWebhook(
  webhook: any,
  payload: WebhookPayload,
  supabase: any
): Promise<{ status: 'success' | 'failed'; error?: string; attempts: number }> {
  const maxAttempts = 3;
  const baseDelay = 1000; // 1 second
  
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Generate HMAC signature if secret is configured
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'CastorWorks-Forms/1.0',
        'X-CastorWorks-Event': payload.event,
        'X-CastorWorks-Delivery': crypto.randomUUID(),
      };

      if (webhook.secret) {
        const signature = generateHmacSignature(
          JSON.stringify(payload),
          webhook.secret
        );
        headers['X-CastorWorks-Signature'] = signature;
      }

      // Send webhook request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Success - update webhook status
        await supabase
          .from('form_webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq('id', webhook.id);

        return { status: 'success', attempts: attempt };
      } else {
        lastError = `HTTP ${response.status}: ${await response.text()}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle abort/timeout specially
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = 'Request timeout (10s exceeded)';
      }
    }

    // Exponential backoff before retry
    if (attempt < maxAttempts) {
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed - update failure count
  const newFailureCount = (webhook.failure_count || 0) + 1;
  const shouldDisable = newFailureCount >= 10;

  await supabase
    .from('form_webhooks')
    .update({
      failure_count: newFailureCount,
      is_active: !shouldDisable,
      last_triggered_at: new Date().toISOString(),
    })
    .eq('id', webhook.id);

  if (shouldDisable) {
    console.error(`Webhook ${webhook.id} disabled after 10 consecutive failures`);
  }

  return {
    status: 'failed',
    error: lastError,
    attempts: maxAttempts,
  };
}

function generateHmacSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}
