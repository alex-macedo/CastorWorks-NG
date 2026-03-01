import { useState, useMemo, Fragment, ReactNode } from "react";
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
import {
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
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

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface CollapsibleGroupedTableProps<T> {
  items: T[];
  groupBy: (item: T) => string;
  columns: ColumnDef<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onCopy?: (item: T) => void;
  calculateSubtotal?: (items: T[]) => number;
  calculateGrandTotal?: (items: T[]) => number;
  isReorderable?: boolean;
  onReorderGroups?: (groupOrder: string[]) => void;
  emptyMessage?: string;
  groupHeaderClassName?: string;
  showSectionCollapse?: boolean;
  collapsedSummary?: (items: T[]) => ReactNode;
  getItemId: (item: T) => string;
  initialExpandedGroups?: Record<string, boolean>;
  showActions?: boolean;
}

interface SortableCategoryRowProps {
  category: string;
  categoryItems: any[];
  subtotal: number;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  isReorderable?: boolean;
  colSpan: number;
  currency: string;
}

function SortableCategoryRow({
  category,
  subtotal,
  expandedGroups,
  onToggleGroup,
  isReorderable,
  colSpan,
  currency,
}: SortableCategoryRowProps) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category,
  });

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
      <TableCell colSpan={colSpan - 2} className="font-semibold">
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

export function CollapsibleGroupedTable<T>({
  items,
  groupBy,
  columns,
  onEdit,
  onDelete,
  onCopy,
  calculateSubtotal,
  calculateGrandTotal,
  isReorderable = false,
  onReorderGroups,
  emptyMessage,
  groupHeaderClassName,
  showSectionCollapse = false,
  collapsedSummary,
  getItemId,
  initialExpandedGroups = {},
  showActions = true,
}: CollapsibleGroupedTableProps<T>) {
  const { t, currency } = useLocalization();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    initialExpandedGroups
  );
  const [isItemsSectionVisible, setIsItemsSectionVisible] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  // Group items by the groupBy function
  const groupedItems = useMemo(() => {
    const grouped: Record<string, T[]> = {};
    const groupOrder: string[] = [];

    items.forEach((item) => {
      const group = groupBy(item);
      if (!grouped[group]) {
        grouped[group] = [];
        groupOrder.push(group);
      }
      grouped[group].push(item);
    });

    return { grouped, groupOrder };
  }, [items, groupBy]);

  // Calculate subtotals and grand total
  const { groupSubtotals, grandTotal } = useMemo(() => {
    const subtotals: Record<string, number> = {};
    let total = 0;

    Object.entries(groupedItems.grouped).forEach(([group, groupItems]) => {
      const groupTotal = calculateSubtotal
        ? calculateSubtotal(groupItems)
        : groupItems.reduce((sum, item: any) => sum + Number(item.amount || 0), 0);

      subtotals[group] = groupTotal;
      total += groupTotal;
    });

    const finalTotal = calculateGrandTotal ? calculateGrandTotal(items) : total;

    return { groupSubtotals: subtotals, grandTotal: finalTotal };
  }, [groupedItems.grouped, calculateSubtotal, calculateGrandTotal, items]);

  const isGroupsExpanded = Object.values(expandedGroups).some((expanded) => expanded);

  const handleExpandGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    Object.keys(groupedItems.grouped).forEach((group) => {
      allExpanded[group] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const handleCollapseGroups = () => {
    setExpandedGroups({});
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !onReorderGroups) return;

    const oldIndex = groupedItems.groupOrder.indexOf(active.id as string);
    const newIndex = groupedItems.groupOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(groupedItems.groupOrder, oldIndex, newIndex);
      onReorderGroups(newOrder);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage || t("common.noItems", "No items found")}
      </div>
    );
  }

  // Calculate column span for group headers
  const colSpan = columns.length + (showActions ? 1 : 0);

  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
          {showActions && <TableHead className="text-right">{t("common.actions.label", "Actions")}</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedItems.groupOrder.map((group) => {
          const groupItems = groupedItems.grouped[group] || [];
          return (
            <Fragment key={`group-${group}`}>
              {isReorderable ? (
                <SortableCategoryRow
                  category={group}
                  categoryItems={groupItems}
                  subtotal={groupSubtotals[group] || 0}
                  expandedGroups={expandedGroups}
                  onToggleGroup={toggleGroup}
                  isReorderable={isReorderable}
                  colSpan={colSpan}
                  currency={currency}
                />
              ) : (
                <TableRow
                  className={
                    groupHeaderClassName || "bg-muted/50 cursor-pointer hover:bg-muted/70"
                  }
                  onClick={() => toggleGroup(group)}
                >
                  <TableCell colSpan={colSpan - 2} className="font-semibold">
                    <div className="flex items-center gap-2">
                      {expandedGroups[group] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {group}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(groupSubtotals[group] || 0, currency)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
              {expandedGroups[group] &&
                groupItems.map((item) => (
                  <TableRow key={getItemId(item)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {onEdit && (
                            <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onCopy && (
                            <Button size="sm" variant="ghost" onClick={() => onCopy(item)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(item)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </Fragment>
          );
        })}

        {/* Grand Total Row */}
        <TableRow className="bg-primary text-primary-foreground font-bold">
          <TableCell colSpan={colSpan - 2} className="text-lg">
            {t("common.total", "Total")}
          </TableCell>
          <TableCell className="text-right text-lg">
            {formatCurrency(grandTotal, currency)}
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const wrappedContent = isReorderable && onReorderGroups ? (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={groupedItems.groupOrder} strategy={verticalListSortingStrategy}>
        {tableContent}
      </SortableContext>
    </DndContext>
  ) : (
    tableContent
  );

  return (
    <div className="w-full">
      {/* Expand/Collapse Controls */}
      {!showSectionCollapse && (
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={isGroupsExpanded ? handleCollapseGroups : handleExpandGroups}
            className="h-8"
          >
            {isGroupsExpanded ? (
              <>
                <ChevronsUp className="h-4 w-4 mr-2" />
                {t("common.collapseAll", "Collapse All")}
              </>
            ) : (
              <>
                <ChevronsDown className="h-4 w-4 mr-2" />
                {t("common.expandAll", "Expand All")}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Table or Collapsed Summary */}
      {showSectionCollapse && !isItemsSectionVisible ? (
        <div className="p-4">{collapsedSummary ? collapsedSummary(items) : null}</div>
      ) : (
        <div className="w-full overflow-x-auto">{wrappedContent}</div>
      )}
    </div>
  );
}

// Export helper function for creating column definitions
export function createColumn<T>(
  key: string,
  header: string,
  cell: (item: T) => ReactNode,
  options?: {
    className?: string;
    headerClassName?: string;
  }
): ColumnDef<T> {
  return {
    key,
    header,
    cell,
    className: options?.className,
    headerClassName: options?.headerClassName,
  };
}
