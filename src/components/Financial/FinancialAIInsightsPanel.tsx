import React from 'react';
import { AIInsightsCard } from '@/components/AI/AIInsightsCard';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useLocalization } from '@/contexts/LocalizationContext';

export const FinancialAIInsightsPanel: React.FC = () => {
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
  } = useAIInsights({ insightType: 'financial-overall' });

  return (
    <AIInsightsCard
      title={t('financial.aiInsights.title') || "Financial AI Analysis"}
      description={t('financial.aiInsights.description') || "AI-powered analysis of revenue trends, expense anomalies, and cash flow forecasts."}
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
