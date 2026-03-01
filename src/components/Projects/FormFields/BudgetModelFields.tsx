import { UseFormReturn } from 'react-hook-form';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectManagers } from '@/hooks/useUsers';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetModelFieldsProps {
  form: UseFormReturn<any>;
  projectTypeOptions: Array<{ key: string; label: string }>;
  projectStatusDropdown: any;
}

export const BudgetModelFields = ({
  form,
  projectTypeOptions,
  projectStatusDropdown
}: BudgetModelFieldsProps) => {
  const { t } = useLocalization();
  const { data: projectManagers, isLoading: isLoadingPMs } = useProjectManagers();

  return (
    <div className="space-y-4">
      {/* Project Type, Status & Manager - 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:projectTypeLabel')}</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectProjectType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projectTypeOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="inline-flex items-center">
                {t('projects:projectStatusLabel')}
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectProjectStatus')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projectStatusDropdown?.values?.map((status: any) => (
                    <SelectItem key={status.key} value={status.key}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="manager_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:projectManagerLabel')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ''}
                disabled={isLoadingPMs}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectProjectManager')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projectManagers?.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Dates - 4 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="budget_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:budgetDateLabel')}</FormLabel>
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
          name="start_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:startDateLabel')}</FormLabel>
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
          name="total_duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:projectDuration') || 'Project Duration'}</FormLabel>
              <FormControl>
                <div className="flex">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="rounded-r-none"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                  <div className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r text-sm text-gray-600 flex items-center">
                    {t('projects:days') || 'days'}
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:endDateLabel')}</FormLabel>
              <FormControl>
                <DateInput
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                  disabled
                />
              </FormControl>
              <FormDescription>{t('projects:endDateCalculated') || 'Automatically calculated'}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
