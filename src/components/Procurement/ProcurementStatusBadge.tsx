import * as React from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  MessageSquare,
  Truck,
  CreditCard,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Status type definitions
export type PurchaseRequestStatus =
  | "draft"
  | "pending"
  | "quoted"
  | "approved"
  | "ordered"
  | "delivered"
  | "closed";

export type QuoteRequestStatus =
  | "draft"
  | "sent"
  | "responded"
  | "expired"
  | "cancelled";

export type PurchaseOrderStatus =
  | "draft"
  | "sent"
  | "acknowledged"
  | "in_transit"
  | "fulfilled"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "scheduled"
  | "processing"
  | "completed"
  | "failed";

export type ProcurementEntityType =
  | "purchase_request"
  | "quote_request"
  | "purchase_order"
  | "payment";

export type ProcurementStatus =
  | PurchaseRequestStatus
  | QuoteRequestStatus
  | PurchaseOrderStatus
  | PaymentStatus;

interface ProcurementStatusBadgeProps {
  entityType: ProcurementEntityType;
  status: string;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

// Color variant mapping based on status semantics
const getStatusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "success" | "warning" | "info" => {
  const grayStatuses = ["draft", "pending"];
  const blueStatuses = ["sent", "in_transit", "scheduled"];
  const yellowStatuses = ["responded", "acknowledged", "processing", "quoted"];
  const greenStatuses = ["approved", "delivered", "fulfilled", "completed", "closed"];
  const redStatuses = ["expired", "cancelled", "failed", "ordered"];

  if (grayStatuses.includes(status)) return "secondary";
  if (blueStatuses.includes(status)) return "info";
  if (yellowStatuses.includes(status)) return "warning";
  if (greenStatuses.includes(status)) return "success";
  if (redStatuses.includes(status)) return "destructive";

  return "default";
};

// Icon mapping based on status
const getStatusIcon = (status: string, size: "sm" | "default" | "lg") => {
  const iconSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;
  const iconProps = { size: iconSize, strokeWidth: 2 };

  const iconMap: Record<string, React.ReactNode> = {
    // Gray - neutral states
    draft: <FileText {...iconProps} />,
    pending: <Clock {...iconProps} />,

    // Blue - active/in-progress
    sent: <Send {...iconProps} />,
    in_transit: <Truck {...iconProps} />,
    scheduled: <Clock {...iconProps} />,

    // Yellow - awaiting action
    responded: <MessageSquare {...iconProps} />,
    acknowledged: <CheckCircle {...iconProps} />,
    processing: <CreditCard {...iconProps} />,
    quoted: <MessageSquare {...iconProps} />,

    // Green - success states
    approved: <CheckCircle {...iconProps} />,
    delivered: <CheckCircle {...iconProps} />,
    fulfilled: <CheckCircle {...iconProps} />,
    completed: <CheckCircle {...iconProps} />,
    closed: <CheckCircle {...iconProps} />,
    ordered: <Send {...iconProps} />,

    // Red - error/terminal states
    expired: <AlertTriangle {...iconProps} />,
    cancelled: <Ban {...iconProps} />,
    failed: <XCircle {...iconProps} />,
  };

  return iconMap[status] || <Clock {...iconProps} />;
};

// Validate status belongs to entity type
const isValidStatus = (entityType: ProcurementEntityType, status: string): boolean => {
  const validStatuses: Record<ProcurementEntityType, string[]> = {
    purchase_request: ["draft", "pending", "quoted", "approved", "ordered", "delivered", "closed"],
    quote_request: ["draft", "sent", "responded", "expired", "cancelled"],
    purchase_order: ["draft", "sent", "acknowledged", "in_transit", "fulfilled", "cancelled"],
    payment: ["pending", "scheduled", "processing", "completed", "failed"],
  };

  return validStatuses[entityType]?.includes(status) ?? false;
};

export function ProcurementStatusBadge({
  entityType,
  status,
  size = "default",
  showIcon = true,
  showTooltip = false,
  className,
}: ProcurementStatusBadgeProps) {
  const { t } = useLocalization();

  // Validate status
  if (!isValidStatus(entityType, status)) {
    console.warn(
      `Invalid status "${status}" for entity type "${entityType}"`
    );
  }

  const variant = getStatusVariant(status);
  const icon = showIcon ? getStatusIcon(status, size) : undefined;

  // Get translation key for status label
  const statusLabel = t(`status.${status}`, { defaultValue: status.replace(/_/g, " ") });

  // Get tooltip description if needed
  const tooltipDescription = t(`status.${status}_description`, {
    defaultValue: `${entityType.replace(/_/g, " ")} is ${status.replace(/_/g, " ")}`,
  });

  const badgeContent = (
    <Badge
      variant={variant}
      size={size}
      icon={icon}
      className={cn("capitalize", className)}
      aria-label={`${entityType.replace(/_/g, " ")} status: ${statusLabel}`}
    >
      {statusLabel}
    </Badge>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipDescription}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

export default ProcurementStatusBadge;
