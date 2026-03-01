/**
 * Process AI Feedback Edge Function
 *
 * Processes user feedback on AI suggestions to improve performance:
 * - Collect feedback from UI
 * - Analyze feedback patterns
 * - Identify low-performing prompts
 * - Update ai_model_performance table
 * - Generate improvement suggestions
 * - Trigger retraining workflows (future)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  authenticateRequest,
  createServiceRoleClient,
  verifyAdminRole,
} from '../_shared/authorization.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';
import { recordInsightFeedback, updateRecommendationStatus } from '../_shared/insightStorage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request schemas
const insightFeedbackSchema = z.object({
  action: z.literal('insight_feedback'),
  insightId: z.string().uuid(),
  helpfulnessScore: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
  wasActedUpon: z.boolean().optional(),
});

const recommendationFeedbackSchema = z.object({
  action: z.literal('recommendation_feedback'),
  recommendationId: z.string().uuid(),
  status: z.enum(['accepted', 'rejected', 'applied']),
  rejectionReason: z.string().optional(),
  actualImpact: z.record(z.any()).optional(),
  effectivenessScore: z.number().int().min(0).max(100).optional(),
  outcomeNotes: z.string().optional(),
});

const analyzeFeedbackSchema = z.object({
  action: z.literal('analyze'),
  domain: z.string().optional(),
  insightType: z.string().optional(),
  daysBack: z.number().int().positive().default(30),
});

const requestSchema = z.discriminatedUnion('action', [
  insightFeedbackSchema,
  recommendationFeedbackSchema,
  analyzeFeedbackSchema,
]);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();

    // Validate input
    const parsedRequest = requestSchema.parse(requestBody);

    // Authenticate user
    const { user } = await authenticateRequest(req);
    const supabase = createServiceRoleClient();

    // Handle different actions
    if (parsedRequest.action === 'insight_feedback') {
      // Record feedback on an insight
      const { insightId, helpfulnessScore, comment, wasActedUpon } = parsedRequest;

      const result = await recordInsightFeedback(supabase, insightId, {
        helpfulnessScore,
        comment,
        wasActedUpon,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to record feedback');
      }

      // Also record in ai_feedback table for analytics
      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        feature: 'ai_insights',
        rating: helpfulnessScore && helpfulnessScore >= 3 ? 'thumbs_up' : 'thumbs_down',
        comment: comment || null,
      });

      console.log(`👍 Recorded feedback for insight ${insightId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Feedback recorded successfully',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (parsedRequest.action === 'recommendation_feedback') {
      // Update recommendation status
      const {
        recommendationId,
        status,
        rejectionReason,
        actualImpact,
        effectivenessScore,
        outcomeNotes,
      } = parsedRequest;

      const result = await updateRecommendationStatus(
        supabase,
        recommendationId,
        status,
        user.id,
        {
          rejectionReason,
          actualImpact,
          effectivenessScore,
          outcomeNotes,
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update recommendation');
      }

      // Also record in ai_feedback table for analytics
      await supabase.from('ai_feedback').insert({
        user_id: user.id,
        feature: 'ai_recommendations',
        rating: status === 'accepted' || status === 'applied' ? 'thumbs_up' : 'thumbs_down',
        comment: outcomeNotes || rejectionReason || null,
      });

      console.log(`✅ Updated recommendation ${recommendationId} status to ${status}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Recommendation ${status} successfully`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (parsedRequest.action === 'analyze') {
      // Analyze feedback patterns (admin only)
      await verifyAdminRole(user.id, supabase);

      const { domain, insightType, daysBack } = parsedRequest;

      const analysis = await analyzeFeedbackPatterns(
        supabase,
        domain,
        insightType,
        daysBack
      );

      return new Response(
        JSON.stringify({
          success: true,
          analysis,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Process AI Feedback error:', error);

    return createErrorResponse(error, corsHeaders);
  }
});

/**
 * Analyze feedback patterns to identify improvement opportunities
 */
async function analyzeFeedbackPatterns(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  domain?: string,
  insightType?: string,
  daysBack: number = 30
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Get insights with feedback
  let insightsQuery = supabase
    .from('ai_insights')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .not('helpfulness_score', 'is', null);

  if (domain) {
    insightsQuery = insightsQuery.eq('domain', domain);
  }
  if (insightType) {
    insightsQuery = insightsQuery.eq('insight_type', insightType);
  }

  const { data: insights, error: insightsError } = await insightsQuery;

  if (insightsError) throw insightsError;

  // Get recommendations with status
  const recsQuery = supabase
    .from('ai_recommendations')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .in('status', ['accepted', 'rejected', 'applied']);

  const { data: recommendations, error: recsError } = await recsQuery;

  if (recsError) throw recsError;

  // Analyze insights
  const insightAnalysis = analyzeInsights(insights || []);

  // Analyze recommendations
  const recommendationAnalysis = analyzeRecommendations(recommendations || []);

  // Identify low-performing areas
  const improvements = identifyImprovements(insightAnalysis, recommendationAnalysis);

  return {
    period: {
      daysBack,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
    },
    insights: insightAnalysis,
    recommendations: recommendationAnalysis,
    improvements,
  };
}

/**
 * Analyze insights feedback
 */
// deno-lint-ignore no-explicit-any
function analyzeInsights(insights: any[]): any {
  if (insights.length === 0) {
    return {
      totalWithFeedback: 0,
      avgRating: 0,
      ratingDistribution: {},
      byDomain: {},
      byType: {},
      lowPerforming: [],
    };
  }

  // deno-lint-ignore no-explicit-any
  const analysis: any = {
    totalWithFeedback: insights.length,
    avgRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    // deno-lint-ignore no-explicit-any
    byDomain: {} as Record<string, any>,
    // deno-lint-ignore no-explicit-any
    byType: {} as Record<string, any>,
    // deno-lint-ignore no-explicit-any
    lowPerforming: [] as any[],
  };

  // Calculate average rating
  analysis.avgRating =
    insights.reduce((sum, i) => sum + (i.helpfulness_score || 0), 0) / insights.length;
  analysis.avgRating = Math.round(analysis.avgRating * 100) / 100;

  // Rating distribution
  insights.forEach((insight) => {
    const score = insight.helpfulness_score;
    if (score >= 1 && score <= 5) {
      analysis.ratingDistribution[score]++;
    }
  });

  // Group by domain
  insights.forEach((insight) => {
    const { domain } = insight;
    if (!analysis.byDomain[domain]) {
      analysis.byDomain[domain] = {
        count: 0,
        avgRating: 0,
        totalRating: 0,
      };
    }

    analysis.byDomain[domain].count++;
    analysis.byDomain[domain].totalRating += insight.helpfulness_score || 0;
  });

  // Calculate averages by domain
  Object.keys(analysis.byDomain).forEach((domain) => {
    analysis.byDomain[domain].avgRating =
      Math.round(
        (analysis.byDomain[domain].totalRating / analysis.byDomain[domain].count) * 100
      ) / 100;
    delete analysis.byDomain[domain].totalRating;
  });

  // Group by type
  insights.forEach((insight) => {
    const { insight_type } = insight;
    if (!analysis.byType[insight_type]) {
      analysis.byType[insight_type] = {
        count: 0,
        avgRating: 0,
        totalRating: 0,
      };
    }

    analysis.byType[insight_type].count++;
    analysis.byType[insight_type].totalRating += insight.helpfulness_score || 0;
  });

  // Calculate averages by type
  Object.keys(analysis.byType).forEach((type) => {
    analysis.byType[type].avgRating =
      Math.round((analysis.byType[type].totalRating / analysis.byType[type].count) * 100) /
      100;
    delete analysis.byType[type].totalRating;
  });

  // Identify low-performing types (rating < 3)
  analysis.lowPerforming = Object.entries(analysis.byType)
    // deno-lint-ignore no-explicit-any
    .filter(([_, data]: [string, any]) => data.avgRating < 3)
    // deno-lint-ignore no-explicit-any
    .map(([type, data]: [string, any]) => ({
      insightType: type,
      avgRating: data.avgRating,
      count: data.count,
    }))
    // deno-lint-ignore no-explicit-any
    .sort((a: any, b: any) => a.avgRating - b.avgRating);

  return analysis;
}

/**
 * Analyze recommendations feedback
 */
// deno-lint-ignore no-explicit-any
function analyzeRecommendations(recommendations: any[]): any {
  if (recommendations.length === 0) {
    return {
      totalWithStatus: 0,
      accepted: 0,
      rejected: 0,
      applied: 0,
      acceptanceRate: 0,
      avgEffectiveness: 0,
      byCategory: {},
      byPriority: {},
    };
  }

  // deno-lint-ignore no-explicit-any
  const analysis: any = {
    totalWithStatus: recommendations.length,
    accepted: recommendations.filter((r) => r.status === 'accepted').length,
    rejected: recommendations.filter((r) => r.status === 'rejected').length,
    applied: recommendations.filter((r) => r.status === 'applied').length,
    acceptanceRate: 0,
    avgEffectiveness: 0,
    // deno-lint-ignore no-explicit-any
    byCategory: {} as Record<string, any>,
    // deno-lint-ignore no-explicit-any
    byPriority: {} as Record<string, any>,
  };

  // Calculate acceptance rate
  const totalDecided = analysis.accepted + analysis.rejected;
  if (totalDecided > 0) {
    analysis.acceptanceRate = Math.round((analysis.accepted / totalDecided) * 100);
  }

  // Calculate average effectiveness (only for applied)
  const appliedWithScore = recommendations.filter(
    (r) => r.status === 'applied' && r.effectiveness_score != null
  );
  if (appliedWithScore.length > 0) {
    analysis.avgEffectiveness = Math.round(
      appliedWithScore.reduce((sum, r) => sum + r.effectiveness_score, 0) /
        appliedWithScore.length
    );
  }

  // Group by category
  recommendations.forEach((rec) => {
    const { category, status } = rec;
    if (!analysis.byCategory[category]) {
      analysis.byCategory[category] = {
        total: 0,
        accepted: 0,
        rejected: 0,
        acceptanceRate: 0,
      };
    }

    analysis.byCategory[category].total++;
    if (status === 'accepted' || status === 'applied') {
      analysis.byCategory[category].accepted++;
    } else if (status === 'rejected') {
      analysis.byCategory[category].rejected++;
    }
  });

  // Calculate acceptance rates by category
  Object.keys(analysis.byCategory).forEach((category) => {
    const cat = analysis.byCategory[category];
    const decided = cat.accepted + cat.rejected;
    if (decided > 0) {
      cat.acceptanceRate = Math.round((cat.accepted / decided) * 100);
    }
  });

  // Group by priority
  recommendations.forEach((rec) => {
    const { priority, status } = rec;
    if (!analysis.byPriority[priority]) {
      analysis.byPriority[priority] = {
        total: 0,
        accepted: 0,
        rejected: 0,
        acceptanceRate: 0,
      };
    }

    analysis.byPriority[priority].total++;
    if (status === 'accepted' || status === 'applied') {
      analysis.byPriority[priority].accepted++;
    } else if (status === 'rejected') {
      analysis.byPriority[priority].rejected++;
    }
  });

  // Calculate acceptance rates by priority
  Object.keys(analysis.byPriority).forEach((priority) => {
    const pri = analysis.byPriority[priority];
    const decided = pri.accepted + pri.rejected;
    if (decided > 0) {
      pri.acceptanceRate = Math.round((pri.accepted / decided) * 100);
    }
  });

  return analysis;
}

/**
 * Identify areas for improvement
 */
// deno-lint-ignore no-explicit-any
function identifyImprovements(insightAnalysis: any, recommendationAnalysis: any): any[] {
  // deno-lint-ignore no-explicit-any
  const improvements: any[] = [];

  // Low-performing insight types
  if (insightAnalysis.lowPerforming && insightAnalysis.lowPerforming.length > 0) {
    improvements.push({
      area: 'insights',
      issue: 'Low helpfulness scores',
      // deno-lint-ignore no-explicit-any
      details: insightAnalysis.lowPerforming.map((lp: any) => ({
        insightType: lp.insightType,
        avgRating: lp.avgRating,
        count: lp.count,
      })),
      recommendation: 'Review and improve prompts for these insight types',
      priority: 'high',
    });
  }

  // Low acceptance rate
  if (recommendationAnalysis.acceptanceRate < 40) {
    improvements.push({
      area: 'recommendations',
      issue: 'Low acceptance rate',
      details: {
        acceptanceRate: recommendationAnalysis.acceptanceRate,
        total: recommendationAnalysis.totalWithStatus,
      },
      recommendation:
        'Review recommendation quality, ensure they are actionable and valuable',
      priority: 'high',
    });
  }

  // Low effectiveness
  if (
    recommendationAnalysis.avgEffectiveness > 0 &&
    recommendationAnalysis.avgEffectiveness < 60
  ) {
    improvements.push({
      area: 'recommendations',
      issue: 'Low effectiveness scores',
      details: {
        avgEffectiveness: recommendationAnalysis.avgEffectiveness,
      },
      recommendation:
        'Investigate why implemented recommendations are not delivering expected results',
      priority: 'medium',
    });
  }

  return improvements;
}
