import { Building2, ArrowRight, Clock, TrendingUp, DollarSign, Wallet, Ruler, Sigma, ShieldAlert, FileCheck2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstallmentsDue } from "@/components/Dashboard/InstallmentsDue";
import { ActiveProjectCard } from '@/components/Dashboard/ActiveProjectCard';
import { FinancialExecutiveOverview } from '@/components/Dashboard/FinancialExecutiveOverview';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { useProjects } from '@/hooks/useProjects';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useProjectBudgetItems } from '@/hooks/useProjectBudgetItems';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFinancialCashflowForecast } from '@/hooks/useFinancialCashflowForecast';
import { calculateExpectedProgress, formatCashFlow } from '@/utils/dashboardCalculations';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Container } from '@/components/Layout';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import resolveStorageUrl from '@/utils/storage';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/reportFormatters';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/formatters';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { useSystemPreferences } from '@/hooks/useSystemPreferences';

const isTableMissing = (error: unknown): boolean => {
  const msg = String((error as Record<string, unknown>)?.code ?? '')
  return msg === '42P01'
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, dateFormat, currency } = useLocalization();
  const { projects, isLoading: loadingProjects } = useProjects();
  const { financialEntries } = useFinancialEntries();
  const { budgetItems } = useProjectBudgetItems();
  const { bdiTotal } = useAppSettings();
  const { forecast, isLoading: loadingForecast } = useFinancialCashflowForecast();
  const { data: systemPreferences } = useSystemPreferences();
  const [projectImages, setProjectImages] = useState<Record<string, string>>({});
  const [userName, setUserName] = useState<string>('');

  const { data: taxEstimates = [], isLoading: loadingTaxEstimates } = useQuery({
    queryKey: ['dashboard-kpi-tax-estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_estimates')
        .select('tax_project_id, inss_estimate, iss_estimate, potential_savings, calculated_at')
        .order('calculated_at', { ascending: false })

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return data ?? []
    },
  })

  const { data: nfeRecords = [], isLoading: loadingNfeRecords } = useQuery({
    queryKey: ['dashboard-kpi-sefaz-nfe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sefaz_nfe_records')
        .select('id, total_amount, link_status')

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return data ?? []
    },
  })

  const { data: arInvoices = [], isLoading: loadingArInvoices } = useQuery({
    queryKey: ['dashboard-kpi-ar-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_ar_invoices')
        .select('id, status, total_amount, amount_paid, days_overdue')
        .in('status', ['issued', 'overdue', 'partially_paid', 'paid'])

      if (error) {
        if (isTableMissing(error)) return []
        throw error
      }

      return data ?? []
    },
  })

  // Get user name
  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (profile?.display_name) {
          setUserName(profile.display_name);
        } else {
          const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
          const fullName = typeof metadata['full_name'] === 'string' ? metadata['full_name'] : t('dashboard.defaultUserName');
          setUserName(fullName);
        }
      }
    };
    fetchUserName();
  }, [t]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { period: 'morning', emoji: '☀️', message: t('dashboard.greetings.morning') };
    } else if (hour >= 12 && hour < 18) {
      return { period: 'afternoon', emoji: '☀️', message: t('dashboard.greetings.afternoon') };
    } else if (hour >= 18 && hour < 22) {
      return { period: 'evening', emoji: '🐝', message: t('dashboard.greetings.evening') };
    } else {
      return { period: 'night', emoji: '🌙', message: t('dashboard.greetings.night') };
    }
  };

  const greeting = getTimeBasedGreeting();

  const uniqueActiveProjects = useMemo(() => {
    const activeProjects = projects?.filter(p =>
      p.status !== 'completed' && p.status !== 'cancelled'
    ) || [];

    return [...activeProjects].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [projects]);
  
  const activeProjectsCount = uniqueActiveProjects.length;
  const stats = useMemo(() => {
    const activeProjects = uniqueActiveProjects;
    const onScheduleCount = (activeProjects as any[]).filter((p: any) => {
      if (!p.start_date || !p.end_date) return false;
      const expectedProgress = calculateExpectedProgress(p.start_date, p.end_date);
      const actualProgress = p.total_spent && p.budget_total 
        ? (p.total_spent / p.budget_total) * 100 
        : 0;
      return actualProgress >= expectedProgress - 5;
    }).length;

    const underBudgetCount = (activeProjects as any[]).filter((p: any) => {
      if (!p.total_spent || !p.budget_total) return true;
      return (p.total_spent / p.budget_total) * 100 < 100;
    }).length;

    const totalIncome = financialEntries?.filter(e => e.entry_type === 'income')
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const totalExpenses = financialEntries?.filter(e => e.entry_type === 'expense')
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const cashFlow = totalIncome - totalExpenses;

    return {
      onSchedule: `${onScheduleCount}/${activeProjectsCount}`,
      underBudget: `${underBudgetCount}/${activeProjectsCount}`,
      cashFlow: formatCashFlow(cashFlow),
      cashFlowPositive: cashFlow >= 0,
    };
  }, [uniqueActiveProjects, financialEntries, activeProjectsCount]);

  const headlineKpis = useMemo(() => {
    const projectCostPerM2Values = uniqueActiveProjects
      .map((project) => {
        const area = Number((project as any).total_gross_floor_area || (project as any).total_area || 0)
        const projectTotal = Number((project as any).budget_total || (project as any).budget_total_value || 0)

        if (area <= 0 || projectTotal <= 0) return null
        return projectTotal / area
      })
      .filter((value): value is number => value !== null)

    const totalArea = uniqueActiveProjects.reduce((sum, project) => {
      return sum + Number((project as any).total_gross_floor_area || (project as any).total_area || 0)
    }, 0)

    const totalBudget = uniqueActiveProjects.reduce((sum, project) => {
      return sum + Number((project as any).budget_total || (project as any).budget_total_value || 0)
    }, 0)

    // Aligns with per-project KPI shown in Budget screen:
    // Cost per m² = project total / project area. We use the average of project KPIs.
    const realizedCostPerM2 = projectCostPerM2Values.length > 0
      ? projectCostPerM2Values.reduce((sum, value) => sum + value, 0) / projectCostPerM2Values.length
      : 0

    // Weighted portfolio reference for variance context.
    const budgetCostPerM2 = totalArea > 0 ? totalBudget / totalArea : 0
    const costPerM2VariancePct = budgetCostPerM2 > 0
      ? ((realizedCostPerM2 - budgetCostPerM2) / budgetCostPerM2) * 100
      : 0

    const riskWeeks = forecast?.weeks.filter(
      week => week.riskLevel === 'high' || week.riskLevel === 'critical'
    ).length || 0
    const lowestProjectedBalance = Number(forecast?.lowestProjectedBalance || 0)

    const bdiProjects = uniqueActiveProjects.filter(
      project => (project as any).budget_model === 'bdi_brazil'
    )
    const bdiProjectIds = new Set(bdiProjects.map(project => project.id))
    const bdiBudgetItems = (budgetItems || []).filter(item => bdiProjectIds.has(item.project_id))
    const directBudget = bdiBudgetItems.reduce((sum, item) => {
      const category = String(item.category || '').toLowerCase()
      const isDirect = /labor|mão|mao|material|insumo/.test(category)
      return isDirect ? sum + Number(item.budgeted_amount || 0) : sum
    }, 0)
    const totalBdiBudgetByProjects = bdiProjects.reduce(
      (sum, project) => sum + Number((project as any).budget_total || (project as any).budget_total_value || 0),
      0
    )
    const totalBdiBudget = totalBdiBudgetByProjects > 0
      ? totalBdiBudgetByProjects
      : bdiBudgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0)
    const realizedBdiPct = directBudget > 0
      ? ((totalBdiBudget - directBudget) / directBudget) * 100
      : 0
    const bdiDeviation = realizedBdiPct - Number(bdiTotal || 0)

    const latestEstimateByProject = new Map<string, (typeof taxEstimates)[number]>()
    taxEstimates.forEach(estimate => {
      if (!latestEstimateByProject.has(estimate.tax_project_id)) {
        latestEstimateByProject.set(estimate.tax_project_id, estimate)
      }
    })
    const latestEstimates = Array.from(latestEstimateByProject.values())
    const taxExposure = latestEstimates.reduce(
      (sum, estimate) => sum + Number(estimate.inss_estimate || 0) + Number(estimate.iss_estimate || 0),
      0
    )
    const potentialTaxSavings = latestEstimates.reduce(
      (sum, estimate) => sum + Number(estimate.potential_savings || 0),
      0
    )

    const totalNfe = nfeRecords.length
    const linkedNfe = nfeRecords.filter(record =>
      record.link_status === 'auto_linked' || record.link_status === 'manual_linked'
    ).length
    const pendingNfeAmount = nfeRecords
      .filter(record => record.link_status === 'unlinked')
      .reduce((sum, record) => sum + Number(record.total_amount || 0), 0)
    const nfeLinkRate = totalNfe > 0 ? (linkedNfe / totalNfe) * 100 : 0

    const overdueInvoices = arInvoices.filter(
      invoice => Number(invoice.days_overdue || 0) > 0 || invoice.status === 'overdue'
    )
    const overdueAmount = overdueInvoices.reduce(
      (sum, invoice) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.amount_paid || 0)),
      0
    )
    const avgDaysLate = overdueInvoices.length > 0
      ? Math.round(overdueInvoices.reduce((sum, invoice) => sum + Number(invoice.days_overdue || 0), 0) / overdueInvoices.length)
      : 0

    return {
      lowestProjectedBalance,
      riskWeeks,
      realizedCostPerM2,
      budgetCostPerM2,
      costPerM2VariancePct,
      realizedBdiPct,
      bdiDeviation,
      bdiProjectCount: bdiProjects.length,
      taxExposure,
      potentialTaxSavings,
      nfeLinkRate,
      pendingNfeAmount,
      totalNfe,
      overdueAmount,
      avgDaysLate,
      overdueCount: overdueInvoices.length,
    }
  }, [uniqueActiveProjects, forecast, budgetItems, bdiTotal, taxEstimates, nfeRecords, arInvoices])

  const kpiCards = useMemo(() => [
    {
      key: 'cashflow',
      title: t('dashboard.kpisBrazil.cashflowRisk.title'),
      value: formatCurrency(headlineKpis.lowestProjectedBalance, currency),
      change: t('dashboard.kpisBrazil.cashflowRisk.change', { count: headlineKpis.riskWeeks }),
      icon: Wallet,
      onClick: () => navigate('/finance/cashflow'),
    },
    {
      key: 'cost_per_m2',
      title: t('dashboard.kpisBrazil.costPerM2.title'),
      value: `${formatCurrency(headlineKpis.realizedCostPerM2, currency)} /m²`,
      change: t('dashboard.kpisBrazil.costPerM2.change', {
        budget: formatCurrency(headlineKpis.budgetCostPerM2, currency),
        percent: headlineKpis.costPerM2VariancePct.toFixed(1),
      }),
      icon: Ruler,
      onClick: () => navigate('/overall-status'),
    },
    {
      key: 'bdi',
      title: t('dashboard.kpisBrazil.bdiDeviation.title'),
      value: `${headlineKpis.realizedBdiPct.toFixed(1)}%`,
      change: t('dashboard.kpisBrazil.bdiDeviation.change', {
        planned: Number(bdiTotal || 0).toFixed(1),
        deviation: headlineKpis.bdiDeviation.toFixed(1),
      }),
      icon: Sigma,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'tax',
      title: t('dashboard.kpisBrazil.taxExposure.title'),
      value: formatCurrency(headlineKpis.taxExposure, currency),
      change: t('dashboard.kpisBrazil.taxExposure.change', {
        savings: formatCurrency(headlineKpis.potentialTaxSavings, currency),
      }),
      icon: ShieldAlert,
      onClick: () => navigate('/settings'),
    },
    {
      key: 'nfe',
      title: t('dashboard.kpisBrazil.nfeReconciliation.title'),
      value: `${headlineKpis.nfeLinkRate.toFixed(0)}%`,
      change: t('dashboard.kpisBrazil.nfeReconciliation.change', {
        pending: formatCurrency(headlineKpis.pendingNfeAmount, currency),
        total: headlineKpis.totalNfe,
      }),
      icon: FileCheck2,
      onClick: () => navigate('/financial-ledger'),
    },
    {
      key: 'overdue',
      title: t('dashboard.kpisBrazil.overdue.title'),
      value: formatCurrency(headlineKpis.overdueAmount, currency),
      change: t('dashboard.kpisBrazil.overdue.change', {
        days: headlineKpis.avgDaysLate,
        count: headlineKpis.overdueCount,
      }),
      icon: AlertTriangle,
      onClick: () => navigate('/financial/collections'),
    },
  ], [t, headlineKpis, bdiTotal, currency, navigate])

  const isHeadlineLoading =
    loadingProjects ||
    loadingForecast ||
    loadingTaxEstimates ||
    loadingNfeRecords ||
    loadingArInvoices

  const displayProjects = useMemo(() => {
    const activeProjects = projects?.filter(p =>
      p.status !== 'completed' && p.status !== 'cancelled'
    ) || [];
    const sorted = [...activeProjects].sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });

    return sorted.slice(0, 6).map((project: any) => {
      const progress = project.total_spent && project.budget_total
        ? Math.round((project.total_spent / project.budget_total) * 100)
        : 0;
      const budgetUsed = project.total_spent && project.budget_total
        ? Math.round((project.total_spent / project.budget_total) * 100)
        : 0;
      const status = getProjectScheduleStatus(project as any)

      return {
        id: project.id,
        name: project.name,
        progress,
        budgetUsed,
        manager: project.manager || t('dashboard.notAssigned'),
        client: project.client_name || 'N/A',
        status,
        imageUrl: projectImages[project.id],
        imageFocusPoint: (project as any).image_focus_point,
      };
    });
  }, [projects, t, projectImages]);

  useEffect(() => {
    const loadImages = async () => {
      const activeProjects = projects?.filter(p =>
        p.status !== 'completed' && p.status !== 'cancelled'
      ).slice(0, 6) || [];

      for (const project of activeProjects) {
        if (projectImages[project.id]) continue;
        const placeholder = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80";
        const rawUrl = project.image_url;
        const resolvedUrl = !rawUrl || rawUrl === '/placeholder.svg' || rawUrl.includes('placeholder')
          ? placeholder
          : rawUrl.startsWith('http')
            ? rawUrl
            : await resolveStorageUrl(rawUrl, 60 * 60 * 24 * 30);

        setProjectImages(prev => ({
          ...prev,
          [project.id]: resolvedUrl || placeholder,
        }));
      }
    };
    if (projects) loadImages();
  }, [projects, projectImages]);

  const recentProjects = projects?.slice(0, 3) || [];

  return (
    <Container size="lg">
      <div className="space-y-6">
        {/* Welcome Section with Greeting */}
        <SidebarHeaderShell variant="default">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{t('dashboard.title')}</h1>
              <p className="text-sm text-white/80 font-medium mt-1">
                {t('dashboard.greeting', { name: userName })} {greeting.message} {greeting.emoji}
              </p>
            </div>
          </div>
        </SidebarHeaderShell>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {isHeadlineLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="rounded-tl-0 rounded-tr-xl rounded-br-xl rounded-bl-xl">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              {kpiCards.map(({ key, title, value, change, icon: Icon, onClick }) => (
                <Card
                  key={key}
                  className="rounded-tl-0 rounded-tr-xl rounded-br-xl rounded-bl-xl relative h-full transition-all border border-border/50 hover:shadow-md cursor-pointer"
                  onClick={onClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onClick()
                  }}
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-1.5 space-y-0 px-4 pt-4">
                    <CardTitle className="text-xs font-semibold leading-tight text-muted-foreground">
                      {title}
                    </CardTitle>
                    <div className="p-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                      <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-base font-bold tracking-tight">{value}</div>
                    <p className="text-[10px] font-medium mt-1 leading-tight text-muted-foreground">{change}</p>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
          {/* Main Content (Left Column) */}
          <div className="space-y-6">
            <FinancialExecutiveOverview />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t('dashboard.activeProjects')}</h2>
                  <p className="text-sm text-muted-foreground">{t('dashboard.activeProjectsDescription')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-medium">
                    {t('common:scheduleStatus.timezoneChip', {
                      timezone: systemPreferences?.system_time_zone || 'America/New_York',
                    })}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-xs font-semibold">
                    {t('dashboard.viewAll')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {displayProjects.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title={t('dashboard.noActiveProjects')}
                  description={t('dashboard.noActiveProjectsDescription')}
                  primaryAction={{
                    label: t('dashboard.createProject'),
                    onClick: () => navigate('/projects/new')
                  }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {displayProjects.map((project) => (
                    <ActiveProjectCard
                      key={project.id}
                      projectId={project.id}
                      projectName={project.name}
                      progress={project.progress}
                      budgetUsed={project.budgetUsed}
                      manager={project.manager}
                      client={project.client}
                      status={project.status}
                      imageUrl={project.imageUrl}
                      imageFocusPoint={project.imageFocusPoint}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Right Column) */}
          <div className="space-y-6">
            <InstallmentsDue />

            {/* Quick Stats */}
            <Card className="rounded-tl-0 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">{t('dashboard.quickStats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{t('dashboard.onSchedule')}</span>
                  </div>
                  <span className="font-bold text-sm">{stats.onSchedule}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{t('dashboard.underBudget')}</span>
                  </div>
                  <span className="font-bold text-sm">{stats.underBudget}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", stats.cashFlowPositive ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                      <DollarSign className={cn("h-4 w-4", stats.cashFlowPositive ? 'text-emerald-600' : 'text-red-500')} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{t('dashboard.cashFlow')}</span>
                  </div>
                  <span className={cn("font-bold text-sm", stats.cashFlowPositive ? 'text-emerald-600' : 'text-red-500')}>
                    {stats.cashFlow}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="rounded-tl-0 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">{t('dashboard.recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('dashboard.noRecentActivity')}
                    </p>
                  ) : (
                    recentProjects.map((project) => (
                      <div 
                        key={project.id} 
                        className="flex gap-3 cursor-pointer group" 
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500 flex-shrink-0 group-hover:scale-125 transition-transform"></div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate text-foreground group-hover:text-blue-600 transition-colors">{project.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">
                            {t('dashboard.updated')} {formatDate(project.created_at, dateFormat)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Dashboard;
