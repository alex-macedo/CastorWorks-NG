import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb
} from 'lucide-react';
import { 
  useArchitectFinancialAdvisor, 
  useRefreshFinancialAdvisor,
  useHealthScoreColor,
  useHealthScoreBgColor,
  useRiskLevelVariant,
  formatCurrency,
} from '@/hooks/useArchitectFinancialAdvisor';
import { AICacheHeader } from '@/components/AI/AICacheHeader';
import type { BudgetIntelligenceAnalysis } from '@/hooks/useArchitectFinancialAdvisor';
import { cn } from '@/lib/utils';

interface BudgetHealthCardProps {
  projectId?: string;
  compact?: boolean;
  showDetails?: boolean;
  onViewDetails?: () => void;
  className?: string;
  context?: 'architect' | 'clientPortal';
  /** When false, AICacheHeader is hidden (e.g. when parent shows page-level cache header) */
  showCacheHeader?: boolean;
}

export function BudgetHealthCard({
  projectId,
  compact = false,
  showDetails = true,
  onViewDetails,
  className,
  context = 'architect',
  showCacheHeader = true,
}: BudgetHealthCardProps) {
  const { t, language, currency } = useLocalization();
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const { data, isLoading, isError } = useArchitectFinancialAdvisor({
    projectId,
    language: language as any,
  });

  const refreshMutation = useRefreshFinancialAdvisor();

  const analysis = data?.analysis;
  const cached = data?.cached ?? false;
  const generatedAt = data?.generatedAt ?? null;

  const handleRefresh = () => {
    refreshMutation.mutate({ projectId, language: language as any });
  };

  if (isLoading) {
    return <BudgetHealthCardSkeleton compact={compact} className={className} />;
  }

  if (isError || !analysis) {
    return (
      <Card className={cn('overflow-hidden border-dashed border-2', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                {t(getTranslationKey('budgetHealth'))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(getTranslationKey('noDataAvailable'))}
              </p>
            </div>
            {onViewDetails && (
              <Button 
                variant="glass-style-dark" 
                size="sm" 
                className="shrink-0"
                onClick={onViewDetails}
              >
                {t(getTranslationKey('setup'))}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {showCacheHeader && (
          <div className="flex justify-end">
            <AICacheHeader
              lastUpdated={generatedAt}
              cached={cached}
              onRefresh={handleRefresh}
              isRefreshing={refreshMutation.isPending}
            />
          </div>
        )}
        <CompactHealthCard
          analysis={analysis}
          onViewDetails={onViewDetails}
          className={className}
          context={context}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showCacheHeader && (
        <div className="flex justify-end">
          <AICacheHeader
            lastUpdated={generatedAt}
            cached={cached}
            onRefresh={handleRefresh}
            isRefreshing={refreshMutation.isPending}
          />
        </div>
      )}
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t(getTranslationKey('budgetHealth'))}
            </CardTitle>
            <HealthScoreBadge score={analysis.overallHealthScore} context={context} />
          </div>
        </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Health Gauge - Centered in its own space */}
          <div className="shrink-0 flex flex-col items-center justify-center space-y-4">
            <HealthScoreCircle score={analysis.overallHealthScore} size="lg" />
            <div className="flex items-center gap-2">
              <HealthScoreBadge score={analysis.overallHealthScore} context={context} />
              <RiskLevelBadge level={analysis.summary.riskLevel} context={context} />
            </div>
          </div>

          {/* Core Analytics - Dense and aligned */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 border-b pb-1">{t(getTranslationKey('primaryIndicators'))}</h4>
              <div className="space-y-3">
                {[
                  { labelKey: 'varianceControl', value: 85, color: 'emerald' },
                  { labelKey: 'riskMitigation', value: 62, color: 'amber' }
                ].map((metric, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-muted-foreground">{t(getTranslationKey(metric.labelKey))}</span>
                      <span className="text-foreground">{metric.value}%</span>
                    </div>
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn('h-full rounded-full bg-primary')} 
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 border-b pb-1">{t(getTranslationKey('aiStrategicOutlook'))}</h4>
              <div className="space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="p-1 rounded bg-primary/10 text-primary mt-0.5 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground">
                    {analysis.overallHealthScore >= 80 ? t(getTranslationKey('spendingOptimal')) : t(getTranslationKey('spendingDeviations'))}
                  </p>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="p-1 rounded bg-amber-500/10 text-amber-600 mt-0.5 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-snug text-muted-foreground">
                    {analysis.summary.riskLevel === 'critical' ? t(getTranslationKey('reservesInsufficient')) : t(getTranslationKey('reservesStable'))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

// Compact version for dashboard
function CompactHealthCard({ 
  analysis, 
  onViewDetails,
  className,
  context = 'architect'
}: { 
  analysis: BudgetIntelligenceAnalysis; 
  onViewDetails?: () => void;
  className?: string;
  context?: 'architect' | 'clientPortal';
}) {
  const { t } = useLocalization();
  const scoreColor = useHealthScoreColor(analysis.overallHealthScore);
  const hasAlerts = analysis.alerts.length > 0;
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HealthScoreCircle score={analysis.overallHealthScore} size="sm" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t(getTranslationKey('budgetHealth'))}
              </p>
              <p className={cn('text-2xl font-bold', scoreColor)}>
                {analysis.overallHealthScore}
                <span className="text-sm font-normal text-muted-foreground ml-1">/100</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <RiskLevelBadge level={analysis.summary.riskLevel} context={context} />
            {hasAlerts && (
              <div className="flex items-center gap-1 mt-1 text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">{analysis.alerts.length} {t(getTranslationKey('alerts'))}</span>
              </div>
            )}
          </div>
        </div>
        {onViewDetails && (
          <Button 
            variant="glass-style-dark" 
            size="sm" 
            className="w-full mt-3" 
            onClick={onViewDetails}
          >
            {t(getTranslationKey('viewDetails'))}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Health Score Circle Component
interface HealthScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function HealthScoreCircle({ score, size = 'md' }: HealthScoreCircleProps) {
  const bgColor = useHealthScoreBgColor(score);
  
  const dimensions = {
    sm: { container: 'w-16 h-16', text: 'text-lg', stroke: 3 },
    md: { container: 'w-24 h-24', text: 'text-2xl', stroke: 4 },
    lg: { container: 'w-32 h-32', text: 'text-3xl', stroke: 5 },
    xl: { container: 'w-48 h-48', text: 'text-5xl', stroke: 6 },
  };

  const { container, text, stroke } = dimensions[size];
  const radius = 50 - stroke;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div 
      className={cn('relative flex items-center justify-center', container)}
      style={{
        '--stroke-dasharray': circumference,
        '--stroke-dashoffset': offset,
      } as React.CSSProperties}
    >
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="50%"
          cy="50%"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn('transition-all duration-1000 ease-out', bgColor.replace('bg-', 'text-'))}
          style={{
            strokeDasharray: 'var(--stroke-dasharray)',
            strokeDashoffset: 'var(--stroke-dashoffset)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', text)}>{score}</span>
        {size === 'lg' && (
          <span className="text-xs text-muted-foreground">/100</span>
        )}
      </div>
    </div>
  );
}

// Health Score Badge
function HealthScoreBadge({ score, context = 'architect' }: { score: number; context?: 'architect' | 'clientPortal' }) {
  const { t } = useLocalization();
  const variant = score >= 80 ? 'default' : score >= 60 ? 'secondary' : score >= 40 ? 'outline' : 'destructive';
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const label = score >= 80 
    ? t(getTranslationKey('healthExcellent')) 
    : score >= 60 
      ? t(getTranslationKey('healthGood')) 
      : score >= 40 
        ? t(getTranslationKey('healthFair')) 
        : t(getTranslationKey('healthPoor'));
  
  return <Badge variant={variant}>{label}</Badge>;
}

// Risk Level Badge
function RiskLevelBadge({ level, context = 'architect' }: { level: string; context?: 'architect' | 'clientPortal' }) {
  const { t } = useLocalization();
  const variant = useRiskLevelVariant(level);
  
  // Helper function to get the correct translation key based on context
  const getTranslationKey = (key: string) => {
    const prefix = context === 'clientPortal' ? 'clientPortal.financial.advisor' : 'architect.financial.advisor';
    return `${prefix}.${key}`;
  };

  const labels: Record<string, string> = {
    low: t(getTranslationKey('riskLow')),
    medium: t(getTranslationKey('riskMedium')),
    high: t(getTranslationKey('riskHigh')),
    critical: t(getTranslationKey('riskCritical')),
  };

  return <Badge variant={variant}>{labels[level] || level}</Badge>;
}

// Summary Stat Component
interface SummaryStatProps {
  label: string;
  value: string;
  trend: 'good' | 'bad' | 'neutral' | 'warning';
  valueClassName?: string;
}

function SummaryStat({ label, value, trend, valueClassName }: SummaryStatProps) {
  const TrendIcon = trend === 'good' ? CheckCircle2 : trend === 'bad' ? AlertTriangle : Info;
  const trendColor = trend === 'good' ? 'text-green-500' : trend === 'bad' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-2">
        <p className={cn('text-xl font-bold tracking-tight', valueClassName)}>{value}</p>
        <TrendIcon className={cn('h-4 w-4', trendColor)} />
      </div>
    </div>
  );
}

// Skeleton Loading State
function BudgetHealthCardSkeleton({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        {compact ? (
           <div className="flex items-center gap-4">
             <Skeleton className="w-16 h-16 rounded-full" />
             <div className="space-y-2 flex-1">
               <Skeleton className="h-4 w-32" />
               <Skeleton className="h-8 w-20" />
             </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 flex flex-col items-center justify-center space-y-4 border-r pr-6">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="md:col-span-8 grid grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BudgetHealthCard;
