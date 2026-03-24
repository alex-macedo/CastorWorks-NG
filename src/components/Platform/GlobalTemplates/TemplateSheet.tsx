import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateGlobalTemplate, useUpdateGlobalTemplate } from '@/hooks/useGlobalTemplates';
import type { GlobalTemplate, GlobalTemplateFormData } from '@/types/platform.types';

interface TemplateSheetProps {
  open: boolean;
  onClose: () => void;
  template?: GlobalTemplate;
}

export function TemplateSheet({ open, onClose, template }: TemplateSheetProps) {
  const { t } = useLocalization();
  const createTemplate = useCreateGlobalTemplate();
  const updateTemplate = useUpdateGlobalTemplate();
  const isEdit = !!template;
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, watch } = useForm<GlobalTemplateFormData>({
    defaultValues: {
      family: 'phase', name: '', description: null,
      content: '{}', status: 'draft',
    },
  });

  useEffect(() => {
    if (open) {
      setJsonError(null);
      reset(template
        ? {
            family: template.family,
            name: template.name,
            description: template.description ?? null,
            content: JSON.stringify(template.content, null, 2),
            status: template.status,
          }
        : { family: 'phase', name: '', description: null, content: '{}', status: 'draft' });
    }
  }, [open, template, reset]);

  const contentValue = watch('content');
  const validateJson = (val: string) => {
    try { JSON.parse(val); setJsonError(null); return true; }
    catch { setJsonError(t('platform:globalTemplates.invalidJson')); return false; }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!validateJson(values.content)) return;
    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({ id: template!.id, updates: values });
      } else {
        await createTemplate.mutateAsync(values);
      }
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('platform:globalTemplates.editTemplate') : t('platform:globalTemplates.newTemplate')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:globalTemplates.name')} *</Label>
            <Input {...register('name', { required: true })} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:globalTemplates.family')}</Label>
              <Controller
                name="family"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['phase', 'wbs', 'activity', 'budget', 'whatsapp'] as const).map(f => (
                        <SelectItem key={f} value={f}>{t(`platform:globalTemplates.families.${f}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:globalTemplates.status')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['draft', 'published', 'archived'] as const).map(s => (
                        <SelectItem key={s} value={s}>{t(`platform:globalTemplates.statuses.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:globalTemplates.description')}</Label>
            <Textarea {...register('description')} rows={2} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform:globalTemplates.content')}</Label>
            <Textarea
              {...register('content')}
              rows={8}
              className="font-mono text-xs"
              disabled={isPending}
              onBlur={() => validateJson(contentValue)}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
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
