import React from 'react';
import { AIInsightsCard } from '@/components/AI/AIInsightsCard';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useLocalization } from '@/contexts/LocalizationContext';

export const AICommunicationAssistant: React.FC = () => {
  const { t } = useLocalization();
  const { insights, isLoading, error, generateInsights, clearInsights } = useAIInsights({
    insightType: 'communication-assistant',
  });

  return (
    <AIInsightsCard
      title={t('notifications.aiAssistant.title') || "AI Communication Assistant"}
      description={t('notifications.aiAssistant.description') || "Get help drafting emails, summarizing recent notifications, and suggesting follow-ups."}
      insights={insights}
      isLoading={isLoading}
      error={error}
      onGenerate={generateInsights}
      onClear={clearInsights}
    />
  );
};
