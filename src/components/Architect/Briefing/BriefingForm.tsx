/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectBriefings } from '@/hooks/useArchitectBriefings';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';

const briefingSchema = z.object({
  project_id: z.string(),
  client_objectives: z.string().optional(),
  style_preferences: z.string().optional(),
  budget_range_min: z.coerce.number().optional(),
  budget_range_max: z.coerce.number().optional(),
  area_m2: z.coerce.number().optional(),
  must_haves: z.string().optional(),
  constraints: z.string().optional(),
  notes: z.string().optional(),
});

type BriefingFormData = z.infer<typeof briefingSchema>;

interface BriefingFormProps {
  projectId: string;
}

export const BriefingForm = ({ projectId }: BriefingFormProps) => {
  const { t } = useLocalization();
  const { briefing, saveBriefing } = useArchitectBriefings(projectId);
  const [inspirations, setInspirations] = useState<Array<{ type: string; url: string; description: string }>>(
    (briefing?.inspirations as any) || []
  );

  const form = useForm({
    resolver: zodResolver(briefingSchema),
    defaultValues: {
      project_id: projectId,
      client_objectives: briefing?.client_objectives || '',
      style_preferences: briefing?.style_preferences || '',
      budget_range_min: briefing?.budget_range_min || undefined,
      budget_range_max: briefing?.budget_range_max || undefined,
      area_m2: briefing?.area_m2 || undefined,
      must_haves: briefing?.must_haves || '',
      constraints: briefing?.constraints || '',
      notes: briefing?.notes || '',
    },
  });

  const onSubmit = async (data: BriefingFormData) => {
    try {
      await saveBriefing.mutateAsync({
        ...data,
        inspirations: inspirations as any,
      });
    } catch (error) {
      console.error('Error saving briefing:', error);
    }
  };

  const addInspiration = () => {
    setInspirations([...inspirations, { type: 'link', url: '', description: '' }]);
  };

  const removeInspiration = (index: number) => {
    setInspirations(inspirations.filter((_, i) => i !== index));
  };

  const updateInspiration = (index: number, field: string, value: string) => {
    const updated = [...inspirations];
    updated[index] = { ...updated[index], [field]: value };
    setInspirations(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('architect.briefing.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="client_objectives"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.briefing.clientObjectives')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('architect.briefing.clientObjectivesPlaceholder')}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="style_preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.briefing.stylePreferences')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('architect.briefing.stylePreferencesPlaceholder')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="budget_range_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('architect.briefing.budgetRangeMin')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value as number | undefined || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_range_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('architect.briefing.budgetRangeMax')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value as number | undefined || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('architect.briefing.areaM2')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value as number | undefined || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="must_haves"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.briefing.mustHaves')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('architect.briefing.mustHavesPlaceholder')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="constraints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.briefing.constraints')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('architect.briefing.constraintsPlaceholder')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inspirations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>{t('architect.briefing.inspirations')}</FormLabel>
                <Button type="button" size="sm" variant="outline" onClick={addInspiration}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('architect.briefing.addInspiration')}
                </Button>
              </div>

              {inspirations.map((inspiration, index) => (
                <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder={t('architect.briefing.inspirationUrl')}
                      value={inspiration.url}
                      onChange={(e) => updateInspiration(index, 'url', e.target.value)}
                    />
                    <Input
                      placeholder={t('architect.briefing.inspirationDescription')}
                      value={inspiration.description}
                      onChange={(e) => updateInspiration(index, 'description', e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeInspiration(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.briefing.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('architect.briefing.notesPlaceholder')}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={saveBriefing.isPending}>
                {t('architect.briefing.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};