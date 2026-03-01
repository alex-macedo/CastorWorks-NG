import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Users, DollarSign, Loader2, Download } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';

interface ImportTemplateConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  project: any;
  materialsCount: number;
  laborCount: number;
  totalBudget: number;
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
  budgetType: 'simple' | 'cost_control';
  onBudgetTypeChange: (type: 'simple' | 'cost_control') => void;
  onConfirm: () => void;
  isImporting: boolean;
}

export function ImportTemplateConfirmationDialog({
  open,
  onOpenChange,
  templateName,
  project,
  materialsCount,
  laborCount,
  totalBudget,
  isPublic,
  onIsPublicChange,
  budgetType,
  onBudgetTypeChange,
  onConfirm,
  isImporting,
}: ImportTemplateConfirmationDialogProps) {
  const { t, currency } = useLocalization();
  
  console.log('[ImportTemplateConfirmationDialog] Component rendered with onConfirm:', typeof onConfirm);

  const handleConfirmClick = () => {
    console.log('[ImportTemplateConfirmationDialog] Import button clicked');
    
    if (typeof onConfirm === 'function') {
      console.log('[ImportTemplateConfirmationDialog] Calling onConfirm...');
      onConfirm();
    } else {
      console.error('[ImportTemplateConfirmationDialog] onConfirm is not a function:', onConfirm);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('templates.importConfirmation', 'Import Template from Project')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('templates.templateName', 'Template Name')}</Label>
            <p className="text-lg font-semibold">{templateName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('templates.importFrom', 'Import from project:')}</Label>
            <p className="text-lg font-semibold">{project?.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Materials: {materialsCount}</p>
                <p className="text-2xl font-bold">{materialsCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Labor: {laborCount}</p>
                <p className="text-2xl font-bold">{laborCount}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('templates.totalBudget', 'Total budget:')}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget, currency)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('templates.budgetType', 'Budget Type')}</Label>
              <RadioGroup value={budgetType} onValueChange={(value) => onBudgetTypeChange(value as 'simple' | 'cost_control')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="simple" id="simple" />
                  <Label htmlFor="simple" className="font-normal cursor-pointer">
                    {t('templates.type.simple', 'Simple Budget')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cost_control" id="cost_control" />
                  <Label htmlFor="cost_control" className="font-normal cursor-pointer">
                    {t('templates.type.costControl', 'Cost Control Budget')}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={isPublic}
                onCheckedChange={onIsPublicChange}
              />
              <Label htmlFor="isPublic" className="font-normal cursor-pointer">
                {t('templates.makePublic', 'Make this template public for all team members')}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={isImporting}
            className="min-w-[140px]"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('templates.importing', 'Importing...')}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('templates.import', 'Import')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
