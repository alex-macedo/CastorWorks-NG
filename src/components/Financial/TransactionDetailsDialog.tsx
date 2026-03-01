import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { isWithinInterval, subDays } from "date-fns";

interface Transaction {
  id: string;
  entry_type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string | null;
  category: string;
  payment_method: string | null;
  reference: string | null;
  recipient_payer: string | null;
  projects?: {
    name: string;
  } | null;
}

interface TransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  selectedTransaction?: Transaction | null;
}

export function TransactionDetailsDialog({
  open,
  onOpenChange,
  transactions,
  selectedTransaction,
}: TransactionDetailsDialogProps) {
  const { t, currency, dateFormat } = useLocalization();

  // Calculate total amount for all displayed transactions
  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const transactionCount = transactions.length;

  // Calculate the date threshold for "last 3 days"
  const threeDaysAgo = subDays(new Date(), 3);

  // Separate transactions into recent (last 3 days) and older
  const recentTransactions = transactions.filter(transaction => 
    isWithinInterval(new Date(transaction.date), { start: threeDaysAgo, end: new Date() })
  );

  const olderTransactions = transactions.filter(transaction => 
    new Date(transaction.date) < threeDaysAgo
  );

  const renderTransaction = (transaction: Transaction) => (
    <div key={transaction.id} className="flex items-start justify-between p-4 rounded-lg border hover:bg-primary/10 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <div
          className={`p-2 rounded-lg ${
            transaction.entry_type === "income" ? "bg-success/10" : "bg-destructive/10"
          }`}
        >
          {transaction.entry_type === "income" ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{transaction.description || transaction.category}</p>
          <div className="text-sm text-muted-foreground space-y-1 mt-1">
            <p><span className="font-medium">{t('financial.project')}:</span> {transaction.projects?.name || 'N/A'}</p>
            <p><span className="font-medium">{t('financial.category')}:</span> {transaction.category}</p>
            {transaction.payment_method && (
              <p><span className="font-medium">{t('financial.paymentMethod')}:</span> {transaction.payment_method}</p>
            )}
            {transaction.reference && (
              <p><span className="font-medium">{t('financial.reference')}:</span> {transaction.reference}</p>
            )}
            {transaction.recipient_payer && (
              <p><span className="font-medium">{transaction.entry_type === 'income' ? 'Payer' : 'Recipient'}:</span> {transaction.recipient_payer}</p>
            )}
          </div>
        </div>
      </div>
      <div className="text-right ml-4">
        <p
          className={`font-bold text-lg ${
            transaction.entry_type === "income" ? "text-success" : "text-destructive"
          }`}
        >
          {transaction.entry_type === "income" ? '+' : '-'}{formatCurrency(Number(transaction.amount), currency)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{formatDate(transaction.date, dateFormat)}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {selectedTransaction 
              ? selectedTransaction.description || selectedTransaction.category
              : t('financial.allTransactions')
            }
          </DialogTitle>
          {selectedTransaction && (
            <div className="text-sm text-muted-foreground space-y-1 pt-2">
              <p className="font-semibold text-lg">
                {formatCurrency(totalAmount, currency)} ({transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'})
              </p>
              <p><span className="font-medium">{t('financial.category')}:</span> {selectedTransaction.category}</p>
            </div>
          )}
          {!selectedTransaction && transactionCount > 0 && (
            <div className="text-sm text-muted-foreground pt-2">
              <p className="font-semibold text-lg">
                {formatCurrency(totalAmount, currency)} ({transactionCount} transactions)
              </p>
            </div>
          )}
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('financial.noTransactionsFound')}</p>
          ) : (
            <div className="space-y-6">
              {recentTransactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {t('financial.recentLastThreeDays')}
                  </h3>
                  <div className="space-y-3">
                    {recentTransactions.map(renderTransaction)}
                  </div>
                </div>
              )}

              {recentTransactions.length > 0 && olderTransactions.length > 0 && (
                <Separator className="my-6" />
              )}

              {olderTransactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {t('financial.olderTransactions')}
                  </h3>
                  <div className="space-y-3">
                    {olderTransactions.map(renderTransaction)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
