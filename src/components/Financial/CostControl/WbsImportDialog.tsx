import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/DateInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWbsTemplates } from '@/hooks/useWbsTemplates';
import { useWbsToCostControlImport } from '@/hooks/useWbsToCostControlImport';
import { useCostCodes } from '@/hooks/useCostCodes';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Loader2, FileSpreadsheet, Layers, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface WbsImportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (versionId: string) => void;
}

export function WbsImportDialog({ projectId, open, onOpenChange, onSuccess }: WbsImportDialogProps) {
  const { t, language } = useLocalization();
  const { templates, isLoading: templatesLoading } = useWbsTemplates();
  const { data: costCodes, isLoading: costCodesLoading } = useCostCodes(1);
  const importMutation = useWbsToCostControlImport();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [budgetVersionName, setBudgetVersionName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { useTemplateItems } = useWbsTemplates();
  const { data: templateItems } = useTemplateItems(selectedTemplateId || undefined);

  // Calculate preview statistics
  const phaseCount = templateItems?.filter(item => item.item_type === 'phase').length || 0;
  const itemsWithCostCodes = templateItems?.filter(item => item.standard_cost_code).length || 0;
  const uniqueCostCodes = new Set(
    templateItems?.filter(item => item.standard_cost_code).map(item => item.standard_cost_code) || []
  ).size;

  const handleImport = async () => {
    if (!selectedTemplateId || !budgetVersionName) {
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        projectId,
        wbsTemplateId: selectedTemplateId,
        budgetVersionName,
        effectiveDate,
      });

      onSuccess?.(result.versionId);
      onOpenChange(false);
      
      // Reset form
      setSelectedTemplateId('');
      setBudgetVersionName('');
      setEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error('Import failed:', error);
    }
  };

  const isLoading = templatesLoading || costCodesLoading;
  const canImport = selectedTemplateId && budgetVersionName && !importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('costControl.importFromWbs') || 'Import from WBS Template'}
          </DialogTitle>
          <DialogDescription>
            {t('costControl.importFromWbsDescription') || 
              'Create a Cost Control budget from a WBS template. Phases and cost codes will be mapped based on your language preference.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* WBS Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">
              {t('costControl.wbsTemplate') || 'WBS Template'}
            </Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoading}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder={t('costControl.selectWbsTemplate') || 'Select a WBS template'} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                    {template.is_default && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget Version Name */}
          <div className="space-y-2">
            <Label htmlFor="versionName">
              {t('costControl.budgetVersionName') || 'Budget Version Name'}
            </Label>
            <Input
              id="versionName"
              value={budgetVersionName}
              onChange={(e) => setBudgetVersionName(e.target.value)}
              placeholder={t('costControl.enterVersionName') || 'e.g., Initial Budget from WBS'}
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">
              {t('costControl.effectiveDate') || 'Effective Date'}
            </Label>
            <DateInput
              value={effectiveDate}
              onChange={setEffectiveDate}
              placeholder={t('costControl.effectiveDate') || 'Effective Date'}
            />
          </div>

          {/* Preview Section */}
          {selectedTemplateId && templateItems && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                {t('costControl.importPreview') || 'Import Preview'}
              </h4>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">
                    {t('costControl.phases') || 'Phases'}
                  </div>
                  <div className="font-semibold text-lg">{phaseCount}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">
                    {t('costControl.itemsWithCostCodes') || 'Items with Cost Codes'}
                  </div>
                  <div className="font-semibold text-lg">{itemsWithCostCodes}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground">
                    {t('costControl.uniqueCostCodes') || 'Unique Cost Codes'}
                  </div>
                  <div className="font-semibold text-lg">{uniqueCostCodes}</div>
                </div>
              </div>

              {/* Show cost codes in current language */}
              {costCodes && costCodes.length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">
                    {t('costControl.availableCostCodes') || 'Available Cost Codes'} ({language}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {costCodes.map(code => (
                      <div
                        key={code.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background text-xs"
                      >
                        <DollarSign className="h-3 w-3" />
                        <span className="font-mono font-semibold">{code.code}</span>
                        <span className="text-muted-foreground">- {code.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {itemsWithCostCodes === 0 && (
                <div className="text-sm text-amber-600 dark:text-amber-500">
                  ⚠️ {t('costControl.noCostCodesWarning') || 
                    'No WBS items have cost codes assigned. Budget lines will only be created for phases.'}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importMutation.isPending}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
          >
            {importMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('costControl.import') || 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
