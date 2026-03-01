import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ContentStatus } from '@/types/contentHub';

const STATUS_VARIANTS: Record<ContentStatus, { variant: 'secondary' | 'warning' | 'success' | 'outline'; labelKey: string }> = {
  draft: { variant: 'secondary', labelKey: 'contentHub.status.draft' },
  pending_approval: { variant: 'warning', labelKey: 'contentHub.status.pending' },
  published: { variant: 'success', labelKey: 'contentHub.status.published' },
  archived: { variant: 'outline', labelKey: 'contentHub.status.archived' },
};

type WorkflowStatusBadgeProps = {
  status: ContentStatus;
};

export const WorkflowStatusBadge = ({ status }: WorkflowStatusBadgeProps) => {
  const { t } = useLocalization();
  const config = STATUS_VARIANTS[status];

  return (
    <Badge variant={config.variant}>
      {t(config.labelKey)}
    </Badge>
  );
};
