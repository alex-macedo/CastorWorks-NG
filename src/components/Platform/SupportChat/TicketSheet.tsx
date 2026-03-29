import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateSupportTicket } from '@/hooks/usePlatformSupportTickets';
import type { SupportTicketFormData } from '@/types/platform.types';

interface TicketSheetProps {
  open: boolean;
  onClose: () => void;
  tenants?: Array<{ id: string; name: string }>;
}

export function TicketSheet({ open, onClose, tenants = [] }: TicketSheetProps) {
  const { t } = useLocalization();
  const createTicket = useCreateSupportTicket();

  const { register, handleSubmit, reset, control } = useForm<SupportTicketFormData>({
    defaultValues: {
      subject: '', priority: 'medium', tenant_id: null, initialMessage: '',
    },
  });

  useEffect(() => {
    if (open) reset({ subject: '', priority: 'medium', tenant_id: null, initialMessage: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createTicket.mutateAsync(values);
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('platform:supportChat.newTicket')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:supportChat.subject')} *</Label>
            <Input {...register('subject', { required: true })} disabled={createTicket.isPending} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform:supportChat.priority')}</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={createTicket.isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                      <SelectItem key={p} value={p}>{t(`platform:supportChat.priorities.${p}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {tenants.length > 0 && (
            <div className="space-y-2">
              <Label>{t('platform:supportChat.tenant')}</Label>
              <Controller
                name="tenant_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)} disabled={createTicket.isPending}>
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
            <Label>{t('platform:supportChat.initialMessage')} *</Label>
            <Textarea
              {...register('initialMessage', { required: true })}
              rows={4}
              disabled={createTicket.isPending}
            />
          </div>
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={createTicket.isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
