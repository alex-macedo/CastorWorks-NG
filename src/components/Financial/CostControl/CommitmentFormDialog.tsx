import { useState, useEffect } from 'react';
import { useProjectPhases } from '@/hooks/useProjectPhases';
import { useCostCodes } from '@/hooks/useCostCodes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/ui/DateInput';
import type { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/contexts/LocalizationContext';

type Commitment = Database['public']['Tables']['project_commitments']['Row'];

interface CommitmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  commitment?: Commitment;
  onSubmit: (data: {
    project_id: string;
    phase_id?: string;
    cost_code_id: string;
    vendor_name?: string;
    description?: string;
    committed_amount: number;
    status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
    committed_date: string;
    source_type?: string;
    source_id?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function CommitmentFormDialog({
  open,
  onOpenChange,
  projectId,
  commitment,
  onSubmit,
  isSubmitting = false,
}: CommitmentFormDialogProps) {
  const { t, currency } = useLocalization();
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [committedAmount, setCommittedAmount] = useState('');
  const [phaseId, setPhaseId] = useState<string>('');
  const [costCodeId, setCostCodeId] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'approved' | 'sent' | 'received' | 'cancelled'>('draft');
  const [committedDate, setCommittedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { phases } = useProjectPhases(projectId);
  const { data: costCodes = [] } = useCostCodes(1);

  useEffect(() => {
    if (commitment) {
      setVendorName(commitment.vendor_name || '');
      setDescription(commitment.description || '');
      setCommittedAmount(commitment.committed_amount?.toString() || '');
      setPhaseId(commitment.phase_id || '');
      setCostCodeId(commitment.cost_code_id || '');
      setStatus(commitment.status || 'draft');
      setCommittedDate(commitment.committed_date || new Date().toISOString().split('T')[0]);
    } else {
      setVendorName('');
      setDescription('');
      setCommittedAmount('');
      setPhaseId('');
      setCostCodeId('');
      setStatus('draft');
      setCommittedDate(new Date().toISOString().split('T')[0]);
    }
  }, [commitment, open]);

  const handleSave = async () => {
    if (!costCodeId || !committedAmount || parseFloat(committedAmount) <= 0) {
      return;
    }

    await onSubmit({
      project_id: projectId,
      phase_id: phaseId || undefined,
      cost_code_id: costCodeId,
      vendor_name: vendorName || undefined,
      description: description || undefined,
      committed_amount: parseFloat(committedAmount),
      status,
      committed_date: committedDate,
    });

    onOpenChange(false);
  };

  const isValid = costCodeId && committedAmount && parseFloat(committedAmount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {commitment
              ? t('financial.commitments.editCommitment', 'Edit Commitment')
              : t('financial.commitments.createCommitment', 'Create Commitment')}
          </DialogTitle>
          <DialogDescription>
            {commitment
              ? t('financial.commitments.editDescription', 'Update commitment details')
              : t('financial.commitments.createDescription', 'Record a new commitment (PO or contract)')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vendorName">{t('financial.commitments.vendor', 'Vendor')} (Optional)</Label>
              <Input
                id="vendorName"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder={t('financial.commitments.vendorPlaceholder', 'Vendor name')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="committedAmount">{t('financial.commitments.amount', 'Amount')} *</Label>
              <Input
                id="committedAmount"
                type="number"
                value={committedAmount}
                onChange={(e) => setCommittedAmount(e.target.value)}
                placeholder={t("inputPlaceholders.amount")}
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('financial.commitments.description', 'Description')} (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('financial.commitments.descriptionPlaceholder', 'Description or notes')}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phase">{t('financial.commitments.phase', 'Phase')} (Optional)</Label>
              <Select value={phaseId} onValueChange={setPhaseId} disabled={isSubmitting}>
                <SelectTrigger id="phase">
                  <SelectValue placeholder={t('financial.commitments.selectPhase', 'Select a phase')} />
                </SelectTrigger>
                <SelectContent>
                  {phases?.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCode">{t('financial.commitments.costCode', 'Cost Code')} *</Label>
              <Select value={costCodeId} onValueChange={setCostCodeId} disabled={isSubmitting}>
                <SelectTrigger id="costCode">
                  <SelectValue placeholder={t('financial.commitments.selectCostCode', 'Select a cost code')} />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map((code) => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">{t('financial.commitments.statusLabel', 'Status')}</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as typeof status)} disabled={isSubmitting}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('financial.commitments.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="approved">{t('financial.commitments.status.approved', 'Approved')}</SelectItem>
                  <SelectItem value="sent">{t('financial.commitments.status.sent', 'Sent')}</SelectItem>
                  <SelectItem value="received">{t('financial.commitments.status.received', 'Received')}</SelectItem>
                  <SelectItem value="cancelled">{t('financial.commitments.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="committedDate">{t('financial.commitments.date', 'Committed Date')}</Label>
              <DateInput
                id="committedDate"
                value={committedDate}
                onChange={(date) => setCommittedDate(date)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

