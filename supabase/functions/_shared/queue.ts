/**
 * BullMQ Queue Setup for WhatsApp Campaigns
 * 
 * Provides queue management for:
 * - Campaign execution jobs
 * - Individual message sending jobs
 * - Voice message generation jobs
 * - Webhook processing jobs
 * 
 * Requires Redis connection (Upstash Redis recommended for serverless)
 */

interface RedisConnection {
  host?: string;
  port?: number;
  password?: string;
  username?: string;
  url?: string; // Full Redis URL (e.g., redis://default:password@host:port)
}

interface QueueConfig {
  connection: RedisConnection;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
  };
  limiter?: {
    max: number;
    duration: number;
  };
}

/**
 * Parse Redis URL into connection object
 */
function parseRedisUrl(url: string): RedisConnection {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      url,
    };
  } catch (_error) {
    throw new Error(`Invalid Redis URL: ${url}`);
  }
}

/**
 * Get Redis connection from environment
 */
function getRedisConnection(): RedisConnection {
  const redisUrl = Deno.env.get('REDIS_URL');

  if (!redisUrl) {
    throw new Error(
      'REDIS_URL environment variable is required. ' +
      'Set it to your Redis connection URL (e.g., redis://default:password@host:port)'
    );
  }

  return parseRedisUrl(redisUrl);
}

/**
 * Create queue configuration
 */
export function createQueueConfig(): QueueConfig {
  const connection = getRedisConnection();

  return {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2 seconds, exponential backoff
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    },
    limiter: {
      max: 1000, // Tier 1 rate limit: 1000 messages per 24 hours
      duration: 86400000, // 24 hours in milliseconds
    },
  };
}

/**
 * Queue names for different job types
 */
export const QUEUE_NAMES = {
  CAMPAIGN_EXECUTION: 'whatsapp-campaign-execution',
  MESSAGE_SENDING: 'whatsapp-message-sending',
  VOICE_GENERATION: 'whatsapp-voice-generation',
  WEBHOOK_PROCESSING: 'whatsapp-webhook-processing',
} as const;

/**
 * Job data types
 */
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

export interface VoiceGenerationJob {
  recipientId: string;
  messageText: string;
  language?: string;
}

export interface WebhookProcessingJob {
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Create a BullMQ Queue instance
 * Note: This is a factory function that returns queue configuration
 * Actual queue creation happens in worker functions
 */
export async function createQueue<T = unknown>(
  queueName: string,
  config?: Partial<QueueConfig>
): Promise<any> {
  // Dynamic import of BullMQ (npm package)
  // In Deno 2, we can use npm: specifier
  const { Queue } = await import('npm:bullmq@5');

  const queueConfig = createQueueConfig();
  const finalConfig = { ...queueConfig, ...config };

  return new Queue<T>(queueName, finalConfig);
}

/**
 * Create a BullMQ Worker instance
 */
export async function createWorker<T = unknown>(
  queueName: string,
  processor: (job: { id: string; data: T }) => Promise<void>,
  config?: Partial<QueueConfig>
): Promise<any> {
  // Dynamic import of BullMQ
  const { Worker } = await import('npm:bullmq@5');

  const queueConfig = createQueueConfig();
  const finalConfig = { ...queueConfig, ...config };

  return new Worker<T>(queueName, async (job) => {
    try {
      await processor(job);
  } catch (_error) {
      console.error(`Job ${job.id} failed:`, _error);
      throw _error; // Let BullMQ handle retries
    }
  }, finalConfig);
}

/**
 * Add job to queue
 */
export async function addJob<T = unknown>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
  }
): Promise<{ id: string }> {
  const queue = await createQueue<T>(queueName);
  
  const job = await queue.add(jobName, data, options);
  
  // Close queue connection after adding job
  await queue.close();
  
  return { id: job.id! };
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<{
  id: string;
  state: string;
  progress: number;
  data: unknown;
  returnvalue?: unknown;
  failedReason?: string;
}> {
  const queue = await createQueue(queueName);
  
  const job = await queue.getJob(jobId);
  
  if (!job) {
    await queue.close();
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();
  const progress = job.progress;
  const data = job.data;
  const returnvalue = job.returnvalue;
  const failedReason = job.failedReason;

  await queue.close();

  return {
    id: job.id!,
    state,
    progress: typeof progress === 'number' ? progress : 0,
    data,
    returnvalue,
    failedReason,
  };
}

/**
 * Check if Redis is available
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const _connection = getRedisConnection();
    // Try to create a test queue to verify connection
    const testQueue = await createQueue('test-connection');
    await testQueue.close();
    return true;
  } catch (error) {
    console.error('Redis connection check failed:', error);
    return false;
  }
}
