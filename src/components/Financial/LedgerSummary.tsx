import { useLocalization } from "@/contexts/LocalizationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Hash } from "lucide-react";

interface LedgerSummaryProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
  };
}

export function LedgerSummary({ summary }: LedgerSummaryProps) {
  const { t, currency } = useLocalization();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="shadow-none border-muted/40 bg-slate-50/30 dark:bg-slate-900/10">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-0.5">
              {t('financial.ledger.summary.totalIncome')}
            </p>
            <div className="text-lg font-black text-green-600 tabular-nums leading-tight">
              {formatCurrency(summary.totalIncome)}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-green-100/50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border-muted/40 bg-slate-50/30 dark:bg-slate-900/10">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-0.5">
              {t('financial.ledger.summary.totalExpenses')}
            </p>
            <div className="text-lg font-black text-red-600 tabular-nums leading-tight">
              {formatCurrency(summary.totalExpenses)}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-red-100/50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <TrendingDown className="h-4 w-4 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border-muted/40 bg-slate-50/30 dark:bg-slate-900/10">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-0.5">
              {t('financial.ledger.summary.netBalance')}
            </p>
            <div className={`text-lg font-black tabular-nums leading-tight ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netBalance)}
            </div>
          </div>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${summary.netBalance >= 0 ? 'bg-green-100/50 dark:bg-green-900/20' : 'bg-red-100/50 dark:bg-red-900/20'}`}>
            <DollarSign className={`h-4 w-4 ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none border-muted/40 bg-slate-50/30 dark:bg-slate-900/10">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight mb-0.5">
              {t('financial.ledger.summary.transactionCount')}
            </p>
            <div className="text-lg font-black tabular-nums leading-tight">
              {summary.transactionCount}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <Hash className="h-4 w-4 text-slate-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
