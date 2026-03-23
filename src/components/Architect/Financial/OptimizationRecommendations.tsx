import { useTranslation } from 'react-i18next';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  ArrowRightLeft,
  Layers,
  ChevronRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Bell
} from 'lucide-react';
import { 
  formatCurrency, 
} from '@/hooks/useArchitectFinancialAdvisor';
import type { BudgetOptimizationRecommendation } from '@/hooks/useArchitectFinancialAdvisor';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface OptimizationRecommendationsProps {
  recommendations: BudgetOptimizationRecommendation[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  showAllByDefault?: boolean;
  onApply?: (recommendationId: string) => void;
  context?: 'architect' | 'clientPortal';
}

export function OptimizationRecommendations({ 
  recommendations, 
  isLoading = false,
  className,
  maxItems = 5,
  showAllByDefault = false,
  onApply,
  context = 'architect'
}: OptimizationRecommendationsProps) {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(showAllByDefault);
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  if (isLoading) {
    return <OptimizationRecommendationsSkeleton className={className} />;
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">{t(getTranslationKey('noRecommendations'))}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by priority: high > medium > low
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder: Record<string, number> = {
      critical: 0,
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    }
    const aPriority = priorityOrder[a.priority] ?? priorityOrder.medium
    const bPriority = priorityOrder[b.priority] ?? priorityOrder.medium
    return aPriority - bPriority
  });

  const displayedRecommendations = isOpen ? sortedRecommendations : sortedRecommendations.slice(0, maxItems);
  const hasMore = sortedRecommendations.length > maxItems;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Lightbulb className="h-4 w-4 text-emerald-600" />
            </div>
            {t(getTranslationKey('optimizationRecommendations'))}
          </CardTitle>
          {recommendations.length > 0 && (
            <Badge variant="glass-style-dark" className="h-5 px-2">{recommendations.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedRecommendations.map((recommendation, index) => (
          <RecommendationCard 
            key={`${recommendation.id}-${index}`} 
            recommendation={recommendation}
            onApply={onApply}
            context={context}
          />
        ))}
        
        {hasMore && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {isOpen ? t('common.showLess') : t('common.showMore', { count: sortedRecommendations.length - maxItems })}
                <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {sortedRecommendations.slice(maxItems).map((recommendation, index) => (
                <RecommendationCard 
                  key={`extra-${recommendation.id}-${index}`} 
                  recommendation={recommendation}
                  onApply={onApply}
                  context={context}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// Individual Recommendation Card
interface RecommendationCardProps {
  recommendation: BudgetOptimizationRecommendation;
  onApply?: (recommendationId: string) => void;
  context?: 'architect' | 'clientPortal';
}

function RecommendationCard({ recommendation, onApply, context = 'architect' }: RecommendationCardProps) {
  const { t, language, currency } = useLocalization();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const typeConfig = {
    reallocation: { icon: ArrowRightLeft, label: t(getTranslationKey('reallocation')), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    reduction: { icon: TrendingDown, label: t(getTranslationKey('reduction')), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
    increase: { icon: TrendingUp, label: t(getTranslationKey('increase')), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
    consolidation: { icon: Layers, label: t(getTranslationKey('consolidation')), color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
  };

  const priorityConfig = {
    critical: { badge: 'destructive', label: t(getTranslationKey('priorityHigh')) },
    urgent: { badge: 'destructive', label: t(getTranslationKey('priorityHigh')) },
    high: { badge: 'destructive', label: t(getTranslationKey('priorityHigh')) },
    medium: { badge: 'secondary', label: t(getTranslationKey('priorityMedium')) },
    low: { badge: 'outline', label: t(getTranslationKey('priorityLow')) },
  };

  const complexityConfig = {
    easy: { icon: CheckCircle2, color: 'text-green-600', label: t(getTranslationKey('complexityEasy')) },
    moderate: { icon: Clock, color: 'text-amber-600', label: t(getTranslationKey('complexityModerate')) },
    complex: { icon: Layers, color: 'text-red-600', label: t(getTranslationKey('complexityComplex')) },
  };

  const type = typeConfig[recommendation.type as keyof typeof typeConfig] || typeConfig.reallocation;
  const priority = priorityConfig[recommendation.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const complexity = complexityConfig[recommendation.implementationComplexity as keyof typeof complexityConfig] || complexityConfig.moderate;
  const TypeIcon = type.icon;
  const ComplexityIcon = complexity.icon;

  return (
    <div className={cn(
      'p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-md bg-gradient-to-r from-card to-background',
      type.bg.replace('bg-', 'border-l-'), // Use type.bg for border-l color
      'border-border shadow-sm'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn('p-2 rounded-lg bg-background', type.color)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{recommendation.category}</h4>
              <Badge variant={priority.badge as any} className="text-xs">
                {priority.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{type.label}</p>
          </div>
        </div>
        {onApply && (
          <Button 
            variant="glass-style-dark" 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => onApply(recommendation.id)}
          >
            {t('common.apply')}
          </Button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm mt-3">{recommendation.rationale}</p>

      {/* Allocation Comparison */}
      <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-dashed border-border group-hover:bg-muted/50 transition-colors">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t(getTranslationKey('current'))}</span>
            <p className="text-sm font-semibold opacity-70 line-through text-muted-foreground">{formatCurrency(recommendation.currentAllocation, currency, language)}</p>
          </div>
          <div className="space-y-1 border-l pl-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{t(getTranslationKey('optimized'))}</span>
            <p className="text-sm font-bold text-primary">{formatCurrency(recommendation.recommendedAllocation, currency, language)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-600">
            {t(getTranslationKey('potentialSavings'))}
          </span>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold">
            {formatCurrency(recommendation.potentialSavings, currency, language)}
          </Badge>
        </div>
      </div>

      {/* Action Items */}
      {recommendation.actionItems && recommendation.actionItems.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t(getTranslationKey('actionItems'))}:
          </p>
          <ul className="text-xs space-y-1">
            {recommendation.actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-1">
                <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <ComplexityIcon className={cn('h-3 w-3', complexity.color)} />
          <span>{complexity.label}</span>
        </div>
        {recommendation.estimatedImpact && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{recommendation.estimatedImpact}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton Loading State
function OptimizationRecommendationsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default OptimizationRecommendations;
