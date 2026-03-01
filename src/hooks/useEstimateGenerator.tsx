import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineItem } from '@/components/Estimates/EstimateLineItemTable';
import { useLocalization } from '@/contexts/LocalizationContext';

interface ProjectInfo {
  projectType: string;
  location: string;
  squareFootage?: number;
  qualityLevel: string;
  clientBudget?: number;
}

interface GeneratedEstimate {
  lineItems: LineItem[];
  estimatedDurationDays: number;
  confidenceScore: number;
  assumptions: string[];
  recommendations: string[];
  alternativeOptions?: Array<{
    description: string;
    priceDifference: number;
    impact: string;
  }>;
  generatedAt: string;
  processingTimeMs: number;
}

export const useEstimateGenerator = () => {
  const [estimate, setEstimate] = useState<GeneratedEstimate | null>(null);
  const [cached, setCached] = useState<boolean>(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLocalization();

  const generateEstimate = async (
    projectInfo: ProjectInfo,
    description: string,
    forceRefresh = false
  ) => {
    setIsGenerating(true);
    setError(null);
    const startTime = Date.now();

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-construction-estimate',
        {
          body: {
            projectType: projectInfo.projectType,
            location: projectInfo.location,
            squareFootage: projectInfo.squareFootage,
            qualityLevel: projectInfo.qualityLevel,
            clientBudget: projectInfo.clientBudget,
            description,
            language,
            forceRefresh,
          },
        }
      );

      if (functionError) {
        console.error('Edge Function error:', functionError);
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const processingTime = Date.now() - startTime;
      const resultGeneratedAt = data.generatedAt ?? new Date().toISOString();

      const result: GeneratedEstimate = {
        ...data,
        generatedAt: resultGeneratedAt,
        processingTimeMs: processingTime,
      };

      setEstimate(result);
      setCached(data.cached ?? false);
      setGeneratedAt(resultGeneratedAt);

      toast.success('Estimate Generated', {
        description: `Generated ${data.lineItems.length} line items in ${(processingTime / 1000).toFixed(1)}s`,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate estimate';
      setError(errorMessage);

      // Handle specific error types
      if (errorMessage.includes('Rate limit')) {
        toast.error('Rate Limit Exceeded', {
          description: 'Please wait a moment before generating another estimate.',
        });
      } else if (errorMessage.includes('API key')) {
        toast.error('API Configuration Error', {
          description: 'AI API key not configured. Please contact support.',
        });
      } else if (errorMessage.includes('timeout')) {
        toast.error('Request Timeout', {
          description: 'The estimate generation took too long. Please try again.',
        });
      } else {
        toast.error('Generation Failed', {
          description: errorMessage,
        });
      }

      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setEstimate(null);
    setCached(false);
    setGeneratedAt(null);
    setError(null);
    setIsGenerating(false);
  };

  const refresh = async (projectInfo: ProjectInfo, description: string) => {
    return generateEstimate(projectInfo, description, true);
  };

  return {
    estimate,
    cached,
    generatedAt,
    isGenerating,
    error,
    generateEstimate,
    refresh,
    reset,
  };
};
