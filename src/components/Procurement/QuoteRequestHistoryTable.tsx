import { useQuoteRequests, useCancelQuoteRequest } from '@/hooks/useQuoteRequests';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/utils/formatters';
import { Mail, MessageCircle, RefreshCw, Eye, XCircle } from 'lucide-react';
import { useResendQuoteRequest } from '@/hooks/useQuoteRequests';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Loader2 } from 'lucide-react';
import { SupplierContactBadge } from './SupplierContactBadge';

interface QuoteRequestHistoryTableProps {
  purchaseRequestId: string;
  requestStatus?: string;
}

export function QuoteRequestHistoryTable({
  purchaseRequestId,
  requestStatus,
}: QuoteRequestHistoryTableProps) {
  const { t, dateFormat } = useLocalization();
  const { quoteRequests, isLoading } = useQuoteRequests(purchaseRequestId);
  const resendQuoteRequest = useResendQuoteRequest();
  const cancelQuoteRequest = useCancelQuoteRequest();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState<string | null>(null);

  // Sort quote requests by sent_at (newest first)
  const sortedQuoteRequests = useMemo(() => {
    if (!quoteRequests) return [];
    return [...quoteRequests].sort((a, b) => {
      const dateA = (a as any).sent_at ? new Date((a as any).sent_at).getTime() : 0;
      const dateB = (b as any).sent_at ? new Date((b as any).sent_at).getTime() : 0;
      return dateB - dateA; // Newest first
    });
  }, [quoteRequests]);

  const getStatusBadge = (status: string) => {
    // Status badge colors as per Story 1.8 AC#3:
    // draft (gray), sent (blue), responded (green), expired (orange), cancelled (red)
    const statusConfig: Record<string, { className: string; label: string }> = {
      draft: {
        className: 'border-gray-200 text-gray-700 bg-gray-50',
        label: t('procurement.quoteRequestStatus.draft'),
      },
      sent: {
        className: 'border-blue-200 text-blue-700 bg-blue-50',
        label: t('procurement.quoteRequestStatus.sent'),
      },
      responded: {
        className: 'border-green-200 text-green-700 bg-green-50',
        label: t('procurement.quoteRequestStatus.responded'),
      },
      expired: {
        className: 'border-orange-200 text-orange-700 bg-orange-50',
        label: t('procurement.quoteRequestStatus.expired'),
      },
      cancelled: {
        className: 'border-red-200 text-red-700 bg-red-50',
        label: t('procurement.quoteRequestStatus.cancelled'),
      },
    };

    const config = statusConfig[status] || {
      className: 'border-gray-200 text-gray-700 bg-gray-50',
      label: status,
    };

    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleResend = async (quoteRequestId: string) => {
    try {
      await resendQuoteRequest.mutateAsync(quoteRequestId);
    } catch (error) {
      console.error('Failed to resend:', error);
    }
  };

  const handleCancelClick = (quoteRequestId: string) => {
    setRequestToCancel(quoteRequestId);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!requestToCancel) return;
    try {
      await cancelQuoteRequest.mutateAsync(requestToCancel);
      setCancelDialogOpen(false);
      setRequestToCancel(null);
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!quoteRequests || quoteRequests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('procurement.noQuoteRequests')}</p>
        {requestStatus !== 'approved' && (
          <p className="text-sm mt-2">
            {t('procurement.noQuoteRequestsHint') || 'Use the "Send Quote Requests" button to get started'}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('procurement.quoteRequestNumber')}</TableHead>
            <TableHead>{t('procurement.requestFields.supplier')}</TableHead>
            <TableHead>{t('procurement.sentDate')}</TableHead>
            <TableHead>{t('procurement.sentVia')}</TableHead>
            <TableHead>{t('procurement.statusLabel')}</TableHead>
            <TableHead>{t('procurement.responseDeadline')}</TableHead>
            <TableHead>{t('common.actions.label')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQuoteRequests.map((qr: any) => (
            <TableRow key={qr.id}>
              <TableCell className="font-medium">{qr.request_number}</TableCell>
              <TableCell>{qr.suppliers?.name || 'N/A'}</TableCell>
              <TableCell>
                {qr.sent_at ? formatDate(qr.sent_at, dateFormat) : t('procurement.notSent')}
              </TableCell>
              <TableCell>
                {qr.sent_via && <SupplierContactBadge contactMethod={qr.sent_via} />}
              </TableCell>
              <TableCell>{getStatusBadge(qr.status)}</TableCell>
              <TableCell>{formatDate(qr.response_deadline, dateFormat)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(qr);
                      setDetailsOpen(true);
                    }}
                    title={t('common.viewDetails') || 'View Details'}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {(qr.status === 'sent' || qr.status === 'expired') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(qr.id)}
                      disabled={resendQuoteRequest.isPending}
                      title={t('procurement.resendQuoteRequest') || 'Resend'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {(qr.status === 'draft' || qr.status === 'sent') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelClick(qr.id)}
                      disabled={cancelQuoteRequest.isPending}
                      title={t('common.cancel') || 'Cancel'}
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('procurement.quoteRequestDetails')}</DialogTitle>
            <DialogDescription>
              {t('procurement.quoteRequestNumber')}: {selectedRequest?.request_number}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <strong>{t('procurement.requestFields.supplier')}:</strong> {selectedRequest.suppliers?.name}
              </div>
              <div>
                <strong>{t('procurement.statusLabel')}:</strong> {selectedRequest.status}
              </div>
              <div>
                <strong>{t('procurement.sentVia')}:</strong> {selectedRequest.sent_via}
              </div>
              <div>
                <strong>{t('procurement.sentDate')}:</strong> {selectedRequest.sent_at ? formatDate(selectedRequest.sent_at, dateFormat) : t('procurement.notSent')}
              </div>
              <div>
                <strong>{t('procurement.responseDeadline')}:</strong> {formatDate(selectedRequest.response_deadline, dateFormat)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('procurement.cancelQuoteRequest') || 'Cancel Quote Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('procurement.cancelQuoteRequestConfirm') ||
                'Are you sure you want to cancel this quote request? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRequestToCancel(null)}>
              {t('common.cancelAction') || 'No, keep it'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.confirmCancel') || 'Yes, cancel request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

