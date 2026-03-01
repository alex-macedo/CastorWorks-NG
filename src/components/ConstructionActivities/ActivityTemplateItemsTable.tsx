import { useMemo } from "react";
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

export interface ActivityItem {
  sequence: number;
  // Duration-based mode fields
  activityName?: string;
  defaultDays?: number;
  // Offset-based mode fields
  description?: string;
  startOffset?: number;
  endOffset?: number;
  duration?: number;
  isMilestone?: boolean;
}

interface ActivityTemplateItemsTableProps {
  activities: ActivityItem[];
  onEdit?: (activity: ActivityItem, index: number) => void;
  onDelete?: (index: number) => void;
  isReorderable?: boolean;
  onReorderActivities?: (newActivities: ActivityItem[]) => void;
  readOnly?: boolean;
  mode?: 'duration' | 'offset'; // Template mode
}

// Sortable activity row component
function SortableActivityRow({
  activity,
  index,
  onEdit,
  onDelete,
  isReorderable,
  readOnly,
  mode: rowMode,
}: {
  activity: ActivityItem;
  index: number;
  onEdit?: (activity: ActivityItem, index: number) => void;
  onDelete?: (index: number) => void;
  isReorderable?: boolean;
  readOnly?: boolean;
  mode?: 'duration' | 'offset';
}) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `activity-${index}`,
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
      <TableCell className="text-center p-2">{activity.sequence}</TableCell>
      
      {/* Conditional columns based on mode */}
      {rowMode === 'duration' ? (
        <>
          <TableCell className="font-medium p-2">{activity.activityName}</TableCell>
          <TableCell className="text-right p-2">{activity.defaultDays}</TableCell>
        </>
      ) : (
        <>
          <TableCell className="font-medium p-2">
            <div className="flex items-center gap-2">
              {activity.isMilestone && (
                <span className="text-orange-500" title={t("constructionActivities.milestone", "Milestone")}>
                  ◆
                </span>
              )}
              {activity.description}
            </div>
          </TableCell>
          <TableCell className="text-center p-2">{activity.startOffset ?? ''}</TableCell>
          <TableCell className="text-center p-2">{activity.endOffset ?? ''}</TableCell>
          <TableCell className="text-center p-2">{activity.duration ?? ''}</TableCell>
        </>
      )}
            {!readOnly && (
        <TableCell className="text-right p-2">
          <div className="flex justify-end gap-1">
            {onEdit && (
              <Button size="sm" variant="ghost" onClick={() => onEdit(activity, index)} className="h-7 w-7 p-0">
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

export function ActivityTemplateItemsTable({
  activities,
  onEdit,
  onDelete,
  isReorderable = false,
  onReorderActivities,
  readOnly = false,
  mode = 'duration', // Default to duration mode for backward compatibility
}: ActivityTemplateItemsTableProps) {
  const { t } = useLocalization();

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Calculate total days - mode-aware
  const totalDays = useMemo(() => {
    if (mode === 'duration') {
      return activities.reduce((sum, activity) => sum + (activity.defaultDays || 0), 0);
    } else {
      // Offset mode: total project duration = max end offset + 1
      const maxEnd = Math.max(0, ...activities.map(a => a.endOffset || 0));
      return maxEnd > 0 ? maxEnd + 1 : 0;
    }
  }, [activities, mode]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorderActivities) return;

    const oldIndex = activities.findIndex((_, i) => `activity-${i}` === active.id);
    const newIndex = activities.findIndex((_, i) => `activity-${i}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newActivities = arrayMove(activities, oldIndex, newIndex);
      // Update sequence numbers
      const resequenced = newActivities.map((activity, idx) => ({
        ...activity,
        sequence: idx + 1,
      }));
      onReorderActivities(resequenced);
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("constructionActivities.noActivities", "No activities in this template")}
      </div>
    );
  }

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {isReorderable && <TableHead className="w-[44px]"></TableHead>}
          <TableHead className="w-[80px] text-center">
            {t("constructionActivities.table.sequence", "Sequence")}
          </TableHead>
          
          {/* Conditional headers based on mode */}
          {mode === 'duration' ? (
            <>
              <TableHead>{t("constructionActivities.table.activityName", "Activity Name")}</TableHead>
              <TableHead className="text-right">
                {t("constructionActivities.table.duration", "Duration (days)")}
              </TableHead>
            </>
          ) : (
            <>
              <TableHead>{t("constructionActivities.table.description", "Description")}</TableHead>
              <TableHead className="text-center">
                {t("constructionActivities.table.startOffset", "Start (workdays)")}
              </TableHead>
              <TableHead className="text-center">
                {t("constructionActivities.table.endOffset", "End (workdays)")}
              </TableHead>
              <TableHead className="text-center">
                {t("constructionActivities.table.duration", "Duration")}
              </TableHead>
            </>
          )}
          
          {!readOnly && (
            <TableHead className="text-right">
              {t("common.actions.label", "Actions")}
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((activity, index) => (
          <SortableActivityRow
            key={`activity-${index}`}
            activity={activity}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
            isReorderable={isReorderable}
            readOnly={readOnly}
            mode={mode}
          />
        ))}

        {/* Total Row */}
        <TableRow className="bg-primary text-primary-foreground font-bold">
          <TableCell colSpan={mode === 'duration' ? (isReorderable ? 3 : 2) : (isReorderable ? 4 : 3)} className="text-lg">
            {t("common.total", "Total")}
          </TableCell>
          <TableCell className={mode === 'duration' ? "text-right text-lg" : "text-center text-lg"}>{totalDays} days</TableCell>
          {mode === 'offset' && <TableCell></TableCell>}
          {!readOnly && <TableCell></TableCell>}
        </TableRow>
      </TableBody>
    </Table>
  );

  if (isReorderable && onReorderActivities) {
    return (
      <div className="w-full overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activities.map((_, i) => `activity-${i}`)}
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
