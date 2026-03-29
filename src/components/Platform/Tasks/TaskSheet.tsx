import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreatePlatformTask, useUpdatePlatformTask } from '@/hooks/usePlatformTasks';
import type { PlatformTask, PlatformTaskFormData } from '@/types/platform.types';

interface TaskSheetProps {
  open: boolean;
  onClose: () => void;
  task?: PlatformTask;
}

export function TaskSheet({ open, onClose, task }: TaskSheetProps) {
  const { t } = useLocalization();
  const createTask = useCreatePlatformTask();
  const updateTask = useUpdatePlatformTask();
  const isEdit = !!task;

  const { register, handleSubmit, reset, control } = useForm<PlatformTaskFormData>({
    defaultValues: {
      title: '', description: null, status: 'todo', priority: 'medium',
      assigned_to: null, due_date: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset(task
        ? {
            title: task.title,
            description: task.description ?? null,
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to ?? null,
            due_date: task.due_date ?? null,
          }
        : { title: '', description: null, status: 'todo', priority: 'medium', assigned_to: null, due_date: null });
    }
  }, [open, task, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateTask.mutateAsync({ id: task!.id, updates: values });
      } else {
        await createTask.mutateAsync(values);
      }
      onClose();
    } catch (_) { /* toast handled in hook */ }
  });

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? t('platform:tasks.editTask') : t('platform:tasks.newTask')}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('platform:tasks.taskTitle')} *</Label>
            <Input {...register('title', { required: true })} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label>{t('platform:tasks.description')}</Label>
            <Textarea {...register('description')} rows={3} disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('platform:tasks.status')}</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['todo', 'in_progress', 'done', 'cancelled'] as const).map(s => (
                        <SelectItem key={s} value={s}>{t(`platform:tasks.statuses.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('platform:tasks.priority')}</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                        <SelectItem key={p} value={p}>{t(`platform:tasks.priorities.${p}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('platform:tasks.dueDate')}</Label>
            <Input type="date" {...register('due_date')} disabled={isPending} />
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
