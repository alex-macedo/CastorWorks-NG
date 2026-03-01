import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateProjectStatusReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'PROJECT STATUS REPORT');
  
  // Project Overview
  pdf.addSectionTitle('Project Overview');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Manager', project.manager || 'N/A');
  pdf.addKeyValue('Status', project.schedule_status || project.status);
  pdf.addKeyValue('Start Date', project.start_date ? formatDate(project.start_date) : 'N/A');
  pdf.addKeyValue('Expected End Date', project.end_date ? formatDate(project.end_date) : 'N/A');
  pdf.addKeyValue('Total Area', project.total_area ? `${project.total_area} m²` : 'N/A');
  pdf.addDivider();
  
  // Progress Overview
  pdf.addSectionTitle('Progress Overview');
  const totalBudget = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  // Use standardized actual computation from financial entries
  const totalActual = computeTotalActual(financialEntries, 'all');
  const progressPercentage = totalBudget > 0 ? ((totalActual / totalBudget) * 100) : 0;
  
  pdf.addKeyValue('Overall Progress', `${progressPercentage.toFixed(1)}%`);
  pdf.addKeyValue('Total Budget', formatCurrency(totalBudget));
  pdf.addKeyValue('Amount Spent', formatCurrency(totalActual));
  pdf.addKeyValue('Remaining Budget', formatCurrency(totalBudget - totalActual));
  pdf.addDivider();
  
  // Status by Category
  pdf.addSectionTitle('Status by Category');
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
  const categoryStatus = Object.entries(budgetByCategory).reduce((acc, [category, budgeted]) => {
    acc[category] = {
      budgeted,
      actual: actualByCategoryMap[category] ?? 0,
    };
    return acc;
  }, {} as Record<string, { budgeted: number; actual: number }>);
  
  const statusRows = Object.entries(categoryStatus).map(([category, amounts]) => {
    const progress = amounts.budgeted > 0 ? ((amounts.actual / amounts.budgeted) * 100) : 0;
    const status = progress < 25 ? 'Not Started' : progress < 75 ? 'In Progress' : progress < 100 ? 'Near Completion' : 'Completed';
    
    return [
      category,
      formatCurrency(amounts.budgeted),
      formatCurrency(amounts.actual),
      `${progress.toFixed(1)}%`,
      status
    ];
  });
  
  pdf.addTable(
    ['Category', 'Budget', 'Spent', 'Progress', 'Status'],
    statusRows
  );
  
  // Financial Activity
  if (financialEntries.length > 0) {
    pdf.addSectionTitle('Recent Financial Activity');
    const recentEntries = financialEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
      
    const activityRows = recentEntries.map(entry => [
      formatDate(entry.date),
      entry.description || 'N/A',
      entry.category || 'N/A',
      entry.entry_type === 'income' ? '+' + formatCurrency(Number(entry.amount)) : '-' + formatCurrency(Number(entry.amount)),
      entry.payment_method || 'N/A'
    ]);
    
    pdf.addTable(
      ['Date', 'Description', 'Category', 'Amount', 'Method'],
      activityRows
    );
  }
  
  // Save and open the PDF
  pdf.save(`project-status-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}
