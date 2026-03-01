import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency, calculateLaborCost } from "@/utils/materialsCalculator";
import { Pencil, Check, X } from "lucide-react";

interface LaborTypeCardProps {
  laborType: string;
  material?: any;
  projectArea: number;
  onUpdate: (updates: any) => void;
  unitSymbol: string;
}

export function LaborTypeCard({ laborType, material, projectArea, onUpdate, unitSymbol }: LaborTypeCardProps) {
  const { t, language, currency } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);
  const [pricePerM2, setPricePerM2] = useState(material?.price_per_unit || 0);

  const total = calculateLaborCost(material?.price_per_unit || 0, projectArea);

  const handleSave = () => {
    onUpdate({
      price_per_unit: pricePerM2,
      quantity: projectArea,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPricePerM2(material?.price_per_unit || 0);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t(`materials.labor.types.${laborType}`)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor={`price-${laborType}`}>
              {t("materials:labor.pricePerM2", { unit: unitSymbol })}
            </Label>
            <Input
              id={`price-${laborType}`}
              type="number"
              value={pricePerM2}
              onChange={(e) => setPricePerM2(parseFloat(e.target.value) || 0)}
              step="0.01"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("materials:labor.pricePerM2", { unit: unitSymbol })}:
              </span>
              <span className="font-medium">
                {formatCurrency(material?.price_per_unit || 0, language, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("materials:labor.calculatedTotal")}:
              </span>
              <span className="font-bold text-lg">
                {formatCurrency(total, language, currency)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
