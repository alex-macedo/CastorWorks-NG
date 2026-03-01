import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign } from 'lucide-react';
import { SortableOpportunityCard } from './SortableOpportunityCard';
import type { PipelineStatus } from '@/hooks/useArchitectStatuses';
import type { ArchitectOpportunity } from '@/hooks/useArchitectOpportunities';
import type { ColumnDensity } from '@/components/Architect/Tasks/TasksBoardView';

interface KanbanColumnProps {
  status: PipelineStatus;
  opportunities: ArchitectOpportunity[];
  total: number;
  onAddOpportunity: () => void;
  onEditOpportunity: (opportunity: ArchitectOpportunity) => void;
  columnDensity: ColumnDensity;
  columnMinWidth: number;
}

export const KanbanColumn = ({
  status,
  opportunities,
  total,
  onAddOpportunity,
  onEditOpportunity,
  columnDensity,
  columnMinWidth,
}: KanbanColumnProps) => {
  const { t } = useLocalization();
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const opportunityIds = opportunities.map((opp) => opp.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 transition-all duration-200 ${
        isOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''
      }`}
      style={{ minWidth: `${columnMinWidth}px` }}
    >
      <div
        className="rounded-lg p-4 h-full min-h-[600px] transition-colors duration-200"
        style={{
          backgroundColor: isOver ? `rgb(var(--primary) / 0.1)` : 'rgb(var(--muted) / 0.3)',
          borderLeft: `4px solid ${status.color}`,
        }}
      >
        {/* Column Header */}
        <div className="mb-4 pb-3 border-b space-y-2">
          {/* First line: Stage name, dot, and add button */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <h3 className="font-semibold text-sm flex-1">
              {t(`architect.opportunities.stages.${status.name}`) !== `architect.opportunities.stages.${status.name}`
                ? t(`architect.opportunities.stages.${status.name}`)
                : status.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/10"
              onClick={onAddOpportunity}
              title={t('architect.opportunities.addNew')}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          {/* Second line: Count and monetary value */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm text-muted-foreground bg-background px-2.5 py-1 rounded-full font-medium">
              {opportunities.length}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>



        {/* Opportunities List */}
        <SortableContext items={opportunityIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {opportunities.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${status.color}20` }}
                >
                  <Plus className="h-6 w-6" style={{ color: status.color }} />
                </div>
                {t('architect.opportunities.emptyColumn')}
              </div>
            ) : (
              opportunities.map((opportunity) => (
                <SortableOpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onClick={onEditOpportunity}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
