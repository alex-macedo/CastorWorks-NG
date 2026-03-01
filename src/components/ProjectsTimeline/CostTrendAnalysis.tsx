import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Activity, Target, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useLocalization } from '@/contexts/LocalizationContext'
import { useConstructionCostBenchmarkProjects } from '@/hooks/useConstructionCostBenchmarks'
import { cn } from '@/lib/utils'

interface CostTrendAnalysisProps {
  projectAreaM2: number
  projectTotalCost: number
  className?: string
}

interface TrendData {
  period: string
  costPerM2: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function CostTrendAnalysis({
  projectAreaM2,
  projectTotalCost,
  className,
}: CostTrendAnalysisProps) {
  const { t } = useLocalization()
  const { data: projects, isLoading } = useConstructionCostBenchmarkProjects()

  const projectCostPerM2 = projectAreaM2 > 0 ? projectTotalCost / projectAreaM2 : 0

  const trendAnalysis = useMemo(() => {
    if (!projects || projects.length < 2) {
      return null
    }

    const sortedProjects = [...projects].sort(
      (a, b) => a.benchmarkDate.getTime() - b.benchmarkDate.getTime()
    )

    const recentProjects = sortedProjects.slice(-6)

    const trends: TrendData[] = recentProjects.map((project, index) => {
      const costPerM2 = project.costPerM2
      let trend: 'up' | 'down' | 'stable' = 'stable'
      let changePercent = 0

      if (index > 0) {
        const prevCost = recentProjects[index - 1].costPerM2
        changePercent = ((costPerM2 - prevCost) / prevCost) * 100

        if (changePercent > 2) trend = 'up'
        else if (changePercent < -2) trend = 'down'
      }

      return {
        period: project.benchmarkDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        costPerM2,
        trend,
        changePercent,
      }
    })

    const firstCost = recentProjects[0].costPerM2
    const lastCost = recentProjects[recentProjects.length - 1].costPerM2
    const overallChange = ((lastCost - firstCost) / firstCost) * 100
    const avgCost = recentProjects.reduce((sum, p) => sum + p.costPerM2, 0) / recentProjects.length

    const minCost = Math.min(...recentProjects.map((p) => p.costPerM2))
    const maxCost = Math.max(...recentProjects.map((p) => p.costPerM2))

    return {
      trends,
      overallChange,
      avgCost,
      minCost,
      maxCost,
      sampleSize: projects.length,
    }
  }, [projects])

  const mlPrediction = useMemo(() => {
    if (!trendAnalysis || projectAreaM2 <= 0) {
      return null
    }

    const annualGrowthRate = trendAnalysis.overallChange / 100

    const projections = [1, 2, 3].map((years) => {
      const projectedCostPerM2 = trendAnalysis.avgCost * Math.pow(1 + annualGrowthRate, years)
      const projectedTotal = projectedCostPerM2 * projectAreaM2

      return {
        years,
        costPerM2: projectedCostPerM2,
        total: projectedTotal,
      }
    })

    const confidenceScore = Math.min(95, Math.max(50, 100 - Math.abs(annualGrowthRate) * 50))

    return {
      projections,
      confidenceScore,
      baseCostPerM2: trendAnalysis.avgCost,
    }
  }, [trendAnalysis, projectAreaM2])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('timeline.benchmark.trendAnalysis.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!trendAnalysis) {
    return null
  }

  const currentVsAvg = projectCostPerM2 - trendAnalysis.avgCost
  const currentVsAvgPercent = (currentVsAvg / trendAnalysis.avgCost) * 100

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm">
            {t('timeline.benchmark.trendAnalysis.title')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t('timeline.benchmark.trendAnalysis.description', { count: trendAnalysis.sampleSize })}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">
              {t('timeline.benchmark.trendAnalysis.overallChange')}
            </p>
            <div className="flex items-center gap-1">
              {trendAnalysis.overallChange > 0 ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-green-500" />
              )}
              <span
                className={cn(
                  'text-sm font-bold',
                  trendAnalysis.overallChange > 0 ? 'text-red-500' : 'text-green-500'
                )}
              >
                {trendAnalysis.overallChange > 0 ? '+' : ''}
                {trendAnalysis.overallChange.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">
              {t('timeline.benchmark.trendAnalysis.average')}
            </p>
            <p className="text-sm font-bold">
              {formatCurrency(trendAnalysis.avgCost)}/m²
            </p>
          </div>
        </div>

        {projectCostPerM2 > 0 && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {t('timeline.benchmark.trendAnalysis.yourProjectVsAvg')}
              </span>
              <span
                className={cn(
                  'text-xs font-bold',
                  currentVsAvg > 0 ? 'text-red-500' : 'text-green-500'
                )}
              >
                {currentVsAvg > 0 ? '+' : ''}
                {currentVsAvgPercent.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, 50 + currentVsAvgPercent / 2))}
              className={cn(
                'h-2',
                currentVsAvg > 10 && '[&>div]:bg-red-500',
                currentVsAvg < -10 && '[&>div]:bg-green-500',
                Math.abs(currentVsAvgPercent) <= 10 && '[&>div]:bg-blue-500'
              )}
            />
          </div>
        )}

        {mlPrediction && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900">
                  {t('timeline.benchmark.trendAnalysis.mlPrediction')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-purple-700">
                  {t('timeline.benchmark.trendAnalysis.confidence', {
                    value: mlPrediction.confidenceScore,
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {mlPrediction.projections.map((proj) => (
                <div key={proj.years} className="flex items-center justify-between text-xs">
                  <span className="text-purple-800">
                    +{proj.years} {proj.years === 1 ? 'ano' : 'anos'}
                  </span>
                  <span className="font-medium text-purple-900">
                    {formatCurrency(proj.costPerM2)}/m²
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
