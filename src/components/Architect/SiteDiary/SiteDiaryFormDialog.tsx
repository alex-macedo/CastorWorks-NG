/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectSiteDiary } from '@/hooks/useArchitectSiteDiary';
import resolveStorageUrl from '@/utils/storage';
import { useState, useEffect } from 'react';
import { PhotoUploadZone } from '@/components/Photos/PhotoUploadZone';
import { useProjectPhotos } from '@/hooks/useProjectPhotos';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { AISiteDiaryGenerator } from './AISiteDiaryGenerator';
import { useToast } from '@/hooks/use-toast';

const siteDiarySchema = z.object({
  project_id: z.string(),
  diary_date: z.string().min(1, 'Date is required'),
  weather: z.string().optional(),
  progress_summary: z.string().optional(),
  notes: z.string().optional(),
});

type SiteDiaryFormData = z.infer<typeof siteDiarySchema>;

interface SiteDiaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: any;
  projectId: string;
}

export const SiteDiaryFormDialog = ({
  open,
  onOpenChange,
  entry,
  projectId,
}: SiteDiaryFormDialogProps) => {
  const { t } = useLocalization();
  const { createDiaryEntry, updateDiaryEntry, deleteDiaryEntry } = useArchitectSiteDiary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localPhotos, setLocalPhotos] = useState<any[]>(entry?.photos || []);

  const { photos: projectPhotos } = useProjectPhotos(projectId);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!projectPhotos || projectPhotos.length === 0) return;
      try {
        const mapped = await Promise.all(projectPhotos.map(async (p: any) => ({
          file_path: p.file_path,
          url: await resolveStorageUrl(p.file_path, 60 * 60).catch(() => p.file_path),
        })));
        if (mounted) setLocalPhotos(mapped);
      } catch (e) {
        console.error('Failed to resolve project photo URLs', e);
      }
    };
    load();
    return () => { mounted = false };
  }, [projectPhotos]);

  const form = useForm<SiteDiaryFormData>({
    resolver: zodResolver(siteDiarySchema),
    defaultValues: {
      project_id: projectId,
      diary_date: entry?.diary_date || new Date().toISOString().split('T')[0],
      weather: entry?.weather || '',
      progress_summary: entry?.progress_summary || '',
      notes: entry?.notes || '',
    },
  });

  const handleAIAnalysisComplete = (analysis: any) => {
    if (analysis.progressSummary) {
      form.setValue('progress_summary', analysis.progressSummary);
    }
    if (analysis.weatherCondition) {
      form.setValue('weather', analysis.weatherCondition);
    }
    if (analysis.observations) {
      const currentNotes = form.getValues('notes') || '';
      const aiNotes = analysis.observations;
      form.setValue('notes', currentNotes ? `${currentNotes}\n\nAI Observations: ${aiNotes}` : `AI Observations: ${aiNotes}`);
    }
    toast({
      title: t('architect.siteDiary.ai.populatedTitle'),
      description: t('architect.siteDiary.ai.populatedDescription'),
    });
  };

  const onSubmit = async (data: SiteDiaryFormData) => {
    try {
      const payload = { ...data, photos: localPhotos };
      if (entry) {
        await updateDiaryEntry.mutateAsync({ id: entry.id, ...payload });
      } else {
        await createDiaryEntry.mutateAsync(payload as any);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving diary entry:', error);
    }
  };

  const handleDelete = async () => {
    if (entry && confirm(t('architect.common.confirmDelete'))) {
      await deleteDiaryEntry.mutateAsync(entry.id);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {entry ? t('architect.siteDiary.edit') : t('architect.siteDiary.new')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="diary_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('architect.siteDiary.diaryDate')}</FormLabel>
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
                    <FormLabel>{t('architect.siteDiary.weather')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('architect.siteDiary.weatherPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="progress_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.siteDiary.progressSummary')}</FormLabel>
                  <div className="mb-2">
                    <Label className="sr-only">{t('architect.siteDiary.photos')}</Label>
                    <PhotoUploadZone projectId={projectId} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['project-photos', projectId] })} />

                    {localPhotos.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {localPhotos.map((p, idx) => (
                          <img key={idx} src={p.url || p.file_path} alt={`photo-${idx}`} className="h-16 w-16 object-cover rounded-md" />
                        ))}
                      </div>
                    )}

                    {localPhotos.length > 0 && (
                      <AISiteDiaryGenerator
                        photoUrls={localPhotos.map(p => p.url || p.file_path)}
                        projectId={projectId}
                        onAnalysisComplete={handleAIAnalysisComplete}
                      />
                    )}
                  </div>
                  <FormControl>
                    <Textarea {...field} placeholder={t('architect.siteDiary.progressSummaryPlaceholder')} rows={3} />
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
                  <FormLabel>{t('architect.siteDiary.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('architect.siteDiary.notesPlaceholder')} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between">
              <div>
                {entry && (
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteDiaryEntry.isPending}>
                    {t('common.delete')}
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createDiaryEntry.isPending || updateDiaryEntry.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
