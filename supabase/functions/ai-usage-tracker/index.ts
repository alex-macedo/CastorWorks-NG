/**
 * AI Usage Tracker Edge Function
 *
 * Centralized logging and monitoring of AI usage:
 * - Log AI API calls
 * - Track token usage and costs
 * - Monitor error rates
 * - Calculate usage statistics
 * - Enforce usage quotas (future)
 *
 * This function is called by other edge functions or directly to log AI usage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  authenticateRequest,
  createServiceRoleClient,
  verifyAdminRole,
} from '../_shared/authorization.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schemas
const logUsageSchema = z.object({
  action: z.literal('log'),
  userId: z.string().uuid(),
  feature: z.string(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative().default(0),
  outputTokens: z.number().int().nonnegative().default(0),
  totalCost: z.number().nonnegative().default(0),
  responseTimeMs: z.number().int().nonnegative().optional(),
  estimateId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

const getStatsSchema = z.object({
  action: z.literal('stats'),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['feature', 'day', 'week', 'month']).optional(),
});

const requestSchema = z.discriminatedUnion('action', [logUsageSchema, getStatsSchema]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    // Validate input
    const parsedRequest = requestSchema.parse(requestBody);

    // Authenticate (service role can bypass for internal calls)
    const { user } = await authenticateRequest(req);
    const supabase = createServiceRoleClient();

    // Handle different actions
    if (parsedRequest.action === 'log') {
      // Log AI usage
      const {
        userId,
        feature,
        model,
        inputTokens,
        outputTokens,
        totalCost,
        responseTimeMs,
        estimateId,
        projectId,
      } = parsedRequest;

      // Insert usage log
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: userId,
          feature,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_cost: totalCost,
          response_time_ms: responseTimeMs || null,
          estimate_id: estimateId || null,
          project_id: projectId || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      console.log(
        `📊 Logged AI usage: ${feature} (${model}) - ${inputTokens + outputTokens} tokens - $${totalCost.toFixed(6)}`
      );

      return new Response(
        JSON.stringify({
          success: true,
          logId: data.id,
          message: 'Usage logged successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (parsedRequest.action === 'stats') {
      // Get usage statistics
      const { userId: statsUserId, startDate, endDate, groupBy } = parsedRequest;

      // Verify user can see stats (admins see all, users see their own)
      const isAdmin = await verifyAdminRole(user.id, supabase).then(
        () => true,
        () => false
      );

      const targetUserId = isAdmin ? statsUserId || user.id : user.id;

      // Build query
      let query = supabase
        .from('ai_usage_logs')
        .select('feature, model, input_tokens, output_tokens, total_cost, response_time_ms, created_at')
        .eq('user_id', targetUserId);

      // Apply date filters
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: logs, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const stats = calculateUsageStats(logs || [], groupBy);

      return new Response(
        JSON.stringify({
          success: true,
          stats,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('AI Usage Tracker error:', error);

    return createErrorResponse(error, corsHeaders);
  }
});

/**
 * Calculate usage statistics from logs
 */
function calculateUsageStats(
  logs: any[],
  groupBy?: 'feature' | 'day' | 'week' | 'month'
): any {
  if (logs.length === 0) {
    return {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      byFeature: {},
      byModel: {},
    };
  }

  const stats: any = {
    totalRequests: logs.length,
    totalInputTokens: logs.reduce((sum, log) => sum + (log.input_tokens || 0), 0),
    totalOutputTokens: logs.reduce((sum, log) => sum + (log.output_tokens || 0), 0),
    totalTokens: logs.reduce(
      (sum, log) => sum + (log.input_tokens || 0) + (log.output_tokens || 0),
      0
    ),
    totalCost: logs.reduce((sum, log) => sum + (log.total_cost || 0), 0),
    avgResponseTime: 0,
    byFeature: {} as Record<string, any>,
    byModel: {} as Record<string, any>,
  };

  // Calculate average response time
  const logsWithResponseTime = logs.filter((log) => log.response_time_ms != null);
  if (logsWithResponseTime.length > 0) {
    stats.avgResponseTime = Math.round(
      logsWithResponseTime.reduce((sum, log) => sum + log.response_time_ms, 0) /
        logsWithResponseTime.length
    );
  }

  // Group by feature
  logs.forEach((log) => {
    if (!stats.byFeature[log.feature]) {
      stats.byFeature[log.feature] = {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
    }

    stats.byFeature[log.feature].requests++;
    stats.byFeature[log.feature].tokens +=
      (log.input_tokens || 0) + (log.output_tokens || 0);
    stats.byFeature[log.feature].cost += log.total_cost || 0;
  });

  // Group by model
  logs.forEach((log) => {
    if (!stats.byModel[log.model]) {
      stats.byModel[log.model] = {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
    }

    stats.byModel[log.model].requests++;
    stats.byModel[log.model].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
    stats.byModel[log.model].cost += log.total_cost || 0;
  });

  // Group by time period if requested
  if (groupBy === 'day' || groupBy === 'week' || groupBy === 'month') {
    stats.byPeriod = groupByTimePeriod(logs, groupBy);
  }

  // Round costs to 6 decimal places
  stats.totalCost = Math.round(stats.totalCost * 1000000) / 1000000;
  Object.keys(stats.byFeature).forEach((feature) => {
    stats.byFeature[feature].cost =
      Math.round(stats.byFeature[feature].cost * 1000000) / 1000000;
  });
  Object.keys(stats.byModel).forEach((model) => {
    stats.byModel[model].cost = Math.round(stats.byModel[model].cost * 1000000) / 1000000;
  });

  return stats;
}

/**
 * Group usage logs by time period
 */
function groupByTimePeriod(
  logs: any[],
  period: 'day' | 'week' | 'month'
): Record<string, any> {
  const grouped: Record<string, any> = {};

  logs.forEach((log) => {
    const date = new Date(log.created_at);
    let key: string;

    if (period === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0]; // Week start date
    } else {
      // month
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    }

    if (!grouped[key]) {
      grouped[key] = {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
    }

    grouped[key].requests++;
    grouped[key].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);
    grouped[key].cost += log.total_cost || 0;
  });

  // Round costs
  Object.keys(grouped).forEach((key) => {
    grouped[key].cost = Math.round(grouped[key].cost * 1000000) / 1000000;
  });

  return grouped;
}
