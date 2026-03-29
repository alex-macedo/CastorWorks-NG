import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDeletePlatformTask } from '@/hooks/usePlatformTasks';
import type { PlatformTask } from '@/types/platform.types';

interface DeleteTaskDialogProps {
  task: PlatformTask | null;
  onClose: () => void;
}

export function DeleteTaskDialog({ task, onClose }: DeleteTaskDialogProps) {
  const { t } = useLocalization();
  const deleteTask = useDeletePlatformTask();

  const handleConfirm = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync(task.id);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  };

  return (
    <AlertDialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('platform:tasks.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('platform:tasks.deleteConfirmDesc', { title: task?.title ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTask.isPending}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteTask.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
