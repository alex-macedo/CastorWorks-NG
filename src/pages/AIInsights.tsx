import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInsightsCard } from '@/components/AI/AIInsightsCard';
import { CostPredictionCard } from '@/components/AI/CostPredictionCard';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useCostPrediction } from '@/hooks/useCostPrediction';
import { useProcurementPrediction } from '@/hooks/useProcurementPrediction';
import { useProjects } from '@/hooks/useProjects';
import { Brain, TrendingUp, DollarSign, Package, Calculator, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLocalization } from '@/contexts/LocalizationContext';
import { AIIndicator } from '@/components/ui/ai-indicator';
import { Container } from '@/components/Layout';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const AIInsights = () => {
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | undefined>();
  const { t } = useLocalization();
  
  const { projects = [] } = useProjects();
  const financialOverall = useAIInsights({ insightType: 'financial-overall' });
  const budgetAnalysis = useAIInsights({ insightType: 'budget' });
  const materialsInsights = useAIInsights({ insightType: 'materials' });
  const projectSpecific = useAIInsights({
    insightType: 'financial-project',
    projectId: selectedProjectId
  });
  const scheduleDeviations = useAIInsights({
    insightType: 'schedule-deviations',
    projectId: selectedProjectId
  });
  const costPrediction = useCostPrediction();
  const procurementPrediction = useProcurementPrediction({ projectId: selectedProjectId });
  const portfolioOverview = useAIInsights({ insightType: 'portfolio-overview' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="space-y-2">
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Brain className="h-8 w-8 text-sidebar-primary-foreground" />
            {t('aiInsights.title')}
            <AIIndicator showLabel className="ml-2" />
          </h1>
          <p className="text-sm text-sidebar-primary-foreground/80">
            {t('aiInsights.subtitle')}
          </p>
        </div>
      </SidebarHeaderShell>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiInsights.financialInsights')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('aiInsights.financialInsightsDesc')}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiInsights.budgetAnalysis')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('aiInsights.budgetAnalysisDesc')}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiInsights.materialsInsights')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('aiInsights.materialsInsightsDesc')}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('aiInsights.costPrediction')}</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {t('aiInsights.costPredictionDesc')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Tabs */}
      <Tabs defaultValue="financial" variant="pill" className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="portfolio">{t('aiInsights.portfolio')}</TabsTrigger>
          <TabsTrigger value="financial">{t('aiInsights.financial')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('aiInsights.schedule')}</TabsTrigger>
          <TabsTrigger value="procurement">{t('aiInsights.procurement')}</TabsTrigger>
          <TabsTrigger value="project">{t('aiInsights.project')}</TabsTrigger>
          <TabsTrigger value="budget">{t('aiInsights.budget')}</TabsTrigger>
          <TabsTrigger value="materials">{t('aiInsights.materials')}</TabsTrigger>
          <TabsTrigger value="prediction">{t('aiInsights.prediction')}</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <AIInsightsCard
            title={t('aiInsights.portfolioIntelligence')}
            description={t('aiInsights.crossProjectAnalysis')}
            insights={portfolioOverview.insights}
            isLoading={portfolioOverview.isLoading}
            error={portfolioOverview.error}
            onGenerate={portfolioOverview.generateInsights}
            onRefresh={portfolioOverview.refresh}
            onClear={portfolioOverview.clearInsights}
            cached={portfolioOverview.cached}
            generatedAt={portfolioOverview.generatedAt}
            isRefreshing={portfolioOverview.isLoading}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <AIInsightsCard
            title={t('aiInsights.overallFinancialTitle')}
            description={t('aiInsights.overallFinancialDesc')}
            insights={financialOverall.insights}
            isLoading={financialOverall.isLoading}
            error={financialOverall.error}
            onGenerate={financialOverall.generateInsights}
            onRefresh={financialOverall.refresh}
            onClear={financialOverall.clearInsights}
            cached={financialOverall.cached}
            generatedAt={financialOverall.generatedAt}
            isRefreshing={financialOverall.isLoading}
          />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="space-y-2">
            <Label>{t('aiInsights.selectProjectOptional')}</Label>
            <Select value={selectedProjectId || 'all'} onValueChange={(val) => setSelectedProjectId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t("additionalPlaceholders.allProjectsPortfolio")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('aiInsights.allProjectsPortfolioView')}</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AIInsightsCard
            title={t('aiInsights.scheduleCostDeviation')}
            description={selectedProjectId ? t('aiInsights.projectRiskAnalysis') : t('aiInsights.portfolioRiskAssessment')}
            insights={scheduleDeviations.insights}
            isLoading={scheduleDeviations.isLoading}
            error={scheduleDeviations.error}
            onGenerate={scheduleDeviations.generateInsights}
            onRefresh={scheduleDeviations.refresh}
            onClear={scheduleDeviations.clearInsights}
            cached={scheduleDeviations.cached}
            generatedAt={scheduleDeviations.generatedAt}
            isRefreshing={scheduleDeviations.isLoading}
          />
        </TabsContent>

        <TabsContent value="procurement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {t('aiInsights.procurementPrediction.title')}
              </CardTitle>
              <CardDescription>
                {t('aiInsights.procurementPrediction.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {procurementPrediction.isLoading && (
                <div className="text-center py-4">{t('aiInsights.procurementPrediction.generating')}</div>
              )}

              {procurementPrediction.error && (
                <div className="text-red-500 text-sm">{procurementPrediction.error}</div>
              )}

              {procurementPrediction.prediction && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">{t('aiInsights.procurementPrediction.forecastedSpend')} ({procurementPrediction.prediction.timeframe})</p>
                    <p className="text-3xl font-bold">${procurementPrediction.prediction.forecastedSpend.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{t('aiInsights.procurementPrediction.confidence')}: {procurementPrediction.prediction.confidenceLevel}%</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{t('aiInsights.procurementPrediction.topSuppliers')}</h4>
                    {procurementPrediction.prediction.supplierScores.slice(0, 3).map((s) => (
                      <div key={s.supplierId} className="flex justify-between items-center py-1">
                        <span>#{s.rank} {s.name}</span>
                        <span className="font-medium">{s.score}/100</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">{t("commonUI.recommendations") }</h4>
                    <ul className="space-y-1">
                      {procurementPrediction.prediction.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => procurementPrediction.predict('30')}
                  disabled={procurementPrediction.isLoading}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  {t('aiInsights.procurementPrediction.forecast30Days')}
                </button>
                <button
                  onClick={() => procurementPrediction.predict('60')}
                  disabled={procurementPrediction.isLoading}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded"
                >
                  {t('aiInsights.procurementPrediction.forecast60Days')}
                </button>
                <button
                  onClick={() => procurementPrediction.predict('90')}
                  disabled={procurementPrediction.isLoading}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded"
                >
                  {t('aiInsights.procurementPrediction.forecast90Days')}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="project" className="space-y-4">
          <div className="space-y-2">
            <Label>{t('aiInsights.selectProject')}</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={t('aiInsights.chooseProject')} />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProjectId ? (
            <AIInsightsCard
              title={t('aiInsights.projectFinancialInsights')}
              description={t('aiInsights.detailedAnalysis')}
              insights={projectSpecific.insights}
              isLoading={projectSpecific.isLoading}
              error={projectSpecific.error}
              onGenerate={projectSpecific.generateInsights}
              onRefresh={projectSpecific.refresh}
              onClear={projectSpecific.clearInsights}
              cached={projectSpecific.cached}
              generatedAt={projectSpecific.generatedAt}
              isRefreshing={projectSpecific.isLoading}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {t('aiInsights.selectProjectPrompt')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <AIInsightsCard
            title={t('aiInsights.budgetAnalysis')}
            description={t('aiInsights.budgetAnalysisDesc')}
            insights={budgetAnalysis.insights}
            isLoading={budgetAnalysis.isLoading}
            error={budgetAnalysis.error}
            onGenerate={budgetAnalysis.generateInsights}
            onRefresh={budgetAnalysis.refresh}
            onClear={budgetAnalysis.clearInsights}
            cached={budgetAnalysis.cached}
            generatedAt={budgetAnalysis.generatedAt}
            isRefreshing={budgetAnalysis.isLoading}
          />
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <AIInsightsCard
            title={t('aiInsights.materialsInsights')}
            description={t('aiInsights.materialsProcurement')}
            insights={materialsInsights.insights}
            isLoading={materialsInsights.isLoading}
            error={materialsInsights.error}
            onGenerate={materialsInsights.generateInsights}
            onRefresh={materialsInsights.refresh}
            onClear={materialsInsights.clearInsights}
            cached={materialsInsights.cached}
            generatedAt={materialsInsights.generatedAt}
            isRefreshing={materialsInsights.isLoading}
          />
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          <CostPredictionCard
            prediction={costPrediction.prediction}
            isLoading={costPrediction.isLoading}
            error={costPrediction.error}
            onPredict={() => {
              // For demo purposes, we'll use sample project data
              // In production, this would come from a form or selected project
              const sampleProjectData = {
                type: 'Residential',
                totalArea: 150,
                location: 'São Paulo',
                finishingType: 'standard',
              };
              costPrediction.predictCost(sampleProjectData);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">{t('aiInsights.aboutAI.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            {t('aiInsights.aboutAI.description')}
          </p>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>{t('aiInsights.historicalPerformance')}</li>
            <li>{t('aiInsights.industryBenchmarks')}</li>
            <li>{t('aiInsights.spendingPatterns')}</li>
            <li>{t('aiInsights.similarProjects')}</li>
          </ul>
          <p className="mt-3">
            <strong>Note:</strong> {t('aiInsights.aboutAI.note')}
          </p>
        </CardContent>
      </Card>
      </div>
  );
};

export default AIInsights;
