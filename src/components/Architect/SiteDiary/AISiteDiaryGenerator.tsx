import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useSiteDiaryAI } from '@/hooks/useSiteDiaryAI';
import { Loader2, Sparkles } from 'lucide-react';

interface AISiteDiaryGeneratorProps {
  photoUrls: string[];
  projectId: string;
  onAnalysisComplete: (analysis: {
    progressSummary?: string;
    weatherCondition?: string;
    identifiedMaterials?: string[];
    identifiedActivities?: string[];
    estimatedProgress?: number;
    observations?: string;
    suggestedChecklist?: Record<string, boolean>;
  }) => void;
}

export const AISiteDiaryGenerator = ({
  photoUrls,
  projectId,
  onAnalysisComplete,
}: AISiteDiaryGeneratorProps) => {
  const { t } = useLocalization();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analyzeMutation = useSiteDiaryAI();

  const handleGenerate = async () => {
    if (photoUrls.length === 0) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeMutation.mutateAsync({
        photoUrls,
        projectId,
        language: t('common.language') as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR',
        forceRefresh: false,
      });

      if (result) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (photoUrls.length === 0) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isAnalyzing}
      className="mt-2"
    >
      {isAnalyzing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {isAnalyzing
        ? t('architect.siteDiary.ai.analyzing')
        : t('architect.siteDiary.ai.generateFromPhotos')
      }
    </Button>
  );
};
