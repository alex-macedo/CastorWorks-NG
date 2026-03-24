import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateTenant, useUpdateTenant } from '@/hooks/useTenants';
import type { TenantRow, TenantFormData } from '@/types/platform.types';

interface TenantSheetProps {
  open: boolean;
  onClose: () => void;
  tenant?: TenantRow;
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function TenantSheet({ open, onClose, tenant }: TenantSheetProps) {
  const { t } = useLocalization();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const isEdit = !!tenant;

  const { register, handleSubmit, reset, control, setValue, watch } = useForm<TenantFormData>({
    defaultValues: {
      name: '', slug: '', status: 'trial',
      max_projects: null, max_users: null, trial_ends_at: null,
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (open) {
      reset(tenant
        ? {
            name: tenant.name,
            slug: tenant.slug,
            status: (tenant.status as TenantFormData['status']) ?? 'trial',
            max_projects: tenant.max_projects ?? null,
            max_users: tenant.max_users ?? null,
            trial_ends_at: tenant.trial_ends_at ?? null,
          }
        : { name: '', slug: '', status: 'trial', max_projects: null, max_users: null, trial_ends_at: null });
    }
  }, [open, tenant, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      ...values,
      max_projects: values.max_projects ? Number(values.max_projects) : null,
      max_users: values.max_users ? Number(values.max_users) : null,
    };
    try {
      if (isEdit) {
        await updateTenant.mutateAsync({ id: tenant!.id, updates: payload });
      } else {
        await createTenant.mutateAsync(payload);
      }
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  const isPending = createTenant.isPending || updateTenant.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('platform:customers.editCustomer') : t('platform:customers.newCustomer')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:customers.name')} *</Label>
            <Input {...register('name', { required: true })} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform:customers.slug')} *</Label>
            <div className="flex gap-2">
              <Input {...register('slug', { required: true })} disabled={isPending} className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue('slug', generateSlug(nameValue))}
                disabled={isPending}
              >
                {t('platform:customers.generateSlug')}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:customers.status')}</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['active', 'inactive', 'trial', 'suspended'] as const).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:customers.maxProjects')}</Label>
              <Input type="number" min={1} {...register('max_projects')} disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:customers.maxUsers')}</Label>
              <Input type="number" min={1} {...register('max_users')} disabled={isPending} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:customers.trialEndsAt')}</Label>
            <Input type="date" {...register('trial_ends_at')} disabled={isPending} />
          </div>
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.saving') : t('common.save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
