import { useMutation } from '@tanstack/react-query';
import { aiClient } from '@/lib/ai/client';
import { useToast } from '@/hooks/use-toast';

type AnalyzeResponse = {
  progressSummary?: string;
  weatherCondition?: string;
  identifiedMaterials?: string[];
  identifiedActivities?: string[];
  estimatedProgress?: number;
  observations?: string;
  suggestedChecklist?: Record<string, boolean>;
  cached?: boolean;
  generatedAt?: string;
};

export const useSiteDiaryAI = () => {
  const { toast } = useToast();

  const mutation = useMutation<
    AnalyzeResponse,
    unknown,
    { photoUrls: string[]; projectId?: string; language?: string; forceRefresh?: boolean }
  >(
    async (payload) => {
      return aiClient.analyzeSitePhotos(payload) as Promise<AnalyzeResponse>;
    },
    {
      onError: (err: any) => {
        toast({ title: 'AI Error', description: err?.message || 'Failed to analyze photos', variant: 'destructive' });
      },
    }
  );

  return mutation;
};

export default useSiteDiaryAI;
