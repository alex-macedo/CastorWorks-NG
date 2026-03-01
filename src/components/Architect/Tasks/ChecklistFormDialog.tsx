import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useProjects } from '@/hooks/useProjects';
import { useUsers } from '@/hooks/useUsers';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Plus, Trash2, X } from 'lucide-react';
import { ChecklistItem } from '@/types/taskManagement';

type ChecklistTaskFormData = {
  project_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
};

interface ChecklistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export const ChecklistFormDialog = ({
  open,
  onOpenChange,
  projectId,
}: ChecklistFormDialogProps) => {
  const { t } = useLocalization();
  const { createTask } = useArchitectTasks(projectId);
  const { projects } = useProjects();
  const { data: users } = useUsers();
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const checklistTaskSchema = z.object({
    project_id: z.string().min(1, t('architect.tasks.validation.projectRequired')),
    title: z.string().min(1, t('architect.tasks.validation.titleRequired')),
    description: z.string().optional(),
    assignee_id: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
  });

  const form = useForm<ChecklistTaskFormData>({
    resolver: zodResolver(checklistTaskSchema),
    defaultValues: {
      project_id: projectId || '',
      title: '',
      description: '',
      assignee_id: '',
      priority: 'medium',
    },
  });

  const addChecklistItem = () => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: crypto.randomUUID(),
        text: newItemText.trim(),
        completed: false,
        created_at: new Date().toISOString(),
      };
      setChecklistItems(prev => [...prev, newItem]);
      setNewItemText('');
    }
  };

  const removeChecklistItem = (id: string) => {
    setChecklistItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const onSubmit = async (data: ChecklistTaskFormData) => {
    try {
      // Create task with checklist
      await createTask.mutateAsync({
        ...data,
        status: 'todo',
        checklist_items: checklistItems,
      });

      // Reset form and close dialog
      form.reset();
      setChecklistItems([]);
      setNewItemText('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating checklist task:', error);
    }
  };

  const handleClose = () => {
    form.reset();
    setChecklistItems([]);
    setNewItemText('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            {t('architect.tasks.newChecklist')}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Task Details */}
            <div className="space-y-4">
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
                      <Input {...field} placeholder={t('architect.tasks.taskTitlePlaceholder')} />
                    </FormControl>
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
                      <Textarea {...field} rows={3} placeholder={t('architect.tasks.taskDescriptionPlaceholder')} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('architect.tasks.assignee')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('architect.tasks.selectAssignee')} />
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
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
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
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('architect.tasks.checklistItems')}</h3>
                <span className="text-sm text-muted-foreground">
                  {checklistItems.filter(item => item.completed).length} / {checklistItems.length} {t('architect.tasks.completed')}
                </span>
              </div>

              {/* Add New Item */}
              <div className="flex gap-2">
                <Input
                  placeholder={t('architect.tasks.addChecklistItem')}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={addChecklistItem}
                  disabled={!newItemText.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Checklist Items List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {checklistItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('architect.tasks.noChecklistItems')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={checklistItems.length === 0}>
                <CheckSquare className="h-4 w-4 mr-2" />
                {t('architect.tasks.createChecklistTask')}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
