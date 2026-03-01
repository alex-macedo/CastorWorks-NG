import { useState } from 'react';
import { Building2, DollarSign, CheckCircle2, TrendingUp } from 'lucide-react';
import { MetricCard } from '@/components/Dashboard/MetricCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardFilters } from '@/components/Dashboard/DashboardFilters';
import { BudgetOverviewSection } from '@/components/Dashboard/BudgetOverviewSection';
import { BudgetStatusChart } from '@/components/Dashboard/BudgetStatusChart';
import { MonthlyTrendChart } from '@/components/Dashboard/MonthlyTrendChart';
import { ProjectsTimelineChart } from '@/components/Dashboard/ProjectsTimelineChart';
import { ProjectsStatusTable } from '@/components/Dashboard/ProjectsStatusTable';
import { AlertsPanel } from '@/components/Dashboard/AlertsPanel';
import { TimePeriod } from '@/utils/dateFilters';
import { exportDashboardToPDF } from '@/utils/dashboardExport';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import { formatCompactCurrency } from '@/utils/compactFormatters';
import { CompactValue } from '@/components/ui/compact-value';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const OverallStatus = () => {
  const { toast } = useToast();
  const { t, currency, numberFormat } = useLocalization();
  const [filters, setFilters] = useState<{ period: TimePeriod; projectId?: string }>({
    period: 'month',
    projectId: undefined
  });

  const { kpis, budgetByCategory, charts, alerts, projects, budgetAnalysisMap, isLoading } = useDashboardData(filters);
  const periodLabels = {
    month: t('dashboard.filters.thisMonth'),
    quarter: t('dashboard.filters.lastThreeMonths'),
    year: t('dashboard.filters.lastYear'),
    all: t('dashboard.filters.allTime')
  };
  const periodLabel = periodLabels[filters.period];
  const selectedProjectName = filters.projectId
    ? projects.find((p) => p.id === filters.projectId)?.name
    : t('dashboard.filters.allProjects');
  const budgetVariance = kpis.totalBudget - kpis.totalSpent;
  const remainingBudget = Math.max(0, budgetVariance);
  const spentRatio = kpis.totalBudget > 0 ? Math.min(100, (kpis.totalSpent / kpis.totalBudget) * 100) : 0;

  const handleExport = async () => {
    try {
      await exportDashboardToPDF('overall-status-content');
      toast({ title: t('overallStatus.exportSuccess') });
    } catch (error) {
      toast({ title: t('overallStatus.exportFailed'), description: t('overallStatus.exportFailedDesc'), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="overall-status-content">
      <SidebarHeaderShell>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-sidebar-primary-foreground/80">{periodLabel}</p>
            <h1 className="text-3xl font-bold tracking-tight">{t('overallStatus.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('overallStatus.subtitle')}</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-primary-foreground/30 bg-sidebar-primary-foreground/10 px-3 py-1 text-xs font-semibold">
                {t('overallStatus.projectLabel')}: {selectedProjectName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-primary-foreground/30 bg-sidebar-primary-foreground/10 px-3 py-1 text-xs font-semibold">
                {t('overallStatus.periodLabel')}: {periodLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-[260px]">
            <DashboardFilters
              period={filters.period}
              projectId={filters.projectId}
              projects={projects}
              onPeriodChange={(period) => setFilters({ ...filters, period })}
              onProjectChange={(projectId) => setFilters({ ...filters, projectId })}
              onReset={() => setFilters({ period: 'month', projectId: undefined })}
              onExport={handleExport}
            />
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
          <div className="h-full">
            <MetricCard
              title={t('overallStatus.activeProjects')}
              value={kpis.activeProjects}
              icon={Building2}
              trend="neutral"
              compact
              accent="gradient"
              hint={t('overallStatus.metricActiveHint', { period: periodLabel })}
            />
          </div>
          <div className="h-full">
            <MetricCard 
              title={t('overallStatus.totalBudget')} 
              value={numberFormat === 'compact' 
                ? formatCompactCurrency(kpis.totalBudget, currency)
                : formatCurrency(kpis.totalBudget, currency)
              } 
              icon={DollarSign}
              trend="neutral"
              compact
              accent="gradient"
              hint={t('overallStatus.metricBudgetHint', { period: periodLabel })}
            />
          </div>
          <div className="h-full">
            <MetricCard 
              title={t('overallStatus.totalSpent')} 
              value={numberFormat === 'compact' 
                ? formatCompactCurrency(kpis.totalSpent, currency)
                : formatCurrency(kpis.totalSpent, currency)
              } 
              change={t('overallStatus.ofBudget', { percent: kpis.budgetPercentage.toFixed(1) })} 
              icon={TrendingUp}
              trend="up"
              compact
              accent="gradient"
              hint={t('overallStatus.metricSpentHint', { period: periodLabel })}
            />
          </div>
          <div className="h-full">
            <MetricCard
              title={t('overallStatus.completedProjects')}
              value={kpis.completedProjects}
              change={t('overallStatus.completionRate', { rate: kpis.completionRate.toFixed(0) })}
              icon={CheckCircle2}
              trend="up"
              compact
              accent="gradient"
              hint={t('overallStatus.metricCompletionHint', { period: periodLabel })}
            />
          </div>
        </div>
        <div className="h-full">
          <BudgetOverviewSection totalBudget={kpis.totalBudget} totalSpent={kpis.totalSpent} categories={budgetByCategory} className="h-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-11 gap-6">
        <div className="xl:col-span-3">
          <BudgetStatusChart spent={charts.budgetStatus.spent} remaining={charts.budgetStatus.remaining} percentage={charts.budgetStatus.percentage} />
        </div>
        <div className="xl:col-span-4">
          <MonthlyTrendChart data={charts.monthlyTrend} />
        </div>
        <div className="xl:col-span-4">
          <ProjectsTimelineChart data={charts.projectsTimeline} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectsStatusTable projects={projects} budgetAnalysis={budgetAnalysisMap} />
        </div>
        <div>
          <AlertsPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
};

export default OverallStatus;
