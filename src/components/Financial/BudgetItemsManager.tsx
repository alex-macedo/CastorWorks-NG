import { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectBudgetItems } from "@/hooks/useProjectBudgetItems";
import { useCostCodes } from "@/hooks/useCostCodes";
import { formatCurrency } from "@/utils/formatters";
import { BudgetItemFormDialog } from "./BudgetItemFormDialog";
import type { Database } from "@/integrations/supabase/types";

type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];

interface BudgetItemsManagerProps {
  projectId: string;
}

export function BudgetItemsManager({ projectId }: BudgetItemsManagerProps) {
  const { t, currency } = useLocalization();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | undefined>();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    budgetItems,
    isLoading,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
  } = useProjectBudgetItems(projectId);
  
  const { data: costCodes = [] } = useCostCodes(1);
  
  const getCostCodeName = (costCodeId: string | null | undefined) => {
    if (!costCodeId) return null;
    const code = costCodes.find(c => c.id === costCodeId);
    return code ? `${code.code} - ${code.name}` : null;
  };

  const handleAddNew = () => {
    setSelectedItem(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (item: BudgetItem) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: {
    category: string;
    description?: string;
    budgeted_amount: number;
    phase_id?: string;
    cost_code_id?: string;
  }) => {
    if (selectedItem) {
      await updateBudgetItem.mutateAsync({
        id: selectedItem.id,
        ...data,
      });
    } else {
      await createBudgetItem.mutateAsync({
        project_id: projectId,
        ...data,
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBudgetItem.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const totalBudgeted = budgetItems?.reduce(
    (sum, item) => sum + Number(item.budgeted_amount || 0),
    0
  ) || 0;

  const items = budgetItems || [];
  const isSubmitting =
    createBudgetItem.isPending ||
    updateBudgetItem.isPending ||
    deleteBudgetItem.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("budget:budgetItems.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("budget:budgetItems.description")}
          </p>
        </div>
        <Button onClick={handleAddNew} disabled={isLoading || isSubmitting}>
          <Plus className="mr-2 h-4 w-4" />
          {t("budget:budgetItems.addNew")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("budget:budgetItems.allItems")}
          </CardTitle>
          <CardDescription>
            {t("budget:budgetItems.totalBudgeted", {
              amount: formatCurrency(totalBudgeted, currency),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t("budget:budgetItems.noItems")}
              </p>
              <Button onClick={handleAddNew} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {t("budget:budgetItems.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>{t("budget:budgetItems.category")}</TableHead>
                    <TableHead>{t("budget:budgetItems.description")}</TableHead>
                    <TableHead>{t("budget:budgetItems.phase")}</TableHead>
                    <TableHead>{t("budget:budgetItems.costCode")}</TableHead>
                    <TableHead className="text-right">
                      {t("budget:budgetItems.budgetedAmount")}
                    </TableHead>
                    <TableHead className="text-right w-24">
                      {t("common.actions.label")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.category}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.phase_id ? "(Assigned)" : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getCostCodeName(item.cost_code_id) || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(item.budgeted_amount || 0), currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            disabled={isSubmitting}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(item.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetItemFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        projectId={projectId}
        item={selectedItem}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("budget:budgetItems.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("budget:budgetItems.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
