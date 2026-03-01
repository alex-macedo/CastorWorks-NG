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
import { calculateMaterialTotal, formatCurrency, groupMaterialsByCategory } from "@/utils/materialsCalculator";
import { Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MaterialsTableProps {
  materials: any[];
  onEdit: (material: any) => void;
  onDelete: (id: string) => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (groupName: string) => void;
  onReorderGroups?: (groupOrder: string[]) => void;
  isReorderable?: boolean;
  groupOrder?: string[];
}

// Sortable category row component
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
  onEdit: (material: any) => void;
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
        <TableCell colSpan={isReorderable ? 5 : 5} className="font-semibold">
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
          {formatCurrency(subtotal, language, currency)}
        </TableCell>
        <TableCell colSpan={4}></TableCell>
      </TableRow>
      {expandedGroups[category] && categoryItems.map((material: any) => {
        return (
          <TableRow key={material.id}>
            <TableCell>{material.group_name}</TableCell>
            <TableCell>{material.description}</TableCell>
            <TableCell className="text-right">{material.quantity?.toLocaleString() || 0}</TableCell>
            <TableCell>{material.unit}</TableCell>
            <TableCell className="text-right">{formatCurrency(material.price_per_unit || 0, language, currency)}</TableCell>
            <TableCell className="text-right">{formatCurrency(material.total || 0, language, currency)}</TableCell>
            <TableCell className="text-right">{material.factor || 0}</TableCell>
            <TableCell className="text-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                material.tgfa_applicable 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {material.tgfa_applicable ? t("common.yes") : t("common.no")}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                material.editable !== false 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
                {material.editable !== false ? t("common.yes") : t("common.no")}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(material);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(material.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </Fragment>
  );
}

export function MaterialsTable({ 
  materials, 
  onEdit, 
  onDelete, 
  expandedGroups, 
  onToggleGroup,
  onReorderGroups,
  isReorderable = false,
  groupOrder,
}: MaterialsTableProps) {
  const { t, language, currency } = useLocalization();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const groupedMaterials = useMemo(() => {
    return groupMaterialsByCategory(materials);
  }, [materials]);

  // Calculate subtotals for each group and grand total
  const { groupSubtotals, grandTotal } = useMemo(() => {
    const subtotals: Record<string, number> = {};
    let total = 0;

    Object.entries(groupedMaterials).forEach(([category, items]) => {
      // Skip "Custo Total Estimado" group from calculations
      if (category === "Custo Total Estimado") return;

      const groupTotal = items.reduce((sum: number, material: any) => {
        const materialTotal = material.total || 0;
        return sum + materialTotal;
      }, 0);

      subtotals[category] = groupTotal;
      total += groupTotal;
    });

    return { groupSubtotals: subtotals, grandTotal: total };
  }, [groupedMaterials]);

  // Determine the order of categories
  const orderedCategories = useMemo(() => {
    const categories = Object.keys(groupedMaterials).filter(
      (cat) => cat !== "Custo Total Estimado"
    );
    
    if (groupOrder && groupOrder.length > 0) {
      // Use provided order, but include any new categories at the end
      const ordered = groupOrder.filter((cat) => categories.includes(cat));
      const newCategories = categories.filter((cat) => !groupOrder.includes(cat));
      return [...ordered, ...newCategories];
    }
    
    return categories.sort((a, b) => a.localeCompare(b));
  }, [groupedMaterials, groupOrder]);

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

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("materials:table.noMaterials")}
      </div>
    );
  }

  const tableBodyContent = (
    <>
      {isReorderable ? (
        <SortableContext
          items={orderedCategories}
          strategy={verticalListSortingStrategy}
        >
          {orderedCategories.map((category) => {
            const items = groupedMaterials[category] || [];
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
      ) : (
        orderedCategories.map((category) => {
          const items = groupedMaterials[category] || [];
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
          
          {/* Custo Total Estimado - Grand Total */}
          {groupedMaterials["Custo Total Estimado"] && (
            <>
              <TableRow key="header-total" className="bg-green-100 dark:bg-green-950">
                <TableCell colSpan={10} className="font-bold text-lg">
                  Custo Total Estimado
                </TableCell>
              </TableRow>
              {groupedMaterials["Custo Total Estimado"].map((material: any) => (
                <TableRow key={material.id}>
                  <TableCell>{material.group_name}</TableCell>
                  <TableCell>{material.description}</TableCell>
                  <TableCell className="text-right">{material.quantity?.toLocaleString() || 0}</TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(material.price_per_unit || 0, language, currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(material.total || 0, language, currency)}</TableCell>
                  <TableCell className="text-right">{material.factor || 0}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      material.tgfa_applicable 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {material.tgfa_applicable ? t("common.yes") : t("common.no")}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      material.editable !== false 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {material.editable !== false ? t("common.yes") : t("common.no")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(material)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(material.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
             </>
           )}

           {/* Grand Total Row */}
           <TableRow className="bg-primary text-primary-foreground font-bold">
             <TableCell colSpan={5} className="text-lg">{t("materials:grandTotal")}</TableCell>
             <TableCell className="text-right text-lg">
               {formatCurrency(grandTotal, language, currency)}
             </TableCell>
             <TableCell colSpan={4}></TableCell>
           </TableRow>
         </>
       );

  const content = isReorderable ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("materials:table.group")}</TableHead>
              <TableHead>{t("materials:table.description")}</TableHead>
              <TableHead className="text-right">{t("materials:table.quantity")}</TableHead>
              <TableHead>{t("materials:table.unit")}</TableHead>
              <TableHead className="text-right">{t("materials:table.pricePerUnit")}</TableHead>
              <TableHead className="text-right">{t("materials:table.total")}</TableHead>
              <TableHead className="text-right">{t("materials:table.factor")}</TableHead>
              <TableHead className="text-center">{t("materials:table.tgfaApplicable")}</TableHead>
              <TableHead className="text-center">{t("materials:table.editable")}</TableHead>
              <TableHead className="text-right">{t("materials:table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableBodyContent}
          </TableBody>
        </Table>
      </div>
    </DndContext>
  ) : (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("materials:table.group")}</TableHead>
            <TableHead>{t("materials:table.description")}</TableHead>
            <TableHead className="text-right">{t("materials:table.quantity")}</TableHead>
            <TableHead>{t("materials:table.unit")}</TableHead>
            <TableHead className="text-right">{t("materials:table.pricePerUnit")}</TableHead>
            <TableHead className="text-right">{t("materials:table.total")}</TableHead>
            <TableHead className="text-right">{t("materials:table.factor")}</TableHead>
            <TableHead className="text-center">{t("materials:table.tgfaApplicable")}</TableHead>
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

  return content;
}
