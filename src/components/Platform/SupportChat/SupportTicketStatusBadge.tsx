import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { TicketStatus, TicketPriority } from '@/types/platform.types';

const statusVariant: Record<TicketStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
  closed: 'outline',
};

const priorityVariant: Record<TicketPriority, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

export function SupportTicketStatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useLocalization();
  return <Badge variant={statusVariant[status]}>{t(`platform:supportChat.statuses.${status}`)}</Badge>;
}

export function SupportTicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useLocalization();
  return <Badge variant={priorityVariant[priority]}>{t(`platform:supportChat.priorities.${priority}`)}</Badge>;
}
