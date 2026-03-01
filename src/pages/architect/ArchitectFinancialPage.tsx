import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { FinancialAdvisorPanel } from '@/components/Architect/Financial/FinancialAdvisorPanel';
import { BudgetHealthCard } from '@/components/Architect/Financial/BudgetHealthCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  ArrowLeft,
  Building2,
  LayoutDashboard,
  TrendingDown
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useUserRoles } from '@/hooks/useUserRoles';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useArchitectFinancialAdvisor, useRefreshFinancialAdvisor, formatCurrency } from '@/hooks/useArchitectFinancialAdvisor';
import { AICacheHeader } from '@/components/AI/AICacheHeader';

export default function ArchitectFinancialPage() {
  useRouteTranslations();
  const { t, language, currency } = useLocalization();
  const { data: roles } = useUserRoles();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'detail'>('dashboard');
  
  const { projects = [] } = useProjects();

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
  };

  const handleViewDetails = () => {
    setViewMode('detail');
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
  };

  const projectId = selectedProjectId === 'all' ? undefined : selectedProjectId;

  return (
    <div className="flex-1 space-y-6 animate-in fade-in duration-500">
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               {viewMode === 'detail' && (
                 <Button 
                   variant="glass-style-white"
                   size="sm" 
                   onClick={handleBackToDashboard}
                 >
                   <ArrowLeft className="h-4 w-4 mr-1" />
                   {t('common.back')}
                 </Button>
               )}
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                {t('architect.financial.pageTitle')}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('architect.financial.pageDescription')}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Project Selector */}
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="min-w-[220px] w-auto max-w-[400px] bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold focus:ring-2 focus:ring-white/30 focus:ring-offset-0 focus:ring-offset-transparent">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('architect.financial.selectProject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('architect.financial.allProjects')}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

             {viewMode === 'dashboard' && (
               <Button 
                 onClick={handleViewDetails} 
                 variant="glass-style-white"
               >
                 <TrendingUp className="mr-2 h-4 w-4" />
                 {t('architect.financial.viewDetails')}
               </Button>
             )}
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Content */}
      <div className="px-1">
        {viewMode === 'dashboard' ? (
          <DashboardView 
            projectId={projectId} 
            onViewDetails={handleViewDetails}
          />
        ) : (
          <FinancialAdvisorPanel projectId={projectId} />
        )}
      </div>
    </div>
  );
}

// Dashboard View Component
interface DashboardViewProps {
  projectId?: string;
  onViewDetails: () => void;
}

function DashboardView({ projectId, onViewDetails }: DashboardViewProps) {
  const { t, language, currency } = useLocalization();

  const { data, isLoading } = useArchitectFinancialAdvisor({
    projectId,
    language: language as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR',
  });

  const refreshMutation = useRefreshFinancialAdvisor();

  const analysis = data?.analysis;
  const cached = data?.cached ?? false;
  const generatedAt = data?.generatedAt ?? null;

  const handleRefresh = () => {
    refreshMutation.mutate({ projectId, language: language as 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' });
  };

  const stats = useMemo(() => {
    if (!analysis) return {
      totalBudget: '—',
      totalSpent: '—',
      activeAlerts: '—',
      budgetTrend: 'neutral' as const
    };

    return {
      totalBudget: formatCurrency(analysis.summary.totalBudget, currency, language),
      totalSpent: formatCurrency(analysis.summary.totalSpent, currency, language),
      activeAlerts: analysis.alerts.length.toString(),
      budgetTrend: analysis.summary.totalSpent > analysis.summary.totalBudget ? 'negative' as const : 'positive' as const
    };
  }, [analysis, currency, language]);

  return (
    <div className="space-y-6">
      {/* Cache header when data is loaded */}
      {analysis && (
        <div className="flex justify-end">
          <AICacheHeader
            lastUpdated={generatedAt}
            cached={cached}
            onRefresh={handleRefresh}
            isRefreshing={refreshMutation.isPending}
          />
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BudgetHealthCard
          projectId={projectId}
          compact
          onViewDetails={onViewDetails}
          showCacheHeader={false}
        />
        <QuickStatCard
          title={t('architect.financial.totalBudget')}
          icon={DollarSign}
          value={stats.totalBudget}
          trend="neutral"
          isLoading={isLoading}
        />
        <QuickStatCard
          title={t('architect.financial.totalSpent')}
          icon={TrendingUp}
          value={stats.totalSpent}
          trend={stats.budgetTrend}
          isLoading={isLoading}
        />
        <QuickStatCard
          title={t('architect.financial.activeAlerts')}
          icon={LayoutDashboard}
          value={stats.activeAlerts}
          trend={analysis && analysis.alerts.length > 0 ? 'negative' : 'positive'}
          isLoading={isLoading}
        />
      </div>

      {/* AI Financial Advisor Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('architect.financial.aiAdvisorPreview')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('architect.financial.aiAdvisorDescription')}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title={t('architect.financial.variancePredictions')}
              description={t('architect.financial.variancePredictionsDescription')}
            />
            <FeatureCard
              title={t('architect.financial.anomalyDetection')}
              description={t('architect.financial.anomalyDetectionDescription')}
            />
            <FeatureCard
              title={t('architect.financial.optimizationTips')}
              description={t('architect.financial.optimizationTipsDescription')}
            />
          </div>
          <Button onClick={onViewDetails} className="w-full">
            <TrendingUp className="mr-2 h-4 w-4" />
            {t('architect.financial.launchAdvisor')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick Stat Card Component
interface QuickStatCardProps {
  title: string;
  icon: React.ElementType;
  value: string;
  trend: 'positive' | 'negative' | 'neutral';
  trendValue?: string;
  isLoading?: boolean;
}

function QuickStatCard({ title, icon: Icon, value, trend, trendValue, isLoading }: QuickStatCardProps) {
  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {!isLoading && trendValue && (
              <p className={cn('text-xs mt-1', trendColors[trend])}>
                {trendValue}
              </p>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
