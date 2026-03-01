import { useState, useCallback, useEffect } from 'react';
import { generateINSSReport } from '@/features/tax/utils/generateINSSReport';
import type { TaxProject, INSSCalculatorResult } from '@/features/tax/types/tax.types';

export type ReportType = 'inss' | 'projectStatus' | 'financialSummary' | 'budgetVsActual' | 'cashFlow' | 'profitability' | 'materialsUsage' | 'budget' | 'materials';

interface INSSReportData {
  projectName: string;
  taxProject: TaxProject;
  calculation: INSSCalculatorResult;
  projectId?: string;
  constructionMonths?: number;
}

interface UseReportPDFParams {
  reportType: ReportType;
  reportData: INSSReportData | any; // Type-specific data
  t: any; // Translation function
  enabled?: boolean;
}

/**
 * Hook to generate PDF reports as blobs for display in modal
 */
export function useReportPDF({ reportType, reportData, t, enabled = true }: UseReportPDFParams) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const generatePDF = useCallback(async () => {
    if (!enabled) return;

    setIsGenerating(true);
    setError(null);

    try {
      let blob: Blob;

      switch (reportType) {
        case 'inss': {
          const data = reportData as INSSReportData;
          const result = await generateINSSReport(
            data.projectName,
            data.taxProject,
            data.calculation,
            t,
            data.projectId,
            data.constructionMonths,
            true // returnBlob = true
          );
          if (!result) {
            throw new Error('Failed to generate INSS report');
          }
          blob = result;
          break;
        }
        // Add other report types here as needed
        default:
          throw new Error(`PDF generation not yet implemented for report type: ${reportType}`);
      }

      setPdfBlob(blob);
      
      // Create blob URL for iframe display
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error generating PDF');
      setError(error);
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [reportType, reportData, t, enabled]);

  // Auto-generate when enabled and modal opens
  useEffect(() => {
    if (enabled && !pdfBlob && !isGenerating) {
      console.log('useReportPDF: Auto-generating PDF', { enabled, hasBlob: !!pdfBlob, isGenerating });
      generatePDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    pdfBlob,
    pdfUrl,
    isGenerating,
    error,
    generatePDF,
    clearPDF: useCallback(() => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      setPdfBlob(null);
      setPdfUrl(null);
      setError(null);
    }, [pdfUrl]),
  };
}
