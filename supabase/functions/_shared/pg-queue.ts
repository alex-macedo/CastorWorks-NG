/**
 * PostgreSQL-based Queue for WhatsApp Campaigns
 * 
 * Since Edge Functions are stateless and BullMQ requires continuous workers,
 * we use PostgreSQL as a queue backend. Jobs are stored in a table and
 * processed by scheduled Edge Functions or cron jobs.
 * 
 * This is simpler and works better with Supabase Edge Functions than BullMQ.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export interface QueueJob<T = unknown> {
  id: string;
  queue_name: string;
  job_name: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
  completed_at?: string;
}

/**
 * Create a Supabase client for queue operations
 */
function getQueueClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Add a job to the queue
 */
export async function addQueueJob<T = unknown>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    priority?: number;
    maxAttempts?: number;
    delay?: number; // Delay in milliseconds
  }
): Promise<{ id: string }> {
  const supabase = getQueueClient();

  const scheduledAt = options?.delay
    ? new Date(Date.now() + options.delay).toISOString()
    : new Date().toISOString();

  const { data: job, error } = await supabase
    .from('queue_jobs')
    .insert({
      queue_name: queueName,
      job_name: jobName,
      data: data as Record<string, unknown>,
      status: 'pending',
      priority: options?.priority || 10,
      attempts: 0,
      max_attempts: options?.maxAttempts || 3,
      scheduled_at: scheduledAt,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to add job to queue: ${error.message}`);
  }

  return { id: job.id };
}

/**
 * Get next job from queue (for processing)
 */
export async function getNextJob(queueName: string): Promise<QueueJob | null> {
  const supabase = getQueueClient();

  const { data: job, error } = await supabase
    .from('queue_jobs')
    .select('*')
    .eq('queue_name', queueName)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !job) {
    return null;
  }

  // Mark job as processing
  await supabase
    .from('queue_jobs')
    .update({
      status: 'processing',
      updated_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  return job as QueueJob;
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string, returnValue?: unknown): Promise<void> {
  const supabase = getQueueClient();

  const { error } = await supabase
    .from('queue_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      return_value: returnValue as Record<string, unknown> | null,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to complete job: ${error.message}`);
  }
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, errorMessage: string, incrementAttempts = true): Promise<void> {
  const supabase = getQueueClient();

  // Get current job to check attempts
  const { data: job } = await supabase
    .from('queue_jobs')
    .select('attempts, max_attempts')
    .eq('id', jobId)
    .single();

  const newAttempts = incrementAttempts && job ? job.attempts + 1 : (job?.attempts || 0);
  const shouldRetry = job && newAttempts < job.max_attempts;

  const { error } = await supabase
    .from('queue_jobs')
    .update({
      status: shouldRetry ? 'pending' : 'failed',
      attempts: newAttempts,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
      // Reschedule for retry with exponential backoff
      scheduled_at: shouldRetry
        ? new Date(Date.now() + Math.pow(2, newAttempts) * 1000).toISOString()
        : undefined,
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`Failed to mark job as failed: ${error.message}`);
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<QueueJob | null> {
  const supabase = getQueueClient();

  const { data: job, error } = await supabase
    .from('queue_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return null;
  }

  return job as QueueJob;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const supabase = getQueueClient();

  const { data: stats, error } = await supabase
    .from('queue_jobs')
    .select('status')
    .eq('queue_name', queueName);

  if (error) {
    throw new Error(`Failed to get queue stats: ${error.message}`);
  }

  return {
    pending: stats.filter((s) => s.status === 'pending').length,
    processing: stats.filter((s) => s.status === 'processing').length,
    completed: stats.filter((s) => s.status === 'completed').length,
    failed: stats.filter((s) => s.status === 'failed').length,
  };
}

/**
 * Clean up old completed jobs (keep last N)
 */
export async function cleanupQueue(
  queueName: string,
  keepLast: number = 1000
): Promise<number> {
  const supabase = getQueueClient();

  // Get IDs of jobs to keep
  const { data: keepJobs } = await supabase
    .from('queue_jobs')
    .select('id')
    .eq('queue_name', queueName)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(keepLast);

  const keepIds = keepJobs?.map((j) => j.id) || [];

  if (keepIds.length === 0) {
    return 0;
  }

  // Delete old completed jobs
  const { error } = await supabase
    .from('queue_jobs')
    .delete()
    .eq('queue_name', queueName)
    .eq('status', 'completed')
    .not('id', 'in', `(${keepIds.join(',')})`);

  if (error) {
    throw new Error(`Failed to cleanup queue: ${error.message}`);
  }

  // Count how many were deleted (approximate)
  const { count: _count } = await supabase
    .from('queue_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('queue_name', queueName)
    .eq('status', 'completed');

  // This is approximate - actual deleted count would require a before/after query
  return 0; // Return 0 for now, cleanup is best-effort
}
