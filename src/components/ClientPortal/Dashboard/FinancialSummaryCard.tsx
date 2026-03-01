import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectFinancialSummary } from '@/hooks/clientPortal/useProjectFinancialSummary';
import { Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  clientId?: string | null;
}

export function FinancialSummaryCard({ clientId }: FinancialSummaryCardProps) {
  const { t } = useLocalization();
  const { summary, isLoading } = useProjectFinancialSummary();

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const stats = {
    total: formatCurrencyValue(summary.totalProjectCost),
    paid: formatCurrencyValue(summary.paid),
    outstanding: formatCurrencyValue(summary.outstanding),
  };

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.financialSummary.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex justify-between items-end">
            <div className="space-y-2 text-sm">
              <p>{t("clientPortal.dashboard.financialSummary.totalProjectCost")} <span className="font-medium">{stats.total}</span></p>
              <p>{t("clientPortal.dashboard.financialSummary.paid")} <span className="font-medium">{stats.paid}</span></p>
              <p>{t("clientPortal.dashboard.financialSummary.outstanding")} <span className="font-medium">{stats.outstanding}</span></p>
            </div>

            {/* Simple CSS Bar Chart with calculated heights based on total */}
            <div className="flex items-end gap-2 h-16">
              <div
                className="w-6 bg-primary/20 rounded-t-sm"
                style={{ height: `${summary.totalProjectCost > 0 ? (summary.paid / summary.totalProjectCost) * 100 : 0}%` }}
                title={t("clientPortal.dashboard.financialSummary.paidLabel")}
              ></div>
              <div
                className="w-6 bg-primary rounded-t-sm"
                style={{ height: `${summary.totalProjectCost > 0 ? (summary.outstanding / summary.totalProjectCost) * 100 : 0}%` }}
                title={t("clientPortal.dashboard.financialSummary.outstandingLabel")}
              ></div>
              <div className="w-6 bg-muted rounded-t-sm h-[100%]" title={t("clientPortal.dashboard.financialSummary.totalLabel")}></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
