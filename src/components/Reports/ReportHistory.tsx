import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar } from 'lucide-react';
import { useGeneratedReports } from '@/hooks/useGeneratedReports';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalization } from '@/contexts/LocalizationContext';
import { generateProjectDashboardReport } from './generators/generateProjectDashboardReport';
import { useProjects } from '@/hooks/useProjects';
import { useProjectBudgetItems } from '@/hooks/useProjectBudgetItems';
import { useFinancialEntries } from '@/hooks/useFinancialEntries';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function ReportHistory() {
  const { reports, isLoading } = useGeneratedReports();
  const { t, language, currency, dateFormat } = useLocalization();
  const { projects } = useProjects();
  const { settings: companySettings } = useCompanySettings();
  const { toast } = useToast();

  const getCategoryLabel = (reportType: string) => {
    const categoryMap: Record<string, string> = {
      financial: t('reports:reportTypeLabels.financial'),
      projectStatus: t('reports:reportTypeLabels.projectStatus'),
      budget: t('reports:reportTypeLabels.budget'),
      project_dashboard: t('reports:reportTypes.projectDashboard.title'),
    };
    return categoryMap[reportType] || reportType;
  };

  const handleViewReport = async (report: { id: string; project_id: string; report_type: string; report_name: string; generated_at: string; }) => {
    try {
      if (report.report_type === 'project_dashboard') {
        // Find the project
        const project = projects?.find(p => p.id === report.project_id);
        if (!project) {
          toast({ title: t('common:error'), description: t('common:toast.projectNotFound'), variant: 'destructive' });
          return;
        }

        toast({
          title: t('reports:dashboard.generatingReport'),
          description: t('reports:dashboard.openingNewWindow'),
        });

        // Get project data for report generation
        const { data: budgetItems } = await supabase
          .from('project_budget_items')
          .select('*')
          .eq('project_id', project.id);

        const { data: financialEntries } = await supabase
          .from('project_financial_entries')
          .select('*')
          .eq('project_id', project.id);

        const { data: companySettingsData } = await supabase
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
        };

        await generateProjectDashboardReport(
          project,
          budgetItems || [],
          financialEntries || [],
          companySettingsData || {},
          reportConfig,
          localizationConfig
        );

        toast({
          title: t('reports:reportReady'),
          description: t('common:reportOpened'),
        });
      } else {
        toast({ 
          title: t('common:info'), 
          description: t('reports:errors.notSupportedFromHistory') 
        });
      }
    } catch (error) {
      console.error('Error viewing report:', error);
      toast({ title: t('common:error'), description: t('reports:errors.failedToView'), variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports:recentReports") }</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("reports:recentReports") }</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("reports:noReportsGeneratedYet")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports:recentReports')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {reports.slice(0, 5).map((report) => (
          <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{report.report_name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(report.report_type)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(report.generated_at), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              title={t('reports:download')}
              onClick={() => handleViewReport(report)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
