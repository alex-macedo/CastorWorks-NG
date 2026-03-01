import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Calendar, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';

interface OpportunityCardProps {
  opportunity: any;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const OpportunityCard = ({ opportunity, onDragStart, onClick }: OpportunityCardProps) => {
  const { t, dateFormat } = useLocalization();
  const [isExpanded, setIsExpanded] = useState(false);
  const dragStartedRef = useRef(false);

  const handleDragStart = (e: React.DragEvent) => {
    dragStartedRef.current = true;
    onDragStart(e, opportunity.id);
  };

  const handleDragEnd = () => {
    // Reset after a delay to prevent click after drag
    setTimeout(() => {
      dragStartedRef.current = false;
    }, 100);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger edit if clicking on the expand button
    if ((e.target as HTMLElement).closest('[data-expand-button]')) {
      return;
    }
    // Don't trigger edit if this was a drag operation
    if (dragStartedRef.current) {
      dragStartedRef.current = false;
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3 space-y-2 text-right">
        <div className="flex items-start justify-between gap-2 flex-row-reverse">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm line-clamp-2">
              {opportunity.project_name}
            </div>
            {opportunity.clients && (
              <div className="text-xs text-muted-foreground mt-1">
                {opportunity.clients.name}
              </div>
            )}
          </div>
          <Button
            data-expand-button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 opacity-70 hover:opacity-100 hover:bg-muted"
            onClick={handleExpandClick}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-foreground" />
            )}
          </Button>
        </div>

        {opportunity.estimated_value && (
          <div className="flex items-center justify-end text-sm font-semibold text-green-600">
            {Number(opportunity.estimated_value).toLocaleString()}
            <DollarSign className="h-3 w-3 ml-1" />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground flex-row-reverse">
          {opportunity.probability && (
            <div className="flex items-center">
              {opportunity.probability}%
              <TrendingUp className="h-3 w-3 ml-1" />
            </div>
          )}

          {opportunity.expected_closing_date && (
            <div className="flex items-center">
              {formatDate(opportunity.expected_closing_date)}
              <Calendar className="h-3 w-3 ml-1" />
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="pt-2 border-t space-y-2">
            {opportunity.notes && (
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">{t('architect.opportunities.notes')}:</div>
                <div className="whitespace-pre-wrap">{opportunity.notes}</div>
              </div>
            )}
            {opportunity.created_at && (
              <div className="text-xs text-muted-foreground">
                Created: {formatDate(opportunity.created_at, dateFormat)}
              </div>
            )}
          </div>
        )}

        {!isExpanded && opportunity.notes && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {opportunity.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
