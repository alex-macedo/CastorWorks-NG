import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type FormAnalyticsCache = Database['public']['Tables']['form_analytics_cache']['Row'];

export interface FormAnalytics {
  totalResponses: number;
  completedResponses: number;
  averageCompletionTimeSeconds: number | null;
  completionRate: number;
  questionAnalytics: Record<string, QuestionAnalytics>;
  dailyResponses: DailyResponse[];
  lastCalculatedAt: string;
}

export interface QuestionAnalytics {
  responseCount: number;
  distribution?: Record<string, number>; // For multiple choice, checkboxes, etc.
  average?: number; // For linear scale, rating, number
  responses?: string[]; // For short answer, paragraph (sampled)
}

export interface DailyResponse {
  date: string;
  count: number;
}

/**
 * useFormAnalytics Hook
 * 
 * Fetches aggregated analytics for a form with auto-refresh every 5 minutes.
 * Uses cached analytics from form_analytics_cache table for performance.
 */
export const useFormAnalytics = (formId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['form_analytics', formId],
    queryFn: async () => {
      if (!formId) return null;

      try {
        // Fetch from analytics cache
        const { data: cachedData, error: cacheError } = await supabase
          .from('form_analytics_cache')
          .select('*')
          .eq('form_id', formId)
          .maybeSingle();

        if (cacheError) {
          logger.error('Error fetching analytics cache:', cacheError);
          throw cacheError;
        }

        if (!cachedData) {
          logger.info('No analytics cache found, returning empty analytics', { formId });
          // Return empty analytics structure
          return {
            totalResponses: 0,
            completedResponses: 0,
            averageCompletionTimeSeconds: null,
            completionRate: 0,
            questionAnalytics: {},
            dailyResponses: [],
            lastCalculatedAt: new Date().toISOString(),
          } as FormAnalytics;
        }

        logger.info('Form analytics fetched successfully', { 
          formId,
          totalResponses: cachedData.total_responses 
        });

        // Transform database format to hook interface
        const analytics: FormAnalytics = {
          totalResponses: cachedData.total_responses || 0,
          completedResponses: cachedData.completed_responses || 0,
          averageCompletionTimeSeconds: cachedData.average_completion_time_seconds,
          completionRate: Number(cachedData.completion_rate) || 0,
          questionAnalytics: (cachedData.question_analytics as Record<string, QuestionAnalytics>) || {},
          dailyResponses: (cachedData.daily_responses as DailyResponse[]) || [],
          lastCalculatedAt: cachedData.last_calculated_at || new Date().toISOString(),
        };

        return analytics;
      } catch (err) {
        logger.error('Form analytics query failed:', err);
        return null;
      }
    },
    enabled: !!formId,
    // Auto-refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
  });

  // Helper to manually trigger analytics recalculation
  const refreshAnalytics = async () => {
    if (!formId) return;

    logger.info('Manually refreshing analytics', { formId });
    await queryClient.invalidateQueries({ queryKey: ['form_analytics', formId] });

    // TODO: In Phase 3, this will call the aggregate-form-analytics edge function
    // For now, just invalidate the cache to trigger a refetch
  };

  return {
    analytics,
    isLoading,
    error,
    refreshAnalytics,
  };
};

/**
 * useQuestionAnalytics Hook
 * 
 * Fetches analytics for a specific question within a form.
 */
export const useQuestionAnalytics = (
  formId: string | undefined,
  questionId: string | undefined
) => {
  const { analytics, isLoading, error } = useFormAnalytics(formId);

  const questionAnalytics = questionId && analytics
    ? analytics.questionAnalytics[questionId] || null
    : null;

  return {
    questionAnalytics,
    isLoading,
    error,
  };
};

/**
 * useCompletionFunnel Hook
 * 
 * Calculates completion funnel data (drop-off points) for a form.
 */
export const useCompletionFunnel = (formId: string | undefined) => {
  const { data: funnelData, isLoading, error } = useQuery({
    queryKey: ['form_completion_funnel', formId],
    queryFn: async () => {
      if (!formId) return [];

      try {
        // Fetch all form questions
        const { data: questions, error: questionsError } = await supabase
          .from('form_questions')
          .select('id, title, position')
          .eq('form_id', formId)
          .order('position', { ascending: true });

        if (questionsError) throw questionsError;

        if (!questions || questions.length === 0) {
          return [];
        }

        // Fetch answer counts per question
        const { data: answerCounts, error: countsError } = await supabase
          .from('form_response_answers')
          .select('question_id')
          .in(
            'question_id',
            questions.map(q => q.id)
          );

        if (countsError) throw countsError;

        // Count responses per question
        const countsByQuestion = (answerCounts || []).reduce((acc, answer) => {
          acc[answer.question_id] = (acc[answer.question_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Build funnel data
        const funnel = questions.map((question, index) => {
          const count = countsByQuestion[question.id] || 0;
          const previousCount = index === 0 
            ? count 
            : (countsByQuestion[questions[index - 1].id] || 0);
          
          const dropoffRate = previousCount > 0
            ? ((previousCount - count) / previousCount) * 100
            : 0;

          return {
            questionId: question.id,
            questionTitle: question.title,
            position: question.position,
            responseCount: count,
            dropoffRate: Math.round(dropoffRate * 100) / 100,
          };
        });

        logger.info('Completion funnel calculated', { 
          formId,
          steps: funnel.length 
        });

        return funnel;
      } catch (err) {
        logger.error('Completion funnel query failed:', err);
        return [];
      }
    },
    enabled: !!formId,
  });

  return {
    funnelData,
    isLoading,
    error,
  };
};
