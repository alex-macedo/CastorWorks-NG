import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateBudgetVsActualReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'BUDGET VS ACTUAL REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Manager', project.manager || 'N/A');
  pdf.addKeyValue('Report Date', formatDate(new Date()));
  pdf.addDivider();
  
  // Overall Summary
  pdf.addSectionTitle('Overall Budget Performance');
  const totalBudget = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  // Use standardized actual computation from financial entries
  const totalActual = computeTotalActual(financialEntries, 'all');
  const variance = totalBudget - totalActual;
  const variancePercentage = totalBudget > 0 ? ((variance / totalBudget) * 100) : 0;
  
  pdf.addKeyValue('Total Budgeted', formatCurrency(totalBudget));
  pdf.addKeyValue('Total Actual', formatCurrency(totalActual));
  pdf.addKeyValue('Variance', formatCurrency(variance));
  pdf.addKeyValue('Variance %', `${variancePercentage.toFixed(1)}%`);
  pdf.addKeyValue('Budget Utilization', `${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%`);
  pdf.addDivider();
  
  // Detailed Budget vs Actual by Category
  pdf.addSectionTitle('Budget vs Actual by Category');

  // Build budget summary by category
  const budgetByCategory = budgetItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { budgeted: 0, items: 0 };
    }
    acc[item.category].budgeted += Number(item.budgeted_amount);
    acc[item.category].items++;
    return acc;
  }, {} as Record<string, { budgeted: number; items: number }>);

  // Get standardized actuals by category from financial entries
  const actualByCategory = computeActualsByCategory(financialEntries, 'all');
  const actualByCategoryMap = Object.fromEntries(
    actualByCategory.map((a) => [a.category, a.actual])
  );

  // Combine budget and actual data
  const categoryAnalysis = Object.entries(budgetByCategory).reduce(
    (acc, [category, budgetData]) => {
      acc[category] = {
        budgeted: budgetData.budgeted,
        actual: actualByCategoryMap[category] ?? 0,
        items: budgetData.items,
      };
      return acc;
    },
    {} as Record<string, { budgeted: number; actual: number; items: number }>
  );
  
  const categoryRows = Object.entries(categoryAnalysis).map(([category, data]) => {
    const variance = data.budgeted - data.actual;
    const variancePercentage = data.budgeted > 0 ? ((variance / data.budgeted) * 100) : 0;
    const status = variance > 0 ? 'Under Budget' : variance < 0 ? 'Over Budget' : 'On Budget';
    
    return [
      category,
      data.items.toString(),
      formatCurrency(data.budgeted),
      formatCurrency(data.actual),
      formatCurrency(variance),
      `${variancePercentage.toFixed(1)}%`,
      status
    ];
  });
  
  pdf.addTable(
    ['Category', 'Items', 'Budgeted', 'Actual', 'Variance', 'Variance %', 'Status'],
    categoryRows
  );
  
  // Detailed Item Analysis (showing items with significant variances)
  // Note: Significant variances are computed based on standardized actuals from financial entries
  const significantVariances = budgetItems.filter(item => {
    const budgetedAmount = Number(item.budgeted_amount);
    // Get actual from standardized computation for this category
    const actualAmount = actualByCategoryMap[item.category] ?? 0;
    const variance = budgetedAmount - actualAmount;
    const variancePercentage = budgetedAmount > 0 ? Math.abs(variance / budgetedAmount) * 100 : 0;
    return variancePercentage > 10; // Show items with more than 10% variance
  }).sort((a, b) => {
    const budgetA = Number(a.budgeted_amount);
    const actualA = actualByCategoryMap[a.category] ?? 0;
    const varianceA = Math.abs(budgetA - actualA);

    const budgetB = Number(b.budgeted_amount);
    const actualB = actualByCategoryMap[b.category] ?? 0;
    const varianceB = Math.abs(budgetB - actualB);

    return varianceB - varianceA;
  });
  
  if (significantVariances.length > 0) {
    pdf.addSectionTitle('Items with Significant Variances (>10%)');
    
    const varianceRows = significantVariances.slice(0, 15).map(item => {
      const budgetedAmount = Number(item.budgeted_amount);
      const actualAmount = actualByCategoryMap[item.category] ?? 0;
      const variance = budgetedAmount - actualAmount;
      const variancePercentage = budgetedAmount > 0 ? ((variance / budgetedAmount) * 100) : 0;

      return [
        item.category,
        item.description || 'N/A',
        formatCurrency(budgetedAmount),
        formatCurrency(actualAmount),
        formatCurrency(variance),
        `${variancePercentage.toFixed(1)}%`
      ];
    });
    
    pdf.addTable(
      ['Category', 'Description', 'Budgeted', 'Actual', 'Variance', 'Variance %'],
      varianceRows
    );
  }
  
  // Performance Indicators
  pdf.addSectionTitle('Budget Performance Indicators');
  const overBudgetCategories = Object.entries(categoryAnalysis).filter(([, data]) => data.actual > data.budgeted).length;
  const underBudgetCategories = Object.entries(categoryAnalysis).filter(([, data]) => data.actual < data.budgeted).length;
  const onBudgetCategories = Object.entries(categoryAnalysis).filter(([, data]) => data.actual === data.budgeted).length;
  const totalCategories = Object.keys(categoryAnalysis).length;
  
  pdf.addKeyValue('Categories Over Budget', `${overBudgetCategories} of ${totalCategories}`);
  pdf.addKeyValue('Categories Under Budget', `${underBudgetCategories} of ${totalCategories}`);
  pdf.addKeyValue('Categories On Budget', `${onBudgetCategories} of ${totalCategories}`);
  
  const accuracy = totalCategories > 0 ? ((onBudgetCategories + underBudgetCategories) / totalCategories * 100) : 0;
  pdf.addKeyValue('Budget Accuracy', `${accuracy.toFixed(1)}%`);
  
  // Recommendations
  pdf.addSectionTitle('Recommendations');
  const recommendations = [];
  
  if (variancePercentage < -10) {
    recommendations.push('• Project is significantly over budget. Review and adjust spending.');
  } else if (variancePercentage > 20) {
    recommendations.push('• Project is significantly under budget. Consider reallocating funds.');
  }
  
  if (overBudgetCategories > underBudgetCategories) {
    recommendations.push('• Multiple categories are over budget. Implement stricter cost controls.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('• Budget performance is within acceptable parameters.');
  }
  
  recommendations.forEach(rec => {
    pdf.addParagraph(rec);
  });
  
  // Save and open the PDF
  pdf.save(`budget-vs-actual-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}