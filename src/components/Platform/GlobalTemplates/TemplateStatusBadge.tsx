import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { TemplateStatus } from '@/types/platform.types';

const variant: Record<TemplateStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  published: 'default',
  archived: 'secondary',
};

export function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const { t } = useLocalization();
  return <Badge variant={variant[status]}>{t(`platform:globalTemplates.statuses.${status}`)}</Badge>;
}
