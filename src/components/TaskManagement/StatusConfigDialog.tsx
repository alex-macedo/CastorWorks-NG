import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ProjectTaskStatus } from '@/types/taskManagement';
import { Circle, Clock, CheckCircle, AlertCircle, XCircle, PlayCircle, PauseCircle, Flag } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Slug must contain only lowercase letters, numbers, hyphens, and underscores'),
  color: z.string().min(1, 'Color is required'),
  icon: z.string(),
  is_default: z.boolean(),
  is_completed: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface StatusConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  status?: ProjectTaskStatus | null;
  onSave: (data: FormData) => Promise<void>;
}

const AVAILABLE_COLORS = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
];

const AVAILABLE_ICONS = [
  { value: 'circle', label: 'Circle', Icon: Circle },
  { value: 'clock', label: 'Clock', Icon: Clock },
  { value: 'check-circle', label: 'Check Circle', Icon: CheckCircle },
  { value: 'alert-circle', label: 'Alert Circle', Icon: AlertCircle },
  { value: 'x-circle', label: 'X Circle', Icon: XCircle },
  { value: 'play-circle', label: 'Play Circle', Icon: PlayCircle },
  { value: 'pause-circle', label: 'Pause Circle', Icon: PauseCircle },
  { value: 'flag', label: 'Flag', Icon: Flag },
];

export function StatusConfigDialog({
  open,
  onOpenChange,
  status,
  onSave,
}: StatusConfigDialogProps) {
  const { t } = useLocalization();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: status?.name || '',
      slug: status?.slug || '',
      color: status?.color || 'blue',
      icon: status?.icon || 'circle',
      is_default: status?.is_default || false,
      is_completed: status?.is_completed || false,
    },
  });

  // Reset form when status changes
  React.useEffect(() => {
    if (status) {
      form.reset({
        name: status.name,
        slug: status.slug,
        color: status.color,
        icon: status.icon || 'circle',
        is_default: status.is_default,
        is_completed: status.is_completed,
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        color: 'blue',
        icon: 'circle',
        is_default: false,
        is_completed: false,
      });
    }
  }, [status, form]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    if (!status) {
      // Only auto-generate slug for new statuses
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '_');
      form.setValue('slug', slug);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await onSave(data);
      form.reset();
    } catch (error) {
      console.error('Error saving status:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{status ? 'Edit Status' : 'Add Status'}</DialogTitle>
          <DialogDescription>
            {status
              ? 'Update the status configuration for your project workflow.'
              : 'Create a new status column for your project workflow.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("additionalPlaceholders.exampleStatus")}
                      onChange={(e) => {
                        field.onChange(e);
                        handleNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Display name for the status column</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t("additionalPlaceholders.exampleStatusKey")}
                      disabled={!!status?.is_system}
                    />
                  </FormControl>
                  <FormDescription>
                    URL-friendly identifier (lowercase, numbers, hyphens, underscores only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("additionalPlaceholders.selectColor")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Color for the status indicator</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("additionalPlaceholders.selectIcon")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <icon.Icon className="h-4 w-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Icon to display with the status</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Default */}
            <FormField
              control={form.control}
              name="is_default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Default Status</FormLabel>
                    <FormDescription>
                      New tasks will be assigned this status by default
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Is Completed */}
            <FormField
              control={form.control}
              name="is_completed"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Completed Status</FormLabel>
                    <FormDescription>
                      Tasks with this status are considered completed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{status ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
