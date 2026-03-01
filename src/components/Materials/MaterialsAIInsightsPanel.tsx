import React from 'react';
import { AIInsightsCard } from '@/components/AI/AIInsightsCard';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useLocalization } from '@/contexts/LocalizationContext';

interface MaterialsAIInsightsPanelProps {
  projectId?: string;
}

export const MaterialsAIInsightsPanel: React.FC<MaterialsAIInsightsPanelProps> = ({ projectId }) => {
  const { t } = useLocalization();
  const {
    insights,
    cached,
    generatedAt,
    isLoading,
    error,
    generateInsights,
    refresh,
    clearInsights,
  } = useAIInsights({ insightType: 'materials', projectId });

  return (
    <AIInsightsCard
      title={t('materials:aiInsights.title') || "Materials AI Insights"}
      description={t('materials:aiInsights.description') || "AI-powered analysis of material usage, waste reduction, and cost optimization opportunities."}
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
