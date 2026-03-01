import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
interface ParsedActivity {
  name: string;
  budgetPercentage: number;
  rawBudgetPercentage?: string;
}

interface ParsedPhase {
  id: string;
  phaseName: string;
  activities: ParsedActivity[];
  budgetPercentage: number;
  rawBudgetPercentage?: string;
}

interface SortablePhaseItemProps {
  phase: ParsedPhase;
  index: number;
  adjustmentFactor: number;
  onPercentageChange: (index: number, value: string) => void;
  onPhaseNameChange: (index: number, value: string) => void;
  onActivityNameChange: (phaseIndex: number, activityIndex: number, value: string) => void;
  onDeletePhase: (index: number) => void;
  onDeleteActivity: (phaseIndex: number, activityIndex: number) => void;
}

export function SortablePhaseItem({
  phase,
  index,
  adjustmentFactor,
  onPercentageChange,
  onPhaseNameChange,
  onActivityNameChange,
  onDeletePhase,
  onDeleteActivity,
}: SortablePhaseItemProps) {
  const [editingPhaseName, setEditingPhaseName] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayPercentage = phase.budgetPercentage * adjustmentFactor;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="text-sm border-l-2 border-primary pl-3 py-2 bg-background"
    >
      <div className="flex items-center gap-2 font-medium">
        <div className="flex items-center gap-1">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {index + 1}
          </div>
          <button
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {editingPhaseName ? (
          <Input
            type="text"
            value={phase.phaseName}
            onChange={(e) => onPhaseNameChange(index, e.target.value)}
            onBlur={() => setEditingPhaseName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingPhaseName(false);
              if (e.key === 'Escape') setEditingPhaseName(false);
            }}
            autoFocus
            className="flex-1 h-7 text-sm font-medium"
          />
        ) : (
          <button
            onClick={() => setEditingPhaseName(true)}
            className="flex-1 text-left hover:bg-muted/50 rounded px-2 py-1 transition-colors group flex items-center gap-2"
          >
            <span>{phase.phaseName}</span>
            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDeletePhase(index)}
          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          title={t("tooltips.deletePhase")}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={phase.budgetPercentage.toFixed(2)}
            onChange={(e) => onPercentageChange(index, e.target.value)}
            className="w-20 h-7 text-xs"
          />
          <span className="text-xs">%</span>
          {adjustmentFactor !== 1 && (
            <span className="text-xs text-muted-foreground ml-1">
              → {displayPercentage.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <div className="ml-3 space-y-1 mt-1">
        {phase.activities.map((activity, aidx) => (
          <div key={aidx} className="text-muted-foreground flex items-center gap-2 group">
            <span>•</span>
            {editingActivityIndex === aidx ? (
              <Input
                type="text"
                value={activity.name}
                onChange={(e) => onActivityNameChange(index, aidx, e.target.value)}
                onBlur={() => setEditingActivityIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingActivityIndex(null);
                  if (e.key === 'Escape') setEditingActivityIndex(null);
                }}
                autoFocus
                className="flex-1 h-6 text-xs"
              />
            ) : (
              <button
                onClick={() => setEditingActivityIndex(aidx)}
                className="flex-1 text-left hover:bg-muted/50 rounded px-2 py-0.5 transition-colors group flex items-center gap-2"
              >
                <span>{activity.name}</span>
                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              </button>
            )}
            <span className="text-xs">({activity.budgetPercentage.toFixed(2)}%)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteActivity(index, aidx)}
              className="h-5 px-1 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
              title={t("tooltips.deleteActivity")}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
