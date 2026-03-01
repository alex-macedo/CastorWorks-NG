import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useBudgetIntelligence } from '@/hooks/useBudgetIntelligence';
import { BudgetVariancePredictionCard } from './BudgetVariancePredictionCard';
import { CostAnomalyDetectionCard } from './CostAnomalyDetectionCard';
import { SpendingPatternsCard } from './SpendingPatternsCard';
import { BudgetOptimizationCard } from './BudgetOptimizationCard';
import { BudgetAlertsPanel } from './BudgetAlertsPanel';
import { AICacheHeader } from '@/components/AI/AICacheHeader';
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetIntelligencePanelProps {
  projectId?: string;
}

export const BudgetIntelligencePanel: React.FC<BudgetIntelligencePanelProps> = ({
  projectId,
}) => {
  const { t, language } = useLocalization();
  const {
    analysis,
    cached,
    generatedAt,
    isLoading,
    error,
    analyze,
    refresh,
    acknowledgeAlert,
    variancePredictions,
    anomalies,
    spendingPatterns,
    optimizationRecommendations,
    alerts,
    summary,
    overallHealthScore,
  } = useBudgetIntelligence({ projectId, language: language as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' });

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const handleAnalyze = () => {
    if (projectId) {
      analyze({ projectId });
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) {
      return translate('budget:intelligence.panel.healthExcellent', 'Excellent');
    }
    if (score >= 60) {
      return translate('budget:intelligence.panel.healthGood', 'Good');
    }
    if (score >= 40) {
      return translate('budget:intelligence.panel.healthFair', 'Fair');
    }
    return translate('budget:intelligence.panel.healthNeedsAttention', 'Needs Attention');
  };

  const getRiskLevelLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return translate('budget:intelligence.panel.riskCritical', 'Critical');
      case 'high':
        return translate('budget:intelligence.panel.riskHigh', 'High');
      case 'medium':
        return translate('budget:intelligence.panel.riskMedium', 'Medium');
      case 'low':
        return translate('budget:intelligence.panel.riskLow', 'Low');
      default:
        return riskLevel;
    }
  };

  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {translate('budget:intelligence.panel.title', 'Budget Intelligence')}
              </CardTitle>
              <CardDescription>
                {t(
                  'budget:intelligence.panel.selectProject',
                  { defaultValue: t("architect.selectProjectViewBudget") }
                )}
              </CardDescription>
            </div>
            <div className="pl-4">
              <div className="text-right">
                <Button disabled size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {translate('budget:intelligence.panel.analyzeButton', 'Analyze Budget Intelligence')}
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  {translate('budget:intelligence.panel.selectProjectHint', 'Select a project to enable analysis')}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary flex-shrink-0" />
                {translate('budget:intelligence.panel.title', 'Budget Intelligence')}
              </CardTitle>
              <CardDescription>
                {translate(
                  'budget:intelligence.panel.description',
                  'AI-powered budget analysis and optimization recommendations'
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              {summary && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {translate('budget:intelligence.panel.healthLabel', 'Budget Health')}
                  </div>
                  <div className={`text-3xl font-bold ${getHealthScoreColor(overallHealthScore)}`}>
                    {overallHealthScore}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getHealthScoreLabel(overallHealthScore)}
                  </div>
                </div>
              )}
              {analysis && (
                <AICacheHeader
                  lastUpdated={generatedAt}
                  cached={cached}
                  onRefresh={refresh}
                  isRefreshing={isLoading}
                  lastUpdatedKey="common.lastUpdated"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!analysis && !isLoading && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                {translate(
                  'budget:intelligence.panel.generateDescription',
                  'Generate comprehensive AI-powered budget analysis including variance predictions, anomaly detection, spending patterns, and optimization recommendations.'
                )}
              </p>
              <Button onClick={() => handleAnalyze()} disabled={isLoading} size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                {translate(
                  'budget:intelligence.panel.analyzeButton',
                  'Analyze Budget Intelligence'
                )}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {analysis && !isLoading && summary && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {translate('budget:intelligence.panel.riskLevelLabel', 'Risk Level')}
                  </div>
                  <div className={`text-2xl font-bold capitalize ${
                    summary.riskLevel === 'critical' ? 'text-destructive' :
                    summary.riskLevel === 'high' ? 'text-destructive' :
                    summary.riskLevel === 'medium' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {getRiskLevelLabel(summary.riskLevel)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {translate('budget:intelligence.panel.activeAlertsLabel', 'Active Alerts')}
                  </div>
                  <div className="text-2xl font-bold">
                    {alerts.filter(a => !a.acknowledged).length}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {translate('budget:intelligence.panel.anomaliesLabel', 'Anomalies Found')}
                  </div>
                  <div className="text-2xl font-bold">{anomalies.length}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    {translate('budget:intelligence.panel.optimizationLabel', 'Optimization Tips')}
                  </div>
                  <div className="text-2xl font-bold">{optimizationRecommendations.length}</div>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results Tabs */}
      {analysis && !isLoading && (
        <Tabs defaultValue="alerts" variant="pill" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="alerts">
              {translate('budget:intelligence.panel.alertsTab', 'Alerts')}
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {alerts.filter(a => !a.acknowledged).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="predictions">
              {translate('budget:intelligence.panel.predictionsTab', 'Predictions')}
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              {translate('budget:intelligence.panel.anomaliesTab', 'Anomalies')}
              {anomalies.length > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {anomalies.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="patterns">
              {translate('budget:intelligence.panel.patternsTab', 'Patterns')}
            </TabsTrigger>
            <TabsTrigger value="optimization">
              {translate('budget:intelligence.panel.optimizationTab', 'Optimization')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-6">
            <BudgetAlertsPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />
          </TabsContent>

          <TabsContent value="predictions" className="mt-6">
            <BudgetVariancePredictionCard predictions={variancePredictions} />
          </TabsContent>

          <TabsContent value="anomalies" className="mt-6">
            <CostAnomalyDetectionCard anomalies={anomalies} />
          </TabsContent>

          <TabsContent value="patterns" className="mt-6">
            <SpendingPatternsCard patterns={spendingPatterns} />
          </TabsContent>

          <TabsContent value="optimization" className="mt-6">
            <BudgetOptimizationCard recommendations={optimizationRecommendations} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
