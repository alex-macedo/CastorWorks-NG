import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useForms } from '@/hooks/useForms';

interface FormSheetProps {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  title: string;
  description: string;
}

export function FormSheet({ open, onClose }: FormSheetProps) {
  const { t } = useLocalization();
  const { createForm } = useForms();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { title: '', description: '' },
  });

  useEffect(() => {
    if (open) reset({ title: '', description: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createForm.mutateAsync({
        title: values.title,
        description: values.description || null,
        status: 'draft',
      } as any);
      onClose();
    } catch (_err) { /* toast handled in hook */ }
  });

  const isPending = createForm.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('platform:forms.newForm')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:forms.formTitle')} *</Label>
            <Input
              {...register('title', { required: true })}
              disabled={isPending}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{t('common.required')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('platform:forms.description')}</Label>
            <Textarea {...register('description')} rows={3} disabled={isPending} />
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
