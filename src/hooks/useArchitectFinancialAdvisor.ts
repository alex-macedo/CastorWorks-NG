import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  BudgetIntelligenceAnalysis,
  BudgetVariancePrediction,
  CostAnomaly,
  SpendingPattern,
  BudgetOptimizationRecommendation,
  BudgetAlert,
} from '@/lib/ai/types';

// Re-export types for convenience
export type {
  BudgetIntelligenceAnalysis,
  BudgetVariancePrediction,
  CostAnomaly,
  SpendingPattern,
  BudgetOptimizationRecommendation,
  BudgetAlert,
};

// Analysis types that can be requested
export type AnalysisType = 'variance' | 'anomaly' | 'patterns' | 'optimization' | 'alerts';

// Request parameters for the financial advisor
export interface FinancialAdvisorRequest {
  projectId?: string;
  analysisTypes?: AnalysisType[];
  language?: 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR';
  forceRefresh?: boolean;
}

// Response from the financial advisor edge function
export interface FinancialAdvisorResponse {
  analysis: BudgetIntelligenceAnalysis;
  cached: boolean;
  generatedAt: string;
}

// Hook for fetching financial advisor analysis
export const useArchitectFinancialAdvisor = (params: FinancialAdvisorRequest = {}) => {
  const { projectId, analysisTypes, language = 'en-US', forceRefresh = false } = params;
  
  const queryKey = ['architectFinancialAdvisor', projectId || 'all', analysisTypes, language];
  
  return useQuery<FinancialAdvisorResponse, Error>({
    queryKey,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/architect-financial-advisor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            analysisTypes,
            language,
            forceRefresh,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch financial analysis: ${response.status}`);
      }

      const data = await response.json();
      return data as FinancialAdvisorResponse;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: true,
  });
};

// Hook for refreshing financial advisor analysis
export const useRefreshFinancialAdvisor = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<FinancialAdvisorResponse, Error, FinancialAdvisorRequest>({
    mutationFn: async (params) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/architect-financial-advisor`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...params,
            forceRefresh: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to refresh financial analysis: ${response.status}`);
      }

      const data = await response.json();
      return data as FinancialAdvisorResponse;
    },
    onSuccess: (data, variables) => {
      const { projectId, analysisTypes, language } = variables;
      const queryKey = ['architectFinancialAdvisor', projectId || 'all', analysisTypes, language];
      queryClient.setQueryData(queryKey, data);
      toast({ title: 'Financial analysis refreshed' });
    },
    onError: (err) => {
      toast({ 
        title: 'Error refreshing analysis', 
        description: err?.message || 'Failed to refresh financial analysis', 
        variant: 'destructive' 
      });
    },
  });
};

// Hook for acknowledging alerts
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, { alertId: string; projectId?: string }>({
    mutationFn: async ({ alertId }) => {
      // In a real implementation, this would update the alert status in the database
      // For now, we'll just simulate the acknowledgment
      console.log('Acknowledging alert:', alertId);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onSuccess: (_, variables) => {
      const { projectId } = variables;
      // Invalidate the financial advisor query to refresh the data
      queryClient.invalidateQueries({ 
        queryKey: ['architectFinancialAdvisor', projectId || 'all'] 
      });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (err) => {
      toast({ 
        title: 'Error acknowledging alert', 
        description: err?.message || 'Failed to acknowledge alert', 
        variant: 'destructive' 
      });
    },
  });
};

// Hook for getting health score color
export const useHealthScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
};

// Hook for getting health score background color
export const useHealthScoreBgColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
};

// Hook for getting risk level badge variant
export const useRiskLevelVariant = (riskLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (riskLevel) {
    case 'low':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'high':
      return 'outline';
    case 'critical':
      return 'destructive';
    default:
      return 'default';
  }
};

// Utility function to format currency
export const formatCurrency = (amount: number, currency = 'USD', language = 'en-US'): string => {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Utility function to format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

// Utility function to get trend icon direction
export const getTrendDirection = (trend: string): 'up' | 'down' | 'flat' => {
  switch (trend) {
    case 'increasing':
      return 'up';
    case 'decreasing':
      return 'down';
    default:
      return 'flat';
  }
};
