import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectLabor } from "@/hooks/useProjectLabor";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LaborEditState {
  total_value: number;
  percentage: number;
}

export default function ProjectLaborEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, currency, language } = useLocalization();
  const { laborItems, isLoading, updateLabor } = useProjectLabor(id);

  const [editedLabor, setEditedLabor] = useState<Record<string, LaborEditState>>({});
  const [isSaving, setIsSaving] = useState(false);

  const groupedLabor = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const groupOrder: string[] = [];

    (laborItems as any[]).forEach(item => {
      const groupName = item.group || t("materials:laborSection.defaultGroup", { defaultValue: "Labor" });
      if (!groups[groupName]) {
        groups[groupName] = [];
        groupOrder.push(groupName);
      }
      groups[groupName].push(item);
    });

    return groupOrder.map(name => ({ name, items: groups[name] }));
  }, [laborItems, t]);

  const handleValueChange = (laborId: string, field: keyof LaborEditState, value: string) => {
    const numeric = parseFloat(value) || 0;
    setEditedLabor(prev => ({
      ...prev,
      [laborId]: {
        ...prev[laborId],
        [field]: numeric,
      },
    }));
  };

  const getValue = (laborId: string, field: keyof LaborEditState, originalValue: number | null | undefined) => {
    return editedLabor[laborId]?.[field] ?? Number(originalValue || 0);
  };

  const hasChanges = (laborId: string) => editedLabor[laborId] !== undefined;

  const handleSave = async () => {
    if (!id) return;

    if (Object.keys(editedLabor).length === 0) {
      toast.info(t("common.noChanges"));
      return;
    }

    setIsSaving(true);
    try {
      const updates = Object.entries(editedLabor).map(([laborId, values]) => ({
        id: laborId,
        total_value: values.total_value,
        percentage: values.percentage,
      }));

      for (const update of updates) {
        await (updateLabor as any).mutateAsync(update);
      }

      toast.success(t("materials:laborEdit.updateSuccess"));
      setEditedLabor({});
      navigate(`/projects/${id}`);
    } catch (error) {
      console.error("[ProjectLaborEdit] Failed to update labor items:", error);
      toast.error(t("materials:laborEdit.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (Object.keys(editedLabor).length > 0) {
      if (!window.confirm(t("common.unsavedChanges"))) {
        return;
      }
    }
    navigate(`/projects/${id}`);
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
            <h1 className="text-3xl font-bold">{t("materials:laborEdit.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("materials:laborEdit.description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || Object.keys(editedLabor).length === 0}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Labor Table by Group */}
      <div className="space-y-6">
        {groupedLabor.map(group => (
          <Card key={group.name}>
            <CardHeader>
              <CardTitle className="text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[320px]">{t("materials:description")}</TableHead>
                    <TableHead className="w-[160px] text-right">{t("materials:table.percentage")}</TableHead>
                    <TableHead className="w-[200px] text-right">{t("materials:table.totalValue")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map(item => {
                    const percentage = getValue(item.id, "percentage", item.percentage);
                    const totalValue = getValue(item.id, "total_value", item.total_value);
                    const isEditable = item.editable !== false;
                    const isModified = hasChanges(item.id);

                    return (
                      <TableRow key={item.id} className={isModified ? "bg-blue-50 dark:bg-blue-950" : ""}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={percentage}
                            onChange={(e) => handleValueChange(item.id, "percentage", e.target.value)}
                            className="text-right font-mono"
                            disabled={!isEditable}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={Number(totalValue).toFixed(2)}
                            onChange={(e) => handleValueChange(item.id, "total_value", e.target.value)}
                            className="text-right font-mono"
                            disabled={!isEditable}
                          />
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

      {Object.keys(editedLabor).length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("materials:changesCount", { count: Object.keys(editedLabor).length })}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
