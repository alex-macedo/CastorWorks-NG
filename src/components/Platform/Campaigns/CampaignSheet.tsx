import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  CampaignCreateFormSchema,
  type CampaignCreateFormData,
  type CreateCampaignRequest,
} from '@/types/campaign.types';

interface CampaignSheetProps {
  open: boolean;
  onClose: () => void;
  createCampaign: {
    mutateAsync: (request: CreateCampaignRequest) => Promise<unknown>;
    isPending: boolean;
  };
}

export function CampaignSheet({ open, onClose, createCampaign }: CampaignSheetProps) {
  const { t } = useLocalization();

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<CampaignCreateFormData>({
      resolver: zodResolver(CampaignCreateFormSchema),
      defaultValues: {
        name: '',
        description: '',
        audience_type: 'all',
        message_template: '',
        include_voice_for_vip: false,
        company_name: '',
        scheduled_at: null,
      },
    });

  useEffect(() => {
    if (open) {
      reset({
        name: '', description: '', audience_type: 'all',
        message_template: '', include_voice_for_vip: false,
        company_name: '', scheduled_at: null,
      });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createCampaign.mutateAsync({
        name: values.name,
        description: values.description,
        audience_type: values.audience_type,
        message_template: values.message_template,
        include_voice_for_vip: values.include_voice_for_vip,
        company_name: values.company_name,
        scheduled_at: values.scheduled_at ?? null,
      });
      onClose();
    } catch (_err) { /* toast handled in hook */ }
  });

  const isPending = createCampaign.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('platform:campaigns.newCampaign')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:campaigns.name')} *</Label>
            <Input {...register('name')} disabled={isPending} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('platform:campaigns.description')}</Label>
            <Textarea {...register('description')} rows={2} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label>{t('platform:campaigns.companyName')} *</Label>
            <Input {...register('company_name')} disabled={isPending} />
            {errors.company_name && <p className="text-xs text-destructive">{errors.company_name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t('platform:campaigns.audienceTypeLabel')}</Label>
            <Controller
              name="audience_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['all', 'filtered', 'manual'] as const).map(at => (
                      <SelectItem key={at} value={at}>
                        {t(`platform:campaigns.audienceTypes.${at}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('platform:campaigns.messageTemplate')} *</Label>
            <Textarea
              {...register('message_template')}
              rows={5}
              placeholder={t('platform:campaigns.messageTemplatePlaceholder')}
              disabled={isPending}
              className="font-mono text-sm"
            />
            {errors.message_template && (
              <p className="text-xs text-destructive">{errors.message_template.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="include_voice" className="cursor-pointer text-sm">
              {t('platform:campaigns.includeVoiceForVip')}
            </Label>
            <Controller
              name="include_voice_for_vip"
              control={control}
              render={({ field }) => (
                <Switch
                  id="include_voice"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('platform:campaigns.scheduledAtLabel')}</Label>
            <Input
              type="datetime-local"
              {...register('scheduled_at')}
              disabled={isPending}
            />
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
