import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useCreateClientTask } from '@/hooks/clientPortal/useCreateClientTask';
import { toast } from 'sonner';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated?: (taskData: any) => void;
  teamMembers?: Array<{ id: string; name: string; avatar_url?: string }>;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  onTaskCreated,
  teamMembers = [],
}: AddTaskDialogProps) {
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignee: '',
    dueDate: undefined as Date | undefined,
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'pending' as 'pending' | 'in-progress' | 'blocked',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useCreateClientTask();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('clientPortal.tasks.dialog.nameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const taskData = {
        name: formData.name,
        description: formData.description,
        assignee: formData.assignee || null,
        due_date: formData.dueDate ? formData.dueDate.toISOString() : null,
        priority: formData.priority,
        status: formData.status,
      };

      const result = await mutation.mutateAsync(taskData);

      toast.success(t('clientPortal.tasks.dialog.success'));
      onTaskCreated?.(result || taskData);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      assignee: '',
      dueDate: undefined,
      priority: 'medium',
      status: 'pending',
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('clientPortal.tasks.dialog.title')}</SheetTitle>
          <SheetDescription>
            {t('clientPortal.tasks.dialog.description')}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('clientPortal.tasks.dialog.nameLabel')}
            </Label>
            <Input
              id="name"
              placeholder={t('clientPortal.tasks.dialog.namePlaceholder')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={errors.name ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('clientPortal.tasks.dialog.descriptionLabel')}
            </Label>
            <Textarea
              id="description"
              placeholder={t(
                'clientPortal.tasks.dialog.descriptionPlaceholder'
              )}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              disabled={isSubmitting}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label htmlFor="assignee">
              {t('clientPortal.tasks.dialog.assigneeLabel')}
            </Label>
            <Select
              value={formData.assignee}
              onValueChange={(value) =>
                setFormData({ ...formData, assignee: value === 'none' ? '' : value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="assignee">
                <SelectValue
                  placeholder={t(
                    'clientPortal.tasks.dialog.assigneePlaceholder'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('clientPortal.tasks.dialog.assigneeNone')}
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>{t('clientPortal.tasks.dialog.dueDateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.dueDate
                    ? formatDate(formData.dueDate)
                    : t('clientPortal.tasks.dialog.dueDatePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) =>
                    setFormData({ ...formData, dueDate: date })
                  }
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">
              {t('clientPortal.tasks.dialog.priorityLabel')}
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  priority: value as 'low' | 'medium' | 'high',
                })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  {t('clientPortal.tasks.dialog.priorityLow')}
                </SelectItem>
                <SelectItem value="medium">
                  {t('clientPortal.tasks.dialog.priorityMedium')}
                </SelectItem>
                <SelectItem value="high">
                  {t('clientPortal.tasks.dialog.priorityHigh')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">
              {t('clientPortal.tasks.dialog.statusLabel')}
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  status: value as 'pending' | 'in-progress' | 'blocked',
                })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">
                  {t('clientPortal.tasks.dialog.statusPending')}
                </SelectItem>
                <SelectItem value="in-progress">
                  {t('clientPortal.tasks.dialog.statusInProgress')}
                </SelectItem>
                <SelectItem value="blocked">
                  {t('clientPortal.tasks.dialog.statusBlocked')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Buttons */}
          <SheetFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('clientPortal.tasks.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t('clientPortal.tasks.dialog.submitting')
                : t('clientPortal.tasks.dialog.submit')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
