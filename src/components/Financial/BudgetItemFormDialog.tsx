import { useState, useEffect } from "react";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useCostCodes } from "@/hooks/useCostCodes";
import { getCostCodeFromCategory } from "@/utils/categoryToCostCodeMap";
import { useCostCodeByCode } from "@/hooks/useCostCodes";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { Database } from "@/integrations/supabase/types";

type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];

interface BudgetItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  item?: BudgetItem;
  onSubmit: (data: {
    category: string;
    description?: string;
    budgeted_amount: number;
    phase_id?: string;
    cost_code_id?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function BudgetItemFormDialog({
  open,
  onOpenChange,
  projectId,
  item,
  onSubmit,
  isSubmitting = false,
}: BudgetItemFormDialogProps) {
  const { t } = useLocalization();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [budgetedAmount, setBudgetedAmount] = useState("");
  const [phaseId, setPhaseId] = useState<string>("");
  const [costCodeId, setCostCodeId] = useState<string>("");

  const { phases } = useProjectPhases(projectId);
  const { data: costCodes = [] } = useCostCodes(1);
  
  // Auto-select cost code based on category
  const suggestedCostCode = getCostCodeFromCategory(category);
  const { data: suggestedCostCodeData } = useCostCodeByCode(suggestedCostCode || '');

  useEffect(() => {
    if (item) {
      setCategory(item.category || "");
      setDescription(item.description || "");
      setBudgetedAmount(item.budgeted_amount?.toString() || "");
      setPhaseId(item.phase_id || "");
      setCostCodeId(item.cost_code_id || "");
    } else {
      setCategory("");
      setDescription("");
      setBudgetedAmount("");
      setPhaseId("");
      setCostCodeId("");
    }
  }, [item, open]);

  // Auto-select cost code when category changes (only if not editing existing item)
  useEffect(() => {
    if (!item && suggestedCostCodeData && !costCodeId && category) {
      setCostCodeId(suggestedCostCodeData.id);
    }
  }, [suggestedCostCodeData, category, costCodeId, item]);

  const handleSave = async () => {
    if (!category || !budgetedAmount) {
      return;
    }

    await onSubmit({
      category,
      description: description || undefined,
      budgeted_amount: parseFloat(budgetedAmount),
      phase_id: phaseId || undefined,
      cost_code_id: costCodeId || undefined,
    });

    onOpenChange(false);
  };

  const isValid = category && budgetedAmount && parseFloat(budgetedAmount) >= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {item
              ? t("budget:budgetItems.editItem")
              : t("budget:budgetItems.addNew")}
          </SheetTitle>
          <SheetDescription>
            {item
              ? t("budget:budgetItems.editDescription")
              : t("budget:budgetItems.createDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="category">{t("budget:budgetItems.category")}</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={t("budget:budgetItems.categoryPlaceholder")}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              {t("budget:budgetItems.categoryHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetedAmount">{t("budget:budgetItems.budgetedAmount")}</Label>
            <Input
              id="budgetedAmount"
              type="number"
              value={budgetedAmount}
              onChange={(e) => setBudgetedAmount(e.target.value)}
              placeholder={t("inputPlaceholders.amount")}
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phase">{t("budget:budgetItems.phase")} (Optional)</Label>
              <Select value={phaseId} onValueChange={setPhaseId} disabled={isSubmitting}>
                <SelectTrigger id="phase">
                  <SelectValue placeholder={t("budget:budgetItems.selectPhase")} />
                </SelectTrigger>
                <SelectContent>
                  {phases?.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("budget:budgetItems.phaseHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCode">{t("budget:budgetItems.costCode")} (Optional)</Label>
              <Select value={costCodeId} onValueChange={setCostCodeId} disabled={isSubmitting}>
                <SelectTrigger id="costCode">
                  <SelectValue placeholder={t("budget:budgetItems.selectCostCode")} />
                </SelectTrigger>
                <SelectContent>
                  {costCodes.map((code) => (
                    <SelectItem key={code.id} value={code.id}>
                      {code.code} - {code.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("budget:budgetItems.costCodeHint")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("budget:budgetItems.description")} (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("budget:budgetItems.descriptionPlaceholder")}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
