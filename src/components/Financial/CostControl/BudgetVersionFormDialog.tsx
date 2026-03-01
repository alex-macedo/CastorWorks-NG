import React from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DateInput } from '@/components/ui/DateInput';
import { BudgetVersion } from '@/hooks/useBudgetVersions';

interface BudgetVersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; effective_date: string; description?: string }) => void;
  item?: BudgetVersion;
  isSubmitting?: boolean;
}

const createVersionSchema = () =>
  z.object({
    name: z.string().min(1, 'Version name is required').max(255),
    effective_date: z.string().min(1, 'Effective date is required'),
    description: z.string().optional(),
  });

type VersionFormData = z.infer<ReturnType<typeof createVersionSchema>>;

/**
 * Dialog for creating or editing budget versions
 */
export function BudgetVersionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  item,
  isSubmitting = false,
}: BudgetVersionFormDialogProps) {
  const { t } = useLocalization();
  const schema = createVersionSchema();

  const form = useForm<VersionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item?.name || '',
      effective_date: item?.effective_date || new Date().toISOString().split('T')[0],
      description: item?.description || '',
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name || '',
        effective_date: item?.effective_date || new Date().toISOString().split('T')[0],
        description: item?.description || '',
      });
    }
  }, [open, item, form]);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {item
              ? t('budget:costControl.editVersion', 'Edit Budget Version')
              : t('budget:costControl.createVersion', 'Create Budget Version')}
          </SheetTitle>
          <SheetDescription>
            {t(
              'budget:costControl.versionDescription',
              'Enter details for the budget version. Draft versions can be edited or promoted to baseline.'
            )}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget:costControl.versionName', 'Version Name')}</FormLabel>
                  <FormDescription>
                    {t(
                      'budget:costControl.versionNameHint',
                      'e.g., Q1 2024 Budget, Baseline v2'
                    )}
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'budget:costControl.versionNamePlaceholder',
                        'e.g., Q1 2024 Budget'
                      )}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effective_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget:costControl.effectiveDate', 'Effective Date')}</FormLabel>
                  <FormDescription>
                    {t(
                      'budget:costControl.effectiveDateHint',
                      'When should this budget take effect?'
                    )}
                  </FormDescription>
                  <FormControl>
                    <DateInput
                      value={field.value || ''}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      placeholder={t('common.selectDate')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('budget:costControl.description', 'Description')}</FormLabel>
                  <FormDescription>
                    {t(
                      'budget:costControl.descriptionHint',
                      'Optional notes about this version (changes made, reasons, etc.)'
                    )}
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'budget:costControl.descriptionPlaceholder',
                        'Add notes about this version...'
                      )}
                      disabled={isSubmitting}
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-6">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting
                  ? t('common.saving', 'Saving...')
                  : item
                    ? t('common.update', 'Update')
                    : t('common.create', 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
