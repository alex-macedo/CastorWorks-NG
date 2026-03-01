import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { useLocalization } from "@/contexts/LocalizationContext";

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  unit: z.string().min(1, "Unit is required"),
  unit_cost_material: z.coerce.number().min(0),
  unit_cost_labor: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  group_name: z.string().optional(),
});

type LineItemFormData = z.infer<typeof lineItemSchema>;

interface BudgetLineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  item?: any | null;
  itemType?: "material" | "labor"; // Hint for which tab this is for
  onSuccess?: () => void;
}

export function BudgetLineItemDialog({
  open,
  onOpenChange,
  budgetId,
  item,
  itemType,
  onSuccess,
}: BudgetLineItemDialogProps) {
  const { t } = useLocalization();
  const { addLineItem, updateLineItem } = useBudgetLineItems(budgetId);

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      description: "",
      unit: "",
      unit_cost_material: 0,
      unit_cost_labor: 0,
      quantity: 1,
      group_name: "",
    },
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          description: item.description || "",
          unit: item.unit || "",
          unit_cost_material: item.unit_cost_material || 0,
          unit_cost_labor: item.unit_cost_labor || 0,
          quantity: item.quantity || 1,
          group_name: item.group_name || "",
        });
      } else {
        form.reset({
          description: "",
          unit: "",
          unit_cost_material: 0,
          unit_cost_labor: 0,
          quantity: 1,
          group_name: itemType === "material" ? "Materials" : itemType === "labor" ? "Labor" : "",
        });
      }
    }
  }, [open, item, form, itemType]);

  const unitCostMaterial = useWatch({ control: form.control, name: "unit_cost_material" });
  const unitCostLabor = useWatch({ control: form.control, name: "unit_cost_labor" });
  const quantity = useWatch({ control: form.control, name: "quantity" });

  const onSubmit = (data: LineItemFormData) => {
    if (item) {
      // Edit existing item
      updateLineItem.mutate(
        {
          id: item.id,
          description: data.description,
          unit: data.unit,
          unit_cost_material: data.unit_cost_material,
          unit_cost_labor: data.unit_cost_labor,
          quantity: data.quantity,
          group_name: data.group_name || undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    } else {
      // Create new item
      addLineItem.mutate(
        {
          budget_id: budgetId,
          description: data.description,
          unit: data.unit,
          unit_cost_material: data.unit_cost_material,
          unit_cost_labor: data.unit_cost_labor,
          quantity: data.quantity,
          sinapi_code: "", // Empty for simple budgets
          group_name: data.group_name || undefined,
        },
        {
          onSuccess: () => {
            form.reset();
            onOpenChange(false);
            onSuccess?.();
          },
        }
      );
    }
  };

  const isLoading = addLineItem.isPending || updateLineItem.isPending;
  const totalCost = (unitCostMaterial + unitCostLabor) * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {item
              ? t("budgets:lineItems.editItem")
              : t("budgets:lineItems.addItem")}
          </DialogTitle>
          <DialogDescription>
            {item
              ? t("budgets:lineItems.editItemDescription")
              : t("budgets:lineItems.addItemDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("budgets:lineItems.description")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("budgets:lineItems.descriptionPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Name */}
            <FormField
              control={form.control}
              name="group_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("materials:groupName") || "Group Name"}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={itemType === "material" ? "Materials" : itemType === "labor" ? "Labor" : "Group"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit */}
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("budgets:lineItems.unit")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("budgets:lineItems.unitPlaceholder")}
                      {...field}
                      maxLength={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("budgets:lineItems.quantity")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t("inputPlaceholders.amount")}
                      step="0.01"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Costs */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_cost_material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("budgets:lineItems.unitCostMaterial")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("inputPlaceholders.amount")}
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost_labor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("budgets:lineItems.unitCostLabor")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("inputPlaceholders.amount")}
                        step="0.01"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Preview */}
            {(unitCostMaterial || unitCostLabor) && quantity && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {t("budgets:lineItems.estimatedTotal")}:{" "}
                  <span className="font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(totalCost)}
                  </span>
                </p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? item
                    ? t("common.updating")
                    : t("common.creating")
                  : item
                    ? t("common.update")
                    : t("common.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
