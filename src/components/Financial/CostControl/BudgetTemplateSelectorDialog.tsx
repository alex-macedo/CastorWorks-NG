import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useBudgetTemplates } from '@/hooks/useBudgetTemplates';
import { formatDate } from '@/utils/reportFormatters';
import { useCostControlTemplateApplication } from '@/hooks/useCostControlTemplateApplication';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/ui/DateInput';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface BudgetTemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTemplateApplied?: (versionId: string) => void;
}

export function BudgetTemplateSelectorDialog({
  open,
  onOpenChange,
  projectId,
  onTemplateApplied,
}: BudgetTemplateSelectorDialogProps) {
  const { t, currency, dateFormat } = useLocalization();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [versionName, setVersionName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [description, setDescription] = useState('');

  // Get user's company ID (needed for templates)
  const { data: userProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      return data;
    },
  });

  const companyId = userProfile?.company_id;

  const { templates, isLoading: isLoadingTemplates } = useBudgetTemplates(companyId);
  const { applyTemplate, isApplying, getTemplatePreview } = useCostControlTemplateApplication();

  // Filter to only Cost Control templates
  const costControlTemplates = templates?.filter((t) => t.budget_type === 'cost_control') || [];

  // Load preview when template selected
  const [preview, setPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  useEffect(() => {
    if (selectedTemplateId && open) {
      setIsLoadingPreview(true);
      getTemplatePreview(selectedTemplateId)
        .then((previewData) => {
          setPreview(previewData);
           // Auto-fill version name if empty
           if (!versionName) {
             setVersionName(`${previewData.templateName} - ${formatDate(new Date(), dateFormat)}`);
           }
        })
        .catch((error) => {
          console.error('Failed to load preview:', error);
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    } else {
      setPreview(null);
    }
  }, [selectedTemplateId, open, versionName, getTemplatePreview, dateFormat]);

  const handleApply = async () => {
    if (!selectedTemplateId || !versionName || !effectiveDate) {
      return;
    }

    applyTemplate(
      {
        templateId: selectedTemplateId,
        projectId,
        versionName,
        effectiveDate,
        description: description || undefined,
      },
      {
        onSuccess: (result) => {
          onTemplateApplied?.(result.versionId);
          onOpenChange(false);
          // Reset form
          setSelectedTemplateId('');
          setVersionName('');
          setDescription('');
          setEffectiveDate(new Date().toISOString().split('T')[0]);
        },
      }
    );
  };

  const isValid = selectedTemplateId && versionName && effectiveDate && !isApplying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('budget:costControl.createFromTemplate', 'Create Budget from Template')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'budget:costControl.createFromTemplateDesc',
              'Select a Cost Control template to quickly create a budget version with phases and cost codes'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="template">{t('budget:costControl.selectTemplate', 'Template')} *</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={isApplying}>
              <SelectTrigger id="template">
                <SelectValue placeholder={t('budget:costControl.selectTemplatePlaceholder', 'Select a template')} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingTemplates ? (
                  <SelectItem value="loading" disabled>
                    {t('common.loading', 'Loading...')}
                  </SelectItem>
                ) : costControlTemplates.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t('budget:costControl.noTemplates', 'No Cost Control templates available')}
                  </SelectItem>
                ) : (
                  costControlTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.is_public && (
                        <Badge variant="outline" className="ml-2">
                          {t('common.public', 'Public')}
                        </Badge>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">{t('budget:costControl.templatePreview', 'Template Preview')}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('budget:costControl.phases', 'Phases')}:</span>
                  <span className="ml-2 font-medium">{preview.phaseCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('budget:costControl.costCodes', 'Cost Codes')}:</span>
                  <span className="ml-2 font-medium">{preview.costCodeCount}</span>
                </div>
                {preview.totalBudget > 0 && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">{t('budget:overview.totalBudget', 'Total Budget')}:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(preview.totalBudget, currency)}
                    </span>
                  </div>
                )}
              </div>
              {preview.phases && preview.phases.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('budget:costControl.phases', 'Phases')}:</p>
                  <div className="flex flex-wrap gap-1">
                    {preview.phases.map((phase: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {phase}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoadingPreview && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">
                {t('budget:costControl.loadingPreview', 'Loading template preview...')}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="versionName">{t('budget:costControl.versionName', 'Version Name')} *</Label>
            <Input
              id="versionName"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder={t('budget:costControl.versionNamePlaceholder', 'e.g., Q1 2024 Budget')}
              disabled={isApplying}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">{t('budget:costControl.effectiveDate', 'Effective Date')} *</Label>
            <DateInput
              id="effectiveDate"
              value={effectiveDate}
              onChange={(date) => setEffectiveDate(date)}
              disabled={isApplying}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('budget:costControl.description', 'Description')} (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('budget:costControl.descriptionPlaceholder', 'Add notes about this version...')}
              disabled={isApplying}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleApply}
              disabled={!isValid || isApplying}
              className="flex-1"
            >
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('budget:costControl.applying', 'Applying...')}
                </>
              ) : (
                t('budget:costControl.applyTemplate', 'Apply Template')
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="flex-1"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

