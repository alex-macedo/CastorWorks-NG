import { Fragment, useMemo } from "react";
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
import { formatCurrency, groupMaterialsByCategory } from "@/utils/materialsCalculator";
import { Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LaborTableProps {
  laborItems: any[];
  onEdit: (labor: any) => void;
  onDelete: (id: string) => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onReorderGroups?: (groupOrder: string[]) => void;
  isReorderable?: boolean;
  groupOrder?: string[];
}

function SortableCategoryRow({
  category,
  categoryItems,
  subtotal,
  expandedGroups,
  onToggleGroup,
  onEdit,
  onDelete,
  isReorderable,
}: {
  category: string;
  categoryItems: any[];
  subtotal: number;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onEdit: (labor: any) => void;
  onDelete: (id: string) => void;
  isReorderable?: boolean;
}) {
  const { t, language, currency } = useLocalization();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Fragment>
      <TableRow
        ref={setNodeRef}
        style={style}
        className="bg-muted/50 cursor-pointer hover:bg-muted/70"
        onClick={() => onToggleGroup(category)}
      >
        <TableCell colSpan={2} className="font-semibold">
          <div className="flex items-center gap-2">
            {isReorderable && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            {expandedGroups[category] ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {category}
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
          {formatCurrency(subtotal, language, currency)}
        </TableCell>
        <TableCell colSpan={2}></TableCell>
      </TableRow>
      {expandedGroups[category] &&
        categoryItems.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell>{item.group}</TableCell>
            <TableCell>{item.description}</TableCell>
            <TableCell className="text-right">{(item.percentage || 0).toFixed(2)}%</TableCell>
            <TableCell className="text-right">
              {formatCurrency(item.total_value || 0, language, currency)}
            </TableCell>
            <TableCell className="text-center">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  item.editable !== false
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                }`}
              >
                {item.editable !== false ? t("common.yes") : t("common.no")}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
    </Fragment>
  );
}

export function LaborTable({ 
  laborItems, 
  onEdit, 
  onDelete, 
  expandedGroups, 
  onToggleGroup,
  onReorderGroups,
  isReorderable = false,
  groupOrder 
}: LaborTableProps) {
  const { t, language, currency } = useLocalization();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const groupedLabor = useMemo(() => {
    return groupMaterialsByCategory(laborItems);
  }, [laborItems]);

  const { groupSubtotals, grandTotal } = useMemo(() => {
    const subtotals: Record<string, number> = {};
    let total = 0;

    Object.entries(groupedLabor).forEach(([group, items]) => {
      const sum = items.reduce((acc, item: any) => acc + (item.total_value || 0), 0);
      subtotals[group] = sum;
      total += sum;
    });

    return { groupSubtotals: subtotals, grandTotal: total };
  }, [groupedLabor]);

  // Determine the order of categories
  const orderedCategories = useMemo(() => {
    const categories = Object.keys(groupedLabor);
    
    if (groupOrder && groupOrder.length > 0) {
      // Use provided order, but include any new categories at the end
      const ordered = groupOrder.filter((cat) => categories.includes(cat));
      const newCategories = categories.filter((cat) => !groupOrder.includes(cat));
      return [...ordered, ...newCategories];
    }
    
    return categories.sort((a, b) => a.localeCompare(b));
  }, [groupedLabor, groupOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderGroups) return;

    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
      onReorderGroups(newOrder);
    }
  };

  if (!laborItems.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("materials:laborSection.empty")}
      </div>
    );
  }

  const tableBodyContent = (
    <>
      {isReorderable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedCategories}
            strategy={verticalListSortingStrategy}
          >
            {orderedCategories.map((category) => {
              const items = groupedLabor[category] || [];
              return (
                <SortableCategoryRow
                  key={category}
                  category={category}
                  categoryItems={items}
                  subtotal={groupSubtotals[category] || 0}
                  expandedGroups={expandedGroups}
                  onToggleGroup={onToggleGroup}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isReorderable={isReorderable}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      ) : (
        orderedCategories.map((category) => {
          const items = groupedLabor[category] || [];
          return (
            <SortableCategoryRow
              key={category}
              category={category}
              categoryItems={items}
              subtotal={groupSubtotals[category] || 0}
              expandedGroups={expandedGroups}
              onToggleGroup={onToggleGroup}
              onEdit={onEdit}
              onDelete={onDelete}
              isReorderable={false}
            />
          );
        })
      )}

      <TableRow className="bg-green-100 dark:bg-green-950">
        <TableCell colSpan={3} className="font-bold text-lg">
          {t("materials:summary.laborTotal")}
        </TableCell>
        <TableCell className="text-right font-bold text-lg">
          {formatCurrency(grandTotal, language, currency)}
        </TableCell>
        <TableCell colSpan={2}></TableCell>
      </TableRow>
    </>
  );

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("materials:table.group")}</TableHead>
            <TableHead>{t("materials:table.description")}</TableHead>
            <TableHead className="text-right">{t("materials:table.percentage")}</TableHead>
            <TableHead className="text-right">{t("materials:table.totalValue")}</TableHead>
            <TableHead className="text-center">{t("materials:table.editable")}</TableHead>
            <TableHead className="text-right">{t("materials:table.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableBodyContent}
        </TableBody>
      </Table>
    </div>
  );
}

