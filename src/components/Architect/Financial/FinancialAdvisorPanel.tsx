import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  LayoutDashboard, 
  AlertTriangle, 
  TrendingUp, 
  Lightbulb,
  AlertCircle,
  Wallet,
  CreditCard,
  ChevronLast,
  BarChart4
} from 'lucide-react';
import { AICacheHeader } from '@/components/AI/AICacheHeader';
import { 
  useArchitectFinancialAdvisor, 
  useRefreshFinancialAdvisor,
  formatCurrency,
} from '@/hooks/useArchitectFinancialAdvisor';
import { BudgetHealthCard } from './BudgetHealthCard';
import { VariancePredictionList } from './VariancePredictionList';
import { AnomalyAlertList } from './AnomalyAlertList';
import { OptimizationRecommendations } from './OptimizationRecommendations';
import { cn } from '@/lib/utils';

interface FinancialAdvisorPanelProps {
  projectId?: string;
  className?: string;
  defaultTab?: string;
  context?: 'architect' | 'clientPortal';
}

export function FinancialAdvisorPanel({ 
  projectId, 
  className,
  defaultTab = 'overview',
  context = 'architect'
}: FinancialAdvisorPanelProps) {
  const { t, language, currency } = useLocalization();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };
  
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useArchitectFinancialAdvisor({ 
    projectId,
    language: language as any,
  });

  const refreshMutation = useRefreshFinancialAdvisor();

  const analysis = data?.analysis;
  const generatedAt = analysis?.generatedAt 
    ? new Date(analysis.generatedAt) 
    : null;

  const handleRefresh = () => {
    refreshMutation.mutate({ projectId, language: language as any });
  };

  if (isError) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">
              {t(getTranslationKey('errorTitle'))}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error?.message || t(getTranslationKey('errorLoading'))}
            </p>
            <Button onClick={() => refetch()} variant="glass-style-dark">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertCount = analysis?.alerts?.length || 0;
  const anomalyCount = analysis?.anomalies?.length || 0;
  const recommendationCount = analysis?.optimizationRecommendations?.length || 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t(getTranslationKey('title'))}
          </h2>
          <p className="text-muted-foreground">
            {t(getTranslationKey('subtitle'))}
          </p>
        </div>
        <AICacheHeader
          lastUpdated={generatedAt}
          cached={data?.cached}
          onRefresh={handleRefresh}
          isRefreshing={refreshMutation.isPending}
          lastUpdatedKey={getTranslationKey('lastUpdated')}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t(getTranslationKey('overview'))}</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t(getTranslationKey('alerts'))}</span>
            {alertCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {alertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t(getTranslationKey('predictions'))}</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">{t(getTranslationKey('recommendations'))}</span>
            {recommendationCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {recommendationCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 pt-2">
          {/* Unified Hero Grid: 100% precision alignment */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-8 gap-4">
            {/* Health Column - 50% width on LG */}
            <div className="lg:col-span-4 flex flex-col">
              <BudgetHealthCard
                projectId={projectId}
                showDetails={true}
                showCacheHeader={false}
                className="h-full border-primary/20 bg-card/40 shadow-sm"
                context={context}
              />
            </div>
            
            {/* Stats - Individually placed in the same grid for perfect height matching */}
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="lg:col-span-1 h-full min-h-[140px] rounded-xl" />
              ))
            ) : analysis ? (
              <>
                <div className="lg:col-span-1">
                  <SummaryStatStatCard
                    label={t(getTranslationKey('totalBudget'))}
                    value={formatCurrency(analysis.summary.totalBudget, currency, language)}
                    icon={Wallet}
                    description={t(getTranslationKey('totalBudgetDesc')) || 'Allocated funds'}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SummaryStatStatCard
                    label={t(getTranslationKey('totalSpent'))}
                    value={formatCurrency(analysis.summary.totalSpent, currency, language)}
                    icon={CreditCard}
                    trend={analysis.summary.totalSpent > analysis.summary.totalBudget ? 'negative' : 'neutral'}
                    description={t(getTranslationKey('totalSpentDesc')) || 'Total costs'}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SummaryStatStatCard
                    label={t(getTranslationKey('projectedFinal'))}
                    value={formatCurrency(analysis.summary.projectedFinalCost, currency, language)}
                    icon={ChevronLast}
                    description={t(getTranslationKey('projectedFinalDesc')) || 'AI Forecast'}
                  />
                </div>
                <div className="lg:col-span-1">
                  <SummaryStatStatCard
                    label={t(getTranslationKey('projectedVariance'))}
                    value={formatCurrency(analysis.summary.projectedVariance, currency, language)}
                    icon={BarChart4}
                    trend={analysis.summary.projectedVariance >= 0 ? 'positive' : 'negative'}
                    description={t(getTranslationKey('projectedVarianceDesc')) || 'Vs. Budget'}
                  />
                </div>
              </>
            ) : null}
          </div>

          {/* AI Insights & Actions Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                {t(getTranslationKey('riskMonitoring')) || 'Risk Monitoring'}
              </h4>
              <AnomalyAlertList 
                alerts={analysis?.alerts?.slice(0, 3) || []}
                anomalies={analysis?.anomalies?.slice(0, 2) || []}
                isLoading={isLoading}
                maxItems={3}
                context={context}
                className="border-amber-500/20 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                {t(getTranslationKey('growthOpportunities')) || 'Growth Opportunities'}
              </h4>
              <OptimizationRecommendations
                recommendations={analysis?.optimizationRecommendations?.slice(0, 3) || []}
                isLoading={isLoading}
                maxItems={3}
                context={context}
                className="border-emerald-500/20 shadow-sm"
              />
            </div>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <AnomalyAlertList 
            alerts={analysis?.alerts || []}
            anomalies={analysis?.anomalies || []}
            isLoading={isLoading}
            showAllByDefault
            context={context}
          />
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions">
          <VariancePredictionList 
            predictions={analysis?.variancePredictions || []}
            isLoading={isLoading}
            showAllByDefault
            context={context}
          />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <OptimizationRecommendations
            recommendations={analysis?.optimizationRecommendations || []}
            isLoading={isLoading}
            showAllByDefault
            context={context}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Summary Stat Component
interface SummaryStatStatCardProps {
  label: string;
  value: string;
  icon: any;
  trend?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

function SummaryStatStatCard({ label, value, icon: Icon, trend = 'neutral', description }: SummaryStatStatCardProps) {
  const trendColors = {
    positive: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    negative: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-primary bg-primary/10 border-primary/20',
  };

  return (
    <Card className="h-full border border-border/40 bg-card/50 shadow-none hover:bg-card/80 transition-all duration-200">
      <CardContent className="p-3 sm:p-4 flex flex-col h-full justify-between items-center text-center">
        <div className="p-1.5 rounded-lg border w-fit mb-2 bg-muted/20">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        
        <div className="space-y-1 w-full">
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">{label}</p>
          <h3 className="text-base sm:text-lg font-bold tracking-tight tabular-nums truncate">{value}</h3>
          {description && (
            <p className="text-[9px] text-muted-foreground/50 leading-tight italic truncate">
              {description}
            </p>
          )}
        </div>

        <div className="w-full mt-3 pt-2 border-t border-border/20">
          <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
             <div 
              className={cn('h-full opacity-60', trend === 'positive' ? 'bg-emerald-500' : trend === 'negative' ? 'bg-rose-500' : 'bg-primary')} 
              style={{ width: '65%' }} 
             />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FinancialAdvisorPanel;
