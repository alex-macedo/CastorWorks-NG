import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';

interface CostPredictionResult {
  predictedCost: number;
  confidenceLevel: number;
  costBreakdown: {
    materials: number;
    labor: number;
    overhead: number;
  };
  factors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }>;
  similarProjects: Array<{
    id: string;
    name: string;
    type: string;
    totalArea: number;
    budgetTotal: number;
    similarity: number;
    reason: string;
  }>;
  recommendations: string[];
}

export const useCostPrediction = () => {
  const [prediction, setPrediction] = useState<CostPredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { language } = useLocalization();

  const predictCost = async (projectData: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'predict-project-cost',
        {
          body: { 
            projectData,
            language, // Pass user's selected language
          },
        }
      );

      if (functionError) throw functionError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setPrediction(data);
      
      toast({
        title: 'Cost Prediction Complete',
        description: `Predicted cost: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(data.predictedCost)}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to predict cost';
      setError(errorMessage);
      
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

  const clearPrediction = () => {
    setPrediction(null);
    setError(null);
  };

  return {
    prediction,
    isLoading,
    error,
    predictCost,
    clearPrediction,
  };
};
