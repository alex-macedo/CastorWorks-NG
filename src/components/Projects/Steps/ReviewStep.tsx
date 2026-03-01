import { Control, UseFormWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useConfigDropdown } from "@/hooks/useConfigDropdown";
import { formatCPF } from "@/utils/formatters";
import { formatDate } from "@/utils/reportFormatters";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";
// import {
//   getConstructionUnitLabel,
//   getConstructionUnitSymbol,
// } from "@/constants/constructionUnits";

interface ReviewStepProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  onEditStep: (step: number) => void;
}

export const ReviewStep = ({ control, watch, onEditStep }: ReviewStepProps) => {
  const { t } = useLocalization();
  const projectTypeHook = useConfigDropdown('project_type');
  const statusHook = useConfigDropdown('project_status');
  
  const projectTypeOptions = projectTypeHook.values.map(v => ({ value: v.key, label: v.label }));
  const statusOptions = statusHook.values.map(v => ({ value: v.key, label: v.label }));

  const formData = watch();
  const stateObj = BRAZILIAN_STATES.find(s => s.code === formData.state);
  // const unitSymbol = getConstructionUnitSymbol(formData.construction_unit);
  // const unitLabel = getConstructionUnitLabel(t, formData.construction_unit);
  const unitSymbol = 'm²'; // Default to square meters
  const unitLabel = t('projects:constructionUnitSquareMeter') || 'Square Meters';

  const terrainMap: Record<string, string> = {
    flat: t('projects:terrainPlano'),
    slope: t('projects:terrainDeclive'),
    upslope: t('projects:terrainAclive'),
  };

  const roofMap: Record<string, string> = {
    colonial: t('projects:roofColonial'),
    'built-in': t('projects:roofEmbutido'),
    waterproofed: t('projects:roofWaterproofed'),
  };

  const floorMap: Record<string, string> = {
    'ground floor': t('projects:floorTerreo'),
    'ground + 1 floor': t('projects:floor2Pav'),
    'ground + 2 floors': t('projects:floor3Pav'),
    'ground + 3 floors': t('projects:floor4Pav'),
    'ground + 4 floors': t('projects:floor5Pav'),
  };

  const finishingMap: Record<string, string> = {
    simple: t('projects:finishingSimple'),
    medium: t('projects:finishingMedio'),
    high: t('projects:finishingAlto'),
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('projects:stepClientInfo')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(0)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('projects:editSection')}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('projects:projectName')}</p>
            <p className="font-medium">{formData.name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:budgetDateLabel')}</p>
            <p className="font-medium">{formData.budget_date ? formatDate(formData.budget_date) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:clientNameLabel')}</p>
            <p className="font-medium">{formData.client_name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:clientCPFLabel')}</p>
            <p className="font-medium">{formData.client_cpf ? formatCPF(formData.client_cpf) : '-'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">{t('projects:constructionAddressLabel')}</p>
            <p className="font-medium">{formData.construction_address || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:cityLabel')}</p>
            <p className="font-medium">{formData.city || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:stateLabel')}</p>
            <p className="font-medium">{stateObj?.name || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('projects:stepConstructionDetails')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(1)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('projects:editSection')}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('projects:constructionStartDate')}</p>
            <p className="font-medium">{formData.start_date ? formatDate(formData.start_date) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:constructionUnitLabel')}</p>
            <p className="font-medium">{unitLabel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:totalGrossFloorAreaLabel', { unit: unitSymbol })}</p>
            <p className="font-medium">{formData.total_gross_floor_area ? `${formData.total_gross_floor_area} ${unitSymbol}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:coveredAreaLabel', { unit: unitSymbol })}</p>
            <p className="font-medium">{formData.covered_area ? `${formData.covered_area} ${unitSymbol}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:otherAreasLabel', { unit: unitSymbol })}</p>
            <p className="font-medium">{formData.other_areas ? `${formData.other_areas} ${unitSymbol}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:gourmetAreaLabel', { unit: unitSymbol })}</p>
            <p className="font-medium">{formData.gourmet_area ? `${formData.gourmet_area} ${unitSymbol}` : '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('projects:stepTechnicalSpecs')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(2)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('projects:editSection')}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('projects:terrainTypeLabel')}</p>
            <p className="font-medium">{formData.terrain_type ? (terrainMap[formData.terrain_type] || formData.terrain_type) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:roofTypeLabel')}</p>
            <p className="font-medium">{formData.roof_type ? (roofMap[formData.roof_type] || formData.roof_type) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:floorTypeLabel')}</p>
            <p className="font-medium">{formData.floor_type ? (floorMap[formData.floor_type] || formData.floor_type) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:finishingTypeLabel')}</p>
            <p className="font-medium">{formData.finishing_type ? (finishingMap[formData.finishing_type] || formData.finishing_type) : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:doubleHeightCeilingLabel')}</p>
            <p className="font-medium">{formData.double_height_ceiling || t('common.no')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:bathroomsLabel')}</p>
            <p className="font-medium">{formData.bathrooms ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:lavabosLabel')}</p>
            <p className="font-medium">{formData.lavabos ?? '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('projects:stepCostsAndDates')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onEditStep(3)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('projects:editSection')}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('projects:laborCostLabel')}</p>
            <p className="font-medium">{formData.labor_cost ? `${formData.labor_cost}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:materialCostLabel')}</p>
            <p className="font-medium">{formData.material_cost ? `${formData.material_cost}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:taxesLabel')}</p>
            <p className="font-medium">{formData.taxes ? `${formData.taxes}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('projects:totalCostLabel')}</p>
            <p className="font-medium">{formData.total_cost ? `${formData.total_cost}` : '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('projects:basicInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects:projectTypeLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('projects:selectProjectType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projectTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects:projectStatusLabel')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('projects:selectProjectStatus')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
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
            name="manager"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects:projectManagerLabel')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('projects:projectManagerLabel')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="budget_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects:budgetLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t('projects:budgetPlaceholder')}
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('projects:descriptionLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t('projects:descriptionPlaceholder')}
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
