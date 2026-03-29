import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDeleteCommunicationLogEntry } from '@/hooks/usePlatformCommunicationLog';

interface DeleteLogEntryDialogProps {
  entryId: string | null;
  onClose: () => void;
}

export function DeleteLogEntryDialog({ entryId, onClose }: DeleteLogEntryDialogProps) {
  const { t } = useLocalization();
  const deleteEntry = useDeleteCommunicationLogEntry();

  const handleConfirm = async () => {
    if (!entryId) return;
    try {
      await deleteEntry.mutateAsync(entryId);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  };

  return (
    <AlertDialog open={!!entryId} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('platform:commLog.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('platform:commLog.deleteConfirmDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteEntry.isPending}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteEntry.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
