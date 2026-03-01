import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useINSSCalculation, useTaxEstimates } from '@/features/tax/hooks/useTaxEstimate';
import { useTaxProject } from '@/features/tax/hooks/useTaxProject';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useClientPortalProject } from '@/hooks/clientPortal/useClientPortalProject';
import { calculateConstructionMonths } from '@/utils/projectDurationCalculator';
import { formatCurrency } from '@/features/tax/utils/inssCalculator';
import { TrendingDown, Calendar, CreditCard, Info, CheckCircle2, ExternalLink, ChevronRight, FileText, ChevronDown, ChevronUp, Lock, Calculator, HelpCircle, Circle, Clock } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ReportViewerModal } from '@/components/Reports/ReportViewerModal';
import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';
import { ProjectSelectionModal } from '@/components/ClientPortal/Dialogs/ProjectSelectionModal';
import { useClientAccessibleProjects } from '@/hooks/clientPortal/useClientAccessibleProjects';
import { useNavigate } from 'react-router-dom';
import type { TaxProject } from '@/features/tax/types/tax.types';

interface ScenarioCardProps {
  type: 'standard' | 'planned';
  title: string;
  description: string;
  taxProject: TaxProject;
  isHighlighted?: boolean;
  constructionMonths?: number;
  // Stored values from database (prevents regression)
  storedMonthlyPayment?: number | null;
  storedTotalINSS?: number | null;
  storedSavingsPercentage?: number | null;
}

const ScenarioCard = ({ 
  type, 
  title, 
  description, 
  taxProject, 
  isHighlighted, 
  constructionMonths,
  storedMonthlyPayment,
  storedTotalINSS,
  storedSavingsPercentage
}: ScenarioCardProps) => {
  const calculation = useINSSCalculation(taxProject, constructionMonths);
  const { t } = useLocalization();

  if (!calculation) return null;

  // Prefer stored values over calculated (prevents regression)
  const displayTotalINSS = type === 'planned' 
    ? (storedTotalINSS ?? calculation.plannedScenario?.totalINSS ?? 0)
    : calculation.inssEstimate;
  
  // Only calculate these values for 'planned' type to avoid accessing undefined plannedScenario
  const displayMonthlyPayment = type === 'planned' 
    ? (storedMonthlyPayment ?? calculation.plannedScenario?.monthlyPayment ?? 0)
    : 0;
  const displaySavingsPercentage = type === 'planned'
    ? (storedSavingsPercentage ?? calculation.plannedScenario?.savingsPercentage ?? 0)
    : 0;

  // Debug logging for monthly payment calculation
  if (type === 'planned' && calculation.plannedScenario) {
    console.log('ScenarioCard (Planned): Monthly payment calculation', {
      storedMonthlyPayment,
      calculatedMonthlyPayment: calculation.plannedScenario.monthlyPayment,
      usingStored: !!storedMonthlyPayment,
      totalINSS: displayTotalINSS,
      constructionMonths,
      monthlyPayment: displayMonthlyPayment,
      expectedMonthlyPayment: displayTotalINSS / Math.max(1, constructionMonths ?? 1)
    });
  }

  return (
    <Card className={isHighlighted ? "border-primary border-2 shadow-lg" : "border-2"}>
      <CardHeader className={isHighlighted ? "bg-primary/5" : "bg-muted/50"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'standard' ? <Calendar className="h-5 w-5" /> : <TrendingDown className="h-5 w-5 text-primary" />}
            <CardTitle>{title}</CardTitle>
          </div>
          {isHighlighted && <Badge className="bg-primary text-primary-foreground">{t('clientPortal.inssPlanning.labels.recommended')}</Badge>}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">
            {type === 'standard' ? t('clientPortal.inssPlanning.labels.totalDue') : t('clientPortal.inssPlanning.labels.optimizedTotal')}
          </span>
          <div className={`text-2xl font-bold ${isHighlighted ? 'text-primary' : ''}`}>
            {formatCurrency(displayTotalINSS)}
          </div>
        </div>
        
        {type === 'planned' && (
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">{t('clientPortal.inssPlanning.labels.monthlyPayment')}</span>
            <div className="text-lg font-semibold">
              {displayMonthlyPayment > 0 ? (
                <>
                  {formatCurrency(displayMonthlyPayment)} {t('clientPortal.inssPlanning.labels.perMonth')}
                </>
              ) : (
                <span className="text-muted-foreground animate-pulse">
                  {t('common.loading', { defaultValue: 'Carregando...' })}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 border-t text-sm text-muted-foreground italic">
          {type === 'standard' ? t('clientPortal.inssPlanning.scenarios.standardNote') : 
           t('clientPortal.inssPlanning.labels.totalSavings') + ': ' + displaySavingsPercentage + '%'}
        </div>
      </CardContent>
    </Card>
  );
};

export function INSSPlanningContainer() {
  const { projectId, isLoading: isLoadingAuth } = useClientPortalAuth();
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { data: accessibleProjects = [], isLoading: isLoadingProjects } = useClientAccessibleProjects();
  const { taxProject, isLoading } = useTaxProject(projectId);
  
  // CRITICAL: All hooks must be called before any conditional returns
  // Fetch project data using shared hook (must be called unconditionally)
  const { project, isLoading: isLoadingProject, error: projectError, isFetching: isFetchingProject } = useClientPortalProject();
  
  // Fetch stored tax estimates (to use persisted monthly payment values)
  const { latestEstimate, saveEstimate } = useTaxEstimates(taxProject?.id);
  
  // State hooks (must be called unconditionally)
  const [isOpen, setIsOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Calculate construction months from project duration (must be called unconditionally)
  // Using extracted utility function for testability and regression prevention
  // Prefer stored value from latestEstimate if available (prevents regression)
  const constructionMonths = useMemo(() => {
    // 1. Calculate from project data (source of truth when loaded)
    const calculatedMonths = calculateConstructionMonths(project, {
      isLoading: isLoadingProject,
      projectId
    });

    // 2. If we have a stored estimate, check if we should use it
    if (latestEstimate?.construction_months && latestEstimate.construction_months > 0) {
      // If project is still loading, use stored value
      if (isLoadingProject) {
        return latestEstimate.construction_months;
      }

      // Project is loaded. If stored value is 1 but calculated is > 1, 
      // the stored value is likely corrupted (saved during a race condition).
      if (latestEstimate.construction_months === 1 && calculatedMonths > 1) {
        console.warn('[INSSPlanningContainer] Stored construction_months is 1 but project duration is > 1. Using calculated value to fix corruption.', {
          stored: 1,
          calculated: calculatedMonths,
          estimateId: latestEstimate.id
        });
        return calculatedMonths;
      }

      return latestEstimate.construction_months;
    }
    
    return calculatedMonths;
  }, [project, isLoadingProject, projectId, latestEstimate]);

  // Calculate INSS for the report generation (hook handles null taxProject) - must be called unconditionally
  const calculation = useINSSCalculation(taxProject, constructionMonths);
  
  // Use stored monthly payment if available (prevents regression), otherwise use calculated
  const monthlyPayment = useMemo(() => {
    // If constructionMonths is 0, it means we're still loading project data and don't know the duration yet
    // Unless we have a stored estimate, we should return 0 to avoid showing total INSS as monthly payment
    if (constructionMonths <= 0 && (!latestEstimate?.planned_monthly_payment)) {
      return 0;
    }

    if (latestEstimate?.planned_monthly_payment && latestEstimate.planned_monthly_payment > 0) {
      // If we are fixing a corrupted 1-month estimate, don't use the stored payment
      const calculatedMonths = calculateConstructionMonths(project, { isLoading: isLoadingProject });
      if (!isLoadingProject && latestEstimate.construction_months === 1 && calculatedMonths > 1) {
        return calculation?.plannedScenario?.monthlyPayment ?? 0;
      }

      return latestEstimate.planned_monthly_payment;
    }
    return calculation?.plannedScenario?.monthlyPayment ?? 0;
  }, [latestEstimate, calculation, constructionMonths, project, isLoadingProject]);
  
  // Use stored total INSS if available, otherwise use calculated
  const totalINSS = useMemo(() => {
    if (latestEstimate?.planned_total_inss && latestEstimate.planned_total_inss > 0) {
      return latestEstimate.planned_total_inss;
    }
    return calculation?.plannedScenario?.totalINSS ?? 0;
  }, [latestEstimate, calculation]);
  
  // Get project name with better fallback handling (must be called unconditionally)
  const projName = useMemo(() => {
    if (project?.name) {
      console.log('INSSPlanningContainer: Using project name', { projectName: project.name });
      return project.name;
    }
    if (isLoadingProject) {
      console.log('INSSPlanningContainer: Project still loading');
      return t("clientPortal.dashboard.loading", { defaultValue: "Carregando..." });
    }
    if (projectError) {
      console.error('INSSPlanningContainer: Project query error, using fallback', { 
        projectError,
        projectId,
        errorMessage: projectError?.message
      });
      return t("clientPortal.dashboard.loading", { defaultValue: "Carregando..." });
    }
    // If projectId exists but no project data after loading, there's an issue
    if (projectId && !isLoadingProject) {
      console.error('INSSPlanningContainer: ProjectId exists but no project data loaded', { 
        projectId,
        hasProject: !!project,
        isLoadingProject
      });
      return t("clientPortal.dashboard.loading", { defaultValue: "Carregando..." });
    }
    console.log('INSSPlanningContainer: No projectId, using loading fallback');
    return t("clientPortal.dashboard.loading", { defaultValue: "Carregando..." });
  }, [project, isLoadingProject, projectError, projectId, t]);
  
  // Debug: Log projectId extraction and URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParams = window.location.pathname.split('/');
    const routeId = pathParams[2]; // /portal/:id/inss-planning -> pathParams[2] should be the id
    
    console.log('INSSPlanningContainer: projectId and URL analysis', {
      projectId,
      isLoadingAuth,
      hasAccessibleProjects: accessibleProjects.length > 0,
      currentPath: window.location.pathname,
      pathSegments: pathParams,
      routeIdFromPath: routeId,
      urlSearchParams: Object.fromEntries(urlParams.entries()),
      queryEnabled: !!projectId && !isLoadingAuth
    });
  }, [projectId, isLoadingAuth, accessibleProjects.length]);
  
  // Check if projectId is valid, if not redirect to project selection
  useEffect(() => {
    // Wait for auth and projects to load
    if (isLoadingAuth || isLoadingProjects) return;
    
    // If no projectId in URL, redirect to project selection
    if (!projectId) {
      console.log('INSSPlanningContainer: No projectId, redirecting to project selection');
      // If user has only one project, redirect to it
      if (accessibleProjects.length === 1) {
        navigate(`/portal/${accessibleProjects[0].id}/inss-planning`, { replace: true });
        return;
      }
      // If user has multiple projects, redirect to main client portal for project selection
      if (accessibleProjects.length > 1) {
        navigate('/portal', { replace: true });
        return;
      }
      // If no projects, redirect to main client portal (will show error)
      navigate('/portal', { replace: true });
      return;
    }
    
    // If projectId exists but is not in accessible projects, redirect
    const hasAccess = accessibleProjects.some(p => p.id === projectId);
    if (!hasAccess && accessibleProjects.length > 0) {
      console.warn('INSSPlanningContainer: ProjectId not accessible, redirecting to project selection', { 
        projectId,
        accessibleProjectIds: accessibleProjects.map(p => p.id)
      });
      // If user has only one project, redirect to it
      if (accessibleProjects.length === 1) {
        navigate(`/portal/${accessibleProjects[0].id}/inss-planning`, { replace: true });
        return;
      }
      // Otherwise, redirect to main client portal for project selection
      navigate('/portal', { replace: true });
      return;
    }
  }, [projectId, isLoadingAuth, isLoadingProjects, accessibleProjects, navigate]);
  
  // Debug: Log query status
  useEffect(() => {
    console.log('INSSPlanningContainer: Project query status', {
      projectId,
      isLoadingAuth,
      isLoadingProject,
      isFetchingProject,
      hasProject: !!project,
      projectError: projectError ? {
        message: projectError.message,
        code: (projectError as any)?.code
      } : null,
    });
  }, [projectId, isLoadingAuth, isLoadingProject, isFetchingProject, project, projectError]);
  
  // Auto-save estimate when calculation is ready (prevents regression by persisting values)
  useEffect(() => {
    // Only save if:
    // 1. We have a tax project
    // 2. We have a calculation with plannedScenario
    // 3. We haven't already saved this exact calculation (check if latestEstimate matches)
    // 4. We're not currently saving
    if (
      !taxProject?.id ||
      !calculation?.plannedScenario ||
      saveEstimate.isPending ||
      !constructionMonths ||
      constructionMonths <= 0 ||
      isLoadingProject
    ) {
      return;
    }

    // Check if we already have a saved estimate with the same values
    const hasRecentEstimate = latestEstimate && 
      latestEstimate.planned_monthly_payment === calculation.plannedScenario.monthlyPayment &&
      latestEstimate.planned_total_inss === calculation.plannedScenario.totalINSS &&
      latestEstimate.construction_months === constructionMonths;

    if (hasRecentEstimate) {
      console.log('[INSSPlanningContainer] Estimate already saved with same values, skipping auto-save');
      return;
    }

    // Get VAU reference date (use current date or from refData if available)
    const vauReferenceDate = new Date().toISOString().split('T')[0];

    console.log('[INSSPlanningContainer] Auto-saving estimate with planned scenario data', {
      taxProjectId: taxProject.id,
      constructionMonths,
      monthlyPayment: calculation.plannedScenario.monthlyPayment,
      totalINSS: calculation.plannedScenario.totalINSS
    });

    // Save the estimate with all planned scenario data
    saveEstimate.mutate({
      taxProjectId: taxProject.id,
      result: calculation,
      vauReferenceDate,
      constructionMonths, // Pass constructionMonths explicitly
      notes: 'Auto-saved from INSS Planning page'
    });
  }, [taxProject?.id, calculation, constructionMonths, saveEstimate, latestEstimate, isLoadingProject]);

  // Debug: Log construction months and calculation result
  useEffect(() => {
    if (calculation?.plannedScenario) {
      console.log('INSSPlanningContainer: Calculation result', {
        constructionMonths,
        usingStoredConstructionMonths: !!latestEstimate?.construction_months,
        monthlyPayment,
        calculatedMonthlyPayment: calculation.plannedScenario.monthlyPayment,
        usingStoredMonthlyPayment: !!monthlyPayment,
        totalINSS,
        calculatedTotalINSS: calculation.plannedScenario.totalINSS,
        expectedMonthly: totalINSS / Math.max(1, constructionMonths),
        projectData: {
          total_duration: project?.total_duration,
          start_date: project?.start_date,
          end_date: project?.end_date
        },
        hasStoredEstimate: !!latestEstimate,
        willAutoSave: !saveEstimate.isPending && taxProject?.id && !latestEstimate?.planned_monthly_payment
      });
    }
  }, [calculation, constructionMonths, project, latestEstimate, totalINSS, saveEstimate, taxProject?.id, monthlyPayment]);
  
  // Show loading state while checking auth/projects
  if (isLoadingAuth || isLoadingProjects) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">{t('clientPortal.portal.loadingProjects', { defaultValue: 'Loading...' })}</div>
      </div>
    );
  }
  
  // Show project selection modal if no valid projectId
  if (!projectId) {
    return (
      <ProjectSelectionModal
        isOpen={true}
        onClose={() => navigate('/portal')}
      />
    );
  }
  
  // Check if projectId is in accessible projects
  const hasAccess = accessibleProjects.some(p => p.id === projectId);
  if (!hasAccess && accessibleProjects.length > 0) {
    return (
      <ProjectSelectionModal
        isOpen={true}
        onClose={() => navigate('/portal')}
      />
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  if (!taxProject) {
    return (
      <Card className="m-8">
        <CardContent className="p-12 text-center">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">{t('clientPortal.inssPlanning.notSetupTitle')}</CardTitle>
          <CardDescription>
            {t('clientPortal.inssPlanning.notSetupDescription')}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  const handleViewReport = () => {
    console.log('handleViewReport called', { 
      hasProject: !!project?.name, 
      hasTaxProject: !!taxProject, 
      hasCalculation: !!calculation,
      projectName: project?.name 
    });
    
    if (!taxProject || !calculation) {
      console.warn('Cannot open report modal - missing data:', {
        taxProject: !!taxProject,
        calculation: !!calculation
      });
      toast.error(t('clientPortal.inssPlanning.labels.missingData', { defaultValue: 'Missing data to generate report' }));
      return;
    }
    
    console.log('Opening report modal');
    setIsReportModalOpen(true);
  };

  // Extract client email and phone from project data
  const clientData = project?.clients as any;
  const clientEmail = clientData?.email || '';
  const clientPhone = clientData?.phone || '';

  const handleRequestActivation = async () => {
    try {
      const { error } = await supabase
        .from('tax_alerts')
        .insert({
          tax_project_id: taxProject.id,
          alert_type: 'DOCUMENT_MISSING',
          severity: 'INFO',
          message: `Client requested activation of Strategic INSS service.`,
          metadata: { requested_at: new Date().toISOString() }
        });

      if (error) throw error;
      toast.success(t('clientPortal.inssPlanning.labels.requestSent', { defaultValue: "Request sent to your project manager." }));
    } catch (error) {
      console.error('Error sending activation request:', error);
      toast.error(t('common.errorTitle', { defaultValue: "Error" }));
    }
  };

  const strategySteps = [
    { title: t('clientPortal.inssPlanning.strategySteps.step1Title'), desc: t('clientPortal.inssPlanning.strategySteps.step1Desc') },
    { title: t('clientPortal.inssPlanning.strategySteps.step2Title'), desc: t('clientPortal.inssPlanning.strategySteps.step2Desc') },
    { title: t('clientPortal.inssPlanning.strategySteps.step3Title'), desc: t('clientPortal.inssPlanning.strategySteps.step3Desc') },
    { title: t('clientPortal.inssPlanning.strategySteps.step4Title'), desc: t('clientPortal.inssPlanning.strategySteps.step4Desc') },
  ];

  const PageContent = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2">
        <ScenarioCard
          type="standard"
          title={t('clientPortal.inssPlanning.scenarios.standard.title')}
          description={t('clientPortal.inssPlanning.scenarios.standard.description')}
          taxProject={taxProject}
          constructionMonths={constructionMonths}
        />
        <ScenarioCard
          type="planned"
          title={t('clientPortal.inssPlanning.scenarios.planned.title')}
          description={t('clientPortal.inssPlanning.scenarios.planned.description')}
          taxProject={taxProject}
          isHighlighted
          constructionMonths={constructionMonths}
          storedMonthlyPayment={monthlyPayment}
          storedTotalINSS={totalINSS}
          storedSavingsPercentage={latestEstimate?.planned_savings_percentage ?? calculation?.plannedScenario?.savingsPercentage ?? 0}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-primary" />
              {t('clientPortal.inssPlanning.labels.strategyLogicTitle')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {t('clientPortal.inssPlanning.labels.strategyLogicDesc')}
            </p>
          </div>

          <div className="grid gap-4">
            {strategySteps.map((step, idx) => (
              <div key={idx} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ExternalLink className="h-6 w-6 text-primary" />
              {t('clientPortal.inssPlanning.labels.validationLinks')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('clientPortal.inssPlanning.labels.validationLinksDesc')}
            </p>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-between group" onClick={() => window.open('http://normas.receita.fazenda.gov.br/sijut2consulta/link.action?idAto=116900', '_blank')}>
              <span className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-primary" />
                {t('clientPortal.inssPlanning.labels.rfbInstruction')}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
            </Button>
            <Button variant="outline" className="w-full justify-between group" onClick={() => window.open('https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sero', '_blank')}>
              <span className="flex items-center gap-2 font-medium">
                <ExternalLink className="h-4 w-4 text-primary" />
                {t('clientPortal.inssPlanning.labels.seroOfficial')}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
            </Button>
            <Button variant="outline" className="w-full justify-between group" onClick={() => window.open('https://cav.receita.fazenda.gov.br/autenticacao/login', '_blank')}>
              <span className="flex items-center gap-2 font-medium">
                <CreditCard className="h-4 w-4 text-primary" />
                {t('clientPortal.inssPlanning.labels.ecacPortal')}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
            </Button>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 flex gap-4 items-start">
              <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="font-bold">{t('clientPortal.inssPlanning.labels.complianceTitle')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('clientPortal.inssPlanning.labels.complianceDesc')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.inssPlanning.title", { defaultValue: "Planejamento INSS" })}
        subtitle={t("clientPortal.inssPlanning.subtitle")}
        actions={
          taxProject.has_strategy_service && (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked!', { 
                  hasProject: !!project?.name, 
                  hasTaxProject: !!taxProject, 
                  hasCalculation: !!calculation,
                  isReportModalOpen 
                });
                handleViewReport();
              }} 
              variant="secondary"
              className="flex items-center gap-2 bg-white hover:bg-white/95 text-primary font-semibold shadow-lg border-0 min-w-[140px]"
              disabled={!taxProject || !calculation}
            >
              <FileText className="h-4 w-4" />
              {t('clientPortal.inssPlanning.labels.viewReport', { defaultValue: 'View Report' })}
            </Button>
          )
        }
      />

      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full space-y-2"
        disabled={!taxProject.has_strategy_service}
      >
        <div className="flex items-center justify-between space-x-4 px-4 py-2 border rounded-lg bg-card">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            {t('clientPortal.inssPlanning.pageTitle', { defaultValue: 'INSS Planning' })}
            {!taxProject.has_strategy_service && (
              <Badge variant="secondary" className="ml-2 gap-1 text-blue-600">
                <Lock className="h-3 w-3" />
                {t('clientPortal.inssPlanning.labels.exclusiveContent')}
              </Badge>
            )}
          </h2>
          {taxProject.has_strategy_service ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          ) : (
            <Button variant="outline" size="sm" onClick={() => toast.info(t('clientPortal.inssPlanning.labels.logicLockedDesc'))}>
              {t('clientPortal.inssPlanning.labels.learnMore')}
            </Button>
          )}
        </div>

        {taxProject.has_strategy_service ? (
          <CollapsibleContent className="space-y-6 pt-4 animate-in fade-in duration-500">
            <PageContent />
          </CollapsibleContent>
        ) : (
          <div className="p-12 text-center border rounded-lg bg-muted/20 border-dashed">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold">{t('clientPortal.inssPlanning.labels.logicLocked')}</h3>
            <p className="text-muted-foreground max-w-md mx-auto mt-2">
              {t('clientPortal.inssPlanning.labels.logicLockedDesc')}
            </p>
            <Button className="mt-6" variant="default" onClick={handleRequestActivation}>
              {t('clientPortal.inssPlanning.labels.requestActivation')}
            </Button>
          </div>
        )}
      </Collapsible>

      {/* Report Viewer Modal */}
      {taxProject.has_strategy_service && (
        <ReportViewerModal
          isOpen={isReportModalOpen}
          onClose={() => {
            console.log('Closing report modal');
            setIsReportModalOpen(false);
          }}
          reportType="inss"
          reportData={{
            projectName: project?.name || projName || 'Project',
            taxProject,
            calculation,
            projectId: projectId || undefined,
            constructionMonths,
          }}
          projectId={projectId || ''}
          reportTitle={t('clientPortal.inssPlanning.proposal.title', { defaultValue: 'Proposta de Assessoria para redução de INSS de Obras' })}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
        />
      )}
    </div>
  );
}
