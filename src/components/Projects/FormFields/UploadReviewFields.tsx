import { UseFormReturn } from 'react-hook-form';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProjectFormData } from '@/schemas/project';

interface UploadReviewFieldsProps {
  form: UseFormReturn<any>;
}

export const UploadReviewFields = ({
  form,
}: UploadReviewFieldsProps) => {
  const { t } = useLocalization();

  return (
    <div className="space-y-4">
      {/* Cost Fields */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{t('projects:costBreakdown')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="labor_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:laborCostLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="material_cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:materialCostLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="taxes_and_fees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:taxesAndFeesLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="md:col-span-3">
            <FormField
              control={form.control}
              name="budget_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects:totalBudget')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={t("inputPlaceholders.amount")}
                        className="pl-8"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <FormField
              control={form.control}
              name="total_spent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-red-600">
                    {t('projects:totalSpentLabel')} *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>{t('projects:totalSpentHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* Budget Model Selection - Moved before description */}
      <FormField
        control={form.control}
        name="budget_model"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-red-600">
              {t('projects:budgetModelLabel')} *
            </FormLabel>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('projects:selectBudgetModel')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="SINAPI">SINAPI</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
                <SelectItem value="ORCAMENTO">Orçamento</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Project Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-red-600">
              {t('projects:descriptionLabel')} *
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('projects:descriptionPlaceholder')}
                className="min-h-[120px] resize-y"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>{t('projects:descriptionHelp')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};