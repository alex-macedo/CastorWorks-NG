import {
  executeUpdateTasksUntilToday,
  extractProjectIdentifier,
} from './superBotUpdateTasks.ts'

type SupabaseLike = {
  from: (table: string) => any
  rpc: (fn: string, args: Record<string, unknown>) => any
}

type RetryQueueJob = Record<string, unknown> & {
  id: string
  intent?: string | null
  attempts?: number | null
  max_attempts?: number | null
  backoff_seconds?: number | null
  payload?: Record<string, unknown> | null
}

type RetryReplayResult = {
  outcome: string
  details: Record<string, unknown>
}

const nowDate = () => new Date().toISOString().slice(0, 10)

const getPayloadObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const getString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null

const updateQueueJob = async (supabase: SupabaseLike, jobId: string, updates: Record<string, unknown>) => {
  const { error } = await supabase
    .from('castormind_retry_queue')
    .update(updates)
    .eq('id', jobId)

  if (error) throw error
}

const logRetryEvent = async (
  supabase: SupabaseLike,
  level: 'info' | 'warning' | 'error',
  message: string,
  category: string,
  context: Record<string, unknown>,
  severity: 'low' | 'medium' | 'high' = 'low',
) => {
  await supabase.rpc('log_message', {
    p_level: level,
    p_message: message,
    p_context: context,
    p_category: category,
    p_component: 'process-super-bot-retry-queue',
    p_severity: severity,
  })
}

export async function replayRetryableIntent(
  supabase: SupabaseLike,
  job: RetryQueueJob,
): Promise<RetryReplayResult> {
  const intent = String(job.intent || 'unknown')
  const payload = getPayloadObject(job.payload)
  const llmIntent = getPayloadObject(payload.llm_intent)

  if (intent === 'update_tasks_until_today') {
    const projectIdentifier = getString(llmIntent.project_identifier) || extractProjectIdentifier(String(payload.message || ''))
    const untilDate = getString(llmIntent.until_date) && llmIntent.until_date !== 'current_date'
      ? String(llmIntent.until_date)
      : nowDate()

    const operation = await executeUpdateTasksUntilToday({
      supabase,
      projectIdentifier,
      untilDate,
      forceUpdate: Boolean(payload.forceUpdate) || Boolean(llmIntent.force_update),
      overridePhrase: getString(payload.overridePhrase) || getString(llmIntent.override_phrase),
    })

    return {
      outcome: operation.outcome,
      details: operation as Record<string, unknown>,
    }
  }

  throw new Error('Intent is not retryable by worker')
}

export async function processRetryQueueJob(params: {
  supabase: SupabaseLike
  job: RetryQueueJob
  now?: Date
  replayIntent?: (supabase: SupabaseLike, job: RetryQueueJob) => Promise<RetryReplayResult>
}) {
  const { supabase, job } = params
  const replayIntent = params.replayIntent || replayRetryableIntent
  const now = params.now || new Date()
  const nowIso = now.toISOString()
  const intent = String(job.intent || 'unknown')
  const attempts = Number(job.attempts || 0) + 1
  const maxAttempts = Number(job.max_attempts || 5)
  const backoff = Math.max(60, Number(job.backoff_seconds || 60) * 2)
  const willExhaust = attempts >= maxAttempts

  await updateQueueJob(supabase, String(job.id), {
    status: 'processing',
    attempts,
    updated_at: nowIso,
  })

  await logRetryEvent(
    supabase,
    'info',
    'Retry job processing started',
    'ai.superbot.queue.retrying',
    { queue_job_id: job.id, intent, attempts, max_attempts: maxAttempts },
  )

  try {
    const replayResult = await replayIntent(supabase, job)

    await updateQueueJob(supabase, String(job.id), {
      status: 'succeeded',
      completed_at: nowIso,
      updated_at: nowIso,
      last_error: null,
    })

    await logRetryEvent(
      supabase,
      'info',
      'Retry job succeeded',
      'ai.superbot.queue.succeeded',
      { queue_job_id: job.id, intent, attempts, replay_outcome: replayResult.outcome, replay_result: replayResult.details },
    )

    return { status: 'succeeded' as const, replayResult }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (willExhaust) {
      await updateQueueJob(supabase, String(job.id), {
        status: 'exhausted',
        completed_at: nowIso,
        updated_at: nowIso,
        last_error: errorMessage,
      })

      await logRetryEvent(
        supabase,
        'warning',
        'Retry job exhausted',
        'ai.superbot.queue.exhausted',
        { queue_job_id: job.id, intent, attempts, max_attempts: maxAttempts, error: errorMessage },
        'medium',
      )

      return { status: 'exhausted' as const, error: errorMessage }
    }

    const nextRunAt = new Date(now.getTime() + backoff * 1000).toISOString()
    await updateQueueJob(supabase, String(job.id), {
      status: 'queued',
      next_run_at: nextRunAt,
      backoff_seconds: backoff,
      updated_at: nowIso,
      last_error: errorMessage,
    })

    await logRetryEvent(
      supabase,
      'warning',
      'Retry job requeued',
      'ai.superbot.queue.requeued',
      { queue_job_id: job.id, intent, attempts, max_attempts: maxAttempts, next_run_at: nextRunAt, error: errorMessage },
      'medium',
    )

    return { status: 'queued' as const, error: errorMessage, nextRunAt, backoffSeconds: backoff }
  }
}
