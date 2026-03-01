import { useMemo, useState, type ReactNode } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CircleHelp,
  Wallet,
  Sigma,
  FileCheck2,
  ShieldAlert,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useFinancialCashflowForecast } from '@/hooks/useFinancialCashflowForecast'
import { useProjects } from '@/hooks/useProjects'
import { useBrazilCashflowKpis } from '@/hooks/useBrazilCashflowKpis'
import { formatCurrency } from '@/utils/formatters'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { AICacheHeader } from '@/components/AI/AICacheHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RiskLevel } from '@/types/finance'

const riskColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

const riskChartColors: Record<RiskLevel, string> = {
  low: 'hsl(var(--success))',
  medium: 'hsl(var(--warning, 45 93% 47%))',
  high: 'hsl(30, 100%, 50%)',
  critical: 'hsl(var(--destructive))',
}

interface CashflowKpiCard {
  key: string
  title: string
  value: string
  subvalue: string
  trend: 'good' | 'warning' | 'critical' | 'neutral'
  icon: ReactNode
  tooltipFormula: string
  tooltipSource: string
}

export default function FinancialCashflow() {
  const { t, currency } = useLocalization()
  const { projects } = useProjects()
  const [selectedProject, setSelectedProject] = useState<string>('all')

  const projectId = selectedProject === 'all' ? undefined : selectedProject
  const { forecast, isLoading, refreshForecast } = useFinancialCashflowForecast(projectId)
  const { kpis, dataQualityFlags, isLoading: isLoadingKpis } = useBrazilCashflowKpis(projectId)

  const chartData = useMemo(() => {
    return forecast.weeks.map(week => ({
      name: week.weekLabel,
      inflow: Math.round(week.projectedInflow),
      outflow: Math.round(week.projectedOutflow),
      balance: Math.round(week.projectedBalance),
      actualBalance: week.actualBalance != null ? Math.round(week.actualBalance) : undefined,
      confidence: week.confidence,
      riskLevel: week.riskLevel,
    }))
  }, [forecast.weeks])

  const overallRisk = useMemo<RiskLevel>(() => {
    if (forecast.riskWindows.some(w => w.riskLevel === 'critical')) return 'critical'
    if (forecast.riskWindows.some(w => w.riskLevel === 'high')) return 'high'
    if (forecast.riskWindows.length > 0) return 'medium'
    return 'low'
  }, [forecast.riskWindows])

  const kpiCards = useMemo<CashflowKpiCard[]>(() => {
    const noData = isLoadingKpis
      ? t('financial.loading')
      : t('financial:cashflow.kpi.noDataYet')

    return [
      {
        key: 'liquidity-floor',
        title: t('financial:cashflow.kpi.liquidityFloor.title'),
        value: formatCurrency(kpis.liquidityFloor.value, currency),
        subvalue: dataQualityFlags.hasForecast
          ? t('financial:cashflow.kpi.liquidityFloor.subvalue', { week: kpis.liquidityFloor.weekNumber })
          : noData,
        trend: kpis.liquidityFloor.value < 0 ? 'critical' : kpis.liquidityFloor.value < 10000 ? 'warning' : 'good',
        icon: <Wallet className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.liquidityFloor.formula'),
        tooltipSource: t('financial:cashflow.kpi.liquidityFloor.source'),
      },
      {
        key: 'net-13w',
        title: t('financial:cashflow.kpi.net13w.title'),
        value: formatCurrency(kpis.net13w.value, currency),
        subvalue: dataQualityFlags.hasForecast
          ? t('financial:cashflow.kpi.net13w.subvalue')
          : noData,
        trend: kpis.net13w.value < 0 ? 'critical' : 'good',
        icon: kpis.net13w.value < 0
          ? <TrendingDown className="h-4 w-4" />
          : <TrendingUp className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.net13w.formula'),
        tooltipSource: t('financial:cashflow.kpi.net13w.source'),
      },
      {
        key: 'overdue-ar',
        title: t('financial:cashflow.kpi.overdueAr.title'),
        value: formatCurrency(kpis.overdueAr.value, currency),
        subvalue: dataQualityFlags.hasAr
          ? t('financial:cashflow.kpi.overdueAr.subvalue', {
            days: kpis.overdueAr.avgDaysLate,
            count: kpis.overdueAr.invoiceCount,
          })
          : noData,
        trend: kpis.overdueAr.value > 0 ? 'critical' : 'good',
        icon: <AlertTriangle className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.overdueAr.formula'),
        tooltipSource: t('financial:cashflow.kpi.overdueAr.source'),
      },
      {
        key: 'bdi-deviation',
        title: t('financial:cashflow.kpi.bdiDeviation.title'),
        value: `${kpis.bdiDeviation.deviationPct >= 0 ? '+' : ''}${kpis.bdiDeviation.deviationPct.toFixed(1)}pp`,
        subvalue: dataQualityFlags.hasBdiInputs
          ? t('financial:cashflow.kpi.bdiDeviation.subvalue', {
            realized: kpis.bdiDeviation.realizedPct.toFixed(1),
            planned: kpis.bdiDeviation.plannedPct.toFixed(1),
          })
          : noData,
        trend: Math.abs(kpis.bdiDeviation.deviationPct) > 5 ? 'warning' : 'neutral',
        icon: <Sigma className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.bdiDeviation.formula'),
        tooltipSource: t('financial:cashflow.kpi.bdiDeviation.source'),
      },
      {
        key: 'tax-exposure',
        title: t('financial:cashflow.kpi.taxExposure.title'),
        value: formatCurrency(kpis.taxExposure.value, currency),
        subvalue: dataQualityFlags.hasTax
          ? t('financial:cashflow.kpi.taxExposure.subvalue', { count: kpis.taxExposure.estimateCount })
          : noData,
        trend: kpis.taxExposure.value > 0 ? 'warning' : 'neutral',
        icon: <ShieldAlert className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.taxExposure.formula'),
        tooltipSource: t('financial:cashflow.kpi.taxExposure.source'),
      },
      {
        key: 'nfe-reconciliation',
        title: t('financial:cashflow.kpi.nfeReconciliation.title'),
        value: `${kpis.nfeReconciliation.linkedRate.toFixed(0)}%`,
        subvalue: dataQualityFlags.hasNfe
          ? t('financial:cashflow.kpi.nfeReconciliation.subvalue', {
            pending: formatCurrency(kpis.nfeReconciliation.pendingAmount, currency),
            total: kpis.nfeReconciliation.totalNfe,
          })
          : noData,
        trend: kpis.nfeReconciliation.linkedRate < 80 ? 'warning' : 'good',
        icon: <FileCheck2 className="h-4 w-4" />,
        tooltipFormula: t('financial:cashflow.kpi.nfeReconciliation.formula'),
        tooltipSource: t('financial:cashflow.kpi.nfeReconciliation.source'),
      },
    ]
  }, [t, kpis, currency, dataQualityFlags, isLoadingKpis])

  const getTrendClasses = (trend: CashflowKpiCard['trend']) => {
    if (trend === 'critical') return 'text-destructive'
    if (trend === 'warning') return 'text-orange-600'
    if (trend === 'good') return 'text-success'
    return ''
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('financial:cashflow.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('financial:cashflow.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {chartData.length > 0 && (
              <AICacheHeader
                lastUpdated={null}
                cached={false}
                onRefresh={refreshForecast}
                isRefreshing={isLoading}
              />
            )}
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px] bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm h-10 px-4 !rounded-full font-bold whitespace-nowrap">
                <SelectValue placeholder={t('financial:cashflow.portfolioView')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('financial:cashflow.portfolioView')}</SelectItem>
                {(projects ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" data-testid="cashflow-kpi-cards">
        {kpiCards.map(card => (
          <Card key={card.key} data-testid="cashflow-kpi-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <TooltipProvider>
                    <UiTooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          aria-label={t('financial:cashflow.kpi.tooltip.label', { metric: card.title })}
                        >
                          <CircleHelp className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">{card.title}</p>
                        <p className="text-xs">
                          {t('financial:cashflow.kpi.tooltip.formula', { formula: card.tooltipFormula })}
                        </p>
                        <p className="text-xs">
                          {t('financial:cashflow.kpi.tooltip.source', { source: card.tooltipSource })}
                        </p>
                      </TooltipContent>
                    </UiTooltip>
                  </TooltipProvider>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                  {card.icon}
                </div>
              </div>
              <p className={`text-xl font-bold ${getTrendClasses(card.trend)}`}>{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.subvalue}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Forecast Chart */}
      <Card data-testid="cashflow-forecast-chart">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t('financial:cashflow.forecastChart')}</CardTitle>
            </div>
            <Badge className={riskColors[overallRisk]}>
              {t(`financial:riskLevels.${overallRisk}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <p>{t('financial.loading')}</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <div className="text-center">
                <p className="mb-1">{t('financial:cashflow.noData')}</p>
                <p className="text-sm">{t('financial:cashflow.noDataHint')}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, currency)}
                  labelFormatter={(label: string) => label}
                />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stackId="1"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.15}
                  name={t('financial:cashflow.inflow')}
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stackId="2"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.15}
                  name={t('financial:cashflow.outflow')}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name={t('financial:cashflow.balance')}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Risk Windows + Week Detail */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Risk Windows */}
        <Card data-testid="cashflow-risk-windows">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t('financial:cashflow.riskWindows')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {forecast.riskWindows.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('financial:cashflow.noRiskWindows')}
              </p>
            ) : (
              <div className="space-y-4">
                {forecast.riskWindows.map((window, idx) => (
                  <div key={idx} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">
                        {t('financial:cashflow.riskWindow', {
                          start: window.startWeek,
                          end: window.endWeek,
                          description: window.description,
                        })}
                      </p>
                      <Badge className={riskColors[window.riskLevel]}>
                        {t(`financial:riskLevels.${window.riskLevel}`)}
                      </Badge>
                    </div>
                    {window.projectedShortfall < 0 && (
                      <p className="text-sm text-destructive mb-2">
                        {t('financial:cashflow.shortfall')}: {formatCurrency(Math.abs(window.projectedShortfall), currency)}
                      </p>
                    )}
                    {window.suggestedActions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('financial:cashflow.suggestedActions')}
                        </p>
                        <ul className="text-sm space-y-1">
                          {window.suggestedActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 mt-1 text-warning shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week-by-Week Table */}
        <Card data-testid="cashflow-week-table">
          <CardHeader>
            <CardTitle>{t('financial:cashflow.forecastChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-right py-2 px-2 font-medium">{t('financial:cashflow.inflow')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('financial:cashflow.outflow')}</th>
                    <th className="text-right py-2 px-2 font-medium">{t('financial:cashflow.balance')}</th>
                    <th className="text-center py-2 px-2 font-medium">{t('financial:cashflow.riskLevel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.weeks.map(week => (
                    <tr key={week.weekNumber} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <span className="font-medium">{week.weekLabel}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-success">
                        {formatCurrency(week.projectedInflow, currency)}
                      </td>
                      <td className="py-2 px-2 text-right text-destructive">
                        {formatCurrency(week.projectedOutflow, currency)}
                      </td>
                      <td className={`py-2 px-2 text-right font-medium ${week.projectedBalance < 0 ? 'text-destructive' : ''}`}>
                        {formatCurrency(week.projectedBalance, currency)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full`}
                          style={{ backgroundColor: riskChartColors[week.riskLevel] }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
