import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLocalization } from "@/contexts/LocalizationContext";

interface CostAndDatesStepProps {
  control: Control<any>;
}

export const CostAndDatesStep = ({ control }: CostAndDatesStepProps) => {
  const { t } = useLocalization();

  return (
    <div className="space-y-4">
      {/* Row: Labor Cost, Material Cost, Taxes, Total Cost on same line */}
      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={control}
          name="labor_cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:laborCostLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("inputPlaceholders.amount")}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="material_cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:materialCostLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("inputPlaceholders.amount")}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="taxes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:taxesLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("inputPlaceholders.amount")}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="total_cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:totalCostLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("inputPlaceholders.amount")}
                  {...field}
                  disabled
                  className="bg-muted cursor-not-allowed"
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
