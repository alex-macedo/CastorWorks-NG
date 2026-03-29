import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceRoleClient } from '../_shared/authorization.ts'
import { processRetryQueueJob } from '../_shared/superBotRetryQueue.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const expected = `Bearer ${
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    }`;
    if (!authHeader || authHeader !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const createClient = overrides.createServiceRoleClient ||
      createServiceRoleClient;
    const supabase = createClient();
    const nowIso = new Date().toISOString();

    const { data: jobs, error } = await supabase
      .from("castormind_retry_queue")
      .select("*")
      .eq("status", "queued")
      .lte("next_run_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    const items = jobs || [];
    let processed = 0;
    let succeeded = 0;
    let exhausted = 0;

    for (const job of items) {
      processed += 1
      const result = await processRetryQueueJob({ supabase, job, now: new Date() })

      if (result.status === 'succeeded') {
        succeeded += 1
      } else if (result.status === 'exhausted') {
        exhausted += 1
      }
    }

    return new Response(
      JSON.stringify({ processed, succeeded, exhausted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
})
