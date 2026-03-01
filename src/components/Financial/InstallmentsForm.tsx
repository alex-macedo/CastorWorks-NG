import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useProjects } from "@/hooks/useProjects";
import { useAppSettings } from "@/hooks/useAppSettings";
import { formatCurrency } from "@/utils/formatters";

const createInstallmentSchema = (t: (key: string) => string) => z.object({
  project_id: z.string().uuid({ message: t('financial.installments.validation.projectRequired') }),
  total_amount: z.coerce.number().positive(t('financial.installments.validation.amountPositive')),
  number_of_installments: z.coerce.number().int().min(2, t('financial.installments.validation.minInstallments')),
  start_date: z.string(),
  description: z.string().optional(),
  category: z.string().min(1, t('financial.entryForm.validation.categoryRequired')),
  days_before_due: z.coerce.number().int().nonnegative().optional(),
});

type InstallmentFormValues = z.infer<ReturnType<typeof createInstallmentSchema>>;

interface InstallmentsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallmentsForm({
  open,
  onOpenChange,
}: InstallmentsFormProps) {
  const { t, currency } = useLocalization();
  const { createEntry } = useFinancialEntries();
  const { projects } = useProjects();
  const { settings } = useAppSettings();

  const form = useForm<InstallmentFormValues>({
    resolver: zodResolver(createInstallmentSchema(t)) as any,
    defaultValues: {
      number_of_installments: 2,
      start_date: new Date().toISOString().split('T')[0],
      description: "",
      category: "income",
      days_before_due: settings?.installments_due_days || 3,
    },
  });

  const watchTotalAmount = useWatch({ control: form.control, name: "total_amount" });
  const watchNumberOfInstallments = useWatch({ control: form.control, name: "number_of_installments" });

  const installmentAmount = React.useMemo(() => {
    if (watchTotalAmount && watchNumberOfInstallments) {
      return watchTotalAmount / watchNumberOfInstallments;
    }
    return 0;
  }, [watchTotalAmount, watchNumberOfInstallments]);

  const onSubmit = async (data: InstallmentFormValues) => {
    const installmentValue = data.total_amount / data.number_of_installments;
    const startDate = new Date(data.start_date);

    const promises = [];

    for (let i = 0; i < data.number_of_installments; i++) {
      const currentDate = new Date(startDate);
      currentDate.setMonth(startDate.getMonth() + i);
      
      const entryData = {
        entry_type: "income" as const,
        project_id: data.project_id,
        category: data.category,
        amount: Number(installmentValue.toFixed(2)), // Ensure 2 decimal places
        date: currentDate.toISOString().split('T')[0],
        description: `${data.description ? data.description + ' - ' : ''}${t('financial.installments.installment')} ${i + 1}/${data.number_of_installments}`,
        days_before_due: data.days_before_due,
      };
      promises.push(createEntry.mutateAsync(entryData));
    }

    await Promise.all(promises);
    onOpenChange(false);
    form.reset();
  };

  const isSubmitting = form.formState.isSubmitting || createEntry.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg h-screen flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>{t('financial.installments.title')}</SheetTitle>
          <SheetDescription>
            {t('financial.installments.description')}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 mt-6">
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('financial.entryForm.projectLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('financial.entryForm.projectPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('financial.installments.totalAmount')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t("inputPlaceholders.amount")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number_of_installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('financial.installments.numberOfInstallments')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="2"
                        step="1"
                        placeholder="12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {installmentAmount > 0 && (
               <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                 <span className="font-medium text-foreground">{formatCurrency(installmentAmount, currency)}</span> {t('financial.installments.perInstallment')}
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('financial.installments.startDate')}</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder={t('common.selectDate')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days_before_due"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('financial.installments.daysBeforeDue')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="0" 
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('financial.entryForm.categoryLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('financial.entryForm.categoryPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="income">{t('financial.income')}</SelectItem>
                        <SelectItem value="other">{t('financial.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('financial.entryForm.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('financial.entryForm.descriptionPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
             />

            </div>

            <div className="flex-shrink-0 border-t bg-background pt-4 mt-4">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('financial.entryForm.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('financial.installments.create')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
