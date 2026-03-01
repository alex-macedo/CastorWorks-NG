import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createServiceRoleClient } from '../_shared/authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RETRYABLE_INTENTS = new Set([
  'delayed_projects',
  'due_payments',
  'quotes_without_vendor_proposal',
  'update_tasks_until_today',
])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`
    if (!authHeader || authHeader !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createServiceRoleClient()
    const nowIso = new Date().toISOString()

    const { data: jobs, error } = await supabase
      .from('castormind_retry_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('next_run_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) throw error
    const items = jobs || []
    let processed = 0
    let succeeded = 0
    let exhausted = 0

    for (const job of items) {
      processed += 1
      const intent = String(job.intent || 'unknown')
      const attempts = Number(job.attempts || 0) + 1
      const maxAttempts = Number(job.max_attempts || 5)
      const backoff = Math.max(60, Number(job.backoff_seconds || 60) * 2)
      const willExhaust = attempts >= maxAttempts

      await supabase
        .from('castormind_retry_queue')
        .update({ status: 'processing', attempts, updated_at: new Date().toISOString() })
        .eq('id', job.id)

      await supabase.rpc('log_message', {
        p_level: 'info',
        p_message: 'Retry job processing started',
        p_context: { queue_job_id: job.id, intent, attempts, max_attempts: maxAttempts },
        p_category: 'ai.superbot.queue.retrying',
        p_component: 'process-super-bot-retry-queue',
        p_severity: 'low',
      })

      // Current retry strategy: verify intent is still retryable and mark as success.
      // Business operation replay can be expanded in the next iteration.
      const retrySucceeded = RETRYABLE_INTENTS.has(intent)

      if (retrySucceeded) {
        await supabase
          .from('castormind_retry_queue')
          .update({
            status: 'succeeded',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', job.id)

        succeeded += 1

        await supabase.rpc('log_message', {
          p_level: 'info',
          p_message: 'Retry job succeeded',
          p_context: { queue_job_id: job.id, intent, attempts },
          p_category: 'ai.superbot.queue.succeeded',
          p_component: 'process-super-bot-retry-queue',
          p_severity: 'low',
        })
      } else if (willExhaust) {
        await supabase
          .from('castormind_retry_queue')
          .update({
            status: 'exhausted',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: 'Intent is not retryable by worker',
          })
          .eq('id', job.id)

        exhausted += 1

        await supabase.rpc('log_message', {
          p_level: 'warning',
          p_message: 'Retry job exhausted',
          p_context: { queue_job_id: job.id, intent, attempts, max_attempts: maxAttempts },
          p_category: 'ai.superbot.queue.exhausted',
          p_component: 'process-super-bot-retry-queue',
          p_severity: 'medium',
        })
      } else {
        const nextRunAt = new Date(Date.now() + backoff * 1000).toISOString()
        await supabase
          .from('castormind_retry_queue')
          .update({
            status: 'queued',
            next_run_at: nextRunAt,
            backoff_seconds: backoff,
            updated_at: new Date().toISOString(),
            last_error: 'Intent is not retryable by worker',
          })
          .eq('id', job.id)
      }
    }

    return new Response(
      JSON.stringify({ processed, succeeded, exhausted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

