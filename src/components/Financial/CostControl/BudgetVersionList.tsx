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
import { Edit2, Trash2, CheckCircle, Plus } from 'lucide-react';
import { BudgetVersion } from '@/hooks/useBudgetVersions';
import { formatDate } from '@/utils/formatters';
import { useDateFormat } from '@/hooks/useDateFormat';

interface BudgetVersionListProps {
  versions: BudgetVersion[];
  onCreateNew: () => void;
  onEdit: (version: BudgetVersion) => void;
  onDelete: (versionId: string) => void;
  onPromote: (versionId: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isPromoting?: boolean;
}

/**
 * Table view for all budget versions with actions
 * Shows status, effective date, and allows edit/delete/promote operations
 */
export function BudgetVersionList({
  versions,
  onCreateNew,
  onEdit,
  onDelete,
  onPromote,
  isLoading = false,
  isDeleting = false,
  isPromoting = false,
}: BudgetVersionListProps) {
  const { t } = useLocalization();
  const { dateFormat } = useDateFormat();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'baseline':
        return <Badge className="bg-green-100 text-green-800">{t('budget:costControl.status.baseline', 'Baseline')}</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800">{t('budget:costControl.status.draft', 'Draft')}</Badge>;
      case 'superseded':
        return <Badge className="bg-gray-100 text-gray-800">{t('budget:costControl.status.superseded', 'Superseded')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (versions.length === 0) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-600">
          {t('budget:costControl.noVersions', 'No budget versions yet. Create one to get started.')}
        </p>
        <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          {t('budget:costControl.createVersion', 'Create Budget Version')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={onCreateNew} className="bg-blue-600 hover:bg-blue-700">
        <Plus className="mr-2 h-4 w-4" />
        {t('budget:costControl.createVersion', 'Create Budget Version')}
      </Button>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>{t('common.name', 'Name')}</TableHead>
              <TableHead>{t('budget:costControl.statusLabel', 'Status')}</TableHead>
              <TableHead>{t('budget:costControl.effectiveDate', 'Effective Date')}</TableHead>
              <TableHead>{t('common.description', 'Description')}</TableHead>
              <TableHead className="text-right">{t('common.actions.label', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">{version.name}</TableCell>
                <TableCell>{getStatusBadge(version.status)}</TableCell>
                <TableCell>{formatDate(version.effective_date)}</TableCell>
                <TableCell className="max-w-xs truncate text-sm text-slate-600">
                  {version.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {version.status === 'draft' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(version)}
                          disabled={isLoading}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPromoteId(version.id)}
                          disabled={isLoading || isPromoting}
                          title={t(
                            'budget:costControl.promoteHint',
                            'Promote this draft to become the baseline budget'
                          )}
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      </>
                    )}
                    {version.status === 'baseline' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPromoteId(version.id)}
                        disabled={isLoading || isPromoting}
                        title={t(
                          'budget:costControl.promoteNewHint',
                          'Promote a draft to replace this baseline'
                        )}
                      >
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {version.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(version.id)}
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
          <AlertDialogTitle>{t('budget:costControl.deleteVersionTitle', 'Delete Version?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'budget:costControl.deleteVersionDesc',
              'This action cannot be undone. The budget version and all its lines will be permanently deleted.'
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

      {/* Promote confirmation dialog */}
      <AlertDialog open={!!promoteId} onOpenChange={(open) => !open && setPromoteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('budget:costControl.promoteVersionTitle', 'Promote to Baseline?')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              'budget:costControl.promoteVersionDesc',
              'This will replace the current baseline budget. The previous baseline will be marked as superseded.'
            )}
          </AlertDialogDescription>
          <div className="flex gap-2">
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (promoteId) {
                  onPromote(promoteId);
                  setPromoteId(null);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
              disabled={isPromoting}
            >
              {isPromoting ? t('common.promoting', 'Promoting...') : t('budget:costControl.promote', 'Promote')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
