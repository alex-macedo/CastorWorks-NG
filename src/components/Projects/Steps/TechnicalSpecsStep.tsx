import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useState } from "react";

interface TechnicalSpecsStepProps {
  control: Control<any>;
}

export const TechnicalSpecsStep = ({ control }: TechnicalSpecsStepProps) => {
  const { t } = useLocalization();
  const [hasDoubleHeight, setHasDoubleHeight] = useState(false);

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="terrain_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>{t('projects:terrainTypeLabel')}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="flat" id="plano" />
                  <Label htmlFor="plano">{t('projects:terrainPlano')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="slope" id="declive" />
                  <Label htmlFor="declive">{t('projects:terrainDeclive')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upslope" id="aclive" />
                  <Label htmlFor="aclive">{t('projects:terrainAclive')}</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="roof_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>{t('projects:roofTypeLabel')}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="colonial" id="colonial" />
                  <Label htmlFor="colonial">{t('projects:roofColonial')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="built-in" id="embutido" />
                  <Label htmlFor="embutido">{t('projects:roofEmbutido')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="waterproofed" id="waterproofed" />
                  <Label htmlFor="waterproofed">{t('projects:roofWaterproofed')}</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="floor_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('projects:floorTypeLabel')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('projects:selectProjectType')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="ground floor">{t('projects:floorTerreo')}</SelectItem>
                <SelectItem value="ground + 1 floor">{t('projects:floor2Pav')}</SelectItem>
                <SelectItem value="ground + 2 floors">{t('projects:floor3Pav')}</SelectItem>
                <SelectItem value="ground + 3 floors">{t('projects:floor4Pav')}</SelectItem>
                <SelectItem value="ground + 4 floors">{t('projects:floor5Pav')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="finishing_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>{t('projects:finishingTypeLabel')}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="simple" id="simple" />
                  <Label htmlFor="simple">{t('projects:finishingSimple')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium">{t('projects:finishingMedio')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high">{t('projects:finishingAlto')}</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="double-height"
            checked={hasDoubleHeight}
            onCheckedChange={(checked) => setHasDoubleHeight(checked as boolean)}
          />
          <Label htmlFor="double-height">{t('projects:doubleHeightCeilingLabel')}</Label>
        </div>
        
        {hasDoubleHeight && (
          <FormField
            control={control}
            name="double_height_ceiling"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder={t('projects:doubleHeightRooms')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="bathrooms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:bathroomsLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="lavabos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('projects:lavabosLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
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
