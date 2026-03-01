import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { calculateGroupTotal, calculateCostPerM2, formatCurrency } from "@/utils/materialsCalculator";
import { TrendingUp, Hammer, Package, FileText } from "lucide-react";
// import { ConstructionUnit, getConstructionUnitSymbol } from "@/constants/constructionUnits";

interface MaterialsSummaryProps {
  materials: any[];
  projectArea: number;
  // constructionUnit?: ConstructionUnit | null;
}

export function MaterialsSummary({ materials, projectArea /* , constructionUnit */ }: MaterialsSummaryProps) {
  const { t, language, currency } = useLocalization();
  const [includeMaterials, setIncludeMaterials] = useState(true);
  // const unitSymbol = getConstructionUnitSymbol(constructionUnit);
  const unitSymbol = 'm²'; // Default to square meters

  const totals = useMemo(() => {
    const labor = materials.filter(m => m.group_name === "Labor");
    const materialItems = materials.filter(m => m.group_name === "Materials");
    const taxes = materials.filter(m => m.group_name === "Taxes");

    const laborTotal = calculateGroupTotal(labor);
    const materialsTotal = calculateGroupTotal(materialItems);
    const taxesTotal = calculateGroupTotal(taxes);
    
    const grandTotal = includeMaterials 
      ? laborTotal + materialsTotal + taxesTotal
      : laborTotal + taxesTotal;

    const costPerM2 = calculateCostPerM2(grandTotal, projectArea);

    return {
      laborTotal,
      materialsTotal,
      taxesTotal,
      grandTotal,
      costPerM2,
    };
  }, [materials, projectArea, includeMaterials]);

  const summaryCards = [
    {
      title: t("materials:summary.laborTotal"),
      value: totals.laborTotal,
      icon: Hammer,
      color: "text-blue-600",
    },
    {
      title: t("materials:summary.materialsTotal"),
      value: totals.materialsTotal,
      icon: Package,
      color: "text-green-600",
    },
    {
      title: t("materials:summary.taxesTotal"),
      value: totals.taxesTotal,
      icon: FileText,
      color: "text-orange-600",
    },
    {
      title: t("materials:summary.grandTotal"),
      value: totals.grandTotal,
      icon: TrendingUp,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(card.value, language, currency)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("materials:summary.costPerM2", { unit: unitSymbol })}</p>
              <p className="text-2xl font-bold">{formatCurrency(totals.costPerM2, language, currency)}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-materials"
                checked={includeMaterials}
                onCheckedChange={setIncludeMaterials}
              />
              <Label htmlFor="include-materials">
                {includeMaterials 
                  ? t("materials:summary.withMaterials")
                  : t("materials:summary.withoutMaterials")}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
