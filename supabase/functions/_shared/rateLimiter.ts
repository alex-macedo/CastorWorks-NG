import { createServiceRoleClient } from "./authorization.ts";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  feature: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  current: number;
  limit: number;
}

/**
 * Check if user has exceeded rate limit for a specific feature
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = createServiceRoleClient();
  const windowStart = new Date(Date.now() - config.windowMs);

  try {
    // Count requests in current window
    const { count, error } = await supabase
      .from("ai_usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", config.feature)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      console.error("[Rate Limit] Error checking usage:", error);
      // Fail open - allow request on error to avoid blocking users
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs),
        current: 0,
        limit: config.maxRequests,
      };
    }

    const requestCount = count || 0;
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const allowed = requestCount < config.maxRequests;
    const resetAt = new Date(Date.now() + config.windowMs);

    return {
      allowed,
      remaining,
      resetAt,
      current: requestCount,
      limit: config.maxRequests,
    };
  } catch (error) {
    console.error("[Rate Limit] Unexpected error:", error);
    // Fail open
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
      current: 0,
      limit: config.maxRequests,
    };
  }
}

/**
 * Rate limit configurations by feature
 * These can be adjusted based on observed usage patterns
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI Estimating Platform features
  estimate_generation: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "estimate_generation",
  },

  voice_transcription: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "voice_transcription",
  },

  document_ocr: {
    maxRequests: 200,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "document_ocr",
  },

  image_analysis: {
    maxRequests: 150,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "image_analysis",
  },

  proposal_generation: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "proposal_generation",
  },

  ai_chat: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "ai_chat",
  },

  // Existing AI features (migrated)
  analytics_insights: {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "analytics_insights",
  },

  cost_prediction: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    feature: "cost_prediction",
  },
};

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();

  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.floor(result.resetAt.getTime() / 1000).toString());

  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `Too many requests for this feature. Please try again after ${result.resetAt.toISOString()}`,
      limit: result.limit,
      current: result.current,
      remaining: result.remaining,
      resetAt: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(createRateLimitHeaders(result)),
      },
    }
  );
}
