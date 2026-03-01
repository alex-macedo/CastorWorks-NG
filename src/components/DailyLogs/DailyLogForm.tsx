import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/DateInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';

const dailyLogSchema = z.object({
  log_date: z.preprocess((val) => {
    if (!val) return undefined;
    // If a Date object is provided, format to yyyy-MM-dd
    if (val instanceof Date) return format(val, 'yyyy-MM-dd');
    // If a string (already in yyyy-MM-dd) pass through
    if (typeof val === 'string') return val || undefined;
    return undefined;
  }, z.string().min(1, 'Date is required')),
  weather: z.enum(['sunny', 'cloudy', 'rainy']).optional(),
  tasks_completed: z.string().max(2000).optional(),
  workers_count: z.coerce.number().min(0).optional(),
  equipment_used: z.string().max(1000).optional(),
  materials_delivered: z.string().max(1000).optional(),
  issues: z.string().max(2000).optional(),
  safety_incidents: z.string().max(2000).optional(),
});

type DailyLogFormData = z.infer<typeof dailyLogSchema>;

interface DailyLogFormProps {
  projectId: string;
  onSubmit: (data: DailyLogFormData & { project_id: string }) => void;
  isLoading?: boolean;
}

export const DailyLogForm = ({ projectId, onSubmit, isLoading }: DailyLogFormProps) => {
  const { t } = useLocalization();

  const form = useForm({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      // calendar UI expects a Date object; keep form default as Date
      log_date: new Date().toISOString().split('T')[0],
      workers_count: 0,
    },
  });

  const handleSubmit = (data: DailyLogFormData) => {
    onSubmit({ ...data, project_id: projectId });
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="log_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.date')}</FormLabel>
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
          name="weather"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.weather')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('projectDetail.dailyLogForm.selectWeather')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="sunny">{t('projectDetail.weather.sunny')}</SelectItem>
                  <SelectItem value="cloudy">{t('projectDetail.weather.cloudy')}</SelectItem>
                  <SelectItem value="rainy">{t('projectDetail.weather.rainy')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tasks_completed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.tasksCompleted')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('projectDetail.dailyLogForm.tasksPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workers_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.workers')}</FormLabel>
              <FormControl>
                <Input type="number" min="0" {...field} value={field.value as number | undefined || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="equipment_used"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.equipment')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('projectDetail.dailyLogForm.equipmentPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="materials_delivered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.materials')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('projectDetail.dailyLogForm.materialsPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issues"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.issues')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('projectDetail.dailyLogForm.issuesPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="safety_incidents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projectDetail.dailyLogForm.safety')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('projectDetail.dailyLogForm.safetyPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('common.saving') : t('projectDetail.dailyLogForm.submit')}
        </Button>
      </form>
    </Form>
  );
};
