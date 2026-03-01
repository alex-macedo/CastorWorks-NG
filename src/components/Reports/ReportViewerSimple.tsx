import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, X, Printer } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { ProjectStatusReportView } from './viewers/ProjectStatusReportView';
import { FinancialSummaryReportView } from './viewers/FinancialSummaryReportView';
import { BudgetVsActualReportView } from './viewers/BudgetVsActualReportView';
import { CashFlowReportView } from './viewers/CashFlowReportView';
import { ProfitabilityReportView } from './viewers/ProfitabilityReportView';
import { MaterialsUsageReportView } from './viewers/MaterialsUsageReportView';
import { BudgetReportView } from './viewers/BudgetReportView';
import { MaterialsReportView } from './viewers/MaterialsReportView';
import { ProjectDashboardReportView } from './viewers/ProjectDashboardReportView';
import { AIWeeklySummaryReportView } from './viewers/AIWeeklySummaryReportView';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { Database } from '@/integrations/supabase/types';

// Import PDF generators for download functionality
import { generateProjectStatusReport } from './generators/ProjectStatusReport';
import { generateFinancialSummaryReport } from './generators/FinancialSummaryReport';
import { generateBudgetVsActualReport } from './generators/BudgetVsActualReport';
import { generateCashFlowReport } from './generators/CashFlowReport';
import { generateProfitabilityReport } from './generators/ProfitabilityReport';
import { generateMaterialsUsageReport } from './generators/MaterialsUsageReport';
import { generateBudgetReport } from './generators/BudgetReport';
import { generateMaterialsReport } from './generators/MaterialsReport';

type Project = any;
type BudgetItem = any;
type FinancialEntry = any;
type Material = any;
type CompanySettings = any;

export type ReportType = 
  | 'projectStatus'
  | 'financialSummary'
  | 'budgetVsActual'
  | 'cashFlow'
  | 'profitability'
  | 'materialsUsage'
  | 'budget'
  | 'materials'
  | 'projectDashboard'
  | 'aiWeeklySummary';

interface ReportData {
  project: Project;
  budgetItems: BudgetItem[];
  financialEntries: FinancialEntry[];
  materials: Material[];
  companySettings: CompanySettings | null;
}

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  reportData: ReportData;
  reportTitle: string;
}

export function ReportViewer({
  isOpen,
  onClose,
  reportType,
  reportData,
  reportTitle
}: ReportViewerProps) {
  const { formatDate } = useDateFormat();
  const { toast } = useToast();
  const { t, language } = useLocalization();

  const getReportTypeLabel = (type: ReportType): string => {
    const labelMap: Record<ReportType, string> = {
      projectStatus: t('reports:projectStatus.title'),
      financialSummary: t('reports:financialSummary.title'),
      budgetVsActual: t('reports:budgetVsActual.title'),
      cashFlow: t('reports:cashFlow.title'),
      profitability: t('reports:profitability.title'),
      materialsUsage: t('reports:materialsUsage.title'),
      budget: t('reports:budget.title'),
      materials: t('reports:materials.title'),
      projectDashboard: t('reports:dashboard.title'),
      aiWeeklySummary: t('reports:reportTypes.aiWeeklySummary.title')
    };
    return labelMap[type] || type;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const config = {
        projectId: reportData.project.id,
        includeCharts: true,
        includeMaterials: true,
        includeLabor: true,
        groupBy: 'category' as const
      };

      // Filter financial entries for this project
      const projectFinancialEntries = reportData.financialEntries.filter(
        e => e.project_id === reportData.project.id
      );

      switch (reportType) {
        case 'projectStatus':
          await generateProjectStatusReport(
            reportData.project,
            reportData.budgetItems,
            projectFinancialEntries,
            reportData.companySettings,
            config
          );
          break;
        case 'financialSummary':
          await generateFinancialSummaryReport(
            reportData.project,
            reportData.budgetItems,
            projectFinancialEntries,
            reportData.companySettings,
            config,
            language
          );
          break;
        case 'budgetVsActual':
          await generateBudgetVsActualReport(
            reportData.project,
            reportData.budgetItems,
            projectFinancialEntries,
            reportData.companySettings,
            config
          );
          break;
        case 'cashFlow':
          await generateCashFlowReport(
            reportData.project,
            projectFinancialEntries,
            reportData.companySettings,
            config
          );
          break;
        case 'profitability':
          await generateProfitabilityReport(
            reportData.project,
            reportData.budgetItems,
            projectFinancialEntries,
            reportData.companySettings,
            config
          );
          break;
        case 'materialsUsage':
          await generateMaterialsUsageReport(
            reportData.project,
            reportData.materials,
            reportData.companySettings,
            config
          );
          break;
        case 'budget':
          await generateBudgetReport(
            reportData.project,
            reportData.budgetItems,
            projectFinancialEntries,
            reportData.companySettings,
            config
          );
          break;
        case 'materials':
          await generateMaterialsReport(
            reportData.project,
            reportData.materials,
            reportData.companySettings,
            config
          );
          break;
        default:
          throw new Error('Unsupported report type for PDF generation');
      }

      toast({
        title: 'Success',
        description: 'PDF report downloaded successfully',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    }
  };

  const renderReportContent = () => {
    const projectData = {
      ...reportData,
      financialEntries: reportData.financialEntries.filter(e => e.project_id === reportData.project.id)
    };

    switch (reportType) {
      case 'projectStatus':
        return <ProjectStatusReportView data={projectData} />;
      case 'financialSummary':
        return <FinancialSummaryReportView data={projectData} />;
      case 'budgetVsActual':
        return <BudgetVsActualReportView data={projectData} />;
      case 'cashFlow':
        return <CashFlowReportView data={projectData} />;
      case 'profitability':
        return <ProfitabilityReportView data={projectData} />;
      case 'materialsUsage':
        return <MaterialsUsageReportView data={projectData} />;
      case 'budget':
        return <BudgetReportView data={projectData} />;
      case 'materials':
        return <MaterialsReportView data={projectData} />;
      case 'projectDashboard':
        return <ProjectDashboardReportView data={projectData} />;
      case 'aiWeeklySummary':
        return <AIWeeklySummaryReportView data={projectData} />;
      default:
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('reports:viewer.reportTypeNotSupported')}</h3>
              <p className="text-gray-600 mb-4">
                {getReportTypeLabel(reportType)} {t('reports:viewer.reportNotSupportedMessage')}
              </p>
              <p className="text-sm text-gray-500">
                {t('reports:viewer.pdfDownloadAvailable')}
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {getReportTypeLabel(reportType)}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 print:hidden"
              >
                <Printer className="h-4 w-4" />
                {t('reports:viewer.print')}
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 print:hidden"
              >
                <Download className="h-4 w-4" />
                {t('reports:viewer.downloadPdf')}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 print:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="print:p-0 print:shadow-none">
            {renderReportContent()}
          </div>
        </div>
        
        <div className="flex-shrink-0 border-t pt-4 flex justify-between items-center text-sm text-gray-500 print:hidden">
          <span>{t('reports:viewer.printInstruction')}</span>
          <span>{t('reports:viewer.generatedOn')}: {formatDate(new Date())}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}