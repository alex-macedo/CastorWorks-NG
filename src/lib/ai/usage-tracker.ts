/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { AIUsageStats, AIFeatureUsageSummary, FeedbackRating } from './types';

/**
 * Log AI usage to database (called from Edge Functions typically)
 * This is a client-side wrapper for UI components that need to log usage
 */
export async function logAIUsage(params: {
  feature: string;
  model: string;
  usage: AIUsageStats;
  estimateId?: string;
  chatSessionId?: string;
  proposalId?: string;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[AI Usage] No authenticated user');
      return;
    }

    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      feature: params.feature,
      model: params.model,
      prompt_tokens: params.usage.inputTokens,
      completion_tokens: params.usage.outputTokens,
      total_tokens: params.usage.totalTokens,
      cache_creation_tokens: params.usage.cacheCreationTokens || 0,
      cache_read_tokens: params.usage.cacheReadTokens || 0,
      cost_usd: params.usage.costUsd,
      response_time_ms: params.usage.responseTimeMs,
      cached: params.usage.cached,
      estimate_id: params.estimateId || null,
      chat_session_id: params.chatSessionId || null,
      proposal_id: params.proposalId || null,
    });

    if (error) {
      console.error('[AI Usage] Failed to log usage:', error);
    }
  } catch (error) {
    console.error('[AI Usage] Unexpected error logging usage:', error);
    // Non-blocking - don't throw
  }
}

/**
 * Get usage statistics for current user
 */
export async function getUserUsageStats(options: {
  feature?: string;
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<AIFeatureUsageSummary | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    let query = supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', user.id);

    if (options.feature) {
      query = query.eq('feature', options.feature);
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AI Usage] Failed to get usage stats:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        feature: options.feature || 'all',
        totalRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
      };
    }

    const totalRequests = data.length;
    const totalCost = data.reduce((sum, log) => sum + (log.cost_usd || 0), 0);
    const totalTokens = data.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const cachedRequests = data.filter((log) => log.cached).length;
    const cacheHitRate = cachedRequests / totalRequests;
    const avgResponseTime =
      data.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / totalRequests;

    return {
      feature: options.feature || 'all',
      totalRequests,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
    };
  } catch (error) {
    console.error('[AI Usage] Unexpected error:', error);
    return null;
  }
}

/**
 * Get usage breakdown by feature
 */
export async function getUsageBreakdown(options: {
  startDate?: Date;
  endDate?: Date;
} = {}): Promise<AIFeatureUsageSummary[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const query = supabase.rpc('get_ai_usage_breakdown', {
      p_user_id: user.id,
      p_start_date: options.startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: options.endDate?.toISOString() || new Date().toISOString(),
    });

    const { data, error } = await query;

    if (error) {
      console.error('[AI Usage] Failed to get usage breakdown:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[AI Usage] Unexpected error:', error);
    return [];
  }
}

/**
 * Submit feedback on AI response
 */
export async function submitAIFeedback(params: {
  feature: string;
  rating: FeedbackRating;
  comment?: string;
  usageLogId?: string;
}): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn('[AI Feedback] No authenticated user');
      return false;
    }

    const { error } = await supabase.from('ai_feedback').insert({
      user_id: user.id,
      feature: params.feature,
      rating: params.rating,
      comment: params.comment || null,
      usage_log_id: params.usageLogId || null,
    });

    if (error) {
      console.error('[AI Feedback] Failed to submit feedback:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[AI Feedback] Unexpected error:', error);
    return false;
  }
}

/**
 * Check if user is approaching usage limits
 */
export async function checkUsageWarnings(): Promise<{
  warnings: string[];
  critical: boolean;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { warnings: [], critical: false };
    }

    // Get daily stats
    const dailyStats = await getUserUsageStats({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // Get monthly stats
    const monthlyStats = await getUserUsageStats({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    const warnings: string[] = [];
    let critical = false;

    const dailyCostLimit = 10.0; // $10/day
    const monthlyCostLimit = 100.0; // $100/month
    const dailyRequestLimit = 500; // 500 requests/day

    if (dailyStats) {
      if (dailyStats.totalCost >= dailyCostLimit) {
        warnings.push(
          `Daily cost limit reached: $${dailyStats.totalCost.toFixed(2)} / $${dailyCostLimit.toFixed(2)}`
        );
        critical = true;
      } else if (dailyStats.totalCost >= dailyCostLimit * 0.8) {
        warnings.push(
          `Approaching daily cost limit: $${dailyStats.totalCost.toFixed(2)} / $${dailyCostLimit.toFixed(2)} (80%)`
        );
      }

      if (dailyStats.totalRequests >= dailyRequestLimit) {
        warnings.push(
          `Daily request limit reached: ${dailyStats.totalRequests} / ${dailyRequestLimit}`
        );
        critical = true;
      } else if (dailyStats.totalRequests >= dailyRequestLimit * 0.8) {
        warnings.push(
          `Approaching daily request limit: ${dailyStats.totalRequests} / ${dailyRequestLimit} (80%)`
        );
      }
    }

    if (monthlyStats) {
      if (monthlyStats.totalCost >= monthlyCostLimit) {
        warnings.push(
          `Monthly cost limit reached: $${monthlyStats.totalCost.toFixed(2)} / $${monthlyCostLimit.toFixed(2)}`
        );
        critical = true;
      } else if (monthlyStats.totalCost >= monthlyCostLimit * 0.8) {
        warnings.push(
          `Approaching monthly cost limit: $${monthlyStats.totalCost.toFixed(2)} / $${monthlyCostLimit.toFixed(2)} (80%)`
        );
      }
    }

    return { warnings, critical };
  } catch (error) {
    console.error('[AI Usage] Unexpected error checking warnings:', error);
    return { warnings: [], critical: false };
  }
}
