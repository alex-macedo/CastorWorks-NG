import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Activity, Calendar } from 'lucide-react';
import { SpendingPattern } from '@/lib/ai/types';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

interface SpendingPatternsCardProps {
  patterns: SpendingPattern[];
}

export const SpendingPatternsCard: React.FC<SpendingPatternsCardProps> = ({
  patterns,
}) => {
  const { currency, t } = useLocalization();

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-destructive';
      case 'decreasing':
        return 'text-success';
      case 'stable':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4" />;
      case 'stable':
        return <Minus className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return translate('budget:intelligence.patterns.trendIncreasing', 'Increasing');
      case 'decreasing':
        return translate('budget:intelligence.patterns.trendDecreasing', 'Decreasing');
      case 'stable':
        return translate('budget:intelligence.patterns.trendStable', 'Stable');
      default:
        return trend;
    }
  };

  const getVolatilityColor = (volatility: number) => {
    if (volatility > 70) return 'destructive';
    if (volatility > 40) return 'default';
    return 'secondary';
  };

  const getVolatilityLabel = (volatility: number) => {
    if (volatility > 70) {
      return translate('budget:intelligence.patterns.volatilityHigh', 'High Volatility');
    }
    if (volatility > 40) {
      return translate('budget:intelligence.patterns.volatilityModerate', 'Moderate Volatility');
    }
    return translate('budget:intelligence.patterns.volatilityLow', 'Low Volatility');
  };

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {translate('budget:intelligence.patterns.title', 'Spending Patterns Analysis')}
          </CardTitle>
          <CardDescription>
            {translate(
              'budget:intelligence.patterns.emptyDescription',
              'No spending patterns available. Run analysis to identify trends.'
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {translate('budget:intelligence.patterns.title', 'Spending Patterns Analysis')}
        </CardTitle>
        <CardDescription>
          {translate(
            'budget:intelligence.patterns.description',
            'AI-detected trends and patterns in spending behavior'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map((pattern, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{pattern.category}</h4>
                    <Badge variant="outline" className="capitalize">
                      {pattern.timeframe}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`flex items-center gap-1 ${getTrendColor(pattern.trend)}`}>
                      {getTrendIcon(pattern.trend)}
                      <span className="capitalize">{getTrendLabel(pattern.trend)}</span>
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant={getVolatilityColor(pattern.volatility)}>
                      {getVolatilityLabel(pattern.volatility)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {translate('budget:intelligence.patterns.averageSpending', 'Avg Spending')}
                  </div>
                  <div className="text-lg font-bold">
                    {formatCurrency(pattern.averageSpending, currency)}
                  </div>
                </div>
              </div>

              {/* Volatility Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">
                    {translate('budget:intelligence.patterns.volatilityLabel', 'Spending Volatility')}
                  </span>
                  <span className="font-medium">{pattern.volatility.toFixed(0)}%</span>
                </div>
                <Progress value={pattern.volatility} className="h-2" />
              </div>

              {/* Peak Periods */}
              {pattern.peakPeriods && pattern.peakPeriods.length > 0 && (
                <div className="rounded bg-muted p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Calendar className="h-4 w-4" />
                    {translate('budget:intelligence.patterns.peakPeriods', 'Peak Spending Periods')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pattern.peakPeriods.map((period, idx) => (
                      <Badge key={idx} variant="secondary">
                        {period}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Seasonal Factors */}
              {pattern.seasonalFactors && pattern.seasonalFactors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">
                    {translate('budget:intelligence.patterns.seasonalFactors', 'Seasonal Factors')}
                  </div>
                  <div className="grid gap-2">
                    {pattern.seasonalFactors.map((factor, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm rounded bg-muted p-2">
                        <span className="text-muted-foreground">{factor.period}</span>
                        <Badge variant={factor.multiplier > 1.2 ? 'destructive' : 'secondary'}>
                          {factor.multiplier.toFixed(2)}x
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {pattern.insights && pattern.insights.length > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="text-sm font-semibold mb-2">
                    {translate('budget:intelligence.patterns.keyInsights', 'Key Insights')}
                  </div>
                  <ul className="space-y-1">
                    {pattern.insights.map((insight, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
