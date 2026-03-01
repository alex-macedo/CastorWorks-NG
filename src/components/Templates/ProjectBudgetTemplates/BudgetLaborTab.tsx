import React, { useState, useMemo, Fragment, useEffect } from "react";
import { Plus, Edit2, Trash2, AlertCircle, ChevronsDown, ChevronsUp, ChevronDown, ChevronRight, Users, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { formatCurrency } from "@/utils/formatters";
import { groupMaterialsByCategory } from "@/utils/materialsCalculator";
import { BudgetLineItemDialog } from "./BudgetLineItemDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface BudgetLaborTabProps {
  budgetId: string;
  projectId: string;
}

// Sortable category row component
function SortableCategoryRow({
  category,
  categoryItems,
  subtotal,
  currency,
  t,
  expandedGroups,
  onToggleGroup,
  onEdit,
  onDelete,
}: {
  category: string;
  categoryItems: any[];
  subtotal: number;
  currency: string;
  t: any;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}) {
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
            {expandedGroups[category] ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {category}
          </div>
        </TableCell>
        <TableCell></TableCell>
        <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[120px]">
          {formatCurrency(subtotal, currency)}
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
      </TableRow>
      {expandedGroups[category] &&
        categoryItems.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell>{item.group_name || 'Labor'}</TableCell>
            <TableCell className="font-medium">{item.description}</TableCell>
            <TableCell className="text-right">
              {(item.percentage || 0).toFixed(2)}%
            </TableCell>
            <TableCell className="text-right whitespace-nowrap min-w-[120px]">
              {formatCurrency(item.total_labor || 0, currency)}
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
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
    </Fragment>
  );
}

// Component to show collapsed summary for labor
function LaborCollapsedSummary({ laborItems }: { laborItems: any[] }) {
  const { t, language, currency } = useLocalization();

  const grandTotal = useMemo(() => {
    return laborItems.reduce((total, item) => total + (item.total_labor || 0), 0);
  }, [laborItems]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{t("budgets:labor.summary")}</span>
        <span className="font-bold text-lg">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
    </div>
  );
}

export function BudgetLaborTab({ budgetId, projectId }: BudgetLaborTabProps) {
  const { t, currency, language } = useLocalization();
  const { lineItems, createLineItem, updateLineItem, deleteLineItem, isLoading } = useBudgetLineItems(budgetId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isLaborSectionVisible, setIsLaborSectionVisible] = useState(false);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Filter for labor (items with labor costs)
  const { laborItems, totalLabor } = useMemo(() => {
    const items = lineItems.filter(item => (item.unit_cost_labor || 0) > 0);
    const total = items.reduce((sum, item) => sum + (item.total_labor || 0), 0);
    return { laborItems: items, totalLabor: total };
  }, [lineItems]);

  // Group labor by group_name
  const groupedLabor = useMemo(() => groupMaterialsByCategory(laborItems), [laborItems]);
  const groupOrderFromItems = useMemo(() => {
    const order: string[] = [];
    laborItems.forEach((item) => {
      const group = item.group_name || (item as { group?: string }).group || "Other";
      if (!order.includes(group)) {
        order.push(group);
      }
    });
    return order;
  }, [laborItems]);

  // Calculate subtotals for each group
  const groupSubtotals = useMemo(() => {
    return Object.entries(groupedLabor).reduce((subtotals, [category, items]) => {
      const groupTotal = items.reduce((sum: number, item: any) => {
        return sum + (item.total_labor || 0);
      }, 0);
      subtotals[category] = groupTotal;
      return subtotals;
    }, {} as Record<string, number>);
  }, [groupedLabor]);

  // Load group order from localStorage on mount
  useEffect(() => {
    const storageKey = `budget-labor-group-order-${budgetId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        setGroupOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to parse saved group order:', e);
      }
    }
  }, [budgetId]);

  // Initialize group order from labor items if not set
  useEffect(() => {
    if (Object.keys(groupedLabor).length > 0 && groupOrder.length === 0) {
      setGroupOrder(groupOrderFromItems);
    }
  }, [groupOrderFromItems, groupedLabor, groupOrder.length]);

  // Determine the order of categories
  const orderedCategories = useMemo(() => {
    const categories = groupOrderFromItems.length > 0
      ? groupOrderFromItems
      : Object.keys(groupedLabor);
    
    if (groupOrder.length > 0) {
      const ordered = groupOrder.filter((cat) => categories.includes(cat));
      const newCategories = categories.filter((cat) => !groupOrder.includes(cat));
      return [...ordered, ...newCategories];
    }
    
    return categories;
  }, [groupOrderFromItems, groupedLabor, groupOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
      setGroupOrder(newOrder);
      localStorage.setItem(`budget-labor-group-order-${budgetId}`, JSON.stringify(newOrder));
    }
  };

  // Check if groups are expanded
  const isLaborGroupsExpanded = Object.values(expandedGroups).some(expanded => expanded);

  const handleLaborExpandGroups = () => {
    const allGroups: Record<string, boolean> = {};
    laborItems.forEach(item => {
      if (item.group_name) {
        allGroups[item.group_name] = true;
      }
    });
    setExpandedGroups(allGroups);
  };

  const handleLaborCollapseGroups = () => {
    setExpandedGroups({});
  };

  const toggleLaborGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleAddLabor = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    deleteLineItem.mutate(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("budgets:labor.title")}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLaborSectionVisible(!isLaborSectionVisible)}
              className="h-8"
            >
              {isLaborSectionVisible ? t("materials:collapseSection") : t("materials:expandSection")}
            </Button>
            {isLaborSectionVisible && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isLaborGroupsExpanded ? handleLaborCollapseGroups : handleLaborExpandGroups}
                  className="h-8"
                >
                  {isLaborGroupsExpanded ? (
                    <>
                      <ChevronsUp className="h-4 w-4 mr-2" />
                      {t("common.collapseAll")}
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="h-4 w-4 mr-2" />
                      {t("common.expandAll")}
                    </>
                  )}
                </Button>
              </>
            )}
            <Button onClick={handleAddLabor} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {t("budgets:labor.addItem")}
            </Button>
          </div>
        </CardHeader>
        {isLaborSectionVisible ? (
          <CardContent className="p-0">
            {laborItems.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("materials:table.group")}</TableHead>
                      <TableHead>{t("budgets:lineItems.description")}</TableHead>
                      <TableHead className="text-right">{t("materials:form.percentage")}</TableHead>
                      <TableHead className="text-right min-w-[120px]">{t("materials:form.totalValue")}</TableHead>
                      <TableHead className="text-center">{t("materials:form.editable")}</TableHead>
                      <TableHead className="text-right w-[100px]">{t("common.actions.label")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={orderedCategories}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedCategories.map((group) => (
                          <SortableCategoryRow
                            key={group}
                            category={group}
                            categoryItems={groupedLabor[group] || []}
                            subtotal={groupSubtotals[group] || 0}
                            currency={currency}
                            t={t}
                            expandedGroups={expandedGroups}
                            onToggleGroup={toggleLaborGroup}
                            onEdit={(item: any) => {
                              handleEditItem(item);
                            }}
                            onDelete={(id: string) => {
                              setDeleteConfirm(id);
                            }}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                    {/* Grand Total Row */}
                    <TableRow className="bg-green-100 dark:bg-green-950">
                      <TableCell colSpan={5} className="font-bold text-lg">
                        {t("budgets:labor.summary")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg whitespace-nowrap min-w-[150px]">
                        {formatCurrency(totalLabor, currency)}
                      </TableCell>
                      <TableCell className="w-[100px]"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                  <AlertCircle className="h-4 w-4" />
                  <p>{t("budgets:labor.noItems")}</p>
                </div>
              </CardContent>
            )}
          </CardContent>
        ) : (
          <CardContent className="p-4">
            <LaborCollapsedSummary laborItems={laborItems} />
          </CardContent>
        )}
      </Card>

      {/* Add/Edit Line Item Dialog */}
      <BudgetLineItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        budgetId={budgetId}
        itemType="labor"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("budgets:lineItems.deleteConfirm")}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
