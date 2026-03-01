import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  currency_id: string;
  suppliers: {
    name: string;
  } | null;
}

export interface ApprovalActionBarProps {
  selectedQuote: Quote | null;
  token: string;
  onSuccess: (action: 'approved' | 'rejected') => void;
  className?: string;
}

export const ApprovalActionBar: React.FC<ApprovalActionBarProps> = ({
  selectedQuote,
  token,
  onSuccess,
  className = '',
}) => {
  const { t, currency } = useLocalization();
  const [customerNote, setCustomerNote] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format currency
  const formatPrice = (price: number) => {
    const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'pt-BR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Handle approve quote
  const handleApprove = async () => {
    if (!selectedQuote) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'approve-quote',
        {
          body: {
            token,
            selected_quote_id: selectedQuote.id,
            customer_note: customerNote.trim() || undefined,
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Success!
      setShowApproveDialog(false);
      onSuccess('approved');
    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve quote');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject quotes
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError(t('customerPortal.validation.rejectionReasonRequired'));
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'reject-quotes',
        {
          body: {
            token,
            rejection_reason: rejectionReason.trim(),
          },
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Success!
      setShowRejectDialog(false);
      onSuccess('rejected');
    } catch (err) {
      console.error('Rejection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject quotes');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render if no quote selected
  if (!selectedQuote) {
    return null;
  }

  return (
    <>
      {/* Fixed bottom action bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg z-40 ${className}`}
      >
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {/* Optional note field */}
          <div className="space-y-2">
            <label htmlFor="customer-note" className="text-sm text-muted-foreground">
              {t('customerPortal.actions.addNote')}
            </label>
            <Textarea
              id="customer-note"
              placeholder={t('customerPortal.actions.addNote')}
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={isProcessing}
              className="flex-1 sm:order-2"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t('customerPortal.actions.approveSelected')}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="flex-1 sm:order-1"
              size="lg"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('customerPortal.actions.rejectAll')}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Approve confirmation dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('customerPortal.actions.confirmApproval', {
                price: formatPrice(selectedQuote.total_amount),
                supplier: selectedQuote.suppliers?.name || t('customerPortal.supplier.defaultName'),
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>
                  You are about to approve this quote. This action will:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Mark this quote as approved</li>
                  <li>Reject all other quotes for this request</li>
                  <li>Notify your project manager immediately</li>
                  <li>Lock this approval (cannot be changed)</li>
                </ul>
                <p className="text-sm font-medium mt-3">
                  Quote: {selectedQuote.quote_number} - {formatPrice(selectedQuote.total_amount)}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve Quote'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('customerPortal.actions.confirmRejection')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Please tell us why you're rejecting these quotes. This feedback helps us improve.
                </p>
                <Textarea
                  placeholder={t("additionalPlaceholders.rejectReason")}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                  required
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject All Quotes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
