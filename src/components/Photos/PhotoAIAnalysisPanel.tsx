import React from 'react';
import { AIInsightsCard } from '@/components/AI/AIInsightsCard';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useSupervisorProject } from '@/contexts/SupervisorProjectContext';

export const PhotoAIAnalysisPanel: React.FC = () => {
  const { t } = useLocalization();
  const { selectedProject } = useSupervisorProject();
  
  const {
    insights,
    cached,
    generatedAt,
    isLoading,
    error,
    generateInsights,
    refresh,
    clearInsights,
  } = useAIInsights({
    insightType: 'photo-analysis',
    projectId: selectedProject || undefined,
  });

  if (!selectedProject) return null;

  return (
    <AIInsightsCard
      title={t('supervisor.photoAnalysis.title') || "AI Photo Analysis"}
      description={t('supervisor.photoAnalysis.description') || "Automated detection of safety issues, quality defects, and progress updates from recent site photos."}
      insights={insights}
      isLoading={isLoading}
      error={error}
      onGenerate={generateInsights}
      onRefresh={refresh}
      onClear={clearInsights}
      cached={cached}
      generatedAt={generatedAt}
      isRefreshing={isLoading}
    />
  );
};
