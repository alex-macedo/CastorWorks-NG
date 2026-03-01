import { useMemo, Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface PhaseItem {
  sequence: number;
  phaseName: string;
  defaultDurationDays: number;
  defaultBudgetPercentage: number;
}

interface PhaseTemplateItemsTableProps {
  phases: PhaseItem[];
  onEdit?: (phase: PhaseItem, index: number) => void;
  onDelete?: (index: number) => void;
  isReorderable?: boolean;
  onReorderPhases?: (newPhases: PhaseItem[]) => void;
  readOnly?: boolean;
}

// Sortable phase row component
function SortablePhaseRow({
  phase,
  index,
  onEdit,
  onDelete,
  isReorderable,
  readOnly,
}: {
  phase: PhaseItem;
  index: number;
  onEdit?: (phase: PhaseItem, index: number) => void;
  onDelete?: (index: number) => void;
  isReorderable?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `phase-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="h-12">
      {isReorderable && (
        <TableCell className="w-[44px] p-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </TableCell>
      )}
      <TableCell className="text-center p-2">{phase.sequence}</TableCell>
      <TableCell className="font-medium p-2">{phase.phaseName}</TableCell>
      <TableCell className="text-right p-2">{phase.defaultDurationDays}</TableCell>
      <TableCell className="text-right p-2">{phase.defaultBudgetPercentage}%</TableCell>
      {!readOnly && (
        <TableCell className="text-right p-2">
          <div className="flex justify-end gap-1">
            {onEdit && (
              <Button size="sm" variant="ghost" onClick={() => onEdit(phase, index)} className="h-7 w-7 p-0">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(index)}
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function PhaseTemplateItemsTable({
  phases,
  onEdit,
  onDelete,
  isReorderable = false,
  onReorderPhases,
  readOnly = false,
}: PhaseTemplateItemsTableProps) {
  const { t } = useLocalization();

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Calculate totals
  const { totalDays, totalBudget } = useMemo(() => {
    const days = phases.reduce((sum, phase) => sum + phase.defaultDurationDays, 0);
    const budget = phases.reduce((sum, phase) => sum + phase.defaultBudgetPercentage, 0);
    return { totalDays: days, totalBudget: budget };
  }, [phases]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorderPhases) return;

    const oldIndex = phases.findIndex((_, i) => `phase-${i}` === active.id);
    const newIndex = phases.findIndex((_, i) => `phase-${i}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newPhases = arrayMove(phases, oldIndex, newIndex);
      // Update sequence numbers
      const resequenced = newPhases.map((phase, idx) => ({
        ...phase,
        sequence: idx + 1,
      }));
      onReorderPhases(resequenced);
    }
  };

  if (phases.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("phaseTemplates.noPhases", "No phases in this template")}
      </div>
    );
  }

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {isReorderable && <TableHead className="w-[44px]"></TableHead>}
          <TableHead className="w-[80px] text-center">
            {t("phaseTemplates.table.sequence", "Sequence")}
          </TableHead>
          <TableHead>{t("phaseTemplates.table.phaseName", "Phase Name")}</TableHead>
          <TableHead className="text-right">
            {t("phaseTemplates.table.duration", "Duration (days)")}
          </TableHead>
          <TableHead className="text-right">
            {t("phaseTemplates.table.budget", "Budget (%)")}
          </TableHead>
          {!readOnly && (
            <TableHead className="text-right">
              {t("common.actions.label", "Actions")}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {phases.map((phase, index) => (
          <SortablePhaseRow
            key={`phase-${index}`}
            phase={phase}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
            isReorderable={isReorderable}
            readOnly={readOnly}
          />
        ))}

        {/* Total Row */}
        <TableRow className="bg-primary text-primary-foreground font-bold">
          <TableCell colSpan={isReorderable ? 3 : 2} className="text-lg">
            {t("common.total", "Total")}
          </TableCell>
          <TableCell className="text-right text-lg">{totalDays}</TableCell>
          <TableCell
            className={`text-right text-lg ${
              totalBudget !== 100 ? "text-yellow-300" : ""
            }`}
          >
            {totalBudget}%
          </TableCell>
          {!readOnly && <TableCell></TableCell>}
        </TableRow>
      </TableBody>
    </Table>
  );

  if (isReorderable && onReorderPhases) {
    return (
      <div className="w-full overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={phases.map((_, i) => `phase-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            {tableContent}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return <div className="w-full overflow-x-auto">{tableContent}</div>;
}
