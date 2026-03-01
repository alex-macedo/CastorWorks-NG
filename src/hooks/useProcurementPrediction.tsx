import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

interface SupplierScore {
  supplierId: string;
  name: string;
  score: number;
  rank: number;
  metrics: {
    avgResponseTime: number;
    priceScore: number;
    reliabilityScore: number;
    quoteCount: number;
  };
}

interface OptimalWindow {
  startDate: string;
  endDate: string;
  savings: number;
  reason: string;
}

interface ProcurementPrediction {
  forecastedSpend: number;
  confidenceLevel: number;
  timeframe: string;
  breakdown: {
    materials: number;
    services: number;
  };
  optimalWindows: OptimalWindow[];
  supplierScores: SupplierScore[];
  recommendations: string[];
  generatedAt: string;
  cached?: boolean;
}

interface UseProcurementPredictionProps {
  projectId?: string;
}

export const useProcurementPrediction = (props?: UseProcurementPredictionProps) => {
  const [prediction, setPrediction] = useState<ProcurementPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language, t } = useLocalization();

  const predict = async (timeframe: '30' | '60' | '90' = '30', forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[ProcurementPrediction] Starting prediction call...', {
        timeframe,
        projectId: props?.projectId,
        language,
      });

      const { data, error: functionError } = await supabase.functions.invoke(
        'predict-procurement-spend',
        {
          body: {
            projectId: props?.projectId,
            timeframe,
            language,
            forceRefresh,
          },
        }
      );

      console.log('[ProcurementPrediction] Response received:', {
        hasData: !!data,
        hasError: !!functionError,
        data,
        error: functionError,
      });

      if (functionError) {
        console.error('[ProcurementPrediction] Function error:', functionError);
        throw functionError;
      }

      if (data?.error) {
        console.error('[ProcurementPrediction] Data error:', data.error);
        throw new Error(data.error);
      }

      console.log('[ProcurementPrediction] Prediction successful:', data);
      setPrediction({ ...data, cached: data.cached, generatedAt: data.generatedAt ?? new Date().toISOString() });

      toast({
        title: t('procurement.prediction.generatedTitle') || 'Prediction Generated',
        description:
          t('procurement.prediction.generatedDescription', { days: timeframe }) ||
          `Procurement spend forecast for ${timeframe} days completed.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate prediction';
      console.error('[ProcurementPrediction] Error caught:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);

      toast({
        title: t('common.errorTitle') || 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearPrediction = () => {
    setPrediction(null);
    setError(null);
  };

  const refresh = (timeframe: '30' | '60' | '90' = '30') => {
    return predict(timeframe, true);
  };

  return {
    prediction,
    isLoading,
    error,
    predict,
    refresh,
    clearPrediction,
  };
};
