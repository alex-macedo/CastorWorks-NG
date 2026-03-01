import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useCallback } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectOpportunities } from '@/hooks/useArchitectOpportunities';
import { useArchitectStatuses } from '@/hooks/useArchitectStatuses';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/ui/DateInput';

const createOpportunitySchema = (t: (key: string) => string) => z.object({
  client_id: z.string().min(1, t('architect.opportunities.validation.clientRequired')),
  project_name: z.string().min(1, t('architect.opportunities.validation.projectNameRequired')),
  estimated_value: z.coerce.number().optional(),
  probability: z.coerce.number().min(0).max(100).optional(),
  stage_id: z.string().min(1, t('architect.opportunities.validation.stageRequired')),
  // Use preprocess to ensure empty strings are preserved (not converted to undefined)
  expected_closing_date: z.preprocess(
    (val) => val === undefined ? '' : val,
    z.string().optional()
  ),
  notes: z.string().optional(),
});

type OpportunityFormData = z.infer<ReturnType<typeof createOpportunitySchema>>;

interface OpportunityFormProps {
  initialStageId?: string;
  opportunity?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const OpportunityForm = ({
  initialStageId,
  opportunity,
  onSuccess,
  onCancel,
}: OpportunityFormProps) => {
  const { t } = useLocalization();
  const { saveOpportunity } = useArchitectOpportunities();
  const { clients } = useClients();
  const { statuses } = useArchitectStatuses();

  // Get the default stage (first status) if no initialStageId provided
  const defaultStageId = initialStageId || statuses[0]?.id || '';

  // Resolve an existing opportunity's stage into a concrete status.id, handling
  // both real DB ids and mock/demo stage names.
  const resolveStageIdForOpportunity = useCallback((opp: any | undefined): string => {
    if (!opp) return defaultStageId;

    const stageMappings: Record<string, string> = {
      // mock -> real status.name
      lead: 'initial_contact',
      proposal: 'proposal_sent',
    };

    const candidates = [opp.stage_id, opp.stage, opp.status].filter(Boolean) as string[];

    for (const raw of candidates) {
      // a) direct id match
      const byId = statuses.find((s) => s.id === raw);
      if (byId) return byId.id;

      // b) name match
      const byName = statuses.find((s) => s.name === raw);
      if (byName) return byName.id;

      // c) mapped mock name -> real status name
      const mappedName = stageMappings[raw];
      if (mappedName) {
        const mappedStatus = statuses.find((s) => s.name === mappedName);
        if (mappedStatus) return mappedStatus.id;
      }
    }

    return defaultStageId;
  }, [statuses, defaultStageId]);

  const form = useForm({
    resolver: zodResolver(createOpportunitySchema(t)),
    defaultValues: {
      client_id: opportunity?.client_id || '',
      project_name: opportunity?.project_name || '',
      estimated_value: opportunity?.estimated_value || undefined,
      probability: opportunity?.probability || undefined,
      stage_id: resolveStageIdForOpportunity(opportunity),
      expected_closing_date: opportunity?.expected_closing_date || '',
      notes: opportunity?.notes || '',
    },
  });

  // Reset form when opportunity changes
  useEffect(() => {
    if (opportunity) {
      form.reset({
        client_id: opportunity.client_id || '',
        project_name: opportunity.project_name || '',
        estimated_value: opportunity.estimated_value || undefined,
        probability: opportunity.probability || undefined,
        stage_id: resolveStageIdForOpportunity(opportunity),
        expected_closing_date: opportunity.expected_closing_date || '',
        notes: opportunity.notes || '',
      });
    } else {
      form.reset({
        client_id: '',
        project_name: '',
        estimated_value: undefined,
        probability: undefined,
        stage_id: defaultStageId,
        expected_closing_date: '',
        notes: '',
      });
    }
  }, [opportunity, defaultStageId, form, resolveStageIdForOpportunity]);

  const onSubmit = async (data: OpportunityFormData, e?: React.BaseSyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      // Normalize form data: convert empty strings to null, ensure all fields are included
      // Handle numbers: if value is 0, empty string, undefined, or NaN, set to null
      const normalizeNumber = (value: any): number | null => {
        if (value === undefined || value === null || value === '' || value === 'undefined') {
          return null;
        }
        const num = Number(value);
        return isNaN(num) ? null : num;
      };

      const normalizeString = (value: any): string | null => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        return String(value).trim() || null;
      };

      // Always explicitly include expected_closing_date, even if empty
      // Convert empty string to null for database
      const rawDateValue = data.expected_closing_date;
      
      // Normalize date: empty string, undefined, or null becomes null
      // Valid date strings are preserved
      const normalizedDate: string | null = 
        (rawDateValue && typeof rawDateValue === 'string' && rawDateValue.trim() !== '')
          ? rawDateValue.trim()
          : null;
      
      // Build formData object, ensuring expected_closing_date is ALWAYS included
      const formData: OpportunityInsert | OpportunityUpdate = {
        client_id: data.client_id || '',
        project_name: data.project_name || '',
        stage_id: data.stage_id || defaultStageId,
        estimated_value: normalizeNumber(data.estimated_value),
        probability: normalizeNumber(data.probability),
        expected_closing_date: normalizedDate, // ALWAYS include, even if null
        notes: normalizeString(data.notes),
      };

      if (opportunity) {
        await saveOpportunity.mutateAsync({ id: opportunity.id, ...formData });
      } else {
        await saveOpportunity.mutateAsync(formData);
      }
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      // Error toast is handled by the mutation's onError
      // Don't close dialog on error - let user fix and retry
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit(onSubmit)(e);
          return false;
        }} 
        className="space-y-4" 
        noValidate
      >
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('architect.opportunities.client')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
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
          name="project_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('architect.opportunities.projectName')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stage_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('architect.opportunities.stage')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || defaultStageId}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {t(`architect.opportunities.stages.${status.name}`) !== `architect.opportunities.stages.${status.name}`
                          ? t(`architect.opportunities.stages.${status.name}`)
                          : status.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
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
            name="estimated_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('architect.opportunities.estimatedValue')}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value as number | undefined || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="probability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('architect.opportunities.probability')}</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="100" {...field} value={field.value as number | undefined || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="expected_closing_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('architect.opportunities.expectedClosing')}</FormLabel>
              <FormControl>
                <DateInput
                  value={field.value || ''}
                  onChange={(value) => {
                    // Ensure the form field is updated, even with empty string
                    field.onChange(value || '');
                  }}
                  placeholder={t('common.selectDate')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('architect.opportunities.notes')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={saveOpportunity.isPending}
          >
            {saveOpportunity.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
};
