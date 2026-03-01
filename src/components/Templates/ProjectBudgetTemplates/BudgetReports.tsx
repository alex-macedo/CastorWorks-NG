import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatDate } from '@/utils/reportFormatters';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, FileSpreadsheet, FileJson, BarChart3, PieChart, Table2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBudgetExport } from '@/hooks/useBudgetExport';
import { BudgetVisualization } from './BudgetVisualization';
import { CostByPhase } from './CostByPhase';
import { MaterialVsLabor } from './MaterialVsLabor';

interface BudgetReportsProps {
  budgetId: string;
  projectId: string;
}

export const BudgetReports = ({ budgetId, projectId }: BudgetReportsProps) => {
  const { t, dateFormat } = useLocalization();
  const [activeTab, setActiveTab] = useState('overview');
  const { exportPDF, exportExcel, exportJSON, isExporting } = useBudgetExport(budgetId);

  // Fetch budget data with all related information
  const { data: budgetData, isLoading } = useQuery({
    queryKey: ['budget-reports', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          project:projects(name),
          budget_line_items(
            *,
            phase:project_phases(name, description)
          ),
          budget_phase_totals(
            *,
            phase:project_phases(name, description)
          )
        `)
        .eq('id', budgetId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!budgetData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            {t('budgets.reports.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const phaseTotals = budgetData.budget_phase_totals || [];
  const lineItems = budgetData.budget_line_items || [];

  return (
    <div className="space-y-6">
      {/* Header with Export Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('budgets.reports.title')}</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                disabled={isExporting}
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('budgets.export.pdf')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={isExporting}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('budgets.export.excel')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportJSON}
                disabled={isExporting}
              >
                <FileJson className="w-4 h-4 mr-2" />
                {t('budgets.export.json')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            {t('budgets.reports.overview')}
          </TabsTrigger>
          <TabsTrigger value="phases" className="flex items-center gap-2">
            <Table2 className="w-4 h-4" />
            {t('budgets.reports.byPhase')}
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            {t('budgets.reports.analysis')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Visualizations */}
        <TabsContent value="overview" className="space-y-4">
          {phaseTotals.length > 0 ? (
            <BudgetVisualization phaseTotals={phaseTotals} lineItems={lineItems} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  {t('budgets.reports.noPhaseTotals')}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Phases Tab - Detailed Table */}
        <TabsContent value="phases" className="space-y-4">
          {phaseTotals.length > 0 ? (
            <CostByPhase phaseTotals={phaseTotals} showPercentages={true} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  {t('budgets.reports.noPhaseTotals')}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Analysis Tab - Material vs Labor */}
        <TabsContent value="analysis" className="space-y-4">
          {lineItems.length > 0 ? (
            <MaterialVsLabor lineItems={lineItems} showTopItems={10} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  {t('budgets.reports.noLineItems')}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Stats Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('budgets.reports.quickStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">{t('budgets.reports.totalPhases')}</div>
              <div className="text-2xl font-bold">{phaseTotals.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('budgets.reports.totalLineItems')}</div>
              <div className="text-2xl font-bold">{lineItems.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('budgets.status.label')}</div>
              <div className="text-2xl font-bold capitalize">{budgetData.status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t('budgets.reports.lastUpdated')}</div>
               <div className="text-sm font-medium">
                 {formatDate(new Date(budgetData.updated_at), dateFormat)}
               </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

