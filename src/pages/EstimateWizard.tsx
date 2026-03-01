/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Users, FileText, Edit3 } from 'lucide-react';
import { ProjectInfoStep } from '@/components/Estimates/EstimateWizard/ProjectInfoStep';
import { DescriptionStep } from '@/components/Estimates/EstimateWizard/DescriptionStep';
import { AIProcessingStep } from '@/components/Estimates/EstimateWizard/AIProcessingStep';
import { EstimateLineItemTable, LineItem } from '@/components/Estimates/EstimateLineItemTable';
import { AICacheHeader } from '@/components/AI/AICacheHeader';
import { useEstimateGenerator } from '@/hooks/useEstimateGenerator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';

const STORAGE_KEY = 'estimate_wizard_draft';

const EstimateWizard = () => {
  useRouteTranslations();
  const { t } = useLocalization();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [markupPercentage, setMarkupPercentage] = useState(20);
  const [taxRate, setTaxRate] = useState(0);
  const [estimateMetadata, setEstimateMetadata] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { generateEstimate, refresh, cached, generatedAt, isGenerating, error, reset } = useEstimateGenerator();

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const draftAge = Date.now() - draft.timestamp;

        // Only restore if draft is less than 24 hours old
        if (draftAge < 24 * 60 * 60 * 1000) {
          setCurrentStep(draft.currentStep || 0);
          setProjectInfo(draft.projectInfo || null);
          setDescription(draft.description || '');
          setLineItems(draft.lineItems || []);
          setMarkupPercentage(draft.markupPercentage || 20);
          setTaxRate(draft.taxRate || 0);
          setEstimateMetadata(draft.estimateMetadata || null);

          if (draft.currentStep > 0) {
            toast.info(t('estimates.wizard.draftRestored'), {
              description: t('estimates.wizard.draftRestoredDescription'),
            });
          }
        } else {
          // Clear old draft
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
     
  }, [t]);

  // Save draft to localStorage whenever state changes
  useEffect(() => {
    try {
      const draft = {
        currentStep,
        projectInfo,
        description,
        lineItems,
        markupPercentage,
        taxRate,
        estimateMetadata,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, [currentStep, projectInfo, description, lineItems, markupPercentage, taxRate, estimateMetadata]);

  const steps = [
    { title: t('estimates.wizard.steps.projectInfo'), icon: Users },
    { title: t('estimates.wizard.steps.describe'), icon: FileText },
    { title: t('estimates.wizard.steps.processing'), icon: Calculator },
    { title: t('estimates.wizard.steps.review'), icon: Edit3 },
  ];

  const handleProjectInfoNext = (data: any) => {
    setProjectInfo(data);
    setCurrentStep(1);
  };

  const handleGenerateEstimate = async (desc: string) => {
    setDescription(desc);
    setCurrentStep(2); // Move to processing step

    try {
      const result = await generateEstimate(projectInfo, desc);
      setLineItems(result.lineItems);
      setEstimateMetadata({
        estimatedDurationDays: result.estimatedDurationDays,
        confidenceScore: result.confidenceScore,
        assumptions: result.assumptions,
        recommendations: result.recommendations,
        alternativeOptions: result.alternativeOptions,
      });
      setCurrentStep(3); // Move to review step
    } catch (err) {
      // Error is handled by the hook, stay on processing step to show error
      console.error('Failed to generate estimate:', err);
    }
  };

  const handleRetry = () => {
    reset();
    handleGenerateEstimate(description);
  };

  const handleBack = () => {
    if (currentStep > 0 && currentStep !== 2) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    // Validate line items exist
    if (!lineItems || lineItems.length === 0) {
      toast.error(t('estimates.wizard.cannotSave'), {
        description: t('estimates.wizard.cannotSaveDescription'),
      });
      return;
    }

    setIsSaving(true);
    try {
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const markupAmount = subtotal * (markupPercentage / 100);
      const taxAmount = (subtotal + markupAmount) * (taxRate / 100);
      const total = subtotal + markupAmount + taxAmount;

      const { data, error } = await supabase
        .from('estimates')
        .insert({
          client_id: projectInfo.clientId || null,
          name: `${projectInfo.projectType.replace('_', ' ')} estimate - ${projectInfo.location}`,
          description: description,
          status: 'draft',
          line_items: lineItems,
          subtotal: subtotal,
          tax_rate: taxRate / 100,
          tax_amount: taxAmount,
          markup_percentage: markupPercentage / 100, // Store as decimal for consistency
          total: total,
          ai_generated: true,
          ai_context: {
            projectInfo,
            description,
            metadata: estimateMetadata,
          },
          ai_confidence_score: estimateMetadata?.confidenceScore || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('estimates.wizard.estimateSaved'), {
        description: t('estimates.wizard.estimateSavedDescription'),
      });

      // Clear localStorage draft after successful save
      localStorage.removeItem(STORAGE_KEY);

      // Navigate to estimates list after short delay
      setTimeout(() => {
        navigate('/estimates');
      }, 1500);
    } catch (err) {
      console.error('Save failed:', err);
      toast.error(t('estimates.wizard.saveFailed'), {
        description: err instanceof Error ? err.message : t('estimates.wizard.saveFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <ProjectInfoStep initialData={projectInfo} onNext={handleProjectInfoNext} />;
      case 1:
        return (
          <DescriptionStep
            initialDescription={description}
            onGenerate={handleGenerateEstimate}
            onBack={handleBack}
            isGenerating={isGenerating}
          />
        );
      case 2:
        return (
          <AIProcessingStep
            isProcessing={isGenerating}
            error={error}
            onRetry={handleRetry}
            onCancel={() => setCurrentStep(1)}
          />
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Cache header when estimate exists */}
            {lineItems.length > 0 && (
              <div className="flex justify-end">
                <AICacheHeader
                  lastUpdated={generatedAt}
                  cached={cached}
                  onRefresh={() => refresh(projectInfo, description)}
                  isRefreshing={isGenerating}
                />
              </div>
            )}
            {/* Project Summary */}
            <div className="bg-muted/50 p-4 rounded-lg border">
              <h3 className="font-semibold mb-2">{t('estimates.review.projectSummary')}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('estimates.review.type')}</span>{' '}
                  <span className="font-medium capitalize">
                    {projectInfo?.projectType?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('estimates.review.location')}</span>{' '}
                  <span className="font-medium">{projectInfo?.location}</span>
                </div>
                {projectInfo?.squareFootage && (
                  <div>
                    <span className="text-muted-foreground">{t('estimates.review.size')}</span>{' '}
                    <span className="font-medium">{projectInfo.squareFootage} sq ft</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t('estimates.review.quality')}</span>{' '}
                  <span className="font-medium capitalize">{projectInfo?.qualityLevel}</span>
                </div>
                {estimateMetadata && (
                  <>
                    <div>
                      <span className="text-muted-foreground">{t('estimates.review.duration')}</span>{' '}
                      <span className="font-medium">
                        {estimateMetadata.estimatedDurationDays} {t('estimates.review.days')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('estimates.review.aiConfidence')}</span>{' '}
                      <span className="font-medium">{estimateMetadata.confidenceScore}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* AI Recommendations */}
            {estimateMetadata?.recommendations && estimateMetadata.recommendations.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
                  {t('estimates.review.recommendations')}
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {estimateMetadata.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Line Items Table */}
            <EstimateLineItemTable
              lineItems={lineItems}
              onChange={setLineItems}
              markupPercentage={markupPercentage}
              onMarkupChange={setMarkupPercentage}
              taxRate={taxRate}
              onTaxRateChange={setTaxRate}
            />

            {/* Assumptions */}
            {estimateMetadata?.assumptions && estimateMetadata.assumptions.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg border text-sm">
                <h4 className="font-semibold mb-2">{t('estimates.review.assumptions')}</h4>
                <ul className="text-muted-foreground space-y-1">
                  {estimateMetadata.assumptions.map((assumption: string, idx: number) => (
                    <li key={idx}>• {assumption}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleBack} variant="outline" className="flex-1" size="lg">
                {t('estimates.review.editDescription')}
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="flex-1"
                size="lg"
              >
                {isSaving ? t('estimates.review.saving') : t('estimates.review.saveDraft')}
              </Button>
              <Button variant="default" disabled className="flex-1" size="lg">
                {t('estimates.review.createProposal')}
                <span className="ml-2 text-xs opacity-70">{t('estimates.review.createProposalComingSoon')}</span>
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">{t('estimates.wizard.title')}</h1>
      <p className="text-muted-foreground mb-6">
        {t('estimates.wizard.subtitle')}
      </p>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;

          return (
            <div
              key={step.title}
              className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary scale-110'
                      : isCompleted
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-muted text-muted-foreground border-muted-foreground/20'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-4 bg-border relative top-[-18px]">
                  <div
                    className={`h-full transition-all ${
                      isCompleted ? 'bg-green-500' : 'bg-transparent'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
};

export default EstimateWizard;