import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useLocalization } from '@/contexts/LocalizationContext';

const itemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  budgeted_amount: z.number().min(0, 'Amount must be positive'),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface BudgetTemplateItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
  templateId: string;
  onSave: (data: ItemFormData) => void;
}

export function BudgetTemplateItemForm({
  open,
  onOpenChange,
  item,
  templateId,
  onSave,
}: BudgetTemplateItemFormProps) {
  const { t } = useLocalization();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category: '',
      description: '',
      budgeted_amount: 0,
    },
  });

  // Update form when item changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          category: item.category || '',
          description: item.description || '',
          budgeted_amount: item.budgeted_amount || 0,
        });
      } else {
        form.reset({
          category: '',
          description: '',
          budgeted_amount: 0,
        });
      }
    }
  }, [item, open, form]);

  const onSubmit = (data: ItemFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {item ? t('templates.editItem', 'Edit Item') : t('templates.addItem', 'Add Item')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('templates.category', 'Category')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('templates.categoryPlaceholder', 'e.g., Materials, Labor')} />
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
                  <FormLabel>{t('common.description', 'Description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('templates.descriptionPlaceholder', 'Item description...')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgeted_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('templates.amount', 'Amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit">
                {item ? t('common.save', 'Save') : t('common.add', 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

