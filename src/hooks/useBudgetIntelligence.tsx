import { useState, useCallback } from 'react';
import { aiClient, formatAIError } from '@/lib/ai/client';
import { BudgetIntelligenceAnalysis } from '@/lib/ai/types';
import { toast } from 'sonner';

export interface UseBudgetIntelligenceOptions {
  projectId?: string;
  analysisTypes?: ('variance' | 'anomaly' | 'patterns' | 'optimization' | 'alerts')[];
  timeframe?: {
    startDate?: string;
    endDate?: string;
  };
  language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
}

interface BudgetIntelligenceResponse {
  analysis: BudgetIntelligenceAnalysis;
  cached?: boolean;
  generatedAt?: string;
}

export function useBudgetIntelligence(options: UseBudgetIntelligenceOptions = {}) {
  const [analysis, setAnalysis] = useState<BudgetIntelligenceAnalysis | null>(null);
  const [cached, setCached] = useState<boolean | undefined>(undefined);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (overrideOptions?: UseBudgetIntelligenceOptions & { forceRefresh?: boolean }) => {
      const finalOptions = { ...options, ...overrideOptions };
      const forceRefresh = finalOptions.forceRefresh ?? false;

      if (!finalOptions.projectId) {
        setError('Project ID is required for budget intelligence analysis');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = (await aiClient.analyzeBudgetIntelligence({
          projectId: finalOptions.projectId,
          analysisTypes: finalOptions.analysisTypes,
          timeframe: finalOptions.timeframe,
          forceRefresh,
          language: finalOptions.language ?? 'en-US',
        })) as BudgetIntelligenceResponse;

        setAnalysis(result.analysis);
        setCached(result.cached ?? false);
        setGeneratedAt(result.generatedAt ?? null);
        toast.success('Budget intelligence analysis completed');
      } catch (err) {
        const errorMessage = formatAIError(err);
        setError(errorMessage);
        toast.error('Failed to analyze budget intelligence', {
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const refresh = useCallback(() => {
    if (options.projectId) {
      analyze({ projectId: options.projectId, forceRefresh: true });
    }
  }, [analyze, options.projectId]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setCached(undefined);
    setGeneratedAt(null);
    setError(null);
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    if (!analysis) return;

    setAnalysis({
      ...analysis,
      alerts: analysis.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
    });
  }, [analysis]);

  return {
    analysis,
    cached,
    generatedAt,
    isLoading,
    error,
    analyze,
    refresh,
    clearAnalysis,
    acknowledgeAlert,

    // Convenience accessors
    variancePredictions: analysis?.variancePredictions || [],
    anomalies: analysis?.anomalies || [],
    spendingPatterns: analysis?.spendingPatterns || [],
    optimizationRecommendations: analysis?.optimizationRecommendations || [],
    alerts: analysis?.alerts || [],
    summary: analysis?.summary,
    overallHealthScore: analysis?.overallHealthScore || 0,
  };
}
