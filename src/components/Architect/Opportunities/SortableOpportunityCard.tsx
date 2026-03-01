import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OpportunityCard } from './OpportunityCard';
import type { ArchitectOpportunity } from '@/hooks/useArchitectOpportunities';

interface SortableOpportunityCardProps {
  opportunity: ArchitectOpportunity;
  onClick: (opportunity: ArchitectOpportunity) => void;
}

export const SortableOpportunityCard = ({ opportunity, onClick }: SortableOpportunityCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <OpportunityCard
        opportunity={opportunity}
        onDragStart={() => {}}
        onClick={() => onClick(opportunity)}
      />
    </div>
  );
};
