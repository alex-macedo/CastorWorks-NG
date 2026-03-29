import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDeleteContact } from '@/hooks/useContacts';
import type { Contact } from '@/types/contacts';

interface DeleteContactDialogProps {
  contact: Contact | null;
  onClose: () => void;
}

export function DeleteContactDialog({ contact, onClose }: DeleteContactDialogProps) {
  const { t } = useLocalization();
  const deleteContact = useDeleteContact();

  const handleConfirm = async () => {
    if (!contact) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  };

  return (
    <AlertDialog open={!!contact} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('platform:contacts.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('platform:contacts.deleteConfirmDesc', { name: contact?.full_name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteContact.isPending}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteContact.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
