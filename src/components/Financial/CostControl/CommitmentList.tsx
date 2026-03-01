import React, { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { formatDate } from '@/utils/formatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { Database } from '@/integrations/supabase/types';

type Commitment = Database['public']['Tables']['project_commitments']['Row'] & {
  cost_codes?: { code: string; name: string } | null;
  project_phases?: { phase_name: string } | null;
};

interface CommitmentListProps {
  commitments: Commitment[];
  onCreateNew: () => void;
  onEdit: (commitment: Commitment) => void;
  onDelete: (commitmentId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  currency?: string;
}

/**
 * Table view for all commitments with actions
 * Shows vendor, amount, status, phase, cost code, and allows edit/delete operations
 */
export function CommitmentList({
  commitments,
  onCreateNew,
  onEdit,
  onDelete,
  isLoading = false,
  isDeleting = false,
  currency = 'USD',
}: CommitmentListProps) {
  const { t } = useLocalization();
  const { dateFormat } = useDateFormat();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">{t('financial.commitments.status.approved', 'Approved')}</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800">{t('financial.commitments.status.sent', 'Sent')}</Badge>;
      case 'received':
        return <Badge className="bg-blue-100 text-blue-800">{t('financial.commitments.status.received', 'Received')}</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">{t('financial.commitments.status.draft', 'Draft')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">{t('financial.commitments.status.cancelled', 'Cancelled')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (commitments.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-600">
          {t('financial.commitments.noCommitments', 'No commitments yet. Create one to get started.')}
        </p>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          {t('financial.commitments.createCommitment', 'Create Commitment')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="mr-2 h-4 w-4" />
        {t('financial.commitments.createCommitment', 'Create Commitment')}
      </Button>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>{t('financial.commitments.vendor', 'Vendor')}</TableHead>
              <TableHead>{t('financial.commitments.description', 'Description')}</TableHead>
              <TableHead>{t('financial.commitments.phase', 'Phase')}</TableHead>
              <TableHead>{t('financial.commitments.costCode', 'Cost Code')}</TableHead>
              <TableHead className="text-right">{t('financial.commitments.amount', 'Amount')}</TableHead>
              <TableHead>{t('financial.commitments.statusLabel', 'Status')}</TableHead>
              <TableHead>{t('financial.commitments.date', 'Date')}</TableHead>
              <TableHead className="text-right">{t('common.actions.label', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commitments.map((commitment) => (
              <TableRow key={commitment.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">
                  {commitment.vendor_name || '-'}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-slate-600">
                  {commitment.description || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {commitment.project_phases?.phase_name || '-'}
                </TableCell>
                <TableCell className="text-sm">
                  {commitment.cost_codes ? `${commitment.cost_codes.code} - ${commitment.cost_codes.name}` : '-'}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(commitment.committed_amount || 0), currency)}
                </TableCell>
                <TableCell>{getStatusBadge(commitment.status)}</TableCell>
                <TableCell className="text-sm">
                  {formatDate(commitment.committed_date, dateFormat)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(commitment)}
                      disabled={isLoading}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {commitment.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(commitment.id)}
                        disabled={isLoading || isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('financial.commitments.deleteTitle', 'Delete Commitment?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'financial.commitments.deleteDesc',
              'This action cannot be undone. The commitment will be permanently deleted.'
            )}
          </AlertDialogDescription>
          <div className="flex gap-2">
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

