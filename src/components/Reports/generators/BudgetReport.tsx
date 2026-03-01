import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateBudgetReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'BUDGET REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Manager', project.manager || 'N/A');
  pdf.addKeyValue('Status', project.schedule_status || project.status);
  pdf.addDivider();
  
  // Budget Breakdown
  pdf.addSectionTitle('Budget Breakdown');

  // Build budget by category
  const budgetByCategory = budgetItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = 0;
    }
    acc[item.category] += Number(item.budgeted_amount);
    return acc;
  }, {} as Record<string, number>);

  // Get standardized actuals by category from financial entries
  const actualByCategory = computeActualsByCategory(financialEntries, 'all');
  const actualByCategoryMap = Object.fromEntries(
    actualByCategory.map((a) => [a.category, a.actual])
  );

  // Combine budget and actual data
  const budgetRows = Object.entries(budgetByCategory).map(([category, budgeted]) => {
    const actual = actualByCategoryMap[category] ?? 0;
    const variance = budgeted - actual;
    const percentage = budgeted > 0 ? ((actual / budgeted) * 100) : 0;

    return [
      category,
      formatCurrency(budgeted),
      formatCurrency(actual),
      formatCurrency(variance),
      `${percentage.toFixed(1)}%`
    ];
  });
  
  pdf.addTable(
    ['Category', 'Budgeted', 'Actual', 'Variance', '% Used'],
    budgetRows
  );
  
  // Summary
  const totalBudgeted = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  const totalActual = computeTotalActual(financialEntries, 'all');
  const variance = totalBudgeted - totalActual;
  
  pdf.addSummaryBox([
    { label: 'Total Budgeted', value: formatCurrency(totalBudgeted) },
    { label: 'Total Spent', value: formatCurrency(totalActual) },
    { label: 'Remaining', value: formatCurrency(variance), highlight: true },
    { label: 'Budget Usage', value: `${((totalActual / totalBudgeted) * 100).toFixed(1)}%`, highlight: true }
  ]);
  
  // Recent Expenses
  if (financialEntries.length > 0) {
    pdf.addSectionTitle('Recent Expenses');
    const expenseRows = financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .slice(0, 10)
      .map(entry => [
        formatDate(entry.date),
        entry.description || 'N/A',
        entry.category,
        formatCurrency(Number(entry.amount))
      ]);
    
    pdf.addTable(
      ['Date', 'Description', 'Category', 'Amount'],
      expenseRows
    );
  }
  
  // Save
  pdf.save(`Budget_Report_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
}
