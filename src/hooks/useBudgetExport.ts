import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface BudgetData {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  project?: {
    name: string;
  };
  budget_line_items?: Array<{
    sinapi_code: string;
    description: string;
    unit: string;
    quantity: number;
    unit_cost_material: number;
    unit_cost_labor: number;
    total_cost: number;
    phase?: {
      name: string;
    };
  }>;
  budget_phase_totals?: Array<{
    total_material: number;
    total_labor: number;
    total_direct_cost: number;
    bdi_amount: number;
    final_total: number;
    phase: {
      name: string;
    };
  }>;
}

export const useBudgetExport = (budgetId: string) => {
  const { t } = useLocalization();
  const [isExporting, setIsExporting] = useState(false);

  const fetchBudgetData = async (): Promise<BudgetData | null> => {
    const { data, error } = await supabase
      .from('project_budgets')
      .select(`
        *,
        project:projects(name),
        budget_line_items(
          *,
          phase:project_phases(name)
        ),
        budget_phase_totals(
          *,
          phase:project_phases(name)
        )
      `)
      .eq('id', budgetId)
      .single();

    if (error) {
      console.error('Error fetching budget data:', error);
      toast.error(t('budgets.export.errorFetching'));
      return null;
    }

    return data as BudgetData;
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const budgetData = await fetchBudgetData();
      if (!budgetData) return;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(18);
      doc.text(budgetData.project?.name || 'Project', 14, 20);
      doc.setFontSize(14);
      doc.text(budgetData.name, 14, 30);
      
      doc.setFontSize(10);
      doc.text(`${t('budgets.status.label')}: ${t(`budgets.status.${budgetData.status}`)}`, 14, 38);
      doc.text(`${t('common.date')}: ${new Date(budgetData.created_at).toLocaleDateString()}`, 14, 44);

      // Line Items Table
      if (budgetData.budget_line_items && budgetData.budget_line_items.length > 0) {
        doc.setFontSize(12);
        doc.text(t('budgets.editor.lineItems'), 14, 54);

        const tableData = budgetData.budget_line_items.map(item => [
          item.sinapi_code,
          item.description,
          item.unit,
          item.quantity.toFixed(2),
          `$${item.unit_cost_material.toFixed(2)}`,
          `$${item.unit_cost_labor.toFixed(2)}`,
          `$${item.total_cost.toFixed(2)}`,
          item.phase?.name || '-'
        ]);

        autoTable(doc, {
          startY: 58,
          head: [[
            t('budgets.editor.sinapiCode'),
            t('budgets.editor.description'),
            t('budgets.editor.unit'),
            t('budgets.editor.quantity'),
            t('budgets.editor.material'),
            t('budgets.editor.labor'),
            t('budgets.editor.total'),
            t('budgets.phases.phase')
          ]],
          body: tableData,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      // Phase Totals Table
      if (budgetData.budget_phase_totals && budgetData.budget_phase_totals.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 58;
        doc.setFontSize(12);
        doc.text(t('budgets.phases.title'), 14, finalY + 10);

        const phaseData = budgetData.budget_phase_totals.map(phase => [
          phase.phase.name,
          `$${phase.total_direct_cost.toFixed(2)}`,
          `$${phase.bdi_amount.toFixed(2)}`,
          `$${phase.final_total.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: finalY + 14,
          head: [[
            t('budgets.phases.phase'),
            t('budgets.phases.directCost'),
            t('budgets.phases.bdiAmount'),
            t('budgets.phases.finalTotal')
          ]],
          body: phaseData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        // Grand Total
        const grandTotal = budgetData.budget_phase_totals.reduce((sum, p) => sum + p.final_total, 0);
        const finalTableY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${t('budgets.summary.grandTotal')}: $${grandTotal.toFixed(2)}`, 14, finalTableY + 10);
      }

      // Save
      doc.save(`budget-${budgetData.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
      toast.success(t('budgets.export.pdfSuccess'));
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(t('budgets.export.pdfError'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const budgetData = await fetchBudgetData();
      if (!budgetData) return;

      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Budget Name', budgetData.name],
        ['Project', budgetData.project?.name || '-'],
        ['Status', budgetData.status],
        ['Created', new Date(budgetData.created_at).toLocaleDateString()],
        [],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Line Items Sheet
      if (budgetData.budget_line_items && budgetData.budget_line_items.length > 0) {
        const lineItemsData = [
          [
            t('budgets.editor.sinapiCode'),
            t('budgets.editor.description'),
            t('budgets.editor.unit'),
            t('budgets.editor.quantity'),
            t('budgets.editor.material'),
            t('budgets.editor.labor'),
            t('budgets.editor.total'),
            t('budgets.phases.phase')
          ],
          ...budgetData.budget_line_items.map(item => [
            item.sinapi_code,
            item.description,
            item.unit,
            item.quantity,
            item.unit_cost_material,
            item.unit_cost_labor,
            item.total_cost,
            item.phase?.name || '-'
          ])
        ];
        const lineItemsSheet = XLSX.utils.aoa_to_sheet(lineItemsData);
        XLSX.utils.book_append_sheet(workbook, lineItemsSheet, 'Line Items');
      }

      // Phase Totals Sheet
      if (budgetData.budget_phase_totals && budgetData.budget_phase_totals.length > 0) {
        const phaseTotalsData = [
          [
            t('budgets.phases.phase'),
            t('budgets.phases.directCost'),
            t('budgets.phases.bdiAmount'),
            t('budgets.phases.finalTotal')
          ],
          ...budgetData.budget_phase_totals.map(phase => [
            phase.phase.name,
            phase.total_direct_cost,
            phase.bdi_amount,
            phase.final_total
          ]),
          [],
          [
            t('budgets.summary.grandTotal'),
            '',
            '',
            budgetData.budget_phase_totals.reduce((sum, p) => sum + p.final_total, 0)
          ]
        ];
        const phaseTotalsSheet = XLSX.utils.aoa_to_sheet(phaseTotalsData);
        XLSX.utils.book_append_sheet(workbook, phaseTotalsSheet, 'Phase Totals');
      }

      // Save
      XLSX.writeFile(workbook, `budget-${budgetData.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`);
      toast.success(t('budgets.export.excelSuccess'));
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error(t('budgets.export.excelError'));
    } finally {
      setIsExporting(false);
    }
  };

  const exportJSON = async () => {
    setIsExporting(true);
    try {
      const budgetData = await fetchBudgetData();
      if (!budgetData) return;

      const jsonString = JSON.stringify(budgetData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `budget-${budgetData.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(t('budgets.export.jsonSuccess'));
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast.error(t('budgets.export.jsonError'));
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportPDF,
    exportExcel,
    exportJSON,
    isExporting,
  };
};

