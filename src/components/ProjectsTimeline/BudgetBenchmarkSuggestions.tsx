import { useMemo } from 'react'
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useConstructionCostBenchmarkAverages } from '@/hooks/useConstructionCostBenchmarks'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'

interface BudgetBenchmarkSuggestionsProps {
  projectAreaM2: number
  currentBudgetByCategory?: Record<string, number>
  className?: string
}

export function BudgetBenchmarkSuggestions({
  projectAreaM2,
  currentBudgetByCategory = {},
  className,
}: BudgetBenchmarkSuggestionsProps) {
  const { t } = useLocalization()
  const { data: averages, isLoading } = useConstructionCostBenchmarkAverages()

  const suggestions = useMemo(() => {
    if (!averages || projectAreaM2 <= 0) return []

    return averages.map((avg) => {
      const suggestedCost = avg.averageCostPerM2 * projectAreaM2
      const currentCost = currentBudgetByCategory[avg.materialCategory] || 0
      const variance = currentCost > 0 
        ? ((currentCost - suggestedCost) / suggestedCost) * 100 
        : 0

      return {
        category: avg.materialCategory,
        suggestedCost,
        minCost: suggestedCost * 0.9,
        maxCost: suggestedCost * 1.1,
        currentCost,
        variance,
        sampleSize: avg.sampleSize,
        status: variance > 10 ? 'high' : variance < -10 ? 'low' : 'ok',
      }
    })
  }, [averages, projectAreaM2, currentBudgetByCategory])

  const totalSuggested = useMemo(() => 
    suggestions.reduce((sum, s) => sum + s.suggestedCost, 0),
    [suggestions]
  )

  const totalCurrent = useMemo(() => 
    suggestions.reduce((sum, s) => sum + s.currentCost, 0),
    [suggestions]
  )

  const totalVariance = totalCurrent > 0 
    ? ((totalCurrent - totalSuggested) / totalSuggested) * 100 
    : 0

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">{t('timeline.benchmark.budgetSuggestions.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm">
              {t('timeline.benchmark.budgetSuggestions.title')}
            </CardTitle>
          </div>
          {totalCurrent > 0 && (
            <Badge 
              variant={totalVariance > 10 ? 'destructive' : totalVariance < -10 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('timeline.benchmark.budgetSuggestions.subtitle', { area: projectAreaM2 })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {t('timeline.benchmark.budgetSuggestions.suggestedTotal')}
            </p>
            <p className="text-lg font-bold">{formatCurrency(totalSuggested)}</p>
          </div>
          {totalCurrent > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {t('timeline.benchmark.budgetSuggestions.yourTotal')}
              </p>
              <p className={cn(
                "text-lg font-bold",
                totalVariance > 10 && "text-red-600",
                totalVariance < -10 && "text-green-600"
              )}>
                {formatCurrency(totalCurrent)}
              </p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {suggestions.map((item) => (
            <div 
              key={item.category}
              className={cn(
                "flex items-center justify-between rounded-md border p-2 text-sm",
                item.status === 'high' && "border-red-200 bg-red-50",
                item.status === 'low' && "border-green-200 bg-green-50",
                item.status === 'ok' && "border-border"
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.category}</span>
                  {item.status === 'high' && (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  )}
                  {item.status === 'low' && (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  {item.status === 'ok' && item.currentCost > 0 && (
                    <AlertCircle className="h-3 w-3 text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('timeline.benchmark.budgetSuggestions.range', {
                    min: formatCurrency(item.minCost),
                    max: formatCurrency(item.maxCost),
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(item.suggestedCost)}</p>
                {item.currentCost > 0 && (
                  <p className={cn(
                    "text-xs",
                    item.variance > 10 && "text-red-600",
                    item.variance < -10 && "text-green-600",
                    Math.abs(item.variance) <= 10 && "text-muted-foreground"
                  )}>
                    {item.variance > 0 ? '+' : ''}{item.variance.toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>{t('timeline.benchmark.budgetSuggestions.aboveRange')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span>{t('timeline.benchmark.budgetSuggestions.belowRange')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>{t('timeline.benchmark.budgetSuggestions.withinRange')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
