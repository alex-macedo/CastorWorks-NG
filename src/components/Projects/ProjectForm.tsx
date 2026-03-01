
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { MapPin, Upload, X, Info, ChevronLeft, ChevronRight, AlertTriangle, Trash2, Search, Loader2, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateInput } from '@/components/ui/DateInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientCombobox } from '@/components/Clients/ClientCombobox';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useConfigDropdown } from '@/hooks/useConfigDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectManagers } from '@/hooks/useUsers';
import { useDateFormat } from '@/hooks/useDateFormat';
import { lookupBrazilCep } from '@/lib/addressLookup';
import { getStatesByLanguage } from '@/constants/statesByLanguage';
import { saveDraft } from '@/utils/draftManager';
import { formatCPF, unformatCPF } from '@/utils/formatters';
import { formatDate } from '@/utils/reportFormatters';
import { createProjectSchema, type ProjectFormData } from '@/schemas/project';
import { useProjects } from '@/hooks/useProjects';
import { useProjectFinancialsCheck } from '@/hooks/useProjectFinancialsCheck';
import { useBudgetLineItems } from '@/hooks/useBudgetLineItems';

// Shared Form Field Components
import { ClientInfoFields } from './FormFields/ClientInfoFields';
import { BudgetModelFields } from './FormFields/BudgetModelFields';
import { ConstructionDetailsFields } from './FormFields/ConstructionDetailsFields';
import { useProjectActivities } from '@/hooks/useProjectActivities';
import { useAppSettings } from '@/hooks/useAppSettings';
import { calculateSINGrandTotals } from '@/utils/budgetCalculations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void;
  isLoading?: boolean;
  defaultValues?: Partial<ProjectFormData & { created_at?: string; updated_at?: string }>;
  isEditing?: boolean;
  title?: React.ReactNode;
  onCancel?: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, isLoading, defaultValues, isEditing = false, title }) => {
  const { t, dateFormat } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const id = (defaultValues as any)?.id as string | undefined;
  const { deleteProject } = useProjects();
  const {
    activities: projectActivities,
    isLoading: isLoadingActivities,
    autoScheduleActivities,
  } = useProjectActivities(id);
  const { hasFinancials, isLoading: checkingFinancials } = useProjectFinancialsCheck(id);
  const projectStatusDropdown = useConfigDropdown('project_status');
  const projectTypeOptions = [
    { key: 'Project Owned', label: t('projects:projectOwned') },
    { key: 'Project Customer', label: t('projects:projectCustomer') },
  ];
  const { data: projectManagers, isLoading: isLoadingPMs } = useProjectManagers();
  const { settings: appSettings } = useAppSettings();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLookingUpAddress, setIsLookingUpAddress] = useState(false);
  const [initialImageUrl] = useState(defaultValues?.image_url);

  const projectSchemaWithTranslations = createProjectSchema(t, { mode: isEditing ? 'edit' : 'create' });

  const { data: projectBudgets = [] } = useQuery({
    queryKey: ['project-budgets', id, 'latest'],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('project_budgets')
        .select('id, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && isEditing,
  });
  const latestBudgetId = projectBudgets && projectBudgets.length > 0 ? (projectBudgets[0] as { id: string }).id : undefined;
  const { lineItems: budgetLineItems } = useBudgetLineItems(latestBudgetId);
  const budgetFinalTotal = useMemo(() => {
    if (!appSettings) return 0;
    const totals = calculateSINGrandTotals(
      budgetLineItems || [],
      appSettings.bdi_central_admin || 0,
      appSettings.bdi_financial_costs || 0
    );
    return totals.grandTotal || 0;
  }, [appSettings, budgetLineItems]);

  const form = useForm<any>({
    resolver: zodResolver(projectSchemaWithTranslations) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      client_id: defaultValues?.client_id ?? '',
      location: defaultValues?.location ?? '',
      construction_address: defaultValues?.construction_address ?? '',
      street_number: defaultValues?.street_number ?? '',
      neighborhood: defaultValues?.neighborhood ?? '',
      zip_code: defaultValues?.zip_code ?? '',
      address_complement: defaultValues?.address_complement ?? '',
      city: defaultValues?.city ?? '',
      language: defaultValues?.language ?? 'pt-BR',
      state: defaultValues?.state ?? '',
      budget_date: defaultValues?.budget_date ?? '',
      manager_id: defaultValues?.manager_id ?? '',
      type: defaultValues?.type ?? '',
      status: defaultValues?.status ?? 'planning',
      start_date: defaultValues?.start_date ?? '',
      total_duration: defaultValues?.total_duration ?? 0,
      end_date: defaultValues?.end_date ?? '',
      budget_total: defaultValues?.budget_total ?? '',
      total_gross_floor_area: defaultValues?.total_gross_floor_area ?? 0,
      covered_area: defaultValues?.covered_area ?? 0,
      other_areas: defaultValues?.other_areas ?? 0,
      gourmet_area: defaultValues?.gourmet_area ?? 0,
      terrain_type: defaultValues?.terrain_type ?? 'flat',
      roof_type: defaultValues?.roof_type ?? 'colonial',
      floor_type: defaultValues?.floor_type ?? 'ground floor',
      finishing_type: defaultValues?.finishing_type ?? 'simple',
      double_height_ceiling: defaultValues?.double_height_ceiling ?? '',
      bathrooms: defaultValues?.bathrooms ?? 0,
      lavabos: defaultValues?.lavabos ?? 0,
      labor_cost: defaultValues?.labor_cost ?? 0,
      material_cost: defaultValues?.material_cost ?? 0,
      taxes_and_fees: defaultValues?.taxes_and_fees ?? 0,
      total_spent: defaultValues?.total_spent ?? 0,
      description: defaultValues?.description ?? '',
      create_default_phases: defaultValues?.create_default_phases ?? true,
      construction_unit: defaultValues?.construction_unit ?? 'square meter',
      budget_model: defaultValues?.budget_model ?? appSettings?.default_budget_model ?? 'simple',
      budget_has_materials: defaultValues?.budget_has_materials ?? true,
      image_focus_point: defaultValues?.image_focus_point ?? { x: 50, y: 50 },
    },
  });

  const selectedLanguage = useWatch({
    control: form.control,
    name: 'language',
  }) || 'pt-BR';
  const selectedBudgetModel = useWatch({
    control: form.control,
    name: 'budget_model',
  });
  const watchedValues = useWatch({
    control: form.control,
    name: ['start_date', 'covered_area', 'other_areas', 'gourmet_area', 'total_gross_floor_area'],
  });

  const [
    watchedStartDate,
    watchedCoveredArea,
    watchedOtherAreas,
    watchedGourmetArea,
    watchedTotalGrossFloorArea,
  ] = Array.isArray(watchedValues) ? watchedValues : [];
  const zipCode =
    useWatch({ control: form.control, name: 'zip_code' }) || '';
  const focusPoint = useWatch({ control: form.control, name: 'image_focus_point' }) || { x: 50, y: 50 };
  const previousLanguageRef = useRef(selectedLanguage);

  useEffect(() => {
    if (previousLanguageRef.current !== selectedLanguage) {
      form.setValue('state', '');
      previousLanguageRef.current = selectedLanguage;
    }
  }, [form, selectedLanguage]);

  useEffect(() => {
    if (!isEditing || !latestBudgetId) return;
    if (selectedBudgetModel !== 'simple') return;
    const nextValue = Number(budgetFinalTotal || 0);
    const currentValue = Number(form.getValues('budget_total') ?? 0);
    if (currentValue !== nextValue) {
      form.setValue('budget_total', nextValue, { shouldDirty: false, shouldValidate: true });
    }
  }, [budgetFinalTotal, form, isEditing, latestBudgetId, selectedBudgetModel]);

  // Update budget_model if appSettings loads after form initialization for new projects
  useEffect(() => {
    if (!isEditing && appSettings?.default_budget_model && !form.getValues('budget_model')) {
      form.setValue('budget_model', appSettings.default_budget_model);
    }
  }, [appSettings, isEditing, form]);

  const lastCepLookup = useRef<string | null>(null);

  const applyAddressLookup = useCallback((normalized: any) => {
    const candidates = [
      { name: 'construction_address', value: normalized.line1 },
      { name: 'neighborhood', value: normalized.district },
      { name: 'city', value: normalized.city },
      { name: 'state', value: normalized.region },
    ];

    candidates.forEach(({ name, value }) => {
      if (value) {
        form.setValue(name, value, { shouldDirty: true, shouldValidate: true });
      }
    });
  }, [form]);

  // Watch fields for dates calculation
  const startDate = useWatch({ control: form.control, name: 'start_date' });
  const totalDuration = useWatch({ control: form.control, name: 'total_duration' });

  // Auto-calculate end_date from start_date + total_duration
  useEffect(() => {
    const duration = Number(totalDuration);
    if (startDate && duration && duration > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + duration);
      // Check if date is valid before formatting
      if (!isNaN(end.getTime())) {
        try {
          const formattedEndDate = format(end, 'yyyy-MM-dd');
          form.setValue('end_date', formattedEndDate, { shouldValidate: false });
        } catch (e) {
          console.error("Error formatting date", e);
        }
      }
    }
  }, [startDate, totalDuration, form]);

  // Watch fields for area calculation
  const coveredArea = useWatch({ control: form.control, name: 'covered_area' });
  const gourmetArea = useWatch({ control: form.control, name: 'gourmet_area' });
  const otherAreas = useWatch({ control: form.control, name: 'other_areas' });

  // Auto-calculate total_gross_floor_area from covered_area + gourmet_area + other_areas
  useEffect(() => {
    // Cast to number to handle potential string inputs during editing
    const cArea = Number(coveredArea ?? 0);
    const gArea = Number(gourmetArea ?? 0);
    const oArea = Number(otherAreas ?? 0);
    
    const calculatedTotal = cArea + gArea + oArea;
    form.setValue('total_gross_floor_area', calculatedTotal, { shouldValidate: false });
  }, [coveredArea, gourmetArea, otherAreas, form]);

  const runCepLookup = useCallback(async (cep: string) => {
    if (!cep || cep.length < 8) return;
    
    setIsLookingUpAddress(true);
    try {
      const { normalized, error } = await lookupBrazilCep(cep);
      if (error) {
        toast({
          title: t('projects:addressLookupErrorTitle'),
          description: t('projects:addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      const hasAddressData = normalized?.line1 || normalized?.city || normalized?.district;
      
      if (!normalized?.quality?.is_valid && !hasAddressData) {
        toast({
          title: t('projects:addressLookupErrorTitle'),
          description: t('projects:addressLookupErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      applyAddressLookup(normalized);
      
      const foundParts = [
        normalized.city,
        normalized.region,
        normalized.district
      ].filter(Boolean).join(', ');

      toast({
        title: t('projects:addressFoundTitle') || 'Address Found',
        description: t('projects:addressFoundMessage', { city: foundParts }) || `Address data found: ${foundParts}`,
      });
    } finally {
      setIsLookingUpAddress(false);
    }
  }, [applyAddressLookup, t, toast]);

  useEffect(() => {
    const digits = String(zipCode).replace(/\D/g, '');
    if (digits.length !== 8) {
      return;
    }
    if (lastCepLookup.current === digits) {
      return;
    }
    lastCepLookup.current = digits;
    void runCepLookup(digits);
  }, [zipCode, runCepLookup]);

  const normalizeValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const hasProjectDataChanges = isEditing && (
    normalizeValue(watchedStartDate) !== normalizeValue(defaultValues?.start_date) ||
    normalizeValue(watchedCoveredArea) !== normalizeValue(defaultValues?.covered_area) ||
    normalizeValue(watchedOtherAreas) !== normalizeValue(defaultValues?.other_areas) ||
    normalizeValue(watchedGourmetArea) !== normalizeValue(defaultValues?.gourmet_area) ||
    normalizeValue(watchedTotalGrossFloorArea) !== normalizeValue(defaultValues?.total_gross_floor_area)
  );
  const hasActivities = (projectActivities?.length ?? 0) > 0;

  useEffect(() => {
    if (!isEditing || !initialImageUrl) return;
    let isActive = true;

    const loadImagePreview = async () => {
      if (initialImageUrl.startsWith('http')) {
        if (isActive) setImagePreview(initialImageUrl);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from('project-images')
          .createSignedUrl(initialImageUrl, 60 * 60 * 24);
        if (!error && data && isActive) {
          setImagePreview(data.signedUrl);
        }
      } catch (error) {
        console.error('Error loading image preview:', error);
      }
    };

    loadImagePreview();
    return () => { isActive = false; };
  }, [initialImageUrl, isEditing]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return defaultValues?.image_url || null;
    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(filePath, imageFile);
      if (uploadError) throw uploadError;
      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    console.log('[ProjectForm] handleSubmit called with data:', data);
    try {
      console.log('[ProjectForm] Starting image upload...');
      const imageUrl = await uploadImage();
      console.log('[ProjectForm] Image upload complete:', imageUrl);
      const toNum = (val: string | number | null | undefined) => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const n = parseFloat(val.replace(',', '.'));
        return isNaN(n) ? null : n;
      };

      const sanitizedData = {
        ...data,
        image_url: imageUrl,
        construction_address: data.construction_address || null,
        address_complement: data.address_complement || null,
        city: data.city || null,
        language: data.language || null,
        state: data.state || null,
        budget_date: data.budget_date || null,
        location: data.location || null,
        manager_id: data.manager_id || null,
        type: data.type || null,
        start_date: data.start_date || null,
        total_duration: toNum(data.total_duration),
        end_date: data.end_date || null,
        description: data.description || null,
        construction_unit: data.construction_unit || null,
        total_gross_floor_area: toNum(data.total_gross_floor_area),
        covered_area: toNum(data.covered_area),
        other_areas: toNum(data.other_areas),
        gourmet_area: toNum(data.gourmet_area),
        terrain_type: data.terrain_type || null,
        roof_type: data.roof_type || null,
        floor_type: data.floor_type || null,
        finishing_type: data.finishing_type || null,
        double_height_ceiling: data.double_height_ceiling || null,
        bathrooms: toNum(data.bathrooms),
        lavabos: toNum(data.lavabos),
        labor_cost: toNum(data.labor_cost),
        material_cost: toNum(data.material_cost),
        taxes_and_fees: toNum(data.taxes_and_fees),
        total_spent: toNum(data.total_spent),
        budget_total: toNum(data.budget_total),
        budget_model: data.budget_model || 'simple',
        budget_has_materials: data.budget_has_materials ?? true,
        image_focus_point: data.image_focus_point || { x: 50, y: 50 },
      };
      console.log('[ProjectForm] Calling onSubmit with sanitized data:', sanitizedData);
      onSubmit(sanitizedData as any);
    } catch (error) {
      console.error('[ProjectForm] Error in handleSubmit:', error);
    }
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const totalSteps = 3;

  const handleValidationError = (errors: any) => {
    console.log('[ProjectForm] Validation errors:', errors);
    console.log('[ProjectForm] Form values:', form.getValues());
    
    // Map fields to steps
    const step1Fields = ['name', 'client_id', 'construction_address', 'city', 'state', 'language', 'zip_code', 'street_number', 'neighborhood', 'address_complement'];
    const step2Fields = [
      'budget_date',
      'start_date',
      'total_duration',
      'end_date',
      'manager_id',
      'type',
      'status',
      'construction_unit',
      'total_gross_floor_area',
      'covered_area',
      'other_areas',
      'gourmet_area',
      'terrain_type',
      'roof_type',
      'floor_type',
      'finishing_type',
      'paint_type',
      'double_height_ceiling',
      'bathrooms',
      'lavabos',
    ];
    const step3Fields = ['labor_cost', 'material_cost', 'taxes_and_fees', 'total_spent', 'budget_model', 'description', 'budget_total'];
    
    // Find which step has errors
    const errorFields = Object.keys(errors);
    let errorStep = currentStep;
    
    if (errorFields.some(field => step1Fields.includes(field))) {
      errorStep = 1;
    } else if (errorFields.some(field => step2Fields.includes(field))) {
      errorStep = 2;
    } else if (errorFields.some(field => step3Fields.includes(field))) {
      errorStep = 3;
    }
    
    // Navigate to the step with errors
    if (errorStep !== currentStep) {
      setCurrentStep(errorStep);
    }
    
    // Show toast with error details
    const errorMessages = errorFields.map(field => {
      const error = errors[field];
      return error?.message || `${field}: Invalid value`;
    });
    
    const firstErrors = errorMessages.slice(0, 3);
    const remainingCount = errorMessages.length - 3;
    
    toast({
      title: t('projects:errors.validationError'),
      description: (
        <div className="space-y-2">
          {firstErrors.map((msg, idx) => (
            <div key={idx} className="text-sm"> • {msg}</div>
          ))}
          {remainingCount > 0 && (
            <div className="text-sm text-muted-foreground">
              ...and {remainingCount} more {remainingCount === 1 ? 'error' : 'errors'}
            </div>
          )}
        </div>
      ),
      variant: 'destructive',
    });
  };

  const handleRecalculatePhases = async () => {
    if (!id) {
      toast({
        title: t('projects:errors.validationError'),
        description: t('projects:recalculateMissingProject'),
        variant: 'destructive',
      });
      return;
    }

    if (isLoadingActivities) {
      toast({
        title: t('projects:recalculateMissingActivitiesTitle'),
        description: t('projects:recalculateMissingActivitiesMessage'),
        variant: 'destructive',
      });
      return;
    }

    if (!projectActivities || projectActivities.length === 0) {
      toast({
        title: t('projects:recalculateMissingActivitiesTitle'),
        description: t('projects:recalculateMissingActivitiesMessage'),
        variant: 'destructive',
      });
      return;
    }

    const nextStartDateValue = watchedStartDate || defaultValues?.start_date;
    if (!nextStartDateValue) {
      toast({
        title: t('projects:errors.validationError'),
        description: t('projects:recalculateInvalidStartDate'),
        variant: 'destructive',
      });
      return;
    }

    const nextStartDate = new Date(nextStartDateValue);
    if (Number.isNaN(nextStartDate.getTime())) {
      toast({
        title: t('projects:errors.validationError'),
        description: t('projects:recalculateInvalidStartDate'),
        variant: 'destructive',
      });
      return;
    }

    setIsRecalculating(true);
    toast({
      title: t('projects:recalculateNoticeTitle'),
      description: t('projects:recalculateNoticeMessage'),
    });
    try {
      const { error: projectUpdateError } = await (supabase
        .from('projects') as any)
        .update({ start_date: nextStartDateValue })
        .eq('id', id);

      if (projectUpdateError) {
        toast({
          title: t('projects:recalculateErrorTitle'),
          description: projectUpdateError.message || t('projects:recalculateErrorMessage'),
          variant: 'destructive',
        });
        return;
      }

      try {
        // Check if TGFA changed to determine rescheduling strategy
        const tgfaChanged = normalizeValue(watchedTotalGrossFloorArea) !== normalizeValue(defaultValues?.total_gross_floor_area);
        const startDateChanged = normalizeValue(watchedStartDate) !== normalizeValue(defaultValues?.start_date);

        const rescheduledActivities = await autoScheduleActivities.mutateAsync({
          startDate: nextStartDate,
          area: tgfaChanged ? watchedTotalGrossFloorArea : undefined,
          shiftByDelta: !tgfaChanged && startDateChanged, // Only shift dates if TGFA didn't change
          currentStartDate: startDateChanged ? defaultValues?.start_date ?? null : undefined,
        });

        const latestEndDate = (rescheduledActivities || [])
          .map(activity => activity.end_date)
          .filter((value): value is string => Boolean(value))
          .map(dateString => new Date(dateString))
          .filter(dateValue => !Number.isNaN(dateValue.getTime()))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (latestEndDate) {
          const formattedEndDate = latestEndDate.toISOString().split('T')[0];
          const { error: endDateError } = await (supabase
            .from('projects') as any)
            .update({ end_date: formattedEndDate })
            .eq('id', id);

          if (endDateError) {
            toast({
              title: t('projects:recalculateErrorTitle'),
              description: endDateError.message || t('projects:recalculateErrorMessage'),
              variant: 'destructive',
            });
            return;
          }

          form.setValue('end_date', formattedEndDate, { shouldDirty: true });
        }
      } catch {
        return;
      }

      const { data: phases, error } = await supabase
        .from('project_phases')
        .select('id')
        .eq('project_id', id);

      if (error) throw error;
      if (!phases || phases.length === 0) {
        toast({
          title: t('projects:recalculateNoPhasesTitle'),
          description: t('projects:recalculateNoPhasesMessage'),
          variant: 'destructive',
        });
        return;
      }

       await Promise.all(
         phases.map((phase: any) =>
           (supabase as any).rpc('recalculate_phase_metrics', { p_phase_id: phase.id })
         )
       );

      queryClient.invalidateQueries({ queryKey: ['project-activities', id] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', id] });
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: t('projects:recalculateSuccessTitle'),
        description: t('projects:recalculateSuccessMessage'),
      });
    } catch (recalcError: any) {
      console.error('Failed to recalculate phases:', recalcError);
      toast({
        title: t('projects:recalculateErrorTitle'),
        description: recalcError?.message || t('projects:recalculateErrorMessage'),
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // Step navigation handlers
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step progress component
  const StepProgress = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`flex items-center ${step < 3 ? 'flex-1' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{t('projects:stepClientInfo')}</span>
        <span>{t('projects:stepConstructionDetails')}</span>
        <span>{t('projects:tabUploadReview')}</span>
      </div>
    </div>
  );

  const formatZipCode = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  };

  const unformatZipCode = (value: string) => value.replace(/\D/g, '').slice(0, 8);

  const RequiredMark = () => (
    <span className="text-destructive ml-1" aria-hidden="true">*</span>
  );

  const LabelWithRequired = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <FormLabel className="inline-flex items-center">
      {children}
      {required ? <RequiredMark /> : null}
    </FormLabel>
  );

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          console.log('[ProjectForm] Form onSubmit event triggered');
          console.log('[ProjectForm] Current form state:', form.formState);
          form.handleSubmit(handleSubmit, handleValidationError)(e);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          const target = e.target as HTMLElement | null;
          const isTextarea = target?.tagName === 'TEXTAREA';
          const isButton = target?.tagName === 'BUTTON';
          if (!isEditing && currentStep < totalSteps && !isTextarea && !isButton) {
            e.preventDefault();
            goToNextStep();
          }
        }}
        className="w-full mx-auto"
        noValidate
      >
        {!isEditing ? (
          // Step-by-step wizard for new projects
          <div className="space-y-4 pb-24 max-w-[70rem] mx-auto">
            {/* Step Content */}
            {/* Wizard Steps */}
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{title}</h2>
              </div>
            )}

            {/* Step Progress */}
            <StepProgress />

            {currentStep === 1 && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold mb-0">{t('projects:stepClientInfo')}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">{t('projects:stepClientInfoDescription')}</p>
                </div>

                 <ClientInfoFields
                   form={form}
                   selectedLanguage={selectedLanguage}
                   isLookingUpAddress={isLookingUpAddress}
                   runCepLookup={runCepLookup}
                  />
                </div>
              )}

            {currentStep === 2 && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold mb-0">{t('projects:stepConstructionDetails')}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">{t('projects:stepConstructionDetailsDescription')}</p>
                </div>
                <BudgetModelFields
                  form={form}
                  projectTypeOptions={projectTypeOptions}
                  projectStatusDropdown={projectStatusDropdown}
                />
                <ConstructionDetailsFields form={form} />
              </div>
            )}

             {currentStep === 3 && (
               <div className="space-y-3">
                 <div>
                   <h2 className="text-lg font-semibold text-gray-900 mb-0">
                      {t('projects:stepUploadReview')}
                    </h2>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {t('projects:stepUploadReviewDescription')}
                    </p>
                 </div>
                  <div className="space-y-4">


                    <FormField
                      control={form.control}
                      name="budget_model"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>{t('projects:budgetModelLabel')}</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div
                                className={cn(
                                  "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                  field.value === 'simple' ? "border-primary" : "border-muted"
                                )}
                                onClick={() => field.onChange('simple')}
                              >
                                <div className="flex items-center gap-3 w-full self-start mb-2">
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                    field.value === 'simple' ? "bg-primary" : "bg-transparent"
                                  )}>
                                    {field.value === 'simple' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="font-semibold">{t('projects:budgetTypeSimple')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground w-full text-left">
                                  {t('projects:budgetModelSimpleDescription') || 'Granular cost tracking with materials and labor breakdown.'}
                                </p>
                              </div>

                              <div
                                className={cn(
                                  "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                  field.value === 'bdi_brazil' ? "border-primary" : "border-muted"
                                )}
                                onClick={() => field.onChange('bdi_brazil')}
                              >
                                <div className="flex items-center gap-3 w-full self-start mb-2">
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                    field.value === 'bdi_brazil' ? "bg-primary" : "bg-transparent"
                                  )}>
                                    {field.value === 'bdi_brazil' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="font-semibold">{t('projects:budgetTypeBDIBrazil')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground w-full text-left">
                                  {t('projects:budgetModelBDIBrazilDescription') || 'Brazilian construction standard with BDI (Business Difficulty Index) calculations.'}
                                </p>
                              </div>

                              <div
                                className={cn(
                                  "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                  field.value === 'cost_control' ? "border-primary" : "border-muted"
                                )}
                                onClick={() => field.onChange('cost_control')}
                              >
                                <div className="flex items-center gap-3 w-full self-start mb-2">
                                  <div className={cn(
                                    "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                    field.value === 'cost_control' ? "bg-primary" : "bg-transparent"
                                  )}>
                                    {field.value === 'cost_control' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="font-semibold">{t('projects:budgetTypeCostControl')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground w-full text-left">
                                  {t('projects:budgetModelCostControlDescription') || 'Standard fixed budget tracking per phase with committed vs actuals.'}
                                </p>
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="budget_total"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithRequired required={selectedBudgetModel === 'cost_control'}>
                            {t('projects:totalBudget')}
                          </LabelWithRequired>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t('inputPlaceholders.amount')}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedBudgetModel === 'simple' && (
                      <FormField
                        control={form.control}
                        name="budget_has_materials"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('projects:materialsInBudget')}</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value ? 'with' : 'without'}
                                onValueChange={(value) => field.onChange(value === 'with')}
                                className="flex flex-wrap gap-6"
                              >
                                <label className="flex items-center gap-2 text-sm">
                                  <RadioGroupItem value="with" />
                                  {t('projects:budgetWithMaterials')}
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                  <RadioGroupItem value="without" />
                                  {t('projects:budgetWithoutMaterials')}
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     )}

                    <FormField
                      control={form.control}
                      name="budget_total"
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithRequired required={selectedBudgetModel === 'cost_control'}>
                            {t('projects:totalBudget')}
                          </LabelWithRequired>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder={t('projects:budgetPlaceholder')}
                              disabled={selectedBudgetModel !== 'cost_control'}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          {selectedBudgetModel !== 'cost_control' ? (
                            <FormDescription>{t('projects:autoCalculated')}</FormDescription>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects:descriptionLabel')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('projects:descriptionPlaceholder')}
                              className="min-h-24"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                 <div>
                   <h3 className="text-sm font-semibold mb-2">
                     {t('projects:projectImage')}
                   </h3>
                   <div className="border-2 border-dashed rounded-lg p-3 min-h-[200px] flex items-center justify-center">
                     {imagePreview ? (
                       <div className="relative w-full">
                         <img
                           src={imagePreview}
                           alt={t("images.projectPreview")}
                           className="w-full h-48 object-cover rounded-lg"
                         />
                         <Button
                           type="button"
                           variant="destructive"
                           size="sm"
                           className="absolute top-2 right-2"
                           onClick={() => {
                             setImageFile(null);
                             if (!isEditing) {
                               setImagePreview(null);
                             } else if (initialImageUrl) {
                               if (initialImageUrl.startsWith('http')) {
                                 setImagePreview(initialImageUrl);
                               } else {
                                 supabase.storage
                                   .from('project-images')
                                   .createSignedUrl(initialImageUrl, 60 * 60 * 24)
                                   .then(({ data }) => {
                                     if (data) setImagePreview(data.signedUrl);
                                   });
                               }
                             }
                           }}
                         >
                           <X className="h-4 w-4" />
                         </Button>
                         {isEditing && !imageFile && (
                           <label
                             htmlFor="project-image-upload"
                             className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-primary/90"
                           >
                             {t('projects:changeProjectImage')}
                             <input
                               id="project-image-upload"
                               type="file"
                               accept="image/*"
                               className="hidden"
                               onChange={handleImageChange}
                             />
                           </label>
                         )}
                       </div>
                     ) : (
                       <label htmlFor="project-image-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                         <Upload className="h-8 w-8 text-muted-foreground" />
                         <span className="text-sm text-muted-foreground text-center">
                           {isEditing ? t('projects:uploadNewProjectImage') : t('projects:uploadProjectImage')}
                         </span>
                         {imageFile && (
                           <span className="text-xs text-primary">
                             {imageFile.name}
                           </span>
                          )}
                          <input
                            id="project-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                     </div>
                   </div>
               </div>
                )}
            <div className="sticky bottom-0 border-t bg-background/95 py-4 backdrop-blur z-10">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPrevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 h-10"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.back')}
                </Button>
                {currentStep < totalSteps && (
                  <Button
                    type="button"
                    onClick={goToNextStep}
                    className="flex items-center gap-2 h-10"
                  >
                    {currentStep === 1 ? t('common.next') : t('common.nextStep')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    saveDraft(form.getValues(), 0);
                    toast({ title: t('projects:draftSaved') });
                  }}
                  className="h-10"
                >
                  {t('projects:saveAsDraft')}
                </Button>
                {currentStep === totalSteps && (
                  <Button
                    type="submit"
                    disabled={isLoading || uploading}
                    className="h-10"
                  >
                    {uploading
                      ? t('common.uploading')
                      : isLoading
                        ? t('common.saving')
                        : t('projects:createProject')
                    }
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Tabbed interface for editing existing projects
          <div className="space-y-4 pb-24 max-w-[70rem] mx-auto">
             <div className="flex items-center justify-between mb-4">
                {title && <h2 className="text-xl font-semibold flex-shrink-0">{title}</h2>}
            </div>
             <Tabs defaultValue="client-info" variant="pill" className="w-full">
               <TabsList className="grid w-full grid-cols-3">
                 <TabsTrigger value="client-info">{t('projects:stepClientInfo')}</TabsTrigger>
                 <TabsTrigger value="construction">{t('projects:stepConstructionDetails')}</TabsTrigger>
                  <TabsTrigger value="project-budget">{t('projects:tabUploadReview')}</TabsTrigger>
               </TabsList>



               <TabsContent value="client-info" className="space-y-4">
                 <div className="space-y-4">
                   {/* Project Name, Client & CPF - 3 Column Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <LabelWithRequired required>{t('projects:projectNameLabel')}</LabelWithRequired>
                            <FormControl>
                              <Input placeholder={t('projects:projectNamePlaceholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="client_id"
                        render={({ field }) => (
                          <FormItem>
                            <LabelWithRequired required>{t('projects:clientLabel')}</LabelWithRequired>
                            <FormControl>
                              <ClientCombobox
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                placeholder={t('projects:clientPlaceholder')}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                  <div className="rounded-lg border bg-muted/30 p-2 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{t('projects:projectAddress')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-3">
                        <FormField
                          control={form.control}
                          name="zip_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('projects:zipCodeLabel')}</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder={t('projects:zipCodePlaceholder')}
                                    value={field.value ? formatZipCode(String(field.value)) : ''}
                                    onChange={(e) => field.onChange(unformatZipCode(e.target.value))}
                                    className="flex-1"
                                    inputMode="numeric"
                                    maxLength={9}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="shrink-0 flex gap-2"
                                    onClick={() => runCepLookup(unformatZipCode(field.value || ''))}
                                    disabled={isLookingUpAddress || !field.value || unformatZipCode(field.value).length < 8}
                                  >
                                    {isLookingUpAddress ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">{t('projects:lookupAddress')}</span>
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>{t('projects:zipCodeHelp')}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-5">
                        <FormField
                          control={form.control}
                          name="construction_address"
                          render={({ field }) => (
                            <FormItem>
                              <LabelWithRequired required>{t('projects:constructionAddressLabel')}</LabelWithRequired>
                              <FormControl>
                                <Input
                                  placeholder={t('projects:constructionAddressPlaceholder')}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="street_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('projects:streetNumberLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('projects:streetNumberPlaceholder')}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <FormField
                          control={form.control}
                          name="address_complement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('projects:addressComplementLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('projects:addressComplementPlaceholder')}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('projects:neighborhoodLabel')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('projects:neighborhoodPlaceholder')}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <LabelWithRequired required>{t('projects:cityLabel')}</LabelWithRequired>
                              <FormControl>
                                <Input
                                  placeholder={t('projects:cityLabel')}
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="md:col-span-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <LabelWithRequired required>{t('projects:stateLabel')}</LabelWithRequired>
                              <Select value={field.value || ''} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('projects:selectState')} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {getStatesByLanguage(selectedLanguage).map((state) => (
                                    <SelectItem key={state.code} value={state.code}>
                                      {state.name}
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
                  </div>
                 </div>
              </TabsContent>

                <TabsContent value="construction" className="space-y-4">
                  <div className="space-y-4">
                    {/* Project Description - Moved from project-budget tab */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects:descriptionLabel')}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t('projects:descriptionPlaceholder')}
                              className="min-h-24"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Project Type & Status & Manager */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                       control={form.control}
                       name="type"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:projectTypeLabel')}</FormLabel>
                           <Select value={field.value || ''} onValueChange={field.onChange}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder={t('projects:selectProjectType')} />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               {projectTypeOptions.map((v) => (
                                 <SelectItem key={v.key} value={v.key}>
                                   {v.label}
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
                       name="status"
                       render={({ field }) => (
                         <FormItem>
                           <LabelWithRequired required>{t('projects:projectStatusLabel')}</LabelWithRequired>
                           <Select value={field.value} onValueChange={field.onChange}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder={t('projects:selectProjectStatus')} />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               {projectStatusDropdown.values.map((v) => (
                                 <SelectItem key={v.key} value={v.key}>
                                   {v.label}
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
                       name="manager_id"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:projectManagerLabel')}</FormLabel>
                           <Select
                             onValueChange={field.onChange}
                             value={field.value || ''}
                             disabled={isLoadingPMs}
                           >
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder={t('projects:selectProjectManager')} />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               {projectManagers?.map((pm) => (
                                 <SelectItem key={pm.id} value={pm.id}>
                                   {pm.display_name}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>

                   {/* Dates */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <FormField
                       control={form.control}
                       name="budget_date"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:budgetDateLabel')}</FormLabel>
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
                       control={form.control}
                       name="start_date"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:startDateLabel')}</FormLabel>
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
                       control={form.control}
                       name="total_duration"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:projectDuration') || 'Project Duration'}</FormLabel>
                           <FormControl>
                             <div className="flex">
                               <Input
                                 type="text"
                                 inputMode="numeric"
                                 placeholder="0"
                                 className="rounded-r-none"
                                 {...field}
                                 value={field.value ?? ''}
                                   onChange={(e) => field.onChange(e.target.value)}
                                 />
                               <div className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r text-sm text-gray-600 flex items-center">
                                 {t('projects:days') || 'days'}
                               </div>
                             </div>
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={form.control}
                       name="end_date"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:endDateLabel')}</FormLabel>
                           <FormControl>
                             <DateInput
                               value={typeof field.value === 'string' ? field.value : ''}
                               onChange={field.onChange}
                               disabled
                             />
                           </FormControl>
                           <FormDescription>{t('projects:endDateCalculated') || 'Automatically calculated'}</FormDescription>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                   </div>

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
                               <SelectItem value="square meter">{t('projects:constructionUnitSquareMeter')}</SelectItem>
                               <SelectItem value="square feet">{t('projects:constructionUnitSquareFeet')}</SelectItem>
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

                  {/* Terrain & Roof Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="terrain_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects:terrainTypeLabel')}</FormLabel>
                          <FormControl>
                            <div className="flex flex-wrap gap-3">
                              {[
                                { value: 'flat', label: t('projects:terrainPlano') },
                                { value: 'slope', label: t('projects:terrainDeclive') },
                                { value: 'upslope', label: t('projects:terrainAclive') },
                              ].map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    value={opt.value}
                                    checked={field.value === opt.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                  {opt.label}
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
                              {[
                                { value: 'colonial', label: t('projects:roofColonial') },
                                { value: 'built-in', label: t('projects:roofEmbutido') },
                                { value: 'waterproofed', label: t('projects:roofWaterproofed') },
                              ].map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="radio"
                                    value={opt.value}
                                    checked={field.value === opt.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Floor Type, Bathrooms, Lavabos, Finishing Type */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="floor_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects:floorTypeLabel')}</FormLabel>
                          <FormControl>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder={t('projects:selectFloors')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ground floor">{t('projects:floorTerreo')}</SelectItem>
                                <SelectItem value="ground + 1 floor">{t('projects:floor2Pav')}</SelectItem>
                                <SelectItem value="ground + 2 floors">{t('projects:floor3Pav')}</SelectItem>
                                <SelectItem value="ground + 3 floors">{t('projects:floor4Pav')}</SelectItem>
                                <SelectItem value="ground + 4 floors">{t('projects:floor5Pav')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
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
                              <SelectItem value="simple">{t('projects:finishingSimple')}</SelectItem>
                              <SelectItem value="medium">{t('projects:finishingMedium')}</SelectItem>
                              <SelectItem value="high">{t('projects:finishingHigh')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>



               <TabsContent value="project-budget" className="space-y-4">
                <div className="space-y-4">
                  {/* Costs Row - Now includes Total Budget */}
                  <FormField
                    control={form.control}
                    name="budget_total"
                    render={({ field }) => (
                      <FormItem>
                        <LabelWithRequired required={selectedBudgetModel === 'cost_control'}>
                          {t('projects:totalBudget')}
                        </LabelWithRequired>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t('projects:budgetPlaceholder')}
                            disabled={selectedBudgetModel !== 'cost_control'}
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        {selectedBudgetModel !== 'cost_control' ? (
                          <FormDescription>{t('projects:autoCalculated')}</FormDescription>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                   {/* Budget Model Selection */}
                   <FormField
                     control={form.control}
                     name="budget_model"
                     render={({ field }) => (
                       <FormItem className="space-y-3">
                         <FormLabel>{t('projects:budgetModelLabel')}</FormLabel>
                         <FormControl>
                           <div className="flex gap-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                               <div
                                 className={cn(
                                   "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                   field.value === 'simple' ? "border-primary" : "border-muted"
                                 )}
                                 onClick={() => field.onChange('simple')}
                               >
                                 <div className="flex items-center gap-3 w-full self-start mb-2">
                                   <div className={cn(
                                     "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                     field.value === 'simple' ? "bg-primary" : "bg-transparent"
                                   )}>
                                     {field.value === 'simple' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                   </div>
                                   <span className="font-semibold">{t('projects:budgetTypeSimple')}</span>
                                 </div>
                                 <p className="text-xs text-muted-foreground w-full text-left">
                                   {t('projects:budgetModelSimpleDescription') || 'Granular cost tracking with materials and labor breakdown.'}
                                 </p>
                               </div>

                               <div
                                 className={cn(
                                   "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                   field.value === 'bdi_brazil' ? "border-primary" : "border-muted"
                                 )}
                                 onClick={() => field.onChange('bdi_brazil')}
                               >
                                 <div className="flex items-center gap-3 w-full self-start mb-2">
                                   <div className={cn(
                                     "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                     field.value === 'bdi_brazil' ? "bg-primary" : "bg-transparent"
                                   )}>
                                     {field.value === 'bdi_brazil' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                   </div>
                                   <span className="font-semibold">{t('projects:budgetTypeBDIBrazil')}</span>
                                 </div>
                                 <p className="text-xs text-muted-foreground w-full text-left">
                                   {t('projects:budgetModelBDIBrazilDescription') || 'Brazilian construction standard with BDI (Business Difficulty Index) calculations.'}
                                 </p>
                               </div>

                               <div
                                 className={cn(
                                   "flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-primary/10 hover:text-accent-foreground cursor-pointer transition-all",
                                   field.value === 'cost_control' ? "border-primary" : "border-muted"
                                 )}
                                 onClick={() => field.onChange('cost_control')}
                               >
                                 <div className="flex items-center gap-3 w-full self-start mb-2">
                                   <div className={cn(
                                     "h-4 w-4 rounded-full border border-primary flex items-center justify-center",
                                     field.value === 'cost_control' ? "bg-primary" : "bg-transparent"
                                   )}>
                                     {field.value === 'cost_control' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                   </div>
                                   <span className="font-semibold">{t('projects:budgetTypeCostControl')}</span>
                                 </div>
                                 <p className="text-xs text-muted-foreground w-full text-left">
                                   {t('projects:budgetModelCostControlDescription') || 'Standard fixed budget tracking per phase with committed vs actuals.'}
                                 </p>
                               </div>
                             </div>

                             {/* Recalculate Button - Moved to right side of budget model buttons */}
                             <div className="flex flex-col items-start gap-1">
                               <AlertDialog>
                                 <AlertDialogTrigger asChild>
                                   <Button
                                     type="button"
                                     variant="outline"
                                     disabled={isRecalculating || isLoading || uploading || isLoadingActivities || !hasActivities || !hasProjectDataChanges}
                                   >
                                     {isRecalculating ? t('projects:recalculateWorking') : t('projects:recalculate')}
                                   </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                   <AlertDialogHeader>
                                     <AlertDialogTitle>{t('projects:recalculateConfirmTitle')}</AlertDialogTitle>
                                     <AlertDialogDescription>
                                       {t('projects:recalculateConfirmDescription')}
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter>
                                     <AlertDialogCancel>{t('projects:recalculateCancel')}</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={handleRecalculatePhases}
                                       disabled={isRecalculating || isLoading || uploading || isLoadingActivities || !hasActivities || !hasProjectDataChanges}
                                     >
                                       {t('projects:recalculateConfirm')}
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                               <span className="text-xs text-muted-foreground">
                                 {t('projects:recalculateHelp')}
                               </span>
                             </div>
                           </div>
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="budget_total"
                     render={({ field }) => (
                       <FormItem>
                         <LabelWithRequired required={selectedBudgetModel === 'cost_control'}>
                           {t('projects:totalBudget')}
                         </LabelWithRequired>
                         <FormControl>
                           <Input
                             type="text"
                             inputMode="decimal"
                             placeholder={t('inputPlaceholders.amount')}
                             {...field}
                             value={field.value ?? ''}
                             onChange={(e) => field.onChange(e.target.value)}
                           />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   {selectedBudgetModel === 'simple' && (
                     <FormField
                       control={form.control}
                       name="budget_has_materials"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>{t('projects:budgetHasMaterialsLabel')}</FormLabel>
                           <FormControl>
                             <RadioGroup
                               value={field.value ? 'with' : 'without'}
                               onValueChange={(value) => field.onChange(value === 'with')}
                               className="flex flex-wrap gap-6"
                             >
                               <label className="flex items-center gap-2 text-sm">
                                 <RadioGroupItem value="with" />
                                 {t('projects:budgetWithMaterials')}
                               </label>
                               <label className="flex items-center gap-2 text-sm">
                                 <RadioGroupItem value="without" />
                                 {t('projects:budgetWithoutMaterials')}
                               </label>
                             </RadioGroup>
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   )}



                  {/* Image Upload */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      {t('projects:projectImage')}
                    </h3>
                    <div className="border-2 border-dashed rounded-lg p-3 min-h-[200px] flex items-center justify-center">
                      {imagePreview ? (
                        <div className="relative w-full">
                          <img
                            src={imagePreview}
                            alt={t("images.projectPreview")}
                            className="w-full h-48 object-cover rounded-lg cursor-crosshair"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = ((e.clientX - rect.left) / rect.width) * 100;
                              const y = ((e.clientY - rect.top) / rect.height) * 100;
                              form.setValue('image_focus_point', { x, y }, { shouldDirty: true });
                            }}
                          />
                          {/* Focus Point Target */}
                          <div 
                            className="absolute w-8 h-8 -ml-4 -mt-4 text-white drop-shadow-md pointer-events-none transition-all duration-200"
                            style={{ 
                              left: `${focusPoint?.x ?? 50}%`, 
                              top: `${focusPoint?.y ?? 50}%` 
                            }}
                          >
                            <Target className="w-full h-full text-white filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
                            {t('projects:clickToSetFocus') || 'Click on image to set focus point'}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setImageFile(null);
                              if (!isEditing) {
                                setImagePreview(null);
                              } else if (initialImageUrl) {
                                if (initialImageUrl.startsWith('http')) {
                                  setImagePreview(initialImageUrl);
                                } else {
                                  supabase.storage
                                    .from('project-images')
                                    .createSignedUrl(initialImageUrl, 60 * 60 * 24)
                                    .then(({ data }) => {
                                      if (data) setImagePreview(data.signedUrl);
                                    });
                                }
                              }
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          {isEditing && !imageFile && (
                            <label
                              htmlFor="project-image-upload"
                              className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm cursor-pointer hover:bg-primary/90"
                            >
                              {t('projects:changeProjectImage')}
                              <input
                                id="project-image-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <label htmlFor="project-image-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground text-center">
                            {isEditing ? t('projects:uploadNewProjectImage') : t('projects:uploadProjectImage')}
                          </span>
                          {imageFile && (
                            <span className="text-xs text-primary">
                              {imageFile.name}
                            </span>
                           )}
                           <input
                             id="project-image-upload"
                             type="file"
                             accept="image/*"
                             className="hidden"
                             onChange={handleImageChange}
                           />
                         </label>
                       )}
                      </div>
                     </div>

                     {/* Danger Zone - Moved from client-info tab */}
                     <div className="border border-red-200 rounded-lg p-6 bg-red-50/10 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                       <div className="flex flex-col md:flex-row items-center gap-4">
                         <h3 className="text-lg font-semibold text-red-600 whitespace-nowrap">
                           {t('projects:dangerZone')}
                         </h3>
                         <div className="flex items-center gap-2 text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                             <span className="text-sm font-medium">
                               {t('projects:deleteWarning')}
                             </span>
                         </div>
                       </div>

                       <AlertDialog>
                         <AlertDialogTrigger asChild>
                           <Button
                             variant="destructive"
                             size="sm"
                             disabled={checkingFinancials || !!hasFinancials}
                             title={hasFinancials ? t('projects:cannotDeleteFinancials') : undefined}
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             {t('projects:clearAllData')}
                           </Button>
                         </AlertDialogTrigger>

                         <AlertDialogContent>
                           <AlertDialogHeader>
                            <AlertDialogTitle>{t('common.areYouSure')}</AlertDialogTitle>
                                                         <AlertDialogDescription>
                                                           {t('projects:deleteProjectWarning')}
                                                         </AlertDialogDescription>                           </AlertDialogHeader>
                           <AlertDialogFooter>
                             <AlertDialogCancel>{t('projects:cancelDelete')}</AlertDialogCancel>
                             <AlertDialogAction
                               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                               onClick={() => {
                                 if (id) {
                                   deleteProject.mutate(id, {
                                     onSuccess: () => {
                                       toast({
                                         title: t('projects:projectDeleted'),
                                       });
                                       navigate('/projects');
                                     }
                                   });
                                 }
                               }}
                             >
                               {t('projects:clearAllData')}
                             </AlertDialogAction>
                           </AlertDialogFooter>
                         </AlertDialogContent>
                       </AlertDialog>
                     </div>


                 </div>
               </TabsContent>
            </Tabs>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 py-4 backdrop-blur">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  saveDraft(form.getValues(), 0);
                  toast({ title: t('projects:draftSaved') });
                }}
                className="h-10"
              >
                {t('projects:saveAsDraft')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploading}
                className="h-10"
              >
                {uploading
                  ? t('common.uploading')
                  : isLoading
                    ? t('common.saving')
                    : t('projects:saveProject')
                }
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
};
