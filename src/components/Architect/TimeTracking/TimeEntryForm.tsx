import { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjects } from '@/hooks/useProjects';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useCreateTimeEntry, useUpdateTimeEntry, type TimeEntry, type TimeEntryInsert as CreateTimeEntryInput } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface TimeEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimeEntry | null;
  defaultProjectId?: string;
}

export function TimeEntryForm({ open, onOpenChange, entry, defaultProjectId }: TimeEntryFormProps) {
  const { t, dateFormat } = useLocalization();
  const { projects } = useProjects();
  const createEntry = useCreateTimeEntry();
  const updateEntry = useUpdateTimeEntry();

  const [projectId, setProjectId] = useState<string>('');
  const [taskId, setTaskId] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [useManualDuration, setUseManualDuration] = useState(false);

  const { tasks } = useArchitectTasks(projectId || undefined);
  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const isEditing = !!entry;
  
  const showSeconds = dateFormat === 'DD/MM/YYYY' || dateFormat === 'YYYY-MM-DD';
  const timeSlice = showSeconds ? 8 : 5;

  // Reset form when opened
  useEffect(() => {
    if (open) {
      if (entry) {
        setProjectId(entry.project_id || '');
        setTaskId(entry.task_id || '');
        const startDate = new Date(entry.start_time);
        setDate(startDate.toISOString().split('T')[0]);
        setStartTime(startDate.toTimeString().slice(0, timeSlice));
        if (entry.end_time) {
          setEndTime(new Date(entry.end_time).toTimeString().slice(0, timeSlice));
          setUseManualDuration(false);
        } else {
          setUseManualDuration(true);
        }
        setDurationMinutes(entry.duration_minutes);
        setDescription(entry.description || '');
        setBillable(entry.billable);
        setHourlyRate(entry.hourly_rate?.toString() || '');
      } else {
        const now = new Date();
        setProjectId(defaultProjectId || '');
        setTaskId('');
        setDate(now.toISOString().split('T')[0]);
        setStartTime(now.toTimeString().slice(0, timeSlice));
        setEndTime('');
        setDurationMinutes(60);
        setDescription('');
        setBillable(true);
        setHourlyRate('');
        setUseManualDuration(false);
      }
    }
  }, [open, entry, defaultProjectId, timeSlice]);

  // Auto-calculate duration from start/end times
  useEffect(() => {
    if (!useManualDuration && date && startTime && endTime) {
      const today = date || new Date().toISOString().split('T')[0];
      // Append seconds if missing for Date parsing if needed, though 'T15:30' works fine. 
      // 'T15:30:00' also works.
      const start = new Date(`${today}T${startTime.length === 5 ? startTime + ':00' : startTime}`);
      const end = new Date(`${today}T${endTime.length === 5 ? endTime + ':00' : endTime}`);
      
      if (end > start) {
        setDurationMinutes(Math.round((end.getTime() - start.getTime()) / 60000));
      }
    }
  }, [date, startTime, endTime, useManualDuration]);

  const handleSubmit = async () => {
    const today = date || new Date().toISOString().split('T')[0];
    const sTime = startTime.length === 5 ? startTime + ':00' : startTime;
    const startDateTime = new Date(`${today}T${sTime}`);
    
    let endDateTime = null;
    if (!useManualDuration && endTime) {
      const eTime = endTime.length === 5 ? endTime + ':00' : endTime;
      endDateTime = new Date(`${today}T${eTime}`);
    }

    const input: CreateTimeEntryInput = {
      project_id: projectId || null,
      task_id: taskId || null,
      description: description || undefined,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime?.toISOString() || null,
      duration_minutes: useManualDuration ? durationMinutes : durationMinutes,
      billable,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    };

    if (isEditing && entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...input });
    } else {
      await createEntry.mutateAsync(input);
    }
    onOpenChange(false);
  };

  const isPending = (createEntry as any).isLoading || (updateEntry as any).isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('architect.timeTracking.editEntry')
              : t('architect.timeTracking.logTime')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project */}
          <div className="space-y-2">
            <Label>{t('architect.timeTracking.project')}</Label>
            <Select value={projectId || 'none'} onValueChange={(v) => { setProjectId(v === 'none' ? '' : v); setTaskId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder={t('architect.timeTracking.selectProject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('architect.timeTracking.noProject')}</SelectItem>
                {activeProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task */}
          {projectId && (
            <div className="space-y-2">
              <Label>{t('architect.timeTracking.task')}</Label>
              <Select value={taskId || 'none'} onValueChange={(v) => setTaskId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('architect.timeTracking.selectTask')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('architect.timeTracking.noTask')}</SelectItem>
                  {tasks?.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('architect.timeTracking.date')}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Time inputs */}
          {!useManualDuration ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('architect.timeTracking.startTime')}</Label>
                <Input
                  type="time"
                  step={showSeconds ? "1" : undefined}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('architect.timeTracking.endTime')}</Label>
                <Input
                  type="time"
                  step={showSeconds ? "1" : undefined}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t('architect.timeTracking.durationMinutes')}</Label>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              checked={useManualDuration}
              onCheckedChange={setUseManualDuration}
              id="manual-duration"
            />
            <Label htmlFor="manual-duration" className="text-sm text-muted-foreground cursor-pointer">
              {t('architect.timeTracking.manualDuration')}
            </Label>
          </div>

          {/* Duration display */}
          {durationMinutes > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('architect.timeTracking.totalDuration')}: {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
            </p>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('architect.timeTracking.notes')}</Label>
            <Textarea
              placeholder={t('architect.timeTracking.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Billable + Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={billable}
                onCheckedChange={setBillable}
                id="billable"
              />
              <Label htmlFor="billable" className="cursor-pointer">
                {t('architect.timeTracking.billable')}
              </Label>
            </div>
            {billable && (
              <div className="w-32">
                <Input
                  type="number"
                  placeholder={t('architect.timeTracking.hourlyRate')}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  min={0}
                  step={0.01}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !date || !startTime}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? t('common.save') : t('architect.timeTracking.logTime')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
