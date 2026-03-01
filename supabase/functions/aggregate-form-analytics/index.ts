import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const aggregateFormAnalyticsSchema = z.object({
  formId: z.string().uuid(),
  forceRefresh: z.boolean().optional(),
});

interface QuestionAnalytics {
  responseCount: number;
  distribution?: Record<string, number>;
  average?: number;
  responses?: string[];
}

interface DailyResponse {
  date: string;
  count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const validated = aggregateFormAnalyticsSchema.parse(requestData);
    const { formId, forceRefresh = false } = validated;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Check if cache is fresh (< 5 minutes old) unless force refresh
    if (!forceRefresh) {
      const { data: existingCache } = await supabase
        .from('form_analytics_cache')
        .select('last_calculated_at')
        .eq('form_id', formId)
        .single();

      if (existingCache) {
        const cacheAge = Date.now() - new Date(existingCache.last_calculated_at).getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (cacheAge < fiveMinutes) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              cached: true, 
              message: 'Using cached analytics' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch form questions
    const { data: questions, error: questionsError } = await supabase
      .from('form_questions')
      .select('*')
      .eq('form_id', formId)
      .order('position', { ascending: true });

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    // Fetch all completed responses
    const { data: responses, error: responsesError } = await supabase
      .from('form_responses')
      .select(`
        id,
        status,
        started_at,
        completed_at,
        answers:form_response_answers(*)
      `)
      .eq('form_id', formId);

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    const totalResponses = responses?.length || 0;
    const completedResponses = responses?.filter(r => r.status === 'completed') || [];
    const completedCount = completedResponses.length;

    // Calculate average completion time (in seconds)
    let averageCompletionTime: number | null = null;
    if (completedCount > 0) {
      const completionTimes = completedResponses
        .filter(r => r.started_at && r.completed_at)
        .map(r => {
          const start = new Date(r.started_at!).getTime();
          const end = new Date(r.completed_at!).getTime();
          return (end - start) / 1000; // Convert to seconds
        });

      if (completionTimes.length > 0) {
        const totalTime = completionTimes.reduce((sum, time) => sum + time, 0);
        averageCompletionTime = Math.round(totalTime / completionTimes.length);
      }
    }

    // Calculate completion rate
    const completionRate = totalResponses > 0 
      ? Number(((completedCount / totalResponses) * 100).toFixed(2))
      : 0;

    // Calculate per-question analytics
    const questionAnalytics: Record<string, QuestionAnalytics> = {};

    for (const question of (questions || [])) {
      const questionAnswers = completedResponses.flatMap(r => 
        ((r.answers as any[]) || []).filter(a => a.question_id === question.id)
      );

      const analytics: QuestionAnalytics = {
        responseCount: questionAnswers.length,
      };

      // Calculate distribution for choice-based questions
      if (['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)) {
        const distribution: Record<string, number> = {};

        for (const answer of questionAnswers) {
          if (question.type === 'checkboxes' && answer.answer_options) {
            // Multiple selections
            for (const option of answer.answer_options) {
              distribution[option] = (distribution[option] || 0) + 1;
            }
          } else if (answer.answer_text) {
            // Single selection
            distribution[answer.answer_text] = (distribution[answer.answer_text] || 0) + 1;
          }
        }

        analytics.distribution = distribution;
      }

      // Calculate average for numeric questions
      if (['linear_scale', 'rating'].includes(question.type)) {
        const numericValues = questionAnswers
          .map(a => a.answer_number)
          .filter(n => n !== null && n !== undefined);

        if (numericValues.length > 0) {
          const sum = numericValues.reduce((acc, val) => acc + val, 0);
          analytics.average = Number((sum / numericValues.length).toFixed(2));
          
          // Also include distribution for scale/rating
          const distribution: Record<string, number> = {};
          for (const value of numericValues) {
            const key = String(value);
            distribution[key] = (distribution[key] || 0) + 1;
          }
          analytics.distribution = distribution;
        }
      }

      // Sample responses for text questions (max 50 for performance)
      if (['short_answer', 'paragraph'].includes(question.type)) {
        const textResponses = questionAnswers
          .map(a => a.answer_text)
          .filter(t => t && t.trim())
          .slice(0, 50);

        if (textResponses.length > 0) {
          analytics.responses = textResponses;
        }
      }

      questionAnalytics[question.id] = analytics;
    }

    // Calculate daily responses (last 30 days)
    const dailyResponses: DailyResponse[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentResponses } = await supabase
      .from('form_responses')
      .select('created_at')
      .eq('form_id', formId)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const dailyMap = new Map<string, number>();
    for (const response of (recentResponses || [])) {
      const date = new Date(response.created_at).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    }

    // Convert to array and sort
    for (const [date, count] of dailyMap.entries()) {
      dailyResponses.push({ date, count });
    }
    dailyResponses.sort((a, b) => a.date.localeCompare(b.date));

    // Upsert analytics cache
    const { error: cacheError } = await supabase
      .from('form_analytics_cache')
      .upsert({
        form_id: formId,
        total_responses: totalResponses,
        completed_responses: completedCount,
        average_completion_time_seconds: averageCompletionTime,
        completion_rate: completionRate,
        question_analytics: questionAnalytics,
        daily_responses: dailyResponses,
        last_calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'form_id',
      });

    if (cacheError) {
      throw new Error(`Failed to update cache: ${cacheError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          totalResponses,
          completedResponses: completedCount,
          averageCompletionTimeSeconds: averageCompletionTime,
          completionRate,
          questionAnalytics,
          dailyResponses,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error aggregating form analytics:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
