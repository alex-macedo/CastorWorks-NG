import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { Loader2 } from "lucide-react";

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
}

export function RequestDetailsDialog({
  open,
  onOpenChange,
  requestId,
}: RequestDetailsDialogProps) {
  const { t, currency, dateFormat } = useLocalization();

  // Fetch request details
  const { data: request, isLoading, error: queryError } = useQuery({
    queryKey: ['purchase-request', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      console.log('Fetching purchase request with ID:', requestId);

      const { data, error } = await supabase
        .from('project_purchase_requests')
        .select(`
          *,
          projects(name),
          purchase_request_items:purchase_request_items(*),
          quote_requests:quote_requests(
            id,
            status,
            supplier_id,
            suppliers(name)
          )
        `)
        .eq('id', requestId)
        .single();

      if (error) {
        console.error('Error fetching purchase request:', error);
        // Return null instead of throwing to show "not found" message
        return null;
      }

      console.log('Fetched purchase request:', data);
      return data;
    },
    enabled: !!requestId && open,
    retry: false, // Don't retry on error
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('procurement.requestDetails')}</SheetTitle>
          <SheetDescription>
            {t('procurement.viewRequestInformation')}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : request ? (
          <div className="space-y-6 mt-6">
            {/* Status and Priority */}
            <div className="flex gap-2">
              <Badge
                variant={
                  request.status === "pending"
                    ? "warning"
                    : request.status === "quoted"
                    ? "info"
                    : "success"
                }
              >
                {t(`procurement.statusLabels.${request.status}`)}
              </Badge>
              <Badge
                variant={
                  request.priority === "high"
                    ? "destructive"
                    : request.priority === "medium"
                    ? "warning"
                    : "secondary"
                }
              >
                {t(`procurement.priorityLabels.${request.priority}`)}
              </Badge>
            </div>

            <Separator />

            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                {t('procurement.basicInformation')}
              </h3>
              <div className="grid gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('procurement.project')}</p>
                  <p className="font-medium">{request.projects?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('procurement.requestedBy')}</p>
                  <p className="font-medium">{request.requested_by || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('procurement.requestDate')}</p>
                  <p className="font-medium">{formatDate(request.created_at, dateFormat)}</p>
                </div>
                {request.delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('procurement.requiredDate')}</p>
                    <p className="font-medium">{formatDate(request.delivery_date, dateFormat)}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                {t('procurement.items')}
              </h3>
              <div className="space-y-4">
                {request.purchase_request_items?.map((item: any, index: number) => (
                  <div key={item.id || index} className="border rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold">{item.description}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t('procurement.requestFields.quantity')}</p>
                        <p className="font-medium">{item.quantity} {item.unit}</p>
                      </div>
                      {item.estimated_unit_price && (
                        <div>
                          <p className="text-muted-foreground">{t('procurement.requestFields.unitPrice')}</p>
                          <p className="font-medium">{formatCurrency(item.estimated_unit_price, currency)}</p>
                        </div>
                      )}
                      {item.estimated_total_price && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">{t('procurement.requestFields.total')}</p>
                          <p className="font-semibold text-lg text-primary">
                            {formatCurrency(item.estimated_total_price, currency)}
                          </p>
                        </div>
                      )}
                    </div>
                    {item.specifications && (
                      <div>
                        <p className="text-muted-foreground text-sm">{t('procurement.specifications')}</p>
                        <p className="text-sm">{item.specifications}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quote Requests */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                {t('procurement.quoteRequestHistory')}
              </h3>
              {request.quote_requests && request.quote_requests.length > 0 ? (
                <div className="space-y-2">
                  {request.quote_requests.map((quoteRequest: any) => (
                    <div key={quoteRequest.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{quoteRequest.suppliers?.name || 'Unknown Supplier'}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(`procurement.quoteRequestStatus.${quoteRequest.status}` as any) || quoteRequest.status}
                        </p>
                      </div>
                      <Badge
                        variant={
                          quoteRequest.status === "responded"
                            ? "success"
                            : quoteRequest.status === "sent"
                            ? "info"
                            : quoteRequest.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {t(`procurement.quoteRequestStatus.${quoteRequest.status}` as any) || quoteRequest.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('procurement.noQuoteRequests')}
                </p>
              )}
            </div>

            {/* Notes */}
            {request.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                    {t('procurement.notes')}
                  </h3>
                  <p className="text-sm">{request.notes}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('procurement.requestNotFound')}</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
