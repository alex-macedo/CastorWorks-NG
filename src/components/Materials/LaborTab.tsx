import { useEffect } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { LaborTypeCard } from "./LaborTypeCard";
// import { ConstructionUnit, getConstructionUnitSymbol } from "@/constants/constructionUnits";

interface LaborTabProps {
  projectId: string;
  projectArea: number;
  // constructionUnit?: ConstructionUnit | null;
}

const LABOR_TYPES = [
  { key: "mason", defaultPrice: 80 },
  { key: "plumber", defaultPrice: 70 },
  { key: "electrician", defaultPrice: 75 },
  { key: "painter", defaultPrice: 60 },
  { key: "manager", defaultPrice: 50 },
];

export function LaborTab({ projectId, projectArea /* , constructionUnit */ }: LaborTabProps) {
  const { t } = useLocalization();
  const { materials, createMaterial, updateMaterial } = useProjectMaterials(projectId);
  // const unitSymbol = getConstructionUnitSymbol(constructionUnit);
  const unitSymbol = 'm²'; // Default to square meters

  const laborMaterials = materials.filter(m => m.group_name === "Labor");

  // Initialize labor types if they don't exist
  useEffect(() => {
    if (!projectId || laborMaterials.length > 0) return;

    LABOR_TYPES.forEach(({ key, defaultPrice }) => {
      createMaterial.mutate({
        project_id: projectId,
        group_name: "Labor",
        description: t(`materials.labor.types.${key}`),
        unit: unitSymbol,
        quantity: projectArea,
        price_per_unit: defaultPrice,
        freight_percentage: 0,
      });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, laborMaterials.length, projectArea, unitSymbol]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t("materials:labor.totalArea", { unit: unitSymbol })}: {projectArea} {unitSymbol}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LABOR_TYPES.map(({ key }) => {
          const labor = laborMaterials.find(
            m => m.description === t(`materials.labor.types.${key}`)
          );
          
          return (
            <LaborTypeCard
              key={key}
              laborType={key}
              material={labor}
              projectArea={projectArea}
              unitSymbol={unitSymbol}
              onUpdate={(updates) => {
                if (labor) {
                  updateMaterial.mutate({ id: labor.id, ...updates });
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
