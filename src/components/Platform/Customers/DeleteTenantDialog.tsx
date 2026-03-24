import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDeleteTenant } from '@/hooks/useTenants';
import type { TenantRow } from '@/types/platform.types';

interface DeleteTenantDialogProps {
  tenant: TenantRow | null;
  onClose: () => void;
}

export function DeleteTenantDialog({ tenant, onClose }: DeleteTenantDialogProps) {
  const { t } = useLocalization();
  const deleteTenant = useDeleteTenant();

  const handleConfirm = async () => {
    if (!tenant) return;
    try {
      await deleteTenant.mutateAsync(tenant.id);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  };

  return (
    <AlertDialog open={!!tenant} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('platform:customers.deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-destructive font-medium">
            {t('platform:customers.deleteConfirmDesc', { name: tenant?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTenant.isPending}>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteTenant.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
