import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { DollarSign, Receipt, ArrowUpCircle, ArrowDownCircle, PieChart } from "lucide-react";
import { useProjectFinancialSummary } from "@/hooks/clientPortal/useProjectFinancialSummary";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { formatCurrency } from "@/utils/formatters";
import { formatDate } from "@/utils/reportFormatters";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const ClientPaymentsTab = ({ projectId, projectName }: { projectId?: string, projectName?: string }) => {
  const { t, currency, dateFormat } = useLocalization();
  const { summary, isLoading: summaryLoading } = useProjectFinancialSummary();
  const { financialEntries, isLoading: entriesLoading } = useFinancialEntries(projectId);
  
  const isLoading = summaryLoading || entriesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      <h2 className="text-xl font-bold">
        {t('clientPortal.payments.title', { defaultValue: 'Payments & Financials' })}
      </h2>
      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {t('clientPortal.financial.totalBudget', { defaultValue: 'Total Budgeted' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalProjectCost, currency)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase tracking-wider">
              {t('clientPortal.financial.totalPaid', { defaultValue: 'Total Paid' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(summary.paid, currency)}</div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span>{Math.round(summary.percentagePaid)}% {t('common.complete')}</span>
              </div>
              <Progress value={summary.percentagePaid} className="h-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive uppercase tracking-wider">
              {t('clientPortal.financial.outstanding', { defaultValue: 'Outstanding' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.outstanding, currency)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t('clientPortal.financial.recentTransactions', { defaultValue: 'Recent Transactions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {financialEntries && financialEntries.length > 0 ? (
            <div className="space-y-0">
              {financialEntries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-4 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${entry.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {entry.type === 'income' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.entry_date, dateFormat)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${entry.type === 'income' ? 'text-green-600' : 'text-foreground'}`}>
                      {entry.type === 'income' ? '+' : '-'}{formatCurrency(Number(entry.amount), currency)}
                    </p>
                    <Badge variant="outline" className="text-[10px] uppercase">{entry.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('clientPortal.financial.noTransactions', { defaultValue: 'No recent transactions found.' })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
