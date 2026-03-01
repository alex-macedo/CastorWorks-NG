import { useState } from "react";
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
import { useSinapiLookup } from "@/hooks/useSinapiLookup";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandLoading,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

import { useLocalization } from "@/contexts/LocalizationContext";
const lineItemSchema = z.object({
  sinapi_code: z.string().min(1, "Código SINAPI obrigatório"),
  description: z.string().min(1, "Descrição obrigatória"),
  unit: z.string().min(1, "Unidade obrigatória"),
  unit_cost_material: z.coerce.number().min(0),
  unit_cost_labor: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0.01, "Quantidade deve ser maior que 0"),
});

type LineItemFormData = z.infer<typeof lineItemSchema>;

interface LineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetId: string;
  onSuccess?: () => void;
}

export function LineItemDialog({
  open,
  onOpenChange,
  budgetId,
  onSuccess,
}: LineItemDialogProps) {
  const { t } = useLocalization();
  const { addLineItem } = useBudgetLineItems(budgetId);
  const [searchTerm, setSearchTerm] = useState("");
  const { results, isLoading } = useSinapiLookup(searchTerm);
  const [openPopover, setOpenPopover] = useState(false);

  const form = useForm<LineItemFormData>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      sinapi_code: "",
      description: "",
      unit: "",
      unit_cost_material: 0,
      unit_cost_labor: 0,
      quantity: 1,
    },
  });

  const unitCostMaterial = useWatch({ control: form.control, name: "unit_cost_material" });
  const unitCostLabor = useWatch({ control: form.control, name: "unit_cost_labor" });
  const quantity = useWatch({ control: form.control, name: "quantity" });

  const onSubmit = (data: LineItemFormData) => {
    addLineItem.mutate(
      {
        budget_id: budgetId,
        sinapi_code: data.sinapi_code,
        description: data.description,
        unit: data.unit,
        unit_cost_material: data.unit_cost_material,
        unit_cost_labor: data.unit_cost_labor,
        quantity: data.quantity,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const handleSelectSinapiItem = (item: any) => {
    form.setValue("sinapi_code", item.sinapi_code);
    form.setValue("description", item.sinapi_description || "");
    form.setValue("unit", item.sinapi_unit || "");
    form.setValue("unit_cost_material", item.sinapi_material_cost || 0);
    form.setValue("unit_cost_labor", item.sinapi_labor_cost || 0);
    setOpenPopover(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('budgets:dialog.addLineItemTitle')}</DialogTitle>
          <DialogDescription>
            {t('budgets:dialog.addLineItemDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* SINAPI Search */}
            <FormField
              control={form.control}
              name="sinapi_code"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('budgets:dialog.searchSinapiLabel')}</FormLabel>
                  <Popover open={openPopover} onOpenChange={setOpenPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="justify-between"
                      >
                        {field.value || t('budgets:dialog.searchPlaceholder')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[550px] p-0">
                      <Command>
                        <CommandInput
                          placeholder={t('budgets:dialog.searchPlaceholder')}
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        {isLoading && <CommandLoading>Carregando...</CommandLoading>}
                        <CommandEmpty>{t('budgets:dialog.noItemsFound')}</CommandEmpty>
                        <CommandGroup>
                          {results.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.sinapi_code}
                              onSelect={() => handleSelectSinapiItem(item)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === item.sinapi_code
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-mono text-sm">
                                  {item.sinapi_code}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {item.sinapi_description}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder={t("additionalPlaceholders.itemDescription")} {...field} />
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
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("additionalPlaceholders.unitExample")}
                      {...field}
                      maxLength={10}
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
                    <FormLabel>Preço Unit. Material (R$)</FormLabel>
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
                    <FormLabel>Preço Unit. M.O. (R$)</FormLabel>
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

            {/* Quantity */}
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade</FormLabel>
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

            {/* Total Preview */}
            {unitCostMaterial &&
              unitCostLabor &&
              quantity && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    Total estimado:{" "}
                    <span className="font-bold">
                      R${" "}
                      {(
                        (unitCostMaterial +
                          unitCostLabor) *
                        quantity
                      ).toFixed(2)}
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
                Cancelar
              </Button>
              <Button type="submit" disabled={addLineItem.isPending}>
                {addLineItem.isPending ? t('budgets:dialog.adding') : t('budgets:dialog.addLineItem')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
