import { useState, useEffect, useRef, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { validateCPF } from "@/utils/formatters";
import { saveDraft, clearDraft } from "@/utils/draftManager";
import { ClientInfoStep } from "./Steps/ClientInfoStep";
import { ConstructionDetailsStep } from "./Steps/ConstructionDetailsStep";
import { TechnicalSpecsStep } from "./Steps/TechnicalSpecsStep";
import { CostAndDatesStep } from "./Steps/CostAndDatesStep";
import { ReviewStep } from "./Steps/ReviewStep";
import { toast } from "@/components/ui/sonner";
import { lookupBrazilCep } from "@/lib/addressLookup";

const projectWizardSchema = z.object({
  name: z.string().min(1, "Campo obrigatório").max(200),
  budget_date: z.string().min(1, "Campo obrigatório"),
  client_name: z.string().min(1, "Campo obrigatório").max(200),
  client_cpf: z.string().min(1, "Campo obrigatório").refine(validateCPF, "CPF inválido"),
  construction_address: z.string().min(1, "Campo obrigatório").max(300),
  street_number: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  zip_code: z.string().max(20).optional(),
  city: z.string().min(1, "Campo obrigatório").max(100),
  state: z.string().min(1, "Campo obrigatório"),
  start_date: z.string().optional(),
  total_area: z.coerce.number().min(1, "A área deve ser maior que 0"),
  total_gross_floor_area: z.coerce.number().min(0).optional(),
  covered_area: z.coerce.number().min(0).optional(),
  other_areas: z.coerce.number().min(0).optional(),
  gourmet_area: z.coerce.number().min(0).optional(),
  create_default_phases: z.boolean().optional(),
  external_area_grass: z.coerce.number().min(0).optional(),
  external_area_paving: z.coerce.number().min(0).optional(),
  // construction_unit: z.enum(['square meter', 'square feet']).default('square meter'),
  terrain_type: z.enum(['flat', 'slope', 'upslope']),
  roof_type: z.enum(['colonial', 'built-in', 'waterproofed']),
  floor_type: z.enum(['ground floor', 'ground + 1 floor', 'ground + 2 floors', 'ground + 3 floors', 'ground + 4 floors']),
  finishing_type: z.enum(['simple', 'medium', 'high']),
  double_height_ceiling: z.string().optional(),
  bathrooms: z.coerce.number().min(0).max(20),
  lavabos: z.coerce.number().min(0).max(10),
  budget_total: z.coerce.number().min(0).optional(),
  manager: z.string().max(200).optional(),
  status: z.string().min(1),
  type: z.string().optional(),
  description: z.string().max(1000).optional(),
  labor_cost: z.coerce.number().min(0).optional(),
  material_cost: z.coerce.number().min(0).optional(),
  taxes: z.coerce.number().min(0).optional(),
  total_cost: z.coerce.number().min(0).optional(),
});

type ProjectWizardFormData = z.infer<typeof projectWizardSchema>;

interface NewProjectWizardProps {
  onSubmit: (data: ProjectWizardFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<ProjectWizardFormData>;
}

export const NewProjectWizard = ({ onSubmit, isLoading, defaultValues }: NewProjectWizardProps) => {
  const { t } = useLocalization();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: t('projects:stepClientInfo'), component: ClientInfoStep },
    { title: t('projects:stepConstructionDetails'), component: ConstructionDetailsStep },
    { title: t('projects:stepTechnicalSpecs'), component: TechnicalSpecsStep },
    { title: t('projects:stepCostsAndDates'), component: CostAndDatesStep },
    { title: t('projects:stepReview'), component: ReviewStep },
  ];

  const form = useForm({
    resolver: zodResolver(projectWizardSchema),
    defaultValues: {
      status: 'planning',
      bathrooms: 0,
      lavabos: 0,
      total_area: 0,
      budget_total: 0,
      // construction_unit: 'square meter',
      ...defaultValues,
    },
    mode: "onChange",
  });
  const zipCode =
    useWatch({ control: form.control, name: "zip_code" }) || "";
  const lastCepLookup = useRef<string | null>(null);

  const applyAddressLookup = useCallback((normalized: any) => {
    const candidates = [
      { name: "construction_address", value: normalized.line1 },
      { name: "neighborhood", value: normalized.district },
      { name: "city", value: normalized.city },
      { name: "state", value: normalized.region },
    ];

    candidates.forEach(({ name, value }) => {
      const state = form.getFieldState(name);
      const current = form.getValues(name);
      if (!state.isTouched && !current) {
        form.setValue(name, value || "", { shouldDirty: true });
      }
    });
  }, [form]);

  const runCepLookup = useCallback(async (cep: string) => {
    const { normalized, error } = await lookupBrazilCep(cep);
    if (error) {
      toast.error(t("projects:addressLookupErrorMessage"));
      return;
    }

    if (!normalized?.quality?.is_valid) {
      return;
    }

    applyAddressLookup(normalized);
  }, [applyAddressLookup, t]);

  useEffect(() => {
    const digits = String(zipCode).replace(/\D/g, "");
    if (digits.length !== 8) {
      return;
    }
    if (lastCepLookup.current === digits) {
      return;
    }
    lastCepLookup.current = digits;
    void runCepLookup(digits);
  }, [zipCode, runCepLookup]);

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!watchedValues) {
      return;
    }
    saveDraft(watchedValues, currentStep);
  }, [watchedValues, currentStep]);

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await form.trigger(fieldsToValidate);
    
    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSaveDraft = () => {
    saveDraft(form.getValues(), currentStep);
    toast.success(t('projects:draftSaved'));
  };

  const handleSubmit = (data: ProjectWizardFormData) => {
    clearDraft();
    onSubmit(data);
  };

  const getFieldsForStep = (step: number): (keyof ProjectWizardFormData)[] => {
    switch (step) {
      case 0:
        return ['name', 'budget_date', 'client_name', 'client_cpf', 'construction_address', 'city', 'state'];
      case 1:
        return [/* 'construction_unit', */ 'total_area'];
      case 2:
        return ['terrain_type', 'roof_type', 'floor_type', 'finishing_type', 'bathrooms', 'lavabos'];
      case 3:
        return []; // Cost & Dates fields are optional
      case 4:
        return ['status'];
      default:
        return [];
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <p className={`mt-2 text-xs text-center max-w-[100px] ${
                  index === currentStep ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {step.title}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-24 h-0.5 mx-2 mb-8 ${
                  index < currentStep ? "bg-primary" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content Card */}
        <div className="border rounded-lg p-8 bg-card shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-2">{steps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground">
              {currentStep === 0 && t('projects:wizardStepClientInfoDescription')}
              {currentStep === 1 && t('projects:wizardStepConstructionDetailsDescription')}
              {currentStep === 2 && t('projects:wizardStepTechnicalSpecsDescription')}
              {currentStep === 3 && t('projects:wizardStepCostAndDatesDescription')}
              {currentStep === 4 && t('projects:wizardStepReviewDescription')}
            </p>
          </div>

          <div className="min-h-[400px]">
            {currentStep === 4 ? (
              <ReviewStep 
                control={form.control} 
                watch={form.watch}
                onEditStep={setCurrentStep}
              />
            ) : (
              <CurrentStepComponent control={form.control} />
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('projects:previous')}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
            >
              <Save className="mr-2 h-4 w-4" />
              {t('projects:saveAsDraft')}
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={handleNext} className="">
                {t('common.nextStep')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isLoading} className="">
                {isLoading ? t('common.loading') : t('projects:createProject')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
};
