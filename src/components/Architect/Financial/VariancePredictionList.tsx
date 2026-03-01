import { useTranslation } from 'react-i18next';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { 
  formatCurrency, 
  formatPercentage,
  getTrendDirection,
} from '@/hooks/useArchitectFinancialAdvisor';
import type { BudgetVariancePrediction } from '@/hooks/useArchitectFinancialAdvisor';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface VariancePredictionListProps {
  predictions: BudgetVariancePrediction[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  showAllByDefault?: boolean;
  context?: 'architect' | 'clientPortal';
}

export function VariancePredictionList({ 
  predictions, 
  isLoading = false,
  className,
  maxItems = 5,
  showAllByDefault = false,
  context = 'architect'
}: VariancePredictionListProps) {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(showAllByDefault);
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  if (isLoading) {
    return <VariancePredictionListSkeleton className={className} />;
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t(getTranslationKey('noPredictions'))}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedPredictions = isOpen ? predictions : predictions.slice(0, maxItems);
  const hasMore = predictions.length > maxItems;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t(getTranslationKey('variancePredictions'))}
          </CardTitle>
          {predictions.length > 0 && (
            <Badge variant="secondary">{predictions.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
        {displayedPredictions.map((prediction, index) => (
          <VariancePredictionItem 
            key={`${prediction.category}-${index}`} 
            prediction={prediction} 
            context={context}
          />
        ))}
        
        {hasMore && (
          <div className="col-span-full pt-2">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/40">
                  {isOpen ? t('common.showLess') : t('common.showMore', { count: predictions.length - maxItems })}
                  <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {predictions.slice(maxItems).map((prediction, index) => (
                <VariancePredictionItem 
                  key={`${prediction.category}-extra-${index}`} 
                  prediction={prediction} 
                  context={context}
                />
              ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual Variance Prediction Item
interface VariancePredictionItemProps {
  prediction: BudgetVariancePrediction;
  context?: 'architect' | 'clientPortal';
}

function VariancePredictionItem({ prediction, context = 'architect' }: VariancePredictionItemProps) {
  const { t, language, currency } = useLocalization();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const trendDirection = getTrendDirection(prediction.trendDirection);
  const isOverBudget = prediction.predictedVariance < 0;
  const utilizationRate = prediction.budgetedAmount > 0 
    ? (prediction.currentSpending / prediction.budgetedAmount) * 100 
    : 0;
  const predictedUtilization = prediction.budgetedAmount > 0
    ? (prediction.predictedFinalSpending / prediction.budgetedAmount) * 100
    : 0;

  const TrendIcon = trendDirection === 'up' 
    ? TrendingUp 
    : trendDirection === 'down' 
      ? TrendingDown 
      : Minus;

  const riskColors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const riskLabels: Record<string, string> = {
    low: t(getTranslationKey('riskLow')),
    medium: t(getTranslationKey('riskMedium')),
    high: t(getTranslationKey('riskHigh')),
    critical: t(getTranslationKey('riskCritical')),
  };

  return (
    <div className="flex flex-col justify-between space-y-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-all duration-300 h-full hover:shadow-md">
      <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{prediction.category}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant="outline" 
              className={cn('text-xs', riskColors[prediction.riskLevel]?.replace('bg-', 'border-'))}
            >
              {riskLabels[prediction.riskLevel] || prediction.riskLevel}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatPercentage(prediction.confidence)} {t(getTranslationKey('confidence'))}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn(
            'h-4 w-4',
            trendDirection === 'up' ? 'text-red-500' : 
            trendDirection === 'down' ? 'text-green-500' : 'text-muted-foreground'
          )} />
        </div>
      </div>

      {/* Budget Utilization Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t(getTranslationKey('utilization'))}</span>
          <span className="font-medium">{formatPercentage(utilizationRate)}</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              'absolute h-full rounded-full transition-all duration-500',
              utilizationRate > 100 ? 'bg-red-500' : 
              utilizationRate > 80 ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(utilizationRate, 100)}%` }}
          />
          {/* Predicted marker */}
          <div 
            className="absolute h-full w-0.5 bg-foreground/50"
            style={{ left: `${Math.min(predictedUtilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatCurrency(prediction.currentSpending, currency, language)}</span>
          <span>{formatCurrency(prediction.budgetedAmount, currency, language)}</span>
        </div>
      </div>

      {/* Prediction Details */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground">{t(getTranslationKey('predictedFinal'))}</p>
          <p className={cn(
            'text-sm font-medium',
            isOverBudget ? 'text-red-600' : 'text-green-600'
          )}>
            {formatCurrency(prediction.predictedFinalSpending, currency, language)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t(getTranslationKey('predictedVariance'))}</p>
          <p className={cn(
            'text-sm font-medium',
            isOverBudget ? 'text-red-600' : 'text-green-600'
          )}>
            {isOverBudget ? '' : '+'}{formatCurrency(prediction.predictedVariance, currency, language)}
            <span className="text-xs ml-1">
              ({prediction.variancePercentage > 0 ? '+' : ''}{formatPercentage(prediction.variancePercentage)})
            </span>
          </p>
        </div>
      </div>

      {/* Warning for over budget */}
      {isOverBudget && prediction.riskLevel !== 'low' && (
        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs">
          <AlertTriangle className="h-3 w-3 text-red-600" />
          <span className="text-red-800 dark:text-red-200">
            {t(getTranslationKey('overBudgetWarning'))}
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

// Skeleton Loading State
function VariancePredictionListSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 p-3 rounded-lg border">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-2 w-full" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default VariancePredictionList;
