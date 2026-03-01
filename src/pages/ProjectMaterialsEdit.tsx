import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProjectMaterialsEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, currency, language } = useLocalization();
  const { materials, isLoading, updateMaterial } = useProjectMaterials(id!);
  
  const [editedMaterials, setEditedMaterials] = useState<Record<string, { quantity: number; price_per_unit: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filter only editable materials
  const editableMaterials = useMemo(() => {
    return materials;
  }, [materials]);

  // Group materials by group_name
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const groupOrder: string[] = [];
    
    editableMaterials.forEach(material => {
      const groupName = material.group_name || "Materials";
      if (!groups[groupName]) {
        groups[groupName] = [];
        groupOrder.push(groupName);
      }
      groups[groupName].push(material);
    });

    // If we want "Custo Total Estimado" at the bottom, we can move it
    const finalOrder = groupOrder.filter(g => g !== "Custo Total Estimado");
    if (groupOrder.includes("Custo Total Estimado")) {
      finalOrder.push("Custo Total Estimado");
    }

    return finalOrder.map(name => ({ name, items: groups[name] }));
  }, [editableMaterials]);

  const handleValueChange = (materialId: string, field: 'quantity' | 'price_per_unit', value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: numValue
      }
    }));
  };

  const getValue = (materialId: string, field: 'quantity' | 'price_per_unit', originalValue: number) => {
    return editedMaterials[materialId]?.[field] ?? originalValue;
  };

  const hasChanges = (materialId: string) => {
    return editedMaterials[materialId] !== undefined;
  };

  const calculateTotal = (quantity: number, pricePerUnit: number) => {
    return quantity * pricePerUnit;
  };

  const handleSave = async () => {
    if (Object.keys(editedMaterials).length === 0) {
      toast.info(t("common.noChanges"));
      return;
    }

    setIsSaving(true);
    try {
      const updates = Object.entries(editedMaterials).map(([id, values]) => ({
        id,
        quantity: values.quantity,
        price_per_unit: values.price_per_unit,
      }));

      for (const update of updates) {
        await updateMaterial.mutateAsync(update);
      }

      toast.success(t("materials:updateSuccess"));
      setEditedMaterials({});
      navigate(`/projects/${id}`);
    } catch (error) {
      toast.error(t("materials:updateError"));
      console.error("Error updating materials:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(editedMaterials).length > 0) {
      if (window.confirm(t("common.unsavedChanges"))) {
        navigate(`/projects/${id}`);
      }
    } else {
      navigate(`/projects/${id}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return Number(value).toLocaleString(language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("materials:editTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("materials:editDescription")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || Object.keys(editedMaterials).length === 0}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Materials Table by Group */}
      <div className="space-y-6">
        {groupedMaterials.map(group => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle className="text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">{t("materials:description")}</TableHead>
                    <TableHead className="w-[100px]">{t("materials:unit")}</TableHead>
                    <TableHead className="w-[150px] text-right">{t("materials:quantity")}</TableHead>
                    <TableHead className="w-[150px] text-right">{t("materials:unitPrice")}</TableHead>
                    <TableHead className="w-[150px] text-right">{t("materials:total")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map(material => {
                    const quantity = getValue(material.id, 'quantity', material.quantity);
                    const pricePerUnit = getValue(material.id, 'price_per_unit', material.price_per_unit);
                    const total = calculateTotal(quantity, pricePerUnit);
                    const isModified = hasChanges(material.id);
                    const isEditable = material.editable !== false;

                    return (
                      <TableRow key={material.id} className={isModified ? "bg-blue-50 dark:bg-blue-950" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{material.description}</div>
                            {material.sinapi_code && (
                              <div className="text-xs text-muted-foreground">
                                SINAPI: {material.sinapi_code}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{material.unit || "-"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => handleValueChange(material.id, 'quantity', e.target.value)}
                            className="text-right font-mono"
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={pricePerUnit}
                            onChange={(e) => handleValueChange(material.id, 'price_per_unit', e.target.value)}
                            className="text-right font-mono"
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(total)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {Object.keys(editedMaterials).length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("materials:changesCount", { count: Object.keys(editedMaterials).length })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
