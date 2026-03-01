import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import {
  type ReportData,
  type ReportType,
  type FinancialEntry,
} from './viewers/types';
import type { ReportViewComponent } from './viewers/types';
export type { ReportType, ReportData } from './viewers/types';
import { ProjectStatusReportView } from './viewers/ProjectStatusReportView';
import { ProjectDashboardReportView } from './viewers/ProjectDashboardReportView';
import { FinancialSummaryReportView } from './viewers/FinancialSummaryReportView';
import { BudgetVsActualReportView } from './viewers/BudgetVsActualReportView';
import { CashFlowReportView } from './viewers/CashFlowReportView';
import { ProfitabilityReportView } from './viewers/ProfitabilityReportView';
import { MaterialsUsageReportView } from './viewers/MaterialsUsageReportView';
import { BudgetReportView } from './viewers/BudgetReportView';
import { MaterialsReportView } from './viewers/MaterialsReportView';
import { generateProjectStatusReport } from './generators/ProjectStatusReport';
import { generateFinancialSummaryReport } from './generators/FinancialSummaryReport';
import { generateBudgetVsActualReport } from './generators/BudgetVsActualReport';
import { generateCashFlowReport } from './generators/CashFlowReport';
import { generateProfitabilityReport } from './generators/ProfitabilityReport';
import { generateMaterialsUsageReport } from './generators/MaterialsUsageReport';
import { generateBudgetReport } from './generators/BudgetReport';
import { generateMaterialsReport } from './generators/MaterialsReport';
import { generateProjectDashboardReport } from './generators/generateProjectDashboardReport';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: ReportType;
  reportData: ReportData;
  reportTitle: string;
}

interface GeneratorHelpers {
  config: {
    projectId: string;
    includeCharts: boolean;
    includeMaterials: boolean;
    includeLabor: boolean;
    groupBy: 'category' | 'phase' | 'month';
  };
  localization: {
    t: (key: string) => string;
    language: string;
    currency: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';
  };
}

interface ReportViewerDefinition {
  label: string;
  component: ReportViewComponent;
  generator?: (params: {
    data: ReportData;
    projectEntries: FinancialEntry[];
    helpers: GeneratorHelpers;
  }) => Promise<void> | void;
  downloadLabel?: string;
}

const REPORT_DEFINITIONS: Record<ReportType, ReportViewerDefinition> = {
  projectStatus: {
    label: 'Project Status Report',
    component: ProjectStatusReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateProjectStatusReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  financialSummary: {
    label: 'Financial Summary Report',
    component: FinancialSummaryReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateFinancialSummaryReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  budgetVsActual: {
    label: 'Budget vs Actual Report',
    component: BudgetVsActualReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateBudgetVsActualReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  cashFlow: {
    label: 'Cash Flow Report',
    component: CashFlowReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateCashFlowReport(
        data.project,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  profitability: {
    label: 'Profitability Report',
    component: ProfitabilityReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateProfitabilityReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  materialsUsage: {
    label: 'Materials Usage Report',
    component: MaterialsUsageReportView,
    generator: async ({ data, helpers }) => {
      await generateMaterialsUsageReport(
        data.project,
        data.materials,
        data.companySettings,
        helpers.config
      );
    },
  },
  budget: {
    label: 'Budget Report',
    component: BudgetReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateBudgetReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings,
        helpers.config
      );
    },
  },
  materials: {
    label: 'Materials Report',
    component: MaterialsReportView,
    generator: async ({ data, helpers }) => {
      await generateMaterialsReport(
        data.project,
        data.materials,
        data.companySettings,
        helpers.config
      );
    },
  },
  projectDashboard: {
    label: 'Project Dashboard Report',
    component: ProjectDashboardReportView,
    generator: async ({ data, projectEntries, helpers }) => {
      await generateProjectDashboardReport(
        data.project,
        data.budgetItems,
        projectEntries,
        data.companySettings || {},
        helpers.config,
        helpers.localization
      );
    },
    downloadLabel: 'Open Full Dashboard',
  },
};

export function ReportViewer({
  isOpen,
  onClose,
  reportType,
  reportData,
  reportTitle,
}: ReportViewerProps) {
  const { formatDate } = useDateFormat();
  const { toast } = useToast();
  const localization = useLocalization();
  const { t, language, currency, dateFormat: userDateFormat } = localization;

  const definition = REPORT_DEFINITIONS[reportType];

  const projectFinancialEntries = useMemo(() => {
    return reportData.financialEntries.filter(
      entry => entry.project_id === reportData.project.id
    );
  }, [reportData]);

  const viewerData = useMemo<ReportData>(() => ({
    ...reportData,
    financialEntries: projectFinancialEntries,
  }), [reportData, projectFinancialEntries]);

  const ViewerComponent: ReportViewComponent | undefined = definition?.component;

  const generatorHelpers: GeneratorHelpers = useMemo(() => ({
    config: {
      projectId: reportData.project.id,
      includeCharts: true,
      includeMaterials: true,
      includeLabor: true,
      groupBy: 'category',
    },
    localization: {
      t,
      language,
      currency,
      dateFormat: userDateFormat,
    },
  }), [currency, language, reportData.project.id, t, userDateFormat]);

  const handleDownload = async () => {
    if (!definition?.generator) {
      toast({
        title: 'Viewer only',
        description: 'This report can only be viewed online at the moment.',
      });
      return;
    }

    try {
      await definition.generator({
        data: viewerData,
        projectEntries: projectFinancialEntries,
        helpers: generatorHelpers,
      });

      toast({
        title: 'Success',
        description: 'Report is ready.',
      });
    } catch (error) {
      console.error('Error generating report', error);
      toast({
        title: 'Error',
        description: 'Failed to generate the report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const downloadLabel = definition?.downloadLabel || 'Download PDF';
  const dialogTitle = definition?.label || reportTitle;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadLabel}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="print:p-0 print:shadow-none">
            {ViewerComponent ? (
              <ViewerComponent data={viewerData} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center text-gray-600">
                <FileText className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="font-medium">Viewer unavailable</p>
                  <p className="text-sm text-gray-500">
                    A preview for this report is not yet available. Please download the PDF instead.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t pt-4 flex justify-between items-center text-sm text-gray-500">
          <span>Use Ctrl+P to print this report</span>
          <span>Generated: {formatDate(new Date())}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
