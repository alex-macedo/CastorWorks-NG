import { useEffect } from "react";
import { Control, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/DateInput";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useConfigDropdown } from "@/hooks/useConfigDropdown";
// import {
//   CONSTRUCTION_UNIT_OPTIONS,
//   getConstructionUnitLabel,
//   getConstructionUnitSymbol,
// } from "@/constants/constructionUnits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConstructionDetailsStepProps {
  control: Control<any>;
}

export const ConstructionDetailsStep = ({ control }: ConstructionDetailsStepProps) => {
  const { t } = useLocalization();
  const { values: projectTypeOptions } = useConfigDropdown('project_types');
  // const constructionUnit = useWatch({ control, name: "construction_unit" });
  // const unitSymbol = getConstructionUnitSymbol(constructionUnit);
  const unitSymbol = 'm²'; // Default to square meters
  
  // Watch the area fields to calculate total
  const coveredArea = useWatch({ control, name: "covered_area" });
  const gourmetArea = useWatch({ control, name: "gourmet_area" });
  const otherAreas = useWatch({ control, name: "other_areas" });

  // Update total_gross_floor_area when component mounts or area fields change
  useEffect(() => {
    const totalArea = (coveredArea ?? 0) + (gourmetArea ?? 0) + (otherAreas ?? 0);
    // Note: We can't directly set form values from inside a hook without access to form instance
    // This will be handled by the parent form's calculation logic
  }, [coveredArea, gourmetArea, otherAreas]);

  return (
    <div className="space-y-4">
      {/* Construction Unit - Commented out until table is updated
      <FormField
        control={control}
        name="construction_unit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('projects:constructionUnitLabel')}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('projects:constructionUnitLabel')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CONSTRUCTION_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {getConstructionUnitLabel(t, option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      */}

      <FormField
        control={control}
        name="start_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{t('projects:constructionStartDate')}</FormLabel>
            <FormControl>
              <DateInput
                value={field.value || ''}
                onChange={field.onChange}
                placeholder={t('common.selectDate')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('projects:projectTypeLabel')}</FormLabel>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={t('projects:selectProjectType')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-background z-50">
                {projectTypeOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="total_gross_floor_area"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('projects:totalGrossFloorAreaLabel', { unit: unitSymbol })}
            </FormLabel>
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
            <FormDescription>{t('projects:calculatedFieldDescription', { fallback: 'This field is calculated automatically' })}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="covered_area"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('projects:coveredAreaLabel', { unit: unitSymbol })}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder={t("inputPlaceholders.amount")}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="gourmet_area"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('projects:gourmetAreaLabel', { unit: unitSymbol })}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder={t("inputPlaceholders.amount")}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="other_areas"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('projects:otherAreasLabel', { unit: unitSymbol })}
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder={t("inputPlaceholders.amount")}
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
