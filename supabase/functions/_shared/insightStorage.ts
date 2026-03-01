/**
 * Insight Storage Manager
 *
 * Handles storage and retrieval of AI insights and recommendations
 * - Save insights to ai_insights table
 * - Create actionable recommendations
 * - Track user feedback
 * - Update performance metrics
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface InsightParams {
  insightType: string;
  domain: string;
  projectId?: string;
  userId?: string;
  title: string;
  summary?: string;
  content: any;
  confidenceLevel: number;
  promptVersion?: string;
  modelUsed?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  ttlHours?: number;
}

export interface RecommendationParams {
  insightId?: string;
  projectId?: string;
  userId?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  reasoning?: string;
  expectedImpact?: {
    savings?: number;
    timeSavedDays?: number;
    riskReduction?: number;
    [key: string]: any;
  };
  actionType?: string;
  actionPayload?: any;
  expiresInDays?: number;
}

/**
 * Save an AI insight to the database
 */
export async function saveInsight(
  supabase: SupabaseClient,
  params: InsightParams
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const ttlHours = params.ttlHours || 6;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const { data, error } = await supabase
      .from('ai_insights')
      .insert({
        insight_type: params.insightType,
        domain: params.domain,
        project_id: params.projectId || null,
        user_id: params.userId || null,
        title: params.title,
        summary: params.summary || null,
        content: params.content,
        confidence_level: params.confidenceLevel,
        prompt_version: params.promptVersion || null,
        model_used: params.modelUsed || 'openai/gpt-4o-mini',
        tokens_used: params.tokensUsed || null,
        processing_time_ms: params.processingTimeMs || null,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(`💾 Saved insight: ${params.title} (ID: ${data.id})`);

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error saving insight:', error);
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create an actionable recommendation
 */
export async function createRecommendation(
  supabase: SupabaseClient,
  params: RecommendationParams
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const { data, error } = await supabase
      .from('ai_recommendations')
      .insert({
        insight_id: params.insightId || null,
        project_id: params.projectId || null,
        user_id: params.userId || null,
        category: params.category,
        priority: params.priority,
        title: params.title,
        description: params.description,
        reasoning: params.reasoning || null,
        expected_impact: params.expectedImpact || null,
        action_type: params.actionType || null,
        action_payload: params.actionPayload || null,
        status: 'pending',
        expires_at: expiresAt?.toISOString() || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(`📝 Created recommendation: ${params.title} (ID: ${data.id})`);

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error creating recommendation:', error);
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Record user feedback on an insight
 */
export async function recordInsightFeedback(
  supabase: SupabaseClient,
  insightId: string,
  feedback: {
    helpfulnessScore?: number; // 1-5
    comment?: string;
    wasActedUpon?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};

    if (feedback.helpfulnessScore !== undefined) {
      updateData.helpfulness_score = feedback.helpfulnessScore;
    }
    if (feedback.comment !== undefined) {
      updateData.user_feedback = feedback.comment;
    }
    if (feedback.wasActedUpon !== undefined) {
      updateData.was_acted_upon = feedback.wasActedUpon;
    }

    const { error } = await supabase
      .from('ai_insights')
      .update(updateData)
      .eq('id', insightId);

    if (error) throw error;

    console.log(`👍 Recorded feedback for insight ${insightId}`);

    return { success: true };
  } catch (error) {
    console.error('Error recording insight feedback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  supabase: SupabaseClient,
  recommendationId: string,
  status: 'accepted' | 'rejected' | 'applied' | 'expired',
  userId: string,
  details?: {
    rejectionReason?: string;
    actualImpact?: any;
    effectivenessScore?: number;
    outcomeNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      status,
    };

    if (status === 'accepted') {
      updateData.applied_by = userId;
      updateData.applied_at = new Date().toISOString();
    } else if (status === 'rejected') {
      updateData.rejected_by = userId;
      updateData.rejected_at = new Date().toISOString();
      if (details?.rejectionReason) {
        updateData.rejection_reason = details.rejectionReason;
      }
    } else if (status === 'applied') {
      updateData.applied_by = userId;
      updateData.applied_at = new Date().toISOString();
      if (details?.actualImpact) {
        updateData.actual_impact = details.actualImpact;
      }
      if (details?.effectivenessScore) {
        updateData.effectiveness_score = details.effectivenessScore;
      }
      if (details?.outcomeNotes) {
        updateData.outcome_notes = details.outcomeNotes;
      }
    }

    const { error } = await supabase
      .from('ai_recommendations')
      .update(updateData)
      .eq('id', recommendationId);

    if (error) throw error;

    console.log(`✅ Updated recommendation ${recommendationId} status to ${status}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent insights for a project/user
 */
export async function getRecentInsights(
  supabase: SupabaseClient,
  params: {
    projectId?: string;
    userId?: string;
    domain?: string;
    limit?: number;
    onlyActive?: boolean;
  }
): Promise<any[]> {
  try {
    let query = supabase
      .from('ai_insights')
      .select('*')
      .order('generated_at', { ascending: false });

    if (params.projectId) {
      query = query.eq('project_id', params.projectId);
    }
    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params.domain) {
      query = query.eq('domain', params.domain);
    }
    if (params.onlyActive) {
      query = query.eq('is_active', true);
    }

    query = query.limit(params.limit || 10);

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting recent insights:', error);
    return [];
  }
}

/**
 * Get pending recommendations for a project/user
 */
export async function getPendingRecommendations(
  supabase: SupabaseClient,
  params: {
    projectId?: string;
    userId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
  }
): Promise<any[]> {
  try {
    let query = supabase
      .from('ai_recommendations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (params.projectId) {
      query = query.eq('project_id', params.projectId);
    }
    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params.priority) {
      query = query.eq('priority', params.priority);
    }

    query = query.limit(params.limit || 10);

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting pending recommendations:', error);
    return [];
  }
}

/**
 * Save training data from successful prediction
 */
export async function saveTrainingData(
  supabase: SupabaseClient,
  params: {
    sourceType: 'user_feedback' | 'validated_prediction' | 'manual_entry' | 'actual_outcome';
    domain: string;
    insightType?: string;
    projectId?: string;
    userId?: string;
    inputData: any;
    expectedOutput: any;
    actualOutput?: any;
    qualityScore?: number;
    qualityNotes?: string;
  }
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('ai_training_data')
      .insert({
        source_type: params.sourceType,
        domain: params.domain,
        insight_type: params.insightType || null,
        project_id: params.projectId || null,
        user_id: params.userId || null,
        input_data: params.inputData,
        expected_output: params.expectedOutput,
        actual_output: params.actualOutput || null,
        quality_score: params.qualityScore || null,
        quality_notes: params.qualityNotes || null,
        is_validated: params.sourceType === 'validated_prediction',
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(`📚 Saved training data (ID: ${data.id})`);

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error saving training data:', error);
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update AI model performance metrics
 */
export async function updateModelPerformance(
  supabase: SupabaseClient,
  params: {
    modelName: string;
    promptVersion?: string;
    insightType?: string;
    domain?: string;
    periodStart: Date;
    periodEnd: Date;
    totalPredictions?: number;
    accuratePredictions?: number;
    avgConfidence?: number;
    avgProcessingTime?: number;
    avgTokens?: number;
    avgCost?: number;
    avgRating?: number;
    totalRatings?: number;
    thumbsUp?: number;
    thumbsDown?: number;
    recommendationsAccepted?: number;
    recommendationsRejected?: number;
    avgEffectiveness?: number;
  }
): Promise<{ id: string; success: boolean; error?: string }> {
  try {
    const accuracyPercentage =
      params.totalPredictions && params.accuratePredictions
        ? (params.accuratePredictions / params.totalPredictions) * 100
        : null;

    const satisfactionRate =
      params.thumbsUp && (params.thumbsUp + (params.thumbsDown || 0)) > 0
        ? (params.thumbsUp / (params.thumbsUp + (params.thumbsDown || 0))) * 100
        : null;

    const acceptanceRate =
      params.recommendationsAccepted &&
      (params.recommendationsAccepted + (params.recommendationsRejected || 0)) > 0
        ? (params.recommendationsAccepted /
            (params.recommendationsAccepted + (params.recommendationsRejected || 0))) *
          100
        : null;

    const { data, error } = await supabase
      .from('ai_model_performance')
      .insert({
        model_name: params.modelName,
        prompt_version: params.promptVersion || null,
        insight_type: params.insightType || null,
        domain: params.domain || null,
        total_predictions: params.totalPredictions || 0,
        accurate_predictions: params.accuratePredictions || 0,
        accuracy_percentage: accuracyPercentage,
        avg_confidence_level: params.avgConfidence || null,
        avg_processing_time_ms: params.avgProcessingTime || null,
        avg_tokens_used: params.avgTokens || null,
        avg_cost_per_prediction: params.avgCost || null,
        avg_rating: params.avgRating || null,
        total_ratings: params.totalRatings || 0,
        thumbs_up_count: params.thumbsUp || 0,
        thumbs_down_count: params.thumbsDown || 0,
        satisfaction_rate: satisfactionRate,
        recommendations_accepted: params.recommendationsAccepted || 0,
        recommendations_rejected: params.recommendationsRejected || 0,
        acceptance_rate: acceptanceRate,
        avg_effectiveness_score: params.avgEffectiveness || null,
        period_start: params.periodStart.toISOString(),
        period_end: params.periodEnd.toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log(`📊 Updated model performance for ${params.modelName} (ID: ${data.id})`);

    return {
      id: data.id,
      success: true,
    };
  } catch (error) {
    console.error('Error updating model performance:', error);
    return {
      id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
