import { useState } from 'react';
import { FileText, DollarSign, Package, TrendingUp, BarChart3, Filter } from "lucide-react";
import type { Json, Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { ReportTypeCard } from "@/components/Reports/ReportTypeCard";
import { ReportConfigDialog, ReportConfig } from "@/components/Reports/ReportConfigDialog";
import { ReportHistory } from "@/components/Reports/ReportHistory";
import { generateProjectDashboardReport } from "@/components/Reports/generators/generateProjectDashboardReport";
import { ProjectDashboardDialog } from "@/components/Reports/ProjectDashboardDialog";
import { ReportViewer as ReportViewerSimple, type ReportType } from "@/components/Reports/ReportViewerSimple";
import { useProjects } from "@/hooks/useProjects";
import { useProjectBudgetItems } from "@/hooks/useProjectBudgetItems";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useProjectMaterials } from "@/hooks/useProjectMaterials";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useGeneratedReports } from "@/hooks/useGeneratedReports";
import { useToast } from "@/hooks/use-toast";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

type ProjectRow = Database['public']['Tables']['projects']['Row'];

const Reports = () => {
  const { t, language, currency, dateFormat } = useLocalization();
  const { toast } = useToast();
  const { projects } = useProjects();
  const { settings: companySettings } = useCompanySettings();
  const { saveReport } = useGeneratedReports();
  const { financialEntries } = useFinancialEntries();
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedReportTitle, setSelectedReportTitle] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  const [dashboardProject, setDashboardProject] = useState<ProjectRow | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    budgetItems: any[];
    financialEntries: any[];
    companySettings: any;
  } | null>(null);

  // Report viewer state
  const [reportViewerOpen, setReportViewerOpen] = useState(false);
  const [reportViewerData, setReportViewerData] = useState<{
    reportType: ReportType;
    reportData: {
      project: any;
      budgetItems: any[];
      financialEntries: any[];
      materials: any[];
      companySettings: any;
    };
    reportTitle: string;
  } | null>(null);

  // Get data for reports - these hooks will run but only be used when needed
  const { budgetItems } = useProjectBudgetItems(selectedProjectId);
  const { materials } = useProjectMaterials(selectedProjectId);
  const { financialEntries: projectFinancialEntries } = useFinancialEntries(selectedProjectId);

  const reportTypes = [
    {
      id: 'projectStatus',
      title: t('reports:reportTypes.projectStatus.title'),
      description: t('reports:reportTypes.projectStatus.description'),
      icon: FileText,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'financialSummary',
      title: t('reports:reportTypes.financialSummary.title'),
      description: t('reports:reportTypes.financialSummary.description'),
      icon: DollarSign,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      id: 'budgetVsActual',
      title: t('reports:reportTypes.budgetVsActual.title'),
      description: t('reports:reportTypes.budgetVsActual.description'),
      icon: BarChart3,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      id: 'cashFlow',
      title: t('reports:reportTypes.cashFlow.title'),
      description: t('reports:reportTypes.cashFlow.description'),
      icon: TrendingUp,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'profitability',
      title: t('reports:reportTypes.profitability.title'),
      description: t('reports:reportTypes.profitability.description'),
      icon: DollarSign,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'materialsUsage',
      title: t('reports:reportTypes.materialsUsage.title'),
      description: t('reports:reportTypes.materialsUsage.description'),
      icon: Package,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      id: 'projectDashboard',
      title: t('reports:reportTypes.projectDashboard.title'),
      description: t('reports:reportTypes.projectDashboard.description'),
      icon: BarChart3,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      id: 'aiWeeklySummary',
      title: t('reports:reportTypes.aiWeeklySummary.title'),
      description: t('reports:reportTypes.aiWeeklySummary.description'),
      icon: TrendingUp,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  const handleReportClick = (reportId: string, title: string) => {
    setSelectedReportType(reportId);
    setSelectedReportTitle(title);
    setConfigDialogOpen(true);
  };

  const handleGenerateReport = async (config: ReportConfig) => {
    try {
      // Set the project ID for hooks to fetch data
      setSelectedProjectId(config.projectId);
      
      const project = projects?.find(p => p.id === config.projectId);
      if (!project) {
        toast({ title: t('common:error'), description: t('common:toast.projectNotFound'), variant: 'destructive' });
        return;
      }

      // Special handling for project dashboard (opens in dialog)
      if (selectedReportType === 'projectDashboard') {
        await handleProjectDashboardReport(project, config);
        return;
      }

      // Special handling for AI Weekly Summary
      if (selectedReportType === 'aiWeeklySummary') {
        await handleAIWeeklySummaryReport(project, config);
        return;
      }

      // Fetch all required data for the report
      const { data: budgetData } = await (supabase as any)
        .from('project_budget_items')
        .select('*')
        .eq('project_id', project.id);

      const { data: materialsData } = await (supabase as any)
        .from('project_materials')
        .select('*')
        .eq('project_id', project.id);

      const projectEntries = financialEntries?.filter(e => e.project_id === config.projectId) || [];

      // Prepare report data for the viewer
      const reportData = {
        project,
        budgetItems: budgetData || [],
        financialEntries: projectEntries,
        materials: materialsData || [],
        companySettings: companySettings
      };

      // Show the web viewer with the report data
      setReportViewerData({
        reportType: selectedReportType as ReportType,
        reportData,
        reportTitle: selectedReportTitle
      });
      setReportViewerOpen(true);
      setConfigDialogOpen(false);

    } catch (error) {
      console.error('Error preparing report:', error);
      toast({
        title: t('common:error'),
        description: t('reports:errors.failedToPrepareData'),
        variant: 'destructive'
      });
    }
  };

  // Separate function for AI weekly summary
  const handleAIWeeklySummaryReport = async (project: ProjectRow, config: ReportConfig) => {
    try {
      console.log('[Reports] Starting AI Weekly Summary for project:', project.id);
      
      toast({
        title: t('reports:dashboard.generatingReport'),
        description: t('common:pleaseWait'),
      });

      const { data, error } = await supabase.functions.invoke('generate-weekly-reports', {
        body: { project_id: project.id }
      });

      console.log('[Reports] AI Function response:', { data, error });

      if (error) {
        console.error('[Reports] Invoke Error:', error);
        throw error;
      }

      if (!data || !data.summary) {
        console.error('[Reports] Invalid response format:', data);
        throw new Error('Invalid response from AI engine');
      }

      // Show the result in the viewer
      setReportViewerData({
        reportType: 'aiWeeklySummary' as any,
        reportData: {
          project,
          budgetItems: [],
          financialEntries: [],
          materials: [],
          companySettings: { ...companySettings, ai_summary: data.summary }
        },
        reportTitle: `${selectedReportTitle} - ${project.name}`
      });
      setReportViewerOpen(true);
      setConfigDialogOpen(false);

      toast({ title: t('common:success'), description: t('reports:reportReady') });
    } catch (error: any) {
      console.error('Error generating AI report:', error);
      toast({ 
        title: t('common:error'), 
        description: error.message || t('reports:errors.failedToGenerateAI'), 
        variant: 'destructive' 
      });
    }
  };

  // Separate function for project dashboard that still uses PDF generation
  const handleProjectDashboardReport = async (project: ProjectRow, config: ReportConfig) => {
    try {
        toast({
          title: t('reports:dashboard.generatingReport'),
          description: t('reports:dashboard.openingNewWindow'),
        });
        
        // Try to open in new window first
        try {
          // Get project data for report generation
          const { data: budgetItems } = await (supabase as any)
            .from('project_budget_items')
            .select('*')
            .eq('project_id', project.id);

          const { data: financialEntries } = await (supabase as any)
            .from('project_financial_entries')
            .select('*')
            .eq('project_id', project.id);

          const { data: companySettings } = await (supabase as any)
            .from('company_settings')
            .select('*')
            .single();

          const reportConfig = {
            projectId: project.id,
            includeCharts: true,
            includeMaterials: true,
            includeLabor: true,
            groupBy: 'category' as const
          };

          const localizationConfig = {
            t,
            language: language,
            currency: currency,
            dateFormat: dateFormat
          } as any;
          
          await generateProjectDashboardReport(
            project,
            budgetItems || [],
            financialEntries || [],
            companySettings || {},
            reportConfig,
            localizationConfig
          );
          
          toast({
            title: t('reports:reportReady'),
            description: t('common:reportOpened'),
          });
        } catch (error) {
          console.error('Error generating report:', error);
          // If new window fails (e.g., pop-up blocked), show in dialog
          // First fetch the data for the dialog
          const { data: dialogBudgetItems } = await (supabase as any)
            .from('project_budget_items')
            .select('*')
            .eq('project_id', project.id);

          const { data: dialogFinancialEntries } = await (supabase as any)
            .from('project_financial_entries')
            .select('*')
            .eq('project_id', project.id);

          const { data: dialogCompanySettings } = await (supabase as any)
            .from('company_settings')
            .select('*')
            .single();

          setDashboardProject(project);
          setDashboardData({
            budgetItems: dialogBudgetItems || [],
            financialEntries: dialogFinancialEntries || [],
            companySettings: dialogCompanySettings
          });
          setDashboardDialogOpen(true);
          toast({
            title: t('reports:reportReady'),
            description: t('reports:viewInDialog'),
          });
        }
        
        await saveReport.mutateAsync({
          project_id: config.projectId,
          report_type: 'project_dashboard',
          report_name: `Dashboard Report - ${project.name}`,
          configuration: config as unknown as Json,
          generated_by: 'system'
        });

      toast({ title: t('common:success'), description: t('reports:success.generated') });
      setConfigDialogOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ 
        title: t('common:error'), 
        description: t('reports:errors.failedToGenerate'), 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('reports:title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">
              {t('reports:subtitle')}
            </p>
          </div>
          <Button variant="glass-style-white" className="h-10 px-6 rounded-full font-bold whitespace-nowrap">
            <Filter className="mr-2 h-4 w-4" />
            {t('reports:customReport')}
          </Button>
        </div>
      </SidebarHeaderShell>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <ReportTypeCard
            key={report.id}
            icon={report.icon}
            title={report.title}
            description={report.description}
            iconColor={report.iconColor}
            bgColor={report.bgColor}
            onClick={() => handleReportClick(report.id, report.title)}
          />
        ))}
      </div>

      <ReportHistory />

      <ReportConfigDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onGenerate={handleGenerateReport}
        reportType={selectedReportType}
        title={selectedReportTitle}
      />

      {dashboardDialogOpen && dashboardProject && dashboardData && (
        <ProjectDashboardDialog
          project={dashboardProject}
          budgetItems={dashboardData.budgetItems}
          financialEntries={dashboardData.financialEntries}
          companySettings={dashboardData.companySettings as {
            id?: string;
            company_name?: string;
            currency?: string;
            [key: string]: unknown;
          }}
          onClose={() => {
            setDashboardDialogOpen(false);
            setDashboardProject(null);
            setDashboardData(null);
          }}
        />
      )}

      {reportViewerOpen && reportViewerData && (
        <ReportViewerSimple
          isOpen={reportViewerOpen}
          onClose={() => {
            setReportViewerOpen(false);
            setReportViewerData(null);
          }}
          reportType={reportViewerData.reportType}
          reportData={reportViewerData.reportData}
          reportTitle={reportViewerData.reportTitle}
        />
      )}
    </div>
  );
};

export default Reports;
