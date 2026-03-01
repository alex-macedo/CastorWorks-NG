import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { useProjectLabor } from "@/hooks/useProjectLabor";
import { useSimpleBudgetMaterialsTemplate } from "@/hooks/useSimpleBudgetMaterialsTemplate";
import { useSimpleBudgetLaborTemplate } from "@/hooks/useSimpleBudgetLaborTemplate";
import { MaterialsTable } from "@/components/Materials/MaterialsTable";
import { MaterialForm } from "@/components/Materials/MaterialForm";
import { LaborTable } from "@/components/Materials/LaborTable";
import { LaborForm } from "@/components/Materials/LaborForm";
import { Plus, ChevronsDown, ChevronsUp, Package, Users } from "lucide-react";
import { formatCurrency, groupMaterialsByCategory } from "@/utils/materialsCalculator";
import { PageHeader } from "@/components/Layout/PageHeader";

// Component to show collapsed summary for materials
function MaterialsCollapsedSummary({ materials }: { materials: any[] }) {
  const { t, language, currency } = useLocalization();

  const { grandTotal } = useMemo(() => {
    const groupedMaterials = groupMaterialsByCategory(materials);
    let total = 0;

    Object.entries(groupedMaterials).forEach(([category, items]) => {
      // Skip "Custo Total Estimado" group from calculations
      if (category === "Custo Total Estimado") return;

      const groupTotal = items.reduce((sum: number, material: any) => {
        const materialTotal = material.total || 0;
        return sum + materialTotal;
      }, 0);

      total += groupTotal;
    });

    return { grandTotal: total };
  }, [materials]);

  const custoTotalEstimado = materials.find(m => m.group_name === "Custo Total Estimado");

  return (
    <div className="space-y-2">
      {custoTotalEstimado && (
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <div className="font-bold text-lg mb-2">Custo Total Estimado</div>
          <div className="flex justify-between items-center">
            <span>{custoTotalEstimado.description}</span>
            <span className="font-semibold">
              {formatCurrency(custoTotalEstimado.total || 0, language, currency)}
            </span>
          </div>
        </div>
      )}
      <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg text-green-800 dark:text-green-200">Materials Total</span>
          <span className="font-bold text-lg text-green-800 dark:text-green-200">
            {formatCurrency(grandTotal, language, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Component to show collapsed summary for labor
function LaborCollapsedSummary({ laborItems }: { laborItems: any[] }) {
  const { t, language, currency } = useLocalization();

  const grandTotal = useMemo(() => {
    return laborItems.reduce((total, item) => total + (item.total_value || 0), 0);
  }, [laborItems]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{t("materials:summary.laborTotal")}</span>
        <span className="font-bold text-lg">
          {formatCurrency(grandTotal, language, currency)}
        </span>
      </div>
    </div>
  );
}

export default function MaterialsLabor() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section");
  
  // Treat all-zeros UUID as template view (legacy pattern we're migrating away from)
  const TEMPLATE_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
  const isTemplateView = !id || id === TEMPLATE_PROJECT_ID;
  const projectId = isTemplateView ? undefined : id; // Only set projectId for actual projects
  const { t } = useLocalization();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({}); // Start collapsed
  const [isLaborFormOpen, setIsLaborFormOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<any>(null);
  const [laborExpandedGroups, setLaborExpandedGroups] = useState<Record<string, boolean>>({}); // Start collapsed
  const [isMaterialsSectionVisible, setIsMaterialsSectionVisible] = useState(false); // Start hidden
  const [isLaborSectionVisible, setIsLaborSectionVisible] = useState(false); // Start hidden
  const [materialsGroupOrder, setMaterialsGroupOrder] = useState<string[]>([]);
  const [laborGroupOrder, setLaborGroupOrder] = useState<string[]>([]);

  // Set initial section visibility based on query param
  useEffect(() => {
    if (section === "materials") {
      setIsMaterialsSectionVisible(true);
      setIsLaborSectionVisible(false);
    } else if (section === "labor") {
      setIsLaborSectionVisible(true);
      setIsMaterialsSectionVisible(false);
    }
  }, [section]);

  // Conditional hook usage: template hooks for template view, project hooks for project view
  // Only call project hooks when we have a real project ID (not template view)
  const templateMaterials = useSimpleBudgetMaterialsTemplate();
  const templateLabor = useSimpleBudgetLaborTemplate();
  
  // Clear any cached queries for the template project ID IMMEDIATELY (before hooks run)
  const queryClient = useQueryClient();
  
  // Clear template ID queries synchronously on every render when in template view
  if (isTemplateView) {
    queryClient.removeQueries({ 
      predicate: (query) => {
        const key = query.queryKey;
        if (Array.isArray(key) && key.length >= 2) {
          const tableName = key[0];
          const projectIdInKey = key[1];
          return (tableName === "project-labor" || tableName === "project-materials") && 
                 (projectIdInKey === TEMPLATE_PROJECT_ID || projectIdInKey === "TEMPLATE");
        }
        return false;
      }
    });
  }
  
  // Ensure we never pass template ID to project hooks
  const safeProjectId = isTemplateView || projectId === TEMPLATE_PROJECT_ID ? undefined : projectId;
  
  const projectMaterials = useProjectMaterials(safeProjectId);
  const projectLabor = useProjectLabor(safeProjectId);

  const materials = isTemplateView ? templateMaterials.materials : projectMaterials.materials;
  const laborItems = isTemplateView ? templateLabor.laborItems : projectLabor.laborItems;
  const materialsLoading = isTemplateView ? templateMaterials.isLoading : projectMaterials.isLoading;
  const laborLoading = isTemplateView ? templateLabor.isLoading : projectLabor.isLoading;

  const createMaterial = isTemplateView ? templateMaterials.createMaterial : projectMaterials.createMaterial;
  const updateMaterial = isTemplateView ? templateMaterials.updateMaterial : projectMaterials.updateMaterial;
  const deleteMaterial = isTemplateView ? templateMaterials.deleteMaterial : projectMaterials.deleteMaterial;
  const reorderMaterialsGroups = isTemplateView ? templateMaterials.reorderGroups : projectMaterials.reorderGroups;

  const createLabor = isTemplateView ? templateLabor.createLabor : projectLabor.createLabor;
  const updateLabor = isTemplateView ? templateLabor.updateLabor : projectLabor.updateLabor;
  const deleteLabor = isTemplateView ? templateLabor.deleteLabor : projectLabor.deleteLabor;
  const reorderLaborGroups = isTemplateView ? templateLabor.reorderGroups : projectLabor.reorderGroups;

  // Initialize group order from materials (which come ordered from DB)
  useEffect(() => {
    if (materials.length > 0) {
      const grouped = groupMaterialsByCategory(materials);
      const categories = Object.keys(grouped).filter(
        (cat) => cat !== "Custo Total Estimado"
      );
      // Use the order from Object.keys which reflects the order in the array (because of reduce)
      // Since data is sorted by sort_order in SQL, this order is correct.
      setMaterialsGroupOrder(categories);
    }
  }, [materials]);

  // Initialize group order from labor
  useEffect(() => {
    if (laborItems.length > 0) {
      const grouped = groupMaterialsByCategory(laborItems);
      const categories = Object.keys(grouped);
      setLaborGroupOrder(categories);
    }
  }, [laborItems]);

  // Handle group reordering for materials
  const handleReorderMaterialsGroups = (newOrder: string[]) => {
    setMaterialsGroupOrder(newOrder); // Optimistic update
    reorderMaterialsGroups.mutate(newOrder);
  };

  // Handle group reordering for labor
  const handleReorderLaborGroups = (newOrder: string[]) => {
    setLaborGroupOrder(newOrder); // Optimistic update
    reorderLaborGroups.mutate(newOrder);
  };

  // Check if materials section groups are expanded
  const isMaterialsGroupsExpanded = Object.values(expandedGroups).some(expanded => expanded);
  const isLaborGroupsExpanded = Object.values(laborExpandedGroups).some(expanded => expanded);

  const handleMaterialsExpandGroups = () => {
    const allGroups: Record<string, boolean> = {};
    materials.forEach(material => {
      if (material.group_name) {
        allGroups[material.group_name] = true;
      }
    });
    setExpandedGroups(allGroups);
  };

  const handleMaterialsCollapseGroups = () => {
    setExpandedGroups({});
  };

  const handleLaborExpandGroups = () => {
    const allGroups: Record<string, boolean> = {};
    laborItems.forEach(item => {
      if (item.group) {
        allGroups[item.group] = true;
      }
    });
    setLaborExpandedGroups(allGroups);
  };

  const handleLaborCollapseGroups = () => {
    setLaborExpandedGroups({});
  };

  const handleToggleMaterialsSection = () => {
    setIsMaterialsSectionVisible(!isMaterialsSectionVisible);
  };

  const handleToggleLaborSection = () => {
    setIsLaborSectionVisible(!isLaborSectionVisible);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const toggleLaborGroup = (groupName: string) => {
    setLaborExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleSave = (data: any) => {
    if (editingMaterial) {
      updateMaterial.mutate({ 
        id: editingMaterial.id, 
        ...data,
        project_id: projectId,
      });
    } else {
      createMaterial.mutate({
        ...data,
        project_id: projectId,
        group_name: data.group_name || "Materials",
      });
    }
    setIsFormOpen(false);
    setEditingMaterial(null);
  };

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMaterial.mutate(id);
  };

  const handleLaborSave = (data: any) => {
    if (editingLabor) {
      updateLabor.mutate({
        id: editingLabor.id,
        ...data,
        project_id: projectId,
      });
    } else {
      createLabor.mutate({
        ...data,
        project_id: projectId,
        group: data.group || t("materials:laborSection.defaultGroup", { defaultValue: "Labor" }),
      });
    }
    setIsLaborFormOpen(false);
    setEditingLabor(null);
  };

  const handleLaborEdit = (item: any) => {
    setEditingLabor(item);
    setIsLaborFormOpen(true);
  };

  const handleLaborDelete = (id: string) => {
    deleteLabor.mutate(id);
  };

  const showOnlyMaterials = section === 'materials'
  const showOnlyLabor = section === 'labor'
  const showMaterialsSection = showOnlyMaterials || (!showOnlyLabor && isMaterialsSectionVisible)
  const showLaborSection = showOnlyLabor || (!showOnlyMaterials && isLaborSectionVisible)

  const pageTitle = section === 'materials'
    ? t('materials:materialsTemplateTitle', 'Materials Templates')
    : section === 'labor'
      ? t('materials:laborTemplateTitle', 'Labor Templates')
      : t('materials:title')
  const pageDescription = section === 'materials'
    ? t('materials:materialsTemplateDescription', 'Manage template materials that can be used across projects')
    : section === 'labor'
      ? t('materials:laborTemplateDescription', 'Manage template labor that can be used across projects')
      : isTemplateView
        ? t('materials:templateDescription')
        : t('materials:editDescription')

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {/* Materials card: show when section=materials (only materials) or when no section filter and materials expanded */}
      {!showOnlyLabor && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("materials:sectionTitle")}
            </CardTitle>
            <div className="flex gap-2">
              {!showOnlyMaterials && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleMaterialsSection}
                  className="h-8"
                >
                  {showMaterialsSection ? t("materials:collapseSection") : t("materials:expandSection")}
                </Button>
              )}
              {showMaterialsSection && (
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
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("materials:form.addMaterial")}
              </Button>
            </div>
          </CardHeader>
          {showMaterialsSection ? (
            <CardContent className="p-0">
              <MaterialsTable
                materials={materials}
                onEdit={handleEdit}
                onDelete={handleDelete}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                onReorderGroups={handleReorderMaterialsGroups}
                isReorderable={true}
                groupOrder={materialsGroupOrder}
              />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <MaterialsCollapsedSummary materials={materials} />
            </CardContent>
          )}
        </Card>
      )}

      {/* Labor card: show when section=labor (only labor) or when no section filter and labor visible */}
      {!showOnlyMaterials && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("materials:laborSection.title")}
            </CardTitle>
            <div className="flex gap-2">
              {!showOnlyLabor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLaborSection}
                  className="h-8"
                >
                  {showLaborSection ? t("materials:collapseSection") : t("materials:expandSection")}
                </Button>
              )}
              {showLaborSection && (
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
              <Button onClick={() => setIsLaborFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("materials:laborForm.addItem")}
              </Button>
            </div>
          </CardHeader>
          {showLaborSection ? (
            <CardContent className="p-0">
              <LaborTable
                laborItems={laborItems}
                onEdit={handleLaborEdit}
                onDelete={handleLaborDelete}
                expandedGroups={laborExpandedGroups}
                onToggleGroup={toggleLaborGroup}
                onReorderGroups={handleReorderLaborGroups}
                isReorderable={true}
                groupOrder={laborGroupOrder}
              />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <LaborCollapsedSummary laborItems={laborItems} />
            </CardContent>
          )}
        </Card>
      )}

      <MaterialForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingMaterial(null);
        }}
        material={editingMaterial}
        onSave={handleSave}
      />

      <LaborForm
        open={isLaborFormOpen}
        onOpenChange={(open) => {
          setIsLaborFormOpen(open);
          if (!open) setEditingLabor(null);
        }}
        laborItem={editingLabor}
        onSave={handleLaborSave}
      />
    </div>
  );
}

