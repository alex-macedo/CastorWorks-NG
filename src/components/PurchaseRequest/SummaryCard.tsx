import { AlertCircle, CheckCircle2, FileText, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency as formatCurrencyUtil } from "@/utils/formatters";

interface SummaryCardProps {
  totalItems: number;
  totalValue: number;
  validationStatus: "valid" | "invalid" | "pending";
  errorCount?: number;
  compact?: boolean;
}

export const SummaryCard = ({ 
  totalItems, 
  totalValue, 
  validationStatus,
  errorCount = 0,
  compact = false
}: SummaryCardProps) => {
  const { t, currency } = useLocalization();

  const getValidationStatusInfo = () => {
    switch (validationStatus) {
      case "valid":
        return {
          icon: CheckCircle2,
          text: "Ready to submit",
          color: "text-success",
          bgColor: "bg-success/10",
        };
      case "invalid":
        return {
          icon: AlertCircle,
          text: `${errorCount} validation ${errorCount === 1 ? 'error' : 'errors'}`,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
        };
      default:
        return {
          icon: AlertCircle,
          text: "Not validated",
          color: "text-warning",
          bgColor: "bg-warning/10",
        };
    }
  };

  const statusInfo = getValidationStatusInfo();
  const StatusIcon = statusInfo.icon;

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Total Items */}
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("purchaseRequest.summary.totalItems")}</p>
            <p className="text-lg font-bold">{totalItems}</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-secondary/10 p-2">
            <DollarSign className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("purchaseRequest.summary.totalValue")}</p>
            <p className="text-lg font-bold">{formatCurrencyUtil(totalValue, currency)}</p>
          </div>
        </div>

        {/* Validation Status */}
        <div className="flex items-center gap-3">
          <div className={cn("rounded-md p-2", statusInfo.bgColor)}>
            <StatusIcon className={cn("h-4 w-4", statusInfo.color)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("purchaseRequest.summary.validationStatus")}</p>
            <p className={cn("text-sm font-semibold", statusInfo.color)}>
              {statusInfo.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Items */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("purchaseRequest.summary.totalItems")}</p>
              <p className="text-2xl font-bold">{totalItems}</p>
            </div>
          </div>

          {/* Total Value */}
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-secondary/10 p-3">
              <DollarSign className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("purchaseRequest.summary.totalValue")}</p>
              <p className="text-2xl font-bold">{formatCurrencyUtil(totalValue, currency)}</p>
            </div>
          </div>

          {/* Validation Status */}
          <div className="flex items-center gap-4">
            <div className={cn("rounded-lg p-3", statusInfo.bgColor)}>
              <StatusIcon className={cn("h-6 w-6", statusInfo.color)} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("purchaseRequest.summary.validationStatus")}</p>
              <p className={cn("text-lg font-semibold", statusInfo.color)}>
                {statusInfo.text}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
