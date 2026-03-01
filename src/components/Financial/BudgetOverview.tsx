import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { CompactValue } from "@/components/ui/compact-value";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useBudgetAnalysis } from "@/hooks/useBudgetAnalysis";
import { BudgetCategoryCard } from "./BudgetCategoryCard";
import { TimePeriod } from "@/utils/dateFilters";

interface BudgetOverviewProps {
  projectId?: string;
  period?: TimePeriod;
}

export function BudgetOverview({ projectId, period = 'all' }: BudgetOverviewProps) {
  const { currency, numberFormat, t } = useLocalization();
  const analysis = useBudgetAnalysis(projectId, period);

  const translate = (key: string, fallback: string, variables?: Record<string, string>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const compactLabel = translate(
    'budget:overviewSection.progressLabel',
    `${formatCompactCurrency(analysis.totalSpent, currency)} / ${formatCompactCurrency(analysis.totalBudgeted, currency)}`,
    {
      current: formatCompactCurrency(analysis.totalSpent, currency),
      total: formatCompactCurrency(analysis.totalBudgeted, currency),
    }
  );

  const fullLabel = translate(
    'budget:overviewSection.progressLabel',
    `${formatCurrency(analysis.totalSpent, currency)} / ${formatCurrency(analysis.totalBudgeted, currency)}`,
    {
      current: formatCurrency(analysis.totalSpent, currency),
      total: formatCurrency(analysis.totalBudgeted, currency),
    }
  );

  const hasWarnings = analysis.categoryBreakdown.some(
    (cat) => cat.status === 'warning' || cat.status === 'danger'
  );

  const getOverallStatusColor = () => {
    if (analysis.percentageUsed > 90) return 'bg-destructive';
    if (analysis.percentageUsed > 75) return 'bg-warning';
    return 'bg-success';
  };

  return (
    <div className="space-y-4">
      {hasWarnings && (
        <Alert className="border-warning bg-warning/10 mb-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground text-xs">
            {translate(
              'budget:overviewSection.alertGeneric',
              'Warning: Some budget categories are approaching or exceeding their limits.'
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        <Card className="flex flex-col justify-center border shadow-sm bg-card text-right">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-end">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t('budget:overviewSection.totalBudget', { defaultValue: 'Total Budget' })}
                </p>
                <CompactValue
                  compactValue={numberFormat === 'compact' 
                    ? formatCompactCurrency(analysis.totalBudgeted, currency)
                    : formatCurrency(analysis.totalBudgeted, currency)
                  }
                  fullValue={formatCurrency(analysis.totalBudgeted, currency)}
                  className="text-lg font-bold cursor-help"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border shadow-sm bg-card text-right">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-end">
              <div className="p-2.5 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t('budget:overviewSection.totalSpent', { defaultValue: 'Total Spent' })}
                </p>
                <CompactValue
                  compactValue={numberFormat === 'compact' 
                    ? formatCompactCurrency(analysis.totalSpent, currency)
                    : formatCurrency(analysis.totalSpent, currency)
                  }
                  fullValue={formatCurrency(analysis.totalSpent, currency)}
                  className="text-lg font-bold cursor-help"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border shadow-sm bg-card text-right">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 justify-end">
              <div className="p-2.5 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  {t('budget:overviewSection.remaining', { defaultValue: 'Remaining' })}
                </p>
                <CompactValue
                  compactValue={numberFormat === 'compact' 
                    ? formatCompactCurrency(Math.max(analysis.totalRemaining, 0), currency)
                    : formatCurrency(Math.max(analysis.totalRemaining, 0), currency)
                  }
                  fullValue={formatCurrency(Math.max(analysis.totalRemaining, 0), currency)}
                  className="text-lg font-bold cursor-help"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center border shadow-sm bg-card text-right">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold order-1">
                {analysis.percentageUsed.toFixed(1)}%
              </span>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground order-2">
                {t('budget:overviewSection.overallProgress', { defaultValue: 'Overall Budget Progress' })}
              </p>
            </div>
            
            <div className="text-[10px] text-muted-foreground truncate text-right">
              <CompactValue
                compactValue={numberFormat === 'compact' ? compactLabel : fullLabel}
                fullValue={fullLabel}
                className="cursor-help"
              />
            </div>
            
            <div className="relative pt-1">
              <Progress value={Math.min(analysis.percentageUsed, 100)} className="h-1.5" />
              <div 
                className={`absolute top-1 left-0 h-1.5 rounded-full transition-all ${getOverallStatusColor()}`}
                style={{ width: `${Math.min(analysis.percentageUsed, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(() => {
            // Remove empty categories (no budget and no actuals) and dedupe by normalized name
            const seen = new Set<string>();
            const visible = analysis.categoryBreakdown
              .map((c) => ({ ...c, _norm: (c.category || '').toString().trim().toLowerCase() }))
              .filter((c) => (c.budgeted || c.actual) && !seen.has(c._norm) ? (seen.add(c._norm), true) : false);

            return visible.map((category) => (
              <BudgetCategoryCard key={category._norm || category.category} category={category} />
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
