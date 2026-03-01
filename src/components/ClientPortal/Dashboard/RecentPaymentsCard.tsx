import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectPayments } from '@/hooks/clientPortal/useProjectPayments';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { Loader2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentPaymentsCardProps {
  clientId?: string | null;
}

export function RecentPaymentsCard({ clientId }: RecentPaymentsCardProps) {
  const navigate = useNavigate();
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();
  const { recentInvoices, isLoading } = useProjectPayments();
  const { formatShortDate } = useDateFormat();

  const handlePaymentClick = () => {
    if (projectId) {
      navigate(`/portal/${projectId}/payments`);
    }
  };

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.recentPayments.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentInvoices.length > 0 ? (
          <div className="space-y-2">
            {recentInvoices.map((invoice) => {
              const amount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(invoice.amount);
              const invoiceDate = invoice.due_date ? formatShortDate(invoice.due_date) : 'N/A';

              return (
                <div key={invoice.id} className="text-sm flex justify-between">
                  <span>{t("clientPortal.dashboard.recentPayments.invoice", { id: invoice.invoice_number, amount })}</span>
                  <span className="text-muted-foreground">
                    ({invoice.status === "paid"
                      ? t("clientPortal.dashboard.recentPayments.paid", { date: invoiceDate })
                      : t("clientPortal.dashboard.recentPayments.due", { date: invoiceDate })})
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("clientPortal.dashboard.recentPayments.noInvoices")}</p>
        )}
        <Button
          onClick={handlePaymentClick}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
        >
          {t("clientPortal.dashboard.recentPayments.paymentButton")}
        </Button>
      </CardContent>
    </Card>
  );
}
