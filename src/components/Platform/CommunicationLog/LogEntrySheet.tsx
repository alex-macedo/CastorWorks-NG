import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateCommunicationLogEntry } from '@/hooks/usePlatformCommunicationLog';
import type { CommLogFormData } from '@/types/platform.types';

interface LogEntrySheetProps {
  open: boolean;
  onClose: () => void;
  tenants?: Array<{ id: string; name: string }>;
}

export function LogEntrySheet({ open, onClose, tenants = [] }: LogEntrySheetProps) {
  const { t } = useLocalization();
  const createEntry = useCreateCommunicationLogEntry();

  const { register, handleSubmit, reset, control } = useForm<CommLogFormData>({
    defaultValues: {
      contact_name: '', channel: 'email', direction: 'outbound',
      subject: null, body: null, status: 'logged', tenant_id: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        contact_name: '', channel: 'email', direction: 'outbound',
        subject: null, body: null, status: 'logged', tenant_id: null,
      });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createEntry.mutateAsync(values);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('platform:commLog.logInteraction')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:commLog.contactName')} *</Label>
            <Input {...register('contact_name', { required: true })} disabled={createEntry.isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:commLog.channel')}</Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={createEntry.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['email', 'whatsapp', 'phone', 'meeting'] as const).map(c => (
                        <SelectItem key={c} value={c}>{t(`platform:commLog.channels.${c}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:commLog.status')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={createEntry.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['logged', 'follow_up', 'resolved'] as const).map(s => (
                        <SelectItem key={s} value={s}>{t(`platform:commLog.statuses.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:commLog.direction')}</Label>
            <Controller
              name="direction"
              control={control}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
                  {(['inbound', 'outbound'] as const).map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <RadioGroupItem value={d} id={`dir-${d}`} />
                      <Label htmlFor={`dir-${d}`} className="cursor-pointer">{t(`platform:commLog.directions.${d}`)}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>
          {tenants.length > 0 && (
            <div className="space-y-2">
              <Label>{t('platform:commLog.tenant')}</Label>
              <Controller
                name="tenant_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)} disabled={createEntry.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {tenants.map(ten => (
                        <SelectItem key={ten.id} value={ten.id}>{ten.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('platform:commLog.subject')}</Label>
            <Input {...register('subject')} disabled={createEntry.isPending} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform:commLog.body')}</Label>
            <Textarea {...register('body')} rows={4} disabled={createEntry.isPending} />
          </div>
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={createEntry.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createEntry.isPending}>
              {createEntry.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
