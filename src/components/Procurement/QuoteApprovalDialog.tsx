import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateApprovalLog, useUpdateQuoteStatus } from '@/hooks/useQuoteApprovalLogs';
import { useLocalization } from '@/contexts/LocalizationContext';

interface QuoteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  action: 'approved' | 'rejected';
  quoteName: string;
  supplierName: string;
}

export function QuoteApprovalDialog({
  open,
  onOpenChange,
  quoteId,
  action,
  quoteName,
  supplierName,
}: QuoteApprovalDialogProps) {
  const { t } = useLocalization();
  const [approverName, setApproverName] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createApprovalLog = useCreateApprovalLog();
  const updateQuoteStatus = useUpdateQuoteStatus();

  const handleSubmit = async () => {
    if (!approverName.trim() || !reason.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create approval log
      await createApprovalLog.mutateAsync({
        quote_id: quoteId,
        action,
        notes: reason || notes || null,
      });

      // Update quote status
      await updateQuoteStatus.mutateAsync({
        quoteId,
        status: action,
      });

      // Reset form and close dialog
      setApproverName('');
      setApproverEmail('');
      setReason('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error processing approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setApproverName('');
    setApproverEmail('');
    setReason('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {action === 'approved'
              ? t('procurement.approveQuote')
              : t('procurement.rejectQuote')}
          </DialogTitle>
          <DialogDescription>
            {t('procurement.approvalDialogDescription')}
          </DialogDescription>
          <div className="mt-2 space-y-1">
            <p className="font-medium text-foreground">{quoteName}</p>
            <p className="text-sm">{t('procurement.requestFields.supplier')}: {supplierName}</p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="approverName">
              {t('procurement.approverName')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="approverName"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder={t('procurement.approverNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="approverEmail">
              {t('procurement.approverEmail')}
            </Label>
            <Input
              id="approverEmail"
              type="email"
              value={approverEmail}
              onChange={(e) => setApproverEmail(e.target.value)}
              placeholder={t('procurement.approverEmailPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              {t('procurement.reason')} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                action === 'approved'
                  ? t('procurement.reasonApprovedPlaceholder')
                  : t('procurement.reasonRejectedPlaceholder')
              }
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              {t('procurement.additionalNotes')}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('procurement.additionalNotesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!approverName.trim() || !reason.trim() || isSubmitting}
            className={action === 'approved' ? 'bg-success hover:bg-success/90' : ''}
            variant={action === 'rejected' ? 'destructive' : 'default'}
          >
            {isSubmitting
              ? t('common.submitting')
              : action === 'approved'
              ? t('procurement.approve')
              : t('procurement.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
