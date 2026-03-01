/**
 * Campaign Worker - BullMQ Worker for Processing WhatsApp Campaigns
 * 
 * This worker processes campaign execution jobs from the queue.
 * It breaks down campaigns into individual message jobs and processes them.
 * Uses Twilio for WhatsApp messaging.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addQueueJob, getNextJob, completeJob, failJob, type QueueJob as _QueueJob } from '../_shared/pg-queue.ts';
import { sendWhatsAppViaTwilio } from '../_shared/providers/twilio.ts';
import { checkRateLimit, incrementRateLimit, checkOptIn } from '../_shared/rate-limiter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface CampaignExecutionJob {
  campaignId: string;
  sendNow?: boolean;
}

export interface MessageSendingJob {
  recipientId: string;
  campaignId: string;
  phoneNumber: string; // E.164 format
  message: string;
  templateName?: string;
  templateParams?: Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
    currency?: { code: string; amount_1000: number };
    date_time?: string;
  }>;
  voiceMessageUrl?: string;
}

const QUEUE_NAMES = {
  CAMPAIGN_EXECUTION: 'whatsapp-campaign-execution',
  MESSAGE_SENDING: 'whatsapp-message-sending',
  VOICE_GENERATION: 'whatsapp-voice-generation',
  WEBHOOK_PROCESSING: 'whatsapp-webhook-processing',
} as const;

/**
 * Process campaign execution job
 */
async function processCampaignJob(job: { id: string; data: CampaignExecutionJob }): Promise<void> {
  const { campaignId, sendNow = false } = job.data;
  
  console.log(`Processing campaign job ${job.id} for campaign ${campaignId}`);

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabaseClient
    .from('outbound_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error(`Campaign not found: ${campaignId}`);
  }

  // Check if campaign is in valid state
  if (!['draft', 'scheduled'].includes(campaign.status)) {
    throw new Error(`Campaign cannot be executed in ${campaign.status} status`);
  }

  // Check scheduling (unless send_now is true)
  if (!sendNow && campaign.scheduled_at) {
    const scheduledTime = new Date(campaign.scheduled_at);
    const now = new Date();
    if (scheduledTime > now) {
      throw new Error(`Campaign is scheduled for ${scheduledTime.toISOString()}`);
    }
  }

  // Update campaign status to sending
  await supabaseClient
    .from('outbound_campaigns')
    .update({
      status: 'sending',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  // Log campaign started
  await supabaseClient.from('campaign_logs').insert({
    campaign_id: campaignId,
    log_level: 'info',
    event_type: 'campaign_started',
    message: `Campaign "${campaign.name}" execution started`,
    metadata: { send_now: sendNow, job_id: job.id },
  });

  // Get all recipients for this campaign
  const { data: recipients, error: recipientsError } = await supabaseClient
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'failed']); // Include failed to allow retry

  if (recipientsError) {
    throw new Error(`Failed to fetch recipients: ${recipientsError.message}`);
  }

  if (!recipients || recipients.length === 0) {
    await supabaseClient
      .from('outbound_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);
    return;
  }

  console.log(`Creating ${recipients.length} message jobs for campaign ${campaignId}`);

  // Create individual message jobs for each recipient
  for (const recipient of recipients) {
    // Ensure message is personalized (call personalization function if needed)
    let personalizedMessage = recipient.personalized_message;
    
    if (!personalizedMessage) {
      // Call personalization function
      const personalizationResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/personalize-campaign-messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            recipient_ids: [recipient.id],
          }),
        }
      );

      if (personalizationResponse.ok) {
        // Refresh recipient data
        const { data: updatedRecipient } = await supabaseClient
          .from('campaign_recipients')
          .select('personalized_message')
          .eq('id', recipient.id)
          .single();

        personalizedMessage = updatedRecipient?.personalized_message || campaign.message_template;
      } else {
        personalizedMessage = campaign.message_template;
      }
    }

    // Create message sending job
    const messageJob: MessageSendingJob = {
      recipientId: recipient.id,
      campaignId: campaignId,
      phoneNumber: recipient.contact_phone,
      message: personalizedMessage,
      voiceMessageUrl: recipient.voice_message_url || undefined,
    };

    // Add job to message queue
    await addQueueJob(QUEUE_NAMES.MESSAGE_SENDING, 'send-message', messageJob, {
      priority: recipient.is_vip ? 1 : 10, // VIPs get higher priority
      maxAttempts: 3,
    });
  }

  console.log(`Campaign job ${job.id} completed: ${recipients.length} message jobs created`);
}

/**
 * Process message sending job
 */
async function processMessageJob(job: { id: string; data: MessageSendingJob }): Promise<void> {
  const { recipientId, campaignId, phoneNumber, message, voiceMessageUrl } = job.data;
  
  console.log(`Processing message job ${job.id} for recipient ${recipientId}`);

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Format phone number (ensure E.164 format)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!formattedPhone.startsWith('+')) {
      // Assume Brazil if no country code
      formattedPhone = '+55' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
    }

    // Check opt-in status (compliance requirement)
    const hasOptedIn = await checkOptIn(formattedPhone);
    if (!hasOptedIn) {
      throw new Error(`Recipient ${formattedPhone} has not opted in. Cannot send message.`);
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(formattedPhone, 1); // Default to Tier 1
    if (!rateLimit.allowed) {
      throw new Error(
        `Rate limit exceeded for ${formattedPhone}. ` +
        `Current: ${rateLimit.currentCount}/${rateLimit.limit}. ` +
        `Resets at: ${rateLimit.resetAt.toISOString()}`
      );
    }

    // Update recipient status to sending
    await supabaseClient
      .from('campaign_recipients')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', recipientId);

    // Twilio credentials
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      throw new Error('Twilio WhatsApp credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
    }

    // Send text message (with optional voice media)
    const result = await sendWhatsAppViaTwilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_FROM,
      formattedPhone,
      message,
      voiceMessageUrl ? { mediaUrl: voiceMessageUrl } : undefined
    );

    if (!result.ok) {
      const errMsg = result.data?.message || JSON.stringify(result.data);
      throw new Error(`WhatsApp send failed: ${errMsg}`);
    }

    const messageId = result.data?.sid;

    // Increment rate limit counter
    await incrementRateLimit(formattedPhone, 1);

    // Update recipient with WhatsApp message ID
    await supabaseClient
      .from('campaign_recipients')
      .update({
        status: 'sent',
        whatsapp_message_id: messageId,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipientId);

    // Log success
    await supabaseClient.from('campaign_logs').insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      log_level: 'success',
      event_type: 'message_sent',
      message: `Message sent to ${formattedPhone}`,
      metadata: {
        whatsapp_message_id: messageId,
        has_voice: !!voiceMessageUrl,
        job_id: job.id,
      },
    });

    console.log(`Message job ${job.id} completed successfully`);

  } catch (error) {
    console.error(`Message job ${job.id} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update recipient status to failed
    await supabaseClient
      .from('campaign_recipients')
      .update({
        status: 'failed',
        error_message: errorMessage,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipientId);

    // Log error
    await supabaseClient.from('campaign_logs').insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      log_level: 'error',
      event_type: 'message_failed',
      message: `Failed to send message: ${errorMessage}`,
      metadata: { error: errorMessage, job_id: job.id },
    });

    throw error; // Let BullMQ handle retry
  }
}

/**
 * Main worker function
 * This runs continuously to process jobs from the queue
 */
/**
 * Process a single job from the queue
 */
async function processJobFromQueue(queueName: string): Promise<{ processed: boolean; jobId?: string }> {
  const job = await getNextJob(queueName);

  if (!job) {
    return { processed: false };
  }

  try {
    if (queueName === QUEUE_NAMES.CAMPAIGN_EXECUTION) {
      await processCampaignJob({
        id: job.id,
        data: job.data as CampaignExecutionJob,
      });
    } else if (queueName === QUEUE_NAMES.MESSAGE_SENDING) {
      await processMessageJob({
        id: job.id,
        data: job.data as MessageSendingJob,
      });
    }

    await completeJob(job.id);
    return { processed: true, jobId: job.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await failJob(job.id, errorMessage);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Health check
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'campaign-worker' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Process jobs from queue
    if (req.method === 'POST') {
      const body = await req.json();
      const { queueName, maxJobs = 10 } = body;

      if (!queueName) {
        throw new Error('queueName is required');
      }

      let processedCount = 0;
      const processedJobIds: string[] = [];

      // Process up to maxJobs from the queue
      for (let i = 0; i < maxJobs; i++) {
        try {
          const result = await processJobFromQueue(queueName);
          if (result.processed && result.jobId) {
            processedCount++;
            processedJobIds.push(result.jobId);
          } else {
            // No more jobs available
            break;
          }
        } catch (error) {
          console.error(`Failed to process job:`, error);
          // Continue processing other jobs
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processed: processedCount,
          jobIds: processedJobIds,
        }),
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
    console.error('Worker error:', error);
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
