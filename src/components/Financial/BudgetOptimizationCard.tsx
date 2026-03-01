import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import { BudgetOptimizationRecommendation } from '@/lib/ai/types';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetOptimizationCardProps {
  recommendations: BudgetOptimizationRecommendation[];
}

export const BudgetOptimizationCard: React.FC<BudgetOptimizationCardProps> = ({
  recommendations,
}) => {
  const { currency, t } = useLocalization();

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reallocation':
        return translate('budget:intelligence.optimization.types.reallocation', 'Reallocate Budget');
      case 'reduction':
        return translate('budget:intelligence.optimization.types.reduction', 'Reduce Spending');
      case 'increase':
        return translate('budget:intelligence.optimization.types.increase', 'Increase Budget');
      case 'consolidation':
        return translate('budget:intelligence.optimization.types.consolidation', 'Consolidate Categories');
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'reallocation':
        return 'default';
      case 'reduction':
        return 'destructive';
      case 'increase':
        return 'default';
      case 'consolidation':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return 'bg-success/10 text-success border-success/20';
      case 'moderate':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'complex':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return '';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return translate('budget:intelligence.optimization.priorityHigh', 'High priority');
      case 'medium':
        return translate('budget:intelligence.optimization.priorityMedium', 'Medium priority');
      case 'low':
        return translate('budget:intelligence.optimization.priorityLow', 'Low priority');
      default:
        return priority;
    }
  };

  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return translate('budget:intelligence.optimization.complexityEasy', 'Easy to implement');
      case 'moderate':
        return translate('budget:intelligence.optimization.complexityModerate', 'Moderate to implement');
      case 'complex':
        return translate('budget:intelligence.optimization.complexityComplex', 'Complex to implement');
      default:
        return complexity;
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            {translate('budget:intelligence.optimization.title', 'Budget Optimization')}
          </CardTitle>
          <CardDescription>
            {translate(
              'budget:intelligence.optimization.emptyDescription',
              'No optimization recommendations available at this time'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-success bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              {translate(
                'budget:intelligence.optimization.emptyMessage',
                'Your budget allocation appears optimal. Keep monitoring for future improvements.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totalPotentialSavings = recommendations.reduce(
    (sum, rec) => sum + rec.potentialSavings,
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              {translate('budget:intelligence.optimization.title', 'Budget Optimization')}
            </CardTitle>
            <CardDescription>
              {translate(
                recommendations.length === 1
                  ? 'budget:intelligence.optimization.summarySingle'
                  : 'budget:intelligence.optimization.summaryPlural',
                `${recommendations.length} AI-powered recommendations`,
                { count: recommendations.length }
              )}
            </CardDescription>
          </div>
          {totalPotentialSavings > 0 && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {translate('budget:intelligence.optimization.potentialSavings', 'Potential Savings')}
              </div>
              <div className="text-xl font-bold text-success">
                {formatCurrency(totalPotentialSavings, currency)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-lg border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{rec.category}</h4>
                    <Badge variant={getPriorityColor(rec.priority)}>
                      {getPriorityLabel(rec.priority)}
                    </Badge>
                    <Badge variant={getTypeColor(rec.type)}>
                      {getTypeLabel(rec.type)}
                    </Badge>
                  </div>
                </div>
                {rec.potentialSavings > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {translate('budget:intelligence.optimization.savingsLabel', 'Savings')}
                    </div>
                    <div className="text-lg font-bold text-success">
                      {formatCurrency(rec.potentialSavings, currency)}
                    </div>
                  </div>
                )}
              </div>

              {/* Allocation Change */}
              <div className="flex items-center gap-4 rounded bg-muted p-3">
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {translate('budget:intelligence.optimization.currentLabel', 'Current')}
                  </div>
                  <div className="font-semibold">
                    {formatCurrency(rec.currentAllocation, currency)}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-1">
                    {translate('budget:intelligence.optimization.recommendedLabel', 'Recommended')}
                  </div>
                  <div className="font-semibold text-primary">
                    {formatCurrency(rec.recommendedAllocation, currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">
                    {translate('budget:intelligence.optimization.changeLabel', 'Change')}
                  </div>
                  <div className={`text-sm font-semibold ${
                    rec.recommendedAllocation < rec.currentAllocation
                      ? 'text-success'
                      : 'text-primary'
                  }`}>
                    {rec.recommendedAllocation > rec.currentAllocation ? '+' : ''}
                    {formatCurrency(
                      rec.recommendedAllocation - rec.currentAllocation,
                      currency
                    )}
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {translate(
                    'budget:intelligence.optimization.rationaleLabel',
                    'Rationale:'
                  )}{' '}
                  {rec.rationale}
                </AlertDescription>
              </Alert>

              {/* Action Items */}
              {rec.actionItems && rec.actionItems.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">
                    {translate('budget:intelligence.optimization.actionItems', 'Action Items')}
                  </div>
                  <ul className="space-y-1">
                    {rec.actionItems.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className={`text-xs px-2 py-1 rounded border ${getComplexityColor(rec.implementationComplexity)}`}>
                  {getComplexityLabel(rec.implementationComplexity)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rec.estimatedImpact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
