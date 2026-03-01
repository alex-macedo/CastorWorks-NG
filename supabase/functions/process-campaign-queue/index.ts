/**
 * Process Campaign Queue - Scheduled Function
 * 
 * This function should be called periodically (via Supabase Cron or external scheduler)
 * to process jobs from the campaign queue.
 * 
 * Recommended: Run every 1-5 minutes depending on campaign volume
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient as _createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify this is called by cron or service role
    const authHeader = req.headers.get('authorization');
    const isServiceRole = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY);
    const cronSecret = Deno.env.get('CRON_SECRET');
    const cronHeader = req.headers.get('x-cron-secret');

    if (!isServiceRole && (!cronSecret || cronHeader !== cronSecret)) {
      return new Response('Unauthorized', {
        headers: corsHeaders,
        status: 401,
      });
    }

    const maxJobsPerQueue = 50; // Process up to 50 jobs per queue per run
    const queues = [
      'whatsapp-campaign-execution',
      'whatsapp-message-sending',
      'whatsapp-voice-generation',
    ];

    const results: Record<string, { processed: number; errors: number }> = {};

    // Process each queue
    for (const queueName of queues) {
      let processed = 0;
      let errors = 0;

      // Call campaign-worker to process jobs
      for (let i = 0; i < maxJobsPerQueue; i++) {
        try {
          const workerResponse = await fetch(
            `${SUPABASE_URL}/functions/v1/campaign-worker`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                queueName,
                maxJobs: 1, // Process one at a time
              }),
            }
          );

          if (!workerResponse.ok) {
            errors++;
            break; // Stop processing this queue on error
          }

          const workerResult = await workerResponse.json();
          if (workerResult.processed === 0) {
            // No more jobs in this queue
            break;
          }

          processed += workerResult.processed || 0;
        } catch (error) {
          console.error(`Error processing queue ${queueName}:`, error);
          errors++;
          break;
        }
      }

      results[queueName] = { processed, errors };
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Queue processor error:', error);
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
