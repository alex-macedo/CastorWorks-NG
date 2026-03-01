import { UseFormReturn } from 'react-hook-form';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDropdownOptions } from '@/hooks/useDropdownOptions';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectFormData } from '@/schemas/project';

interface ConstructionDetailsFieldsProps {
  form: UseFormReturn<any>;
}

export const ConstructionDetailsFields = ({
  form,
}: ConstructionDetailsFieldsProps) => {
  const { t } = useLocalization();
  
  // Fetch dynamic dropdown options
  const { data: constructionUnitOptions = [] } = useDropdownOptions('construction_unit');
  const { data: terrainTypeOptions = [] } = useDropdownOptions('terrain_type');
  const { data: roofTypeOptions = [] } = useDropdownOptions('roof_type');
  const { data: floorTypeOptions = [] } = useDropdownOptions('floor_type');
  const { data: finishingTypeOptions = [] } = useDropdownOptions('finishing_type');

  return (
    <div className="space-y-4">
      {/* Project Description */}




      {/* Construction Unit, Covered Area, Gourmet Area, Other Areas, Total Gross Floor Area - 5 Column row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <FormField
          control={form.control}
          name="construction_unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:constructionUnitLabel')}</FormLabel>
              <Select value={field.value || 'square meter'} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {constructionUnitOptions.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
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
          control={form.control}
          name="covered_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:coveredAreaLabel', { unit: 'm²' })}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
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
          control={form.control}
          name="gourmet_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:gourmetAreaLabel', { unit: 'm²' })}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
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
          control={form.control}
          name="other_areas"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:otherAreasLabel', { unit: 'm²' })}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
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
          control={form.control}
          name="total_gross_floor_area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:totalGrossFloorAreaLabel', { unit: 'm²' })}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ''}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              </FormControl>
              <FormDescription>{t('projects:calculatedFieldDescription', { fallback: 'This field is calculated automatically' })}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Terrain and roof type in 2 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="terrain_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:terrainTypeLabel')}</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-3">
                  {terrainTypeOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        name="terrain_type"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="roof_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:roofTypeLabel')}</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-3">
                  {roofTypeOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value={option.value}
                        checked={field.value === option.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        name="roof_type"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Floor Type, Bathrooms, Lavatories, Finishing Type - 4 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="floor_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:floorTypeLabel')}</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectFloors')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {floorTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
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
          control={form.control}
          name="bathrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:bathroomsLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
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
          control={form.control}
          name="lavabos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:lavabosLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
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
          control={form.control}
          name="finishing_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:finishingTypeLabel')}</FormLabel>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('projects:selectFinishing')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {finishingTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};