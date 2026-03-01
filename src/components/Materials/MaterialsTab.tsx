import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { MaterialsTable } from "./MaterialsTable";
import { MaterialForm } from "./MaterialForm";
import { SinapiSearchModal } from "./SinapiSearchModal";
import { Plus, Search } from "lucide-react";
import MaterialsImportDialog from './MaterialsImportDialog';

interface MaterialsTabProps {
  projectId: string;
}

export function MaterialsTab({ projectId }: MaterialsTabProps) {
  const { t } = useLocalization();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSinapiOpen, setIsSinapiOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { materials, createMaterial, updateMaterial, deleteMaterial } = useProjectMaterials(projectId);
  const materialItems = materials.filter(m => m.group_name === "Materials");

  const handleSave = (data: any) => {
    if (editingMaterial) {
      updateMaterial.mutate({ id: editingMaterial.id, ...data });
    } else {
      createMaterial.mutate({
        ...data,
        project_id: projectId,
        group_name: "Materials",
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

  const handleToggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleAddFromSinapi = (sinapiItem: any) => {
    createMaterial.mutate({
      project_id: projectId,
      group_name: "Materials",
      description: sinapiItem.description,
      unit: sinapiItem.unit,
      price_per_unit: sinapiItem.reference_price,
      quantity: 1,
      sinapi_code: sinapiItem.sinapi_code,
      freight_percentage: 0,
    });
    setIsSinapiOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("materials:form.addMaterial")}
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          Import from Excel
        </Button>
        <Button variant="outline" onClick={() => setIsSinapiOpen(true)}>
          {t("materials:sinapi.search")}
        </Button>
      </div>

      <MaterialsTable
        materials={materialItems}
        onEdit={handleEdit}
        onDelete={handleDelete}
        expandedGroups={expandedGroups}
        onToggleGroup={handleToggleGroup}
      />

      <MaterialForm
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingMaterial(null);
        }}
        material={editingMaterial}
        onSave={handleSave}
      />

      <SinapiSearchModal
        open={isSinapiOpen}
        onOpenChange={setIsSinapiOpen}
        onAddToProject={handleAddFromSinapi}
      />
      <MaterialsImportDialog open={importOpen} onOpenChange={setImportOpen} projectId={projectId} />
    </div>
  );
}
