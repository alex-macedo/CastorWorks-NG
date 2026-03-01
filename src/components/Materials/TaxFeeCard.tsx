import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatCurrency, calculateMaterialTotal } from "@/utils/materialsCalculator";
import { Pencil, Check, X, Trash2 } from "lucide-react";

interface TaxFeeCardProps {
  material: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

export function TaxFeeCard({ material, onUpdate, onDelete }: TaxFeeCardProps) {
  const { t, language, currency } = useLocalization();
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(material.quantity);
  const [price, setPrice] = useState(material.price_per_unit);

  const total = calculateMaterialTotal(
    material.quantity,
    material.price_per_unit,
    0
  );

  const handleSave = () => {
    onUpdate({
      quantity,
      price_per_unit: price,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setQuantity(material.quantity);
    setPrice(material.price_per_unit);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{material.description}</CardTitle>
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <Label htmlFor={`quantity-${material.id}`}>
                {t("materials:form.quantity")}
              </Label>
              <Input
                id={`quantity-${material.id}`}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                step="1"
              />
            </div>
            <div>
              <Label htmlFor={`price-${material.id}`}>
                {t("materials:form.pricePerUnit")}
              </Label>
              <Input
                id={`price-${material.id}`}
                type="number"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
              />
            </div>
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
                {t("materials:form.quantity")}:
              </span>
              <span className="font-medium">{material.quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("materials:form.pricePerUnit")}:
              </span>
              <span className="font-medium">
                {formatCurrency(material.price_per_unit, language, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {t("materials:form.total")}:
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
