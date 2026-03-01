/**
 * Execute Campaign - Queue-Based Campaign Execution
 * 
 * This function queues campaign execution jobs instead of processing synchronously.
 * The actual processing happens via the campaign-worker function.
 * 
 * Migration from Twilio to WhatsApp Cloud API + Queue System
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/authorization.ts';
import { addQueueJob } from '../_shared/pg-queue.ts';
import type { CampaignExecutionJob } from '../campaign-worker/index.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecuteCampaignRequest {
  campaign_id: string;
  send_now?: boolean; // Override scheduled_at
}

interface ExecuteCampaignResponse {
  success: boolean;
  campaign_id: string;
  status: string;
  job_id?: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user (service role or authenticated user)
    const authHeader = req.headers.get('authorization');
    const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY);

    if (!isServiceRole) {
      await authenticateRequest(req);
    }

    // Parse request
    const requestData: ExecuteCampaignRequest = await req.json();
    const { campaign_id, send_now = false } = requestData;

    if (!campaign_id) {
      throw new Error('campaign_id is required');
    }

    console.log(`Queueing campaign ${campaign_id} for execution, send_now: ${send_now}`);

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('outbound_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaign_id}`);
    }

    // Check if campaign is in valid state to execute
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      throw new Error(`Campaign cannot be executed in ${campaign.status} status`);
    }

    // Check scheduling (unless send_now is true)
    if (!send_now && campaign.scheduled_at) {
      const scheduledTime = new Date(campaign.scheduled_at);
      const now = new Date();
      if (scheduledTime > now) {
        // For scheduled campaigns, calculate delay
        const delayMs = scheduledTime.getTime() - now.getTime();
        
        // Add job to queue with delay
        const jobData: CampaignExecutionJob = {
          campaignId: campaign_id,
          sendNow: false,
        };

        const { id: jobId } = await addQueueJob(
          'whatsapp-campaign-execution',
          'execute-campaign',
          jobData,
          {
            delay: delayMs,
            priority: 10,
            maxAttempts: 3,
          }
        );

        // Update campaign status to scheduled
        await supabaseClient
          .from('outbound_campaigns')
          .update({
            status: 'scheduled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaign_id);

        // Log campaign queued
        await supabaseClient.from('campaign_logs').insert({
          campaign_id,
          log_level: 'info',
          event_type: 'campaign_queued',
          message: `Campaign "${campaign.name}" queued for execution at ${scheduledTime.toISOString()}`,
          metadata: { job_id: jobId, send_now: false, scheduled_at: campaign.scheduled_at },
        });

        return new Response(
          JSON.stringify({
            success: true,
            campaign_id,
            status: 'scheduled',
            job_id: jobId,
            message: `Campaign queued for execution at ${scheduledTime.toISOString()}`,
          } as ExecuteCampaignResponse),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    // For immediate execution, add job to queue with high priority
    const jobData: CampaignExecutionJob = {
      campaignId: campaign_id,
      sendNow: send_now,
    };

    const { id: jobId } = await addQueueJob(
      'whatsapp-campaign-execution',
      'execute-campaign',
      jobData,
      {
        priority: send_now ? 1 : 10, // Higher priority for immediate sends
        maxAttempts: 3,
      }
    );

    // Update campaign status to sending (will be processed by worker)
    await supabaseClient
      .from('outbound_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaign_id);

    // Log campaign queued
    await supabaseClient.from('campaign_logs').insert({
      campaign_id,
      log_level: 'info',
      event_type: 'campaign_queued',
      message: `Campaign "${campaign.name}" queued for execution`,
      metadata: { job_id: jobId, send_now },
    });

    console.log(`Campaign ${campaign_id} queued with job ID ${jobId}`);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        status: 'sending',
        job_id: jobId,
        message: 'Campaign queued for execution',
      } as ExecuteCampaignResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Campaign execution error:', error);

    const errorResponse: ExecuteCampaignResponse = {
      success: false,
      campaign_id: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
