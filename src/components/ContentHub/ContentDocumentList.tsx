import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ContentHubRow } from '@/types/contentHub';

const getSummary = (content: string) => {
  const trimmed = content.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
};

type ContentDocumentListProps = {
  items: ContentHubRow[];
  onSelect?: (item: ContentHubRow) => void;
};

export const ContentDocumentList = ({ items, onSelect }: ContentDocumentListProps) => {
  const { t } = useLocalization();

  if (!items.length) {
    return (
      <Card className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        {t('contentHub.documents.empty')}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{getSummary(item.content)}</p>
            </div>
          </div>
          {onSelect && (
            <Button variant="outline" size="sm" onClick={() => onSelect(item)}>
              {t('contentHub.actions.view')}
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
};
