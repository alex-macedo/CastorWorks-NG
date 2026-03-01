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
import { formatCurrency } from "@/utils/formatters";
import { Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BudgetTemplateItemsTableProps {
  items: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onReorderCategories?: (categoryOrder: string[]) => void;
  isReorderable?: boolean;
  categoryOrder?: string[];
}

// Sortable category row component
function SortableCategoryRow({
  category,
  categoryItems,
  subtotal,
  expandedGroups,
  onToggleGroup,
  isReorderable,
}: {
  category: string;
  categoryItems: any[];
  subtotal: number;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  isReorderable?: boolean;
}) {
  const { t, currency } = useLocalization();
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
      <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
        {formatCurrency(subtotal, currency)}
      </TableCell>
      <TableCell></TableCell>
    </TableRow>
  );
}

export function BudgetTemplateItemsTable({
  items,
  onEdit,
  onDelete,
  expandedGroups,
  onToggleGroup,
  onReorderCategories,
  isReorderable = false,
  categoryOrder: propCategoryOrder,
}: BudgetTemplateItemsTableProps) {
  const { t, currency } = useLocalization();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Group items by category and maintain order
  const groupedItems = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    let categoryOrder: string[] = [];
    
    items.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
        if (!propCategoryOrder) {
          categoryOrder.push(category);
        }
      }
      grouped[category].push(item);
    });
    
    // Use prop category order if provided, otherwise use computed order
    if (propCategoryOrder && propCategoryOrder.length > 0) {
      // Filter to only include categories that exist in items
      categoryOrder = propCategoryOrder.filter(cat => grouped[cat]);
      // Add any missing categories
      Object.keys(grouped).forEach(cat => {
        if (!categoryOrder.includes(cat)) {
          categoryOrder.push(cat);
        }
      });
    }
    
    return { grouped, categoryOrder };
  }, [items, propCategoryOrder]);

  // Calculate subtotals for each group and grand total
  const { groupSubtotals, grandTotal } = useMemo(() => {
    const subtotals: Record<string, number> = {};
    let total = 0;

    Object.entries(groupedItems.grouped).forEach(([category, categoryItems]) => {
      const groupTotal = categoryItems.reduce((sum: number, item: any) => {
        return sum + Number(item.budgeted_amount || 0);
      }, 0);

      subtotals[category] = groupTotal;
      total += groupTotal;
    });

    return { groupSubtotals: subtotals, grandTotal: total };
  }, [groupedItems.grouped]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !onReorderCategories) return;

    const oldIndex = groupedItems.categoryOrder.indexOf(active.id as string);
    const newIndex = groupedItems.categoryOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(groupedItems.categoryOrder, oldIndex, newIndex);
      onReorderCategories(newOrder);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("templates.noItems", "No items in this template")}
      </div>
    );
  }

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {isReorderable && <TableHead className="w-[44px]"></TableHead>}
          <TableHead>{t("templates.category", "Category")}</TableHead>
          <TableHead>{t("common.description", "Description")}</TableHead>
          <TableHead className="text-right">{t("templates.amount", "Amount")}</TableHead>
          <TableHead className="text-right">{t("common.actions.label", "Actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedItems.categoryOrder.map((category) => {
          const categoryItems = groupedItems.grouped[category] || [];
          return (
            <Fragment key={`group-${category}`}>
              {isReorderable ? (
                <SortableCategoryRow
                  category={category}
                  categoryItems={categoryItems}
                  subtotal={groupSubtotals[category] || 0}
                  expandedGroups={expandedGroups}
                  onToggleGroup={onToggleGroup}
                  isReorderable={isReorderable}
                />
              ) : (
                <TableRow
                  className="bg-muted/50 cursor-pointer hover:bg-muted/70"
                  onClick={() => onToggleGroup(category)}
                >
                  <TableCell colSpan={2} className="font-semibold">
                    <div className="flex items-center gap-2">
                      {expandedGroups[category] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {category}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(groupSubtotals[category] || 0, currency)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              {expandedGroups[category] &&
                categoryItems.map((item: any) => (
                  <TableRow key={item.id || `item-${category}-${item.sort_order}`}>
                    {isReorderable && <TableCell></TableCell>}
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.description || '—'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.budgeted_amount || 0), currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </Fragment>
          );
        })}

        {/* Grand Total Row */}
        <TableRow className="bg-primary text-primary-foreground font-bold">
          <TableCell colSpan={isReorderable ? 3 : 2} className="text-lg">
            {t("templates.total", "Total")}
          </TableCell>
          <TableCell className="text-right text-lg">
            {formatCurrency(grandTotal, currency)}
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  if (isReorderable && onReorderCategories) {
    return (
      <div className="w-full overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groupedItems.categoryOrder}
            strategy={verticalListSortingStrategy}
          >
            {tableContent}
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {tableContent}
    </div>
  );
}

