import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatCompactCurrency } from "@/utils/compactFormatters";
import { CompactValue } from "@/components/ui/compact-value";
import { Currency, useLocalization } from "@/contexts/LocalizationContext";
import type { ProfitabilityMetrics } from "@/utils/profitabilityCalculator";

interface ProfitabilityCardProps {
  metrics: ProfitabilityMetrics;
  currency?: Currency;
}

export function ProfitabilityCard({ metrics, currency = 'BRL' as Currency }: ProfitabilityCardProps) {
  const isProfitable = metrics.netProfit >= 0;
  const { t, numberFormat } = useLocalization();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('analytics.totalRevenue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompactValue
            compactValue={numberFormat === 'compact' ? formatCompactCurrency(metrics.totalIncome, currency) : formatCurrency(metrics.totalIncome, currency)}
            fullValue={formatCurrency(metrics.totalIncome, currency)}
            className="text-base md:text-lg lg:text-xl font-bold text-primary break-words cursor-help"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('analytics.totalExpenses')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompactValue
            compactValue={numberFormat === 'compact' ? formatCompactCurrency(metrics.totalExpenses, currency) : formatCurrency(metrics.totalExpenses, currency)}
            fullValue={formatCurrency(metrics.totalExpenses, currency)}
            className="text-base md:text-lg lg:text-xl font-bold break-words cursor-help"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.budgetUtilization.toFixed(1)}% {t('analytics.ofBudget')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            {t('analytics.netProfit')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CompactValue
            compactValue={numberFormat === 'compact' ? formatCompactCurrency(metrics.netProfit, currency) : formatCurrency(metrics.netProfit, currency)}
            fullValue={formatCurrency(metrics.netProfit, currency)}
            className={`text-base md:text-lg lg:text-xl font-bold break-words cursor-help ${isProfitable ? 'text-green-600' : 'text-red-600'}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.profitMargin.toFixed(1)}% {t('analytics.margin')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {t('analytics.roi')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-base md:text-lg lg:text-xl font-bold break-words">
            {metrics.roi.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('analytics.returnOnInvestment')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
