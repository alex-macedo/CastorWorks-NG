import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "@/types/taskManagement";
import { supabase } from "@/integrations/supabase/client";
import { useTasksStore } from "@/stores/taskManagement";
import { toast } from "sonner";
import { useUsers } from "@/hooks/useUsers";
import { useDropdownOptions } from "@/hooks/useDropdownOptions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const createTaskFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(1, t("taskManagement.dialog.titleRequired")),
    description: z.string().optional(),
    category: z.string().min(1, t("taskManagement.dialog.categoryRequired")),
    status: z.enum(["not_started", "in_progress", "completed", "blocked"] as const),
    priority: z.enum(["low", "medium", "high", "critical"] as const),
    completion_percentage: z.coerce.number().min(0).max(100),
    estimated_hours: z.coerce.number().optional(),
    actual_hours: z.coerce.number().optional(),
    assigned_user_id: z.string().optional().nullable(),
  });

interface TaskFormValues {
  title: string;
  description?: string;
  category: string;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  completion_percentage: number;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_user_id?: string | null;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultStatus?: TaskStatus;
  phaseId?: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus = "not_started",
  phaseId,
}: TaskDialogProps) {
  const { t } = useLocalization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { addTask, updateTask, deleteTask } = useTasksStore();
  const { data: users } = useUsers();
  const { data: priorityOptions = [], isLoading: isLoadingPriorities } = useDropdownOptions('task_priority');

  const taskFormSchema = createTaskFormSchema(t);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      status: defaultStatus,
      priority: "medium",
      completion_percentage: 0,
      estimated_hours: undefined,
      actual_hours: undefined,
      assigned_user_id: null,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        category: task.category,
        status: task.status,
        priority: task.priority,
        completion_percentage: task.completion_percentage,
        estimated_hours: task.estimated_hours || undefined,
        actual_hours: task.actual_hours || undefined,
        assigned_user_id: task.assigned_user_id || null,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        category: "",
        status: defaultStatus,
        priority: "medium",
        completion_percentage: 0,
        estimated_hours: undefined,
        actual_hours: undefined,
        assigned_user_id: null,
      });
    }
  }, [task, defaultStatus, form, open]);

  const onSubmit = async (values: TaskFormValues) => {
    try {
      setIsSubmitting(true);

      if (task) {
        const { data, error } = await supabase
          .from("office_tasks")
          .update({
            title: values.title,
            description: values.description || null,
            category: values.category,
            status: values.status,
            priority: values.priority,
            completion_percentage: values.completion_percentage,
            estimated_hours: values.estimated_hours || null,
            actual_hours: values.actual_hours || null,
            assigned_user_id: values.assigned_user_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)
          .select()
          .single();

        if (error) throw error;

        if (data) {
          updateTask(task.id, data);
          toast.success(t("taskManagement.dialog.updateSuccess"));
        }
      } else {
        if (!phaseId) {
          toast.error(t("taskManagement.dialog.phaseIdRequired"));
          return;
        }

        const { data, error } = await supabase
          .from("office_tasks")
          .insert({
            phase_id: phaseId,
            title: values.title,
            description: values.description || null,
            category: values.category,
            status: values.status,
            priority: values.priority,
            completion_percentage: values.completion_percentage,
            estimated_hours: values.estimated_hours || null,
            actual_hours: values.actual_hours || null,
            assigned_user_id: values.assigned_user_id || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          addTask(data as Task);
          toast.success(t("taskManagement.dialog.createSuccess"));
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(task ? t("taskManagement.dialog.updateError") : t("taskManagement.dialog.createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    try {
      setIsDeleting(true);

      const { error } = await supabase
        .from("office_tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      deleteTask(task.id);
      toast.success(t("taskManagement.dialog.deleteSuccess"));
      setShowDeleteAlert(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(t("taskManagement.dialog.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {task ? t("taskManagement.dialog.editTitle") : t("taskManagement.dialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {task ? t("taskManagement.dialog.editDescription") : t("taskManagement.dialog.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskManagement.dialog.title")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("taskManagement.dialog.titlePlaceholder")} {...field} />
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
                    <FormLabel>{t("taskManagement.dialog.description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("taskManagement.dialog.descriptionPlaceholder")}
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("taskManagement.dialog.assignee")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("taskManagement.dialog.assigneePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.display_name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{user.display_name}</span>
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.category")} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t("taskManagement.dialog.categoryPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.status")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("taskManagement.dialog.status")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not_started">{t("taskManagement.status.notStarted")}</SelectItem>
                          <SelectItem value="in_progress">{t("taskManagement.status.inProgress")}</SelectItem>
                          <SelectItem value="completed">{t("taskManagement.status.completed")}</SelectItem>
                          <SelectItem value="blocked">{t("taskManagement.status.blocked")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.priority")} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                        disabled={isLoadingPriorities}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("taskManagement.dialog.priority")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.id} value={option.value}>
                              <div className="flex items-center gap-2">
                                {option.color && (
                                  <span
                                    className="inline-block w-3 h-3 rounded-full"
                                    style={{ backgroundColor: option.color }}
                                  />
                                )}
                                {option.label}
                              </div>
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
                  name="completion_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.completionPercentage")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimated_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.estimatedHours")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actual_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("taskManagement.dialog.actualHours")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {task && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteAlert(true)}
                    className="mr-auto"
                  >
                    <Trash2 className="size-4 mr-2" />
                    {t("taskManagement.dialog.delete")}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t("taskManagement.dialog.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {task ? t("taskManagement.dialog.updateTask") : t("taskManagement.dialog.createTask")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("taskManagement.dialog.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("taskManagement.dialog.deleteConfirmDescription")} "{task?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("taskManagement.dialog.deleteConfirmCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {t("taskManagement.dialog.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
