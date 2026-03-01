import { useEffect } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { TaxFeeCard } from "./TaxFeeCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface TaxesTabProps {
  projectId: string;
}

const TAX_TYPES = [
  { key: "condominiumApproval", defaultPrice: 500 },
  { key: "habiteseInss", defaultPrice: 1500 },
  { key: "finalInss", defaultPrice: 1200 },
];

export function TaxesTab({ projectId }: TaxesTabProps) {
  const { t } = useLocalization();
  const { materials, createMaterial, updateMaterial, deleteMaterial } = useProjectMaterials(projectId);

  const taxMaterials = materials.filter(m => m.group_name === "Taxes");

  // Initialize tax types if they don't exist
  useEffect(() => {
    if (!projectId || taxMaterials.length > 0) return;

    TAX_TYPES.forEach(({ key, defaultPrice }) => {
      createMaterial.mutate({
        project_id: projectId,
        group_name: "Taxes",
        description: t(`materials.taxes.${key}`),
        unit: "un",
        quantity: 1,
        price_per_unit: defaultPrice,
        freight_percentage: 0,
      });
    });
  }, [projectId, taxMaterials.length, createMaterial, t]);

  const handleAddCustomFee = () => {
    createMaterial.mutate({
      project_id: projectId,
      group_name: "Taxes",
      description: t("materials:taxes.customFee"),
      unit: "un",
      quantity: 1,
      price_per_unit: 0,
      freight_percentage: 0,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddCustomFee} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          {t("materials:taxes.addCustomFee")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {taxMaterials.map((tax) => (
          <TaxFeeCard
            key={tax.id}
            material={tax}
            onUpdate={(updates) => {
              updateMaterial.mutate({ id: tax.id, ...updates });
            }}
            onDelete={() => deleteMaterial.mutate(tax.id)}
          />
        ))}
      </div>
    </div>
  );
}
