import { useState } from 'react';
import { FunctionsHttpError } from '@supabase/functions-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

const DEFAULT_INSIGHT_ERROR_MESSAGE = 'Failed to generate insights';

const extractFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response | undefined;
    if (response) {
      try {
        const clonedResponse = response.clone();
        const contentType = clonedResponse.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await clonedResponse.json();
          if (body?.error) {
            return String(body.error);
          }
          if (body?.message) {
            return String(body.message);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse insights function error response', parseError);
      }

      const statusDescription = response.statusText ? ` ${response.statusText}` : '';
      if (response.status) {
        return `Insights function error (${response.status}${statusDescription})`;
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return DEFAULT_INSIGHT_ERROR_MESSAGE;
};

export type InsightType = 'financial-overall' | 'financial-project' | 'budget' | 'materials' | 'schedule-deviations' | 'daily-briefing' | 'photo-analysis' | 'communication-assistant' | 'portfolio-overview';

interface UseAIInsightsProps {
  insightType: InsightType;
  projectId?: string;
}

export const useAIInsights = ({ insightType, projectId }: UseAIInsightsProps) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean | undefined>(undefined);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language } = useLocalization();

  const generateInsights = async (forceRefreshParam?: boolean) => {
    const forceRefresh = forceRefreshParam ?? false;
    setIsLoading(true);
    setError(null);

    console.log('🔍 useAIInsights.generateInsights called:', { insightType, projectId, language, forceRefresh });

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-analytics-insights',
        {
          body: {
            insightType,
            projectId,
            language,
            forceRefresh,
          },
        }
      );

      console.log('📡 Response from edge function:', { data, functionError });

      if (functionError) {
        const message = await extractFunctionErrorMessage(functionError);
        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
      setCached(data.cached ?? false);
      setGeneratedAt(data.generatedAt ?? null);

      toast({
        title: 'Insights Generated',
        description: 'AI analysis completed successfully.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : DEFAULT_INSIGHT_ERROR_MESSAGE;
      setError(errorMessage);
      
      // Handle rate limiting and payment errors
      if (errorMessage.includes('Rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please try again in a few moments.',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('credits')) {
        toast({
          title: 'AI Credits Exhausted',
          description: 'Please add credits to continue using AI features.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearInsights = () => {
    setInsights(null);
    setCached(undefined);
    setGeneratedAt(null);
    setError(null);
  };

  const refresh = () => generateInsights(true);

  return {
    insights,
    cached,
    generatedAt,
    isLoading,
    error,
    generateInsights,
    refresh,
    clearInsights,
  };
};
