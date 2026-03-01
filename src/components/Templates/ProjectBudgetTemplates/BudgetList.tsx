import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Trash2,
  Eye,
  Edit,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/utils/formatters";
import { calculateSINGrandTotals } from "@/utils/budgetCalculations";

interface Budget {
  id: string;
  name: string;
  description?: string;
  budget_model: string;
  status: string;
  created_at: string;
  total_direct_cost?: number;
  final_total?: number;
}

interface BudgetListProps {
  projectId: string;
  onEdit?: (budgetId: string) => void;
  onDelete?: () => void;
}

const statusConfig = {
  draft: { label: "draft", color: "bg-gray-500" },
  review: { label: "review", color: "bg-yellow-500" },
  approved: { label: "approved", color: "bg-green-500" },
  archived: { label: "archived", color: "bg-gray-400" },
};

const budgetTypeLabels: Record<string, string> = {
  simple: "simple",
  bdi_brazil: "bdi_brazil",
  cost_control: "cost_control",
};

export function BudgetList({ projectId, onEdit, onDelete }: BudgetListProps) {
  const navigate = useNavigate();
  const { t, dateFormat, currency } = useLocalization();
  const { settings, bdiTotal, isLoading: isLoadingSettings } = useAppSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch budgets with React Query
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["project-budgets", projectId, bdiTotal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_budgets")
        .select(`
          *,
          phase_totals:budget_phase_totals (*),
          line_items:budget_line_items (*)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((budget: any) => {
        // Use aliased keys or fallback to default ones
        const phaseTotals = budget.phase_totals || budget.budget_phase_totals || budget.budgetPhaseTotals || [];
        let lineItems = budget.line_items || budget.budget_line_items || budget.budgetLineItems || [];

        // Sort line items by sort_order (ascending)
        lineItems = lineItems.sort((a: any, b: any) => {
          const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });

        // 1. Calculate from phase totals first (stored values including BDI/LS)
        const phaseTotalSum = phaseTotals.reduce((sum: number, phase: any) => sum + (Number(phase.final_total) || 0), 0);
        
        // 2. Fallback to calculation from individual line items (matching Editor's SIN worksheet)
        let liveTotal = 0;
        if (lineItems.length > 0) {
          const grand = calculateSINGrandTotals(
            lineItems, 
            settings?.bdi_central_admin || 0,
            settings?.bdi_financial_costs || 0
          );
          liveTotal = grand.grandTotal;
        }
        
        return {
          ...budget,
          // Prioritize the live calculation from line items to ensure it matches the Editor's summary cards
          final_total: liveTotal || phaseTotalSum || budget.final_total || 0,
          total_direct_cost: budget.total_direct_cost || (lineItems.length > 0 ? lineItems.reduce((s: number, i: any) => s + (Number(i.total_cost) || 0), 0) : 0)
        };
      }) as Budget[];
    },
    enabled: !!projectId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from("project_budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budgets", projectId] });
      toast({
        title: t("common.success"),
        description: t("budgets:notifications.budgetDeleted"),
      });
      onDelete?.();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("budgets:errors.deletingFailed"),
        variant: "destructive",
      });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      // Get original budget
      const { data: original, error: fetchError } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (fetchError) throw fetchError;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create duplicate
      const { data: duplicate, error: insertError } = await supabase
        .from("project_budgets")
        .insert({
          project_id: original.project_id,
          name: `${original.name} (Copy)`,
          description: original.description,
          budget_model: original.budget_model,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return duplicate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budgets", projectId] });
      toast({
        title: t("common.success"),
        description: t("budgets:notifications.budgetDuplicated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (budgetId: string) => {
    setDeleteId(budgetId);
  };

  const handleViewBudget = (budgetId: string) => {
    navigate(`/projects/${projectId}/budgets/${budgetId}`);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">{t("common.loading")}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground mb-2">
              {t("budgets:list.empty")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("budgets:list.emptyHint")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">{t("budgets:list.columns.name")}</TableHead>
              <TableHead className="w-24">{t("budgets:list.columns.type")}</TableHead>
              <TableHead className="w-32">{t("budgets:list.columns.status")}</TableHead>
              <TableHead className="w-40">{t("budgets:list.columns.createdAt")}</TableHead>
              <TableHead className="text-right w-32">{t("budgets:list.columns.totalCost")}</TableHead>
              <TableHead className="text-right w-32">{t("budgets:list.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => (
              <TableRow key={budget.id}>
                <TableCell className="font-medium w-48">
                  <div>
                    <div className="font-medium">{budget.name}</div>
                    {budget.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {budget.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground w-24">
                  {t(`budgets:types.${budgetTypeLabels[budget.budget_model as keyof typeof budgetTypeLabels] || "simple"}`)}
                </TableCell>
                <TableCell className="w-32">
                  <Badge variant="outline">
                    {t(`budgets:status.${statusConfig[budget.status as keyof typeof statusConfig]?.label || "draft"}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground w-40">
                  {budget.created_at ? formatDate(budget.created_at, dateFormat) : '-'}
                </TableCell>
                <TableCell className="text-right text-sm font-medium w-32">
                  {budget.final_total 
                    ? formatCurrency(budget.final_total, currency)
                    : formatCurrency(0, currency)}
                </TableCell>
                <TableCell className="text-right w-32">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBudget(budget.id)}
                      title={t("budgets:actionLabels.viewBudget")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBudget(budget.id)}
                      title={t("budgets:actionLabels.editBudget")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                      title={t("budgets:actionLabels.deleteBudget")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>
            {t("common.confirmDelete")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("budgets:list.deleteConfirm")}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
