import React, { useState, useMemo, Fragment, useEffect } from "react";
import { Plus, Edit2, Trash2, AlertCircle, ChevronsDown, ChevronsUp, ChevronDown, ChevronRight, Package, GripVertical } from "lucide-react";
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

interface BudgetMaterialsTabProps {
  budgetId: string;
  projectId: string;
}

// Sortable category row component
function SortableCategoryRow({
  category,
  categoryItems,
  subtotal,
  currency,
  expandedGroups,
  onToggleGroup,
  onEdit,
  onDelete,
}: {
  category: string;
  categoryItems: any[];
  subtotal: number;
  currency: string;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onEdit: (material: any) => void;
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
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap min-w-[120px]">
          {formatCurrency(subtotal, currency)}
        </TableCell>
        <TableCell></TableCell>
      </TableRow>
      {expandedGroups[category] &&
        categoryItems.map((item: any) => (
          <TableRow key={item.id}>
            <TableCell>{item.group_name || 'Materials'}</TableCell>
            <TableCell className="font-medium">{item.description}</TableCell>
            <TableCell className="text-right text-sm">{item.unit}</TableCell>
            <TableCell className="text-right">{item.quantity}</TableCell>
            <TableCell className="text-right whitespace-nowrap min-w-[100px]">
              {formatCurrency(item.unit_cost_material, currency)}
            </TableCell>
            <TableCell className="text-right font-medium whitespace-nowrap min-w-[120px]">
              {formatCurrency(item.total_material, currency)}
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

// Component to show collapsed summary for materials
function MaterialsCollapsedSummary({ materials }: { materials: any[] }) {
  const { t, language, currency } = useLocalization();

  const { grandTotal } = useMemo(() => {
    const groupedMaterials = groupMaterialsByCategory(materials);
    let total = 0;

    Object.entries(groupedMaterials).forEach(([category, items]) => {
      const groupTotal = items.reduce((sum: number, material: any) => {
        const materialTotal = material.total_material || 0;
        return sum + materialTotal;
      }, 0);

      total += groupTotal;
    });

    return { grandTotal: total };
  }, [materials]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg text-green-800 dark:text-green-200">
          {t("budgets:materials.summary")}
        </span>
        <span className="font-bold text-lg text-green-800 dark:text-green-200">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
    </div>
  );
}

export function BudgetMaterialsTab({ budgetId, projectId }: BudgetMaterialsTabProps) {
  const { t, currency, language } = useLocalization();
  const { lineItems, addLineItem, updateLineItem, deleteLineItem, isLoading } = useBudgetLineItems(budgetId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isMaterialsSectionVisible, setIsMaterialsSectionVisible] = useState(true);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // Filter for materials (items with material costs) and sort by sort_order to match table order
  const { materialItems, totalMaterial } = useMemo(() => {
    const items = lineItems
      .filter(item => (item.unit_cost_material || 0) > 0)
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const total = items.reduce((sum, item) => sum + (item.total_material || 0), 0);
    return { materialItems: items, totalMaterial: total };
  }, [lineItems]);

  // Group materials by group_name (items within each group keep materialItems order = sort_order)
  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materialItems), [materialItems]);
  // Items per group sorted by sort_order for consistent table order
  const groupedMaterialsOrdered = useMemo(() => {
    const result: Record<string, any[]> = {};
    Object.entries(groupedMaterials).forEach(([cat, items]) => {
      result[cat] = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });
    return result;
  }, [groupedMaterials]);
  const groupOrderFromItems = useMemo(() => {
    const order: string[] = [];
    materialItems.forEach((item) => {
      const group = item.group_name || (item as { group?: string }).group || "Other";
      if (!order.includes(group)) {
        order.push(group);
      }
    });
    return order;
  }, [materialItems]);

  // Calculate subtotals for each group
  const groupSubtotals = useMemo(() => {
    return Object.entries(groupedMaterials).reduce((subtotals, [category, items]) => {
      const groupTotal = items.reduce((sum: number, material: any) => {
        return sum + (material.total_material || 0);
      }, 0);
      subtotals[category] = groupTotal;
      return subtotals;
    }, {} as Record<string, number>);
  }, [groupedMaterials]);

  // Load group order from localStorage on mount
  useEffect(() => {
    const storageKey = `budget-materials-group-order-${budgetId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        setGroupOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.error('Failed to parse saved group order:', e);
      }
    }
  }, [budgetId]);

  // Initialize group order from materials if not set
  useEffect(() => {
    if (Object.keys(groupedMaterials).length > 0 && groupOrder.length === 0) {
      setGroupOrder(groupOrderFromItems);
    }
  }, [groupOrderFromItems, groupedMaterials, groupOrder.length]);

  // Determine the order of categories
  const orderedCategories = useMemo(() => {
    const categories = groupOrderFromItems.length > 0
      ? groupOrderFromItems
      : Object.keys(groupedMaterials);
    
    if (groupOrder.length > 0) {
      const ordered = groupOrder.filter((cat) => categories.includes(cat));
      const newCategories = categories.filter((cat) => !groupOrder.includes(cat));
      return [...ordered, ...newCategories];
    }
    
    return categories;
  }, [groupOrderFromItems, groupedMaterials, groupOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
      setGroupOrder(newOrder);
      localStorage.setItem(`budget-materials-group-order-${budgetId}`, JSON.stringify(newOrder));
    }
  };

  // Check if groups are expanded
  const isMaterialsGroupsExpanded = Object.values(expandedGroups).some(expanded => expanded);

  const handleMaterialsExpandGroups = () => {
    const allGroups: Record<string, boolean> = {};
    materialItems.forEach(material => {
      if (material.group_name) {
        allGroups[material.group_name] = true;
      }
    });
    setExpandedGroups(allGroups);
  };

  const handleMaterialsCollapseGroups = () => {
    setExpandedGroups({});
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleAddMaterial = () => {
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
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("budgets:materials.title")}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMaterialsSectionVisible(!isMaterialsSectionVisible)}
              className="h-8"
            >
              {isMaterialsSectionVisible ? t("materials:collapseSection") : t("materials:expandSection")}
            </Button>
            {isMaterialsSectionVisible && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isMaterialsGroupsExpanded ? handleMaterialsCollapseGroups : handleMaterialsExpandGroups}
                  className="h-8"
                >
                  {isMaterialsGroupsExpanded ? (
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
            <Button onClick={handleAddMaterial} disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {t("budgets:materials.addItem")}
            </Button>
          </div>
        </CardHeader>
        {isMaterialsSectionVisible ? (
          <CardContent className="p-0">
            {materialItems.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("materials:table.group")}</TableHead>
                        <TableHead>{t("budgets:lineItems.description")}</TableHead>
                        <TableHead className="text-right">{t("budgets:lineItems.unit")}</TableHead>
                        <TableHead className="text-right">{t("budgets:lineItems.quantity")}</TableHead>
                        <TableHead className="text-right min-w-[100px]">{t("budgets:lineItems.unitCost")}</TableHead>
                        <TableHead className="text-right min-w-[120px]">{t("budgets:lineItems.total")}</TableHead>
                        <TableHead className="text-right w-[100px]">{t("common.actions.label")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={orderedCategories}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedCategories.map((group) => (
                          <SortableCategoryRow
                            key={group}
                            category={group}
                            categoryItems={groupedMaterialsOrdered[group] || []}
                            subtotal={groupSubtotals[group] || 0}
                            currency={currency}
                            expandedGroups={expandedGroups}
                            onToggleGroup={toggleGroup}
                            onEdit={(item: any) => {
                              handleEditItem(item);
                            }}
                            onDelete={(id: string) => {
                              setDeleteConfirm(id);
                            }}
                          />
                        ))}
                      </SortableContext>
                      {/* Grand Total Row */}
                      <TableRow className="bg-green-100 dark:bg-green-950">
                        <TableCell colSpan={5} className="font-bold text-lg">
                          {t("budgets:materials.summary")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg whitespace-nowrap min-w-[150px]">
                          {formatCurrency(totalMaterial, currency)}
                        </TableCell>
                        <TableCell className="w-[100px]"></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            ) : (
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                  <AlertCircle className="h-4 w-4" />
                  <p>{t("budgets:materials.noItems")}</p>
                </div>
              </CardContent>
            )}
          </CardContent>
        ) : (
          <CardContent className="p-4">
            <MaterialsCollapsedSummary materials={materialItems} />
          </CardContent>
        )}
      </Card>

      {/* Add/Edit Line Item Dialog */}
      <BudgetLineItemDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        budgetId={budgetId}
        itemType="material"
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
