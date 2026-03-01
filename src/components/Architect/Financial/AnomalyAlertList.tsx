import { useTranslation } from 'react-i18next';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  Bell,
  ChevronRight,
  X,
  Lightbulb, 
  TrendingDown, 
  TrendingUp, 
  ArrowRightLeft,
  Layers,
  Clock,
  DollarSign
} from 'lucide-react';
import { 
  formatCurrency, 
  formatPercentage,
  useAcknowledgeAlert,
} from '@/hooks/useArchitectFinancialAdvisor';
import type { BudgetAlert, CostAnomaly } from '@/hooks/useArchitectFinancialAdvisor';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface AnomalyAlertListProps {
  alerts: BudgetAlert[];
  anomalies: CostAnomaly[];
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
  showAllByDefault?: boolean;
  onAcknowledge?: (alertId: string) => void;
  context?: 'architect' | 'clientPortal';
}

export function AnomalyAlertList({ 
  alerts, 
  anomalies,
  isLoading = false,
  className,
  maxItems = 5,
  showAllByDefault = false,
  onAcknowledge,
  context = 'architect'
}: AnomalyAlertListProps) {
  const { t } = useLocalization();
  const [isOpen, setIsOpen] = useState(showAllByDefault);
  const acknowledgeMutation = useAcknowledgeAlert();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  if (isLoading) {
    return <AnomalyAlertListSkeleton className={className} />;
  }

  const allItems = [
    ...alerts.map(a => ({ type: 'alert' as const, data: a })),
    ...anomalies.map(a => ({ type: 'anomaly' as const, data: a })),
  ].sort((a, b) => {
    // Sort by severity: critical > high > warning > info
    const severityOrder = { critical: 0, high: 1, warning: 2, info: 3 };
    const aSev = ('severity' in a.data) ? a.data.severity : 'info';
    const bSev = ('severity' in b.data) ? b.data.severity : 'info';
    return severityOrder[aSev as keyof typeof severityOrder] - severityOrder[bSev as keyof typeof severityOrder];
  });

  if (allItems.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">{t(getTranslationKey('noAlerts'))}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedItems = isOpen ? allItems : allItems.slice(0, maxItems);
  const hasMore = allItems.length > maxItems;

  const handleAcknowledge = (alertId: string) => {
    if (onAcknowledge) {
      onAcknowledge(alertId);
    } else {
      acknowledgeMutation.mutate({ alertId });
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            {t(getTranslationKey('alertsAndAnomalies'))}
          </CardTitle>
          {allItems.length > 0 && (
            <Badge variant="glass-style-dark" className="h-5 px-2">{allItems.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6">
        {displayedItems.map((item, index) => (
          item.type === 'alert' ? (
            <AlertCard 
              key={`alert-${item.data.id}-${index}`} 
              alert={item.data}
              onAcknowledge={handleAcknowledge}
              context={context}
            />
          ) : (
            <AnomalyCard 
              key={`anomaly-${item.data.id}-${index}`} 
              anomaly={item.data}
              context={context}
            />
          )
        ))}
        
        {hasMore && (
          <div className="col-span-full pt-2">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border/40">
                  {isOpen ? t('common.showLess') : t('common.showMore', { count: allItems.length - maxItems })}
                  <ChevronRight className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-90')} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {allItems.slice(maxItems).map((item, index) => (
                item.type === 'alert' ? (
                  <AlertCard 
                    key={`alert-extra-${item.data.id}-${index}`} 
                    alert={item.data}
                    onAcknowledge={handleAcknowledge}
                    context={context}
                  />
                ) : (
                  <AnomalyCard 
                    key={`anomaly-extra-${item.data.id}-${index}`} 
                    anomaly={item.data}
                    context={context}
                  />
                )
              ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alert Card Component
interface AlertCardProps {
  alert: BudgetAlert;
  onAcknowledge?: (alertId: string) => void;
  context?: 'architect' | 'clientPortal';
}

function AlertCard({ alert, onAcknowledge, context = 'architect' }: AlertCardProps) {
  const { t } = useLocalization();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const severityConfig = {
    critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200' },
    warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200' },
  };

  const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-md bg-gradient-to-r from-card to-background h-full',
      config.bg.replace('bg-', 'border-l-'),
      'border-border shadow-sm'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">{alert.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.category}</p>
            </div>
            {!alert.acknowledged && onAcknowledge && (
              <Button 
                variant="glass-style-dark" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => onAcknowledge(alert.id)}
              >
                <X className="h-3 w-3 mr-1" />
                {t('common.dismiss')}
              </Button>
            )}
          </div>
          <p className="text-sm mt-1">{alert.message}</p>
          
          {alert.recommendedActions && alert.recommendedActions.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {t(getTranslationKey('recommendedActions'))}:
              </p>
              <ul className="text-xs space-y-0.5">
                {alert.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>{new Date(alert.triggeredAt).toLocaleDateString()}</span>
            {alert.acknowledged && (
              <Badge variant="outline" className="text-xs">
                {t('common.acknowledged')}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Anomaly Card Component
interface AnomalyCardProps {
  anomaly: CostAnomaly;
  context?: 'architect' | 'clientPortal';
}

function AnomalyCard({ anomaly, context = 'architect' }: AnomalyCardProps) {
  const { t, language, currency } = useLocalization();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const severityConfig = {
    high: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200' },
    medium: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200' },
    low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200' },
  };

  const config = severityConfig[anomaly.severity as keyof typeof severityConfig] || severityConfig.low;
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-md bg-gradient-to-r from-card to-background h-full',
      config.bg.replace('bg-', 'border-l-'),
      'border-border shadow-sm'
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-sm">{t(getTranslationKey('costAnomaly'))}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{anomaly.category}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatPercentage(anomaly.deviationPercentage)}
            </Badge>
          </div>
          
          <p className="text-sm mt-1">{anomaly.description}</p>
          
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <span className="text-muted-foreground">{t(getTranslationKey('amount'))}: </span>
              <span className="font-medium">{formatCurrency(anomaly.amount, currency, language)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t(getTranslationKey('expectedRange'))}: </span>
              <span className="font-medium">
                {formatCurrency(anomaly.expectedRange.min, currency, language)} - {formatCurrency(anomaly.expectedRange.max, currency, language)}
              </span>
            </div>
          </div>
          
          {anomaly.possibleCauses && anomaly.possibleCauses.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t(getTranslationKey('possibleCauses'))}:
              </p>
              <ul className="text-xs space-y-0.5 mt-0.5">
                {anomaly.possibleCauses.map((cause, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {anomaly.recommendation && (
            <div className="mt-2 p-2 bg-background/50 rounded text-xs">
              <span className="font-medium">{t(getTranslationKey('recommendation'))}: </span>
              {anomaly.recommendation}
            </div>
          )}
          
          <div className="mt-2 text-xs text-muted-foreground">
            <span>{new Date(anomaly.transactionDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Loading State
function AnomalyAlertListSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-8" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg border space-y-2">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default AnomalyAlertList;
