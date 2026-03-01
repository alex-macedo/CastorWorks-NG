import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { BudgetVariancePrediction } from '@/lib/ai/types';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetVariancePredictionCardProps {
  predictions: BudgetVariancePrediction[];
}

export const BudgetVariancePredictionCard: React.FC<BudgetVariancePredictionCardProps> = ({
  predictions,
}) => {
  const { currency, t } = useLocalization();

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Minus className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-destructive" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-success" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return translate('budget:intelligence.predictions.riskCritical', 'Critical');
      case 'high':
        return translate('budget:intelligence.predictions.riskHigh', 'High');
      case 'medium':
        return translate('budget:intelligence.predictions.riskMedium', 'Medium');
      case 'low':
        return translate('budget:intelligence.predictions.riskLow', 'Low');
      default:
        return riskLevel;
    }
  };

  const getTrendLabel = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return translate('budget:intelligence.predictions.trendIncreasing', 'Increasing');
      case 'decreasing':
        return translate('budget:intelligence.predictions.trendDecreasing', 'Decreasing');
      case 'stable':
        return translate('budget:intelligence.predictions.trendStable', 'Stable');
      default:
        return direction;
    }
  };

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {translate('budget:intelligence.predictions.title', 'Budget Variance Predictions')}
          </CardTitle>
          <CardDescription>
            {translate(
              'budget:intelligence.predictions.emptyDescription',
              'No variance predictions available. Run analysis to generate predictions.'
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {translate('budget:intelligence.predictions.title', 'Budget Variance Predictions')}
        </CardTitle>
        <CardDescription>
          {translate(
            'budget:intelligence.predictions.description',
            'AI-powered forecasts of budget overruns and savings by category'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictions.map((prediction, index) => (
            <div key={index} className="rounded-lg border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{prediction.category}</h4>
                    <Badge variant={getRiskColor(prediction.riskLevel)}>
                      {getRiskIcon(prediction.riskLevel)}
                      <span className="ml-1">{getRiskLabel(prediction.riskLevel)}</span>
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getTrendIcon(prediction.trendDirection)}
                      <span className="capitalize">{getTrendLabel(prediction.trendDirection)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {translate('budget:intelligence.predictions.confidence', 'Confidence')}
                  </div>
                  <div className="text-lg font-bold">{prediction.confidence}%</div>
                </div>
              </div>

              {/* Budget vs Predicted */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">
                    {translate('budget:intelligence.predictions.budgeted', 'Budgeted')}
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(prediction.budgetedAmount, currency)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {translate('budget:intelligence.predictions.currentSpent', 'Current Spent')}
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(prediction.currentSpending, currency)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    {translate('budget:intelligence.predictions.predictedFinal', 'Predicted Final')}
                  </div>
                  <div className="font-semibold text-primary">
                    {formatCurrency(prediction.predictedFinalSpending, currency)}
                  </div>
                </div>
              </div>

              {/* Variance Indicator */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {translate('budget:intelligence.predictions.predictedVariance', 'Predicted Variance')}
                  </span>
                  <span className={`font-semibold ${
                    prediction.predictedVariance > 0 ? 'text-destructive' : 'text-success'
                  }`}>
                    {prediction.predictedVariance > 0 ? '+' : ''}
                    {formatCurrency(prediction.predictedVariance, currency)}
                    {' '}
                    ({prediction.variancePercentage > 0 ? '+' : ''}
                    {prediction.variancePercentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    (prediction.currentSpending / prediction.budgetedAmount) * 100,
                    100
                  )}
                  className="h-2"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
