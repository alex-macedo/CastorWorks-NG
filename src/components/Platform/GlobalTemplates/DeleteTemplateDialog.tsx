import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDeleteGlobalTemplate } from '@/hooks/useGlobalTemplates';
import type { GlobalTemplate } from '@/types/platform.types';

interface DeleteTemplateDialogProps {
  template: GlobalTemplate | null;
  onClose: () => void;
}

export function DeleteTemplateDialog({ template, onClose }: DeleteTemplateDialogProps) {
  const { t } = useLocalization();
  const deleteTemplate = useDeleteGlobalTemplate();

  // Published templates cannot be deleted — caller should have blocked the UI path,
  // but we guard here as a safety net.
  const isBlocked = template?.status === 'published';

  const handleConfirm = async () => {
    if (!template || isBlocked) return;
    try {
      await deleteTemplate.mutateAsync(template.id);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  };

  return (
    <AlertDialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked ? t('platform:globalTemplates.deleteBlockedTitle') : t('platform:globalTemplates.deleteConfirmTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? t('platform:globalTemplates.deleteBlockedDesc')
              : t('platform:globalTemplates.deleteConfirmDesc', { name: template?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTemplate.isPending}>{t('common.cancel')}</AlertDialogCancel>
          {!isBlocked && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={deleteTemplate.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
