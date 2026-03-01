/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { useProjectTaskStatuses } from '@/hooks/useProjectTaskStatuses';
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
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

// TagsInput Component
interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagsInput = ({ value, onChange, placeholder }: TagsInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
              title="Remove tag"
              aria-label={`Remove tag: ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        className="flex-1"
      />
    </div>
  );
};

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: any;
  initialStatus?: string;
  projectId?: string;
}

export const TaskFormDialog = ({
  open,
  onOpenChange,
  task,
  initialStatus = 'todo',
  projectId,
}: TaskFormDialogProps) => {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const { createTask, updateTask, deleteTask } = useArchitectTasks(projectId);
  const { projects } = useProjects();
  const { data: users } = useUsers();

  const taskSchema = z.object({
    project_id: z.string().min(1, t('architect.tasks.validation.projectRequired')),
    title: z.string().min(1, t('architect.tasks.validation.titleRequired')),
    description: z.string().optional(),
    assignee_id: z.string().optional(),
    due_date: z.preprocess((arg) => {
      // Accept Date objects (from the Calendar) and strings; normalize to 'yyyy-MM-dd'
      if (arg instanceof Date) {
        try {
          return format(arg, 'yyyy-MM-dd');
        } catch (e) {
          return undefined;
        }
      }
      return typeof arg === 'string' && arg.length > 0 ? arg : undefined;
    }, z.string().optional()),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    status: z.string().default('todo'),
    status_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  type TaskFormData = z.infer<typeof taskSchema>;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      project_id: task?.project_id || projectId || '',
      title: task?.title || '',
      description: task?.description || '',
      assignee_id: task?.assignee_id || '',
      due_date: task?.due_date || '',
      priority: task?.priority || 'medium',
      status: task?.status || (initialStatus?.length < 20 ? initialStatus : 'todo'),
      status_id: task?.status_id || (initialStatus?.length >= 20 ? initialStatus : undefined),
      tags: task?.tags || [],
    },
  });

  const formProjectId = form.watch('project_id');
  const effectiveProjectId = projectId || formProjectId;
  const { statuses, getDefaultStatus } = useProjectTaskStatuses(effectiveProjectId);

  // Reset form when task changes (for edit mode) or dialog opens
  useEffect(() => {
    if (open) {
      if (task) {
        form.reset({
          project_id: task.project_id || projectId || '',
          title: task.title || '',
          description: task.description || '',
          assignee_id: task.assignee_id || '',
          due_date: task.due_date || '',
          priority: task.priority || 'medium',
          status: task.status || (initialStatus?.length < 20 ? initialStatus : 'todo'),
          status_id: task.status_id || (initialStatus?.length >= 20 ? initialStatus : undefined),
          tags: task.tags || [],
        });
      } else {
        // Reset for new task
        form.reset({
          project_id: projectId || '',
          title: '',
          description: '',
          assignee_id: '',
          due_date: '',
          priority: 'medium',
          status: initialStatus?.length < 20 ? initialStatus : 'todo',
          status_id: initialStatus?.length >= 20 ? initialStatus : undefined,
          tags: [],
        });
      }
    }
  }, [open, task, projectId, initialStatus, form]);

  // Separate effect to handle default status when statuses load
  useEffect(() => {
    if (open && !task && statuses?.length > 0) {
      const currentStatusId = form.getValues('status_id');
      
      // Only set default if no status_id is currently set
      if (!currentStatusId) {
        let defaultStatusId: string | undefined = undefined;

        if (initialStatus?.length >= 20) {
           // Should be handled by first effect, but valid check
           defaultStatusId = initialStatus;
        } else {
           // Try to find by slug or use default
           if (initialStatus && initialStatus !== 'todo') {
             const matchingStatus = statuses.find(s => s.slug === initialStatus);
             defaultStatusId = matchingStatus?.id;
           }
           
           if (!defaultStatusId) {
             defaultStatusId = getDefaultStatus()?.id || statuses[0]?.id;
           }
        }

        if (defaultStatusId) {
          form.setValue('status_id', defaultStatusId);
          // Sync slug
          const statusObj = statuses.find(s => s.id === defaultStatusId);
          if (statusObj) {
            form.setValue('status', statusObj.slug);
          }
        }
      }
    }
  }, [open, task, statuses, initialStatus, getDefaultStatus, form]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      // Normalize form data: convert empty/undefined date strings to null
      const normalizeDate = (value: any): string | null => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        return String(value).trim() || null;
      };

      const normalizedData = {
        ...data,
        due_date: normalizeDate(data.due_date),
        description: data.description && data.description.trim() !== '' ? data.description : null,
        assignee_id: data.assignee_id && data.assignee_id.trim() !== '' ? data.assignee_id : null,
      };

      if (task) {
        await updateTask.mutateAsync({ id: task.id, ...normalizedData });
      } else {
        await createTask.mutateAsync(normalizedData);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDelete = async () => {
    if (task && confirm(t('architect.common.confirmDelete'))) {
      await deleteTask.mutateAsync(task.id);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl h-[90vh] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {task ? t('architect.tasks.edit') : t('architect.tasks.new')}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-1">
              <div className="space-y-4 pr-1">
                {!projectId && (
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('architect.tasks.project')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('common.select')} />
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
                )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.tasks.taskTitle')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.tasks.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('architect.tasks.tags')}</FormLabel>
                  <FormControl>
                    <TagsInput
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder={t('architect.tasks.tagsPlaceholder')}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignee_id"
                render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>{t('architect.tasks.assignee')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t("architect.tasks.selectAssignee")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.display_name || user.email}
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
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('architect.tasks.dueDate')}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                               {field.value ? (
                                 formatDate(field.value)
                               ) : (
                                 <span>{t('common.selectDate')}</span>
                               )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>{t('architect.tasks.priority')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">{t('architect.tasks.priorities.low')}</SelectItem>
                        <SelectItem value="medium">{t('architect.tasks.priorities.medium')}</SelectItem>
                        <SelectItem value="high">{t('architect.tasks.priorities.high')}</SelectItem>
                        <SelectItem value="urgent">{t('architect.tasks.priorities.urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('architect.tasks.status')}</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                         field.onChange(val);
                         // Also update status slug for backward compatibility
                         const selectedStatus = statuses?.find(s => s.id === val);
                         if (selectedStatus) {
                            form.setValue('status', selectedStatus.slug);
                         }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statuses?.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <span 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: status.color || '#ccc' }} 
                              />
                              {t(`taskManagement:status.${status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, status.name)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <div className="flex justify-between mt-auto pt-4 border-t">

              <div>
                {task && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteTask.isPending}
                  >
                    {t('common.delete')}
                  </Button>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
