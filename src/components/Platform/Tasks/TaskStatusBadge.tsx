import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { TaskStatus, TaskPriority } from '@/types/platform.types';

const statusVariant: Record<TaskStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  todo: 'outline',
  in_progress: 'default',
  done: 'secondary',
  cancelled: 'destructive',
};

const priorityVariant: Record<TaskPriority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useLocalization();
  return <Badge variant={statusVariant[status]}>{t(`platform:tasks.statuses.${status}`)}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useLocalization();
  return <Badge variant={priorityVariant[priority]}>{t(`platform:tasks.priorities.${priority}`)}</Badge>;
}
