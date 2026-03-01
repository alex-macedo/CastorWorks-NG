import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import { useTemplateApplication } from '@/hooks/useTemplateApplication';
import { BudgetTemplateList } from './BudgetTemplateList';
import type { BudgetTemplate } from '@/hooks/useBudgetTemplates';

interface TemplateApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  companyId: string;
  onApplied?: () => void;
  hasExistingItems?: boolean;
}

export function TemplateApplicationDialog({
  open,
  onOpenChange,
  projectId,
  companyId,
  onApplied,
  hasExistingItems = false,
}: TemplateApplicationDialogProps) {
  const { t, currency } = useLocalization();
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [merge, setMerge] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const { applyTemplate, getTemplatePreview } = useTemplateApplication();

  const handleSelectTemplate = async (template: BudgetTemplate) => {
    setSelectedTemplate(template);
    setStep('confirm');
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    setIsApplying(true);
    try {
      await applyTemplate({
        templateId: selectedTemplate.id,
        projectId,
        merge,
      });

      onApplied?.();
      onOpenChange(false);
      setStep('select');
      setSelectedTemplate(null);
      setMerge(false);
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('templates.selectTemplate', 'Select Budget Template')}</DialogTitle>
              <DialogDescription>
                {t('templates.selectDescription', 'Choose a template to apply to this project')}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <BudgetTemplateList
                companyId={companyId}
                onSelectTemplate={handleSelectTemplate}
                readOnly={true}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('templates.confirmApplication', 'Apply Template')}</DialogTitle>
              <DialogDescription>
                {t('templates.confirmDescription', 'Review and confirm the template application')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Template Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedTemplate?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedTemplate?.description}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {selectedTemplate?.budget_type === 'simple'
                        ? t('templates.type.simple', 'Simple')
                        : t('templates.type.costControl', 'Cost Control')}
                    </Badge>
                    <Badge variant="outline">
                      {formatCurrency(Number(selectedTemplate?.total_budget_amount || 0), currency)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Warning if has existing items */}
              {hasExistingItems && !merge && (
                <Alert className="border-warning bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning-foreground">
                    {t('templates.replaceWarning', 'This will replace all existing budget items')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Merge Option */}
              {hasExistingItems && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="merge"
                        checked={merge}
                        onCheckedChange={(checked) => setMerge(checked as boolean)}
                      />
                      <label
                        htmlFor="merge"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {t('templates.mergeWithExisting', 'Merge with existing budget items instead of replacing')}
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('templates.itemsToApply', 'Items to Apply')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 font-semibold">
                            {t('templates.category', 'Category')}
                          </th>
                          <th className="text-left py-2 px-2 font-semibold">
                            {t('common.description', 'Description')}
                          </th>
                          <th className="text-right py-2 px-2 font-semibold">
                            {t('templates.amount', 'Amount')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTemplate?.items?.map((item, index) => (
                          <tr key={item.id || index} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2 font-medium">{item.category}</td>
                            <td className="py-2 px-2 text-muted-foreground">
                              {item.description || '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-semibold">
                              {formatCurrency(Number(item.budgeted_amount || 0), currency)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold bg-muted/50">
                          <td colSpan={2} className="py-2 px-2 text-right">
                            {t('templates.total', 'Total')}:
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatCurrency(
                              selectedTemplate?.items?.reduce(
                                (sum, item) => sum + Number(item.budgeted_amount || 0),
                                0
                              ) || 0,
                              currency
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack} disabled={isApplying}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={handleApply} disabled={isApplying}>
                {isApplying ? t('common.applying', 'Applying...') : t('templates.apply', 'Apply Template')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
