import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ContentHubRow } from '@/types/contentHub';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';

const getExcerpt = (content: string) => {
  if (!content) return '';
  const trimmed = content.replace(/\s+/g, ' ').trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
};

type ContentCardProps = {
  content: ContentHubRow;
  onView?: (content: ContentHubRow) => void;
  onEdit?: (content: ContentHubRow) => void;
};

export const ContentCard = ({ content, onView, onEdit }: ContentCardProps) => {
  const { t } = useLocalization();

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <WorkflowStatusBadge status={content.status} />
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {t(`contentHub.types.${content.type}`)}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
          <p className="text-xs text-muted-foreground">{content.slug}</p>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {getExcerpt(content.content)}
      </CardContent>
      {(onView || onEdit) && (
        <CardFooter className="mt-auto flex flex-wrap gap-2">
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(content)}>
              {t('contentHub.actions.view')}
            </Button>
          )}
          {onEdit && (
            <Button size="sm" onClick={() => onEdit(content)}>
              {t('contentHub.actions.edit')}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
