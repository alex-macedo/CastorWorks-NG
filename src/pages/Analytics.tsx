import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useAppSettings } from "@/hooks/useAppSettings";
import { calculateProfitability, calculatePortfolioProfitability, compareToBenchmark } from "@/utils/profitabilityCalculator";
import { ProfitabilityCard } from "@/components/Analytics/ProfitabilityCard";
import { ChartTooltip, PercentageTooltip } from "@/components/Analytics/ChartTooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Bar } from "recharts/es6/cartesian/Bar";
import { TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { MetricCardSkeleton } from "@/components/ui/skeleton-variants";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function Analytics() {
  useRouteTranslations();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const { t } = useLocalization();
  const { projects = [], isLoading: projectsLoading } = useProjects();
  const { financialEntries = [], isLoading: entriesLoading } = useFinancialEntries();
  const { settings } = useAppSettings();

  if (projectsLoading || entriesLoading) {
    return (
      <div className="flex-1 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton count={4} />
        </div>
      </div>
    );
  }

  // Calculate metrics
  const metrics = selectedProjectId === "all"
    ? calculatePortfolioProfitability(
        projects as any[],
        (projects as any[]).reduce((acc, p) => ({
          ...acc,
          [p.id]: financialEntries.filter((e: any) => e.project_id === p.id)
        }), {})
      )
    : calculateProfitability(
        (projects as any[]).find(p => p.id === selectedProjectId)!,
        financialEntries.filter((e: any) => e.project_id === selectedProjectId)
      );

  const benchmark = compareToBenchmark(
    metrics,
    (settings as any)?.benchmark_profit_margin || 15.0,
    (settings as any)?.benchmark_overhead_percentage || 10.0
  );

  // Prepare chart data
  const projectChartData = (projects as any[])
    .map(project => {
      const projectEntries = financialEntries.filter((e: any) => e.project_id === project.id);
      const projectMetrics = calculateProfitability(project, projectEntries);
      return {
        name: project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name,
        income: projectMetrics.totalIncome,
        expenses: projectMetrics.totalExpenses,
        profit: projectMetrics.netProfit,
        margin: projectMetrics.profitMargin,
      };
    })
    .filter(d => d.income > 0 || d.expenses > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('analytics.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('analytics.subtitle')}
            </p>
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[300px] min-w-[200px] bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-6 rounded-full font-bold focus:ring-2 focus:ring-white/30 focus:ring-offset-0 focus:ring-offset-transparent">
              <SelectValue placeholder={t('analytics.selectProject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analytics.allProjects')}</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SidebarHeaderShell>

      {/* Profitability Cards */}
      <ProfitabilityCard metrics={metrics} />

      {/* Benchmark Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {benchmark.profitMarginStatus === 'above' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : benchmark.profitMarginStatus === 'below' ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <TrendingUp className="h-5 w-5 text-blue-500" />
              )}
              {t('analytics.profitMarginVsBenchmark')}
            </CardTitle>
            <CardDescription>
              {t('analytics.industryBenchmark')}: {(settings as any)?.benchmark_profit_margin || 15.0}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('analytics.yourMargin')}</span>
                <span className="text-2xl font-bold">{metrics.profitMargin.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('analytics.variance')}</span>
                <Badge variant={benchmark.profitMarginStatus === 'above' ? 'default' : 'secondary'}>
                  {benchmark.profitMarginVariance > 0 ? '+' : ''}
                  {benchmark.profitMarginVariance.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {benchmark.overheadStatus === 'above' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              {t('analytics.overheadVsBenchmark')}
            </CardTitle>
            <CardDescription>
              {t('analytics.industryBenchmark')}: {(settings as any)?.benchmark_overhead_percentage || 10.0}%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('analytics.yourOverhead')}</span>
                <span className="text-2xl font-bold">
                  {((metrics.totalExpenses / (metrics.totalIncome || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('analytics.variance')}</span>
                <Badge variant={benchmark.overheadStatus === 'above' ? 'default' : 'secondary'}>
                  {benchmark.overheadVariance > 0 ? '+' : ''}
                  {benchmark.overheadVariance.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Comparison Charts */}
      {selectedProjectId === "all" && projectChartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.incomeVsExpenses')}</CardTitle>
              <CardDescription>{t('analytics.topProjects')}</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="h-[400px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    className="text-xs"
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCompactCurrency(value, 'BRL')}
                    className="text-xs"
                  />
                  <Tooltip content={<ChartTooltip currency="BRL" />} />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--primary))" name={t('analytics.totalRevenue')} />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name={t('analytics.totalExpenses')} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.profitMarginByProject')}</CardTitle>
              <CardDescription>{t('analytics.percentageComparison')}</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="h-[400px] w-full min-w-0">
                <ResponsiveContainer width="100%" height={400}>
                <LineChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    className="text-xs"
                  />
                  <YAxis 
                    label={{ value: `${t('analytics.margin')} (%)`, angle: -90, position: 'insideLeft' }}
                    className="text-xs"
                  />
                  <Tooltip content={<PercentageTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="margin" 
                    stroke="hsl(var(--primary))" 
                    name={`${t('analytics.netProfit')} %`}
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
