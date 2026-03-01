import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateProfitabilityReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'PROFITABILITY ANALYSIS REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Total Area', project.total_area ? `${project.total_area} m²` : 'N/A');
  pdf.addKeyValue('Budget Total', formatCurrency(project.budget_total));
  pdf.addKeyValue('Report Date', formatDate(new Date()));
  pdf.addDivider();
  
  // Profitability Analysis
  pdf.addSectionTitle('Profitability Analysis');
  const totalRevenue = financialEntries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCosts = financialEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0);
  const grossProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
  const budgetedProfit = project.budget_total - budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  const profitVariance = grossProfit - budgetedProfit;
  
  pdf.addKeyValue('Total Revenue', formatCurrency(totalRevenue));
  pdf.addKeyValue('Total Costs', formatCurrency(totalCosts));
  pdf.addKeyValue('Gross Profit', formatCurrency(grossProfit));
  pdf.addKeyValue('Profit Margin', `${profitMargin.toFixed(2)}%`);
  pdf.addKeyValue('Budgeted Profit', formatCurrency(budgetedProfit));
  pdf.addKeyValue('Profit Variance', formatCurrency(profitVariance));
  
  const profitPerSqm = project.total_area && project.total_area > 0 ? grossProfit / project.total_area : 0;
  if (project.total_area && project.total_area > 0) {
    pdf.addKeyValue('Profit per m²', formatCurrency(profitPerSqm));
  }
  pdf.addDivider();
  
  // Cost Breakdown Analysis
  pdf.addSectionTitle('Cost Structure Analysis');
  const costByCategory = financialEntries
    .filter(e => e.entry_type === 'expense')
    .reduce((acc, entry) => {
      const category = entry.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + Number(entry.amount);
      return acc;
    }, {} as Record<string, number>);
  
  const costRows = Object.entries(costByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, amount]) => [
      category,
      formatCurrency(amount),
      `${totalCosts > 0 ? ((amount / totalCosts) * 100).toFixed(1) : 0}%`,
      `${totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0}%`
    ]);
  
  if (costRows.length > 0) {
    pdf.addTable(
      ['Cost Category', 'Amount', '% of Total Costs', '% of Revenue'],
      costRows
    );
  }
  
  // ROI Analysis
  pdf.addSectionTitle('Return on Investment (ROI)');
  const totalInvestment = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  const roi = totalInvestment > 0 ? ((grossProfit / totalInvestment) * 100) : 0;
  const paybackPeriod = grossProfit > 0 ? totalInvestment / (grossProfit / 12) : 0; // months
  
  pdf.addKeyValue('Total Investment', formatCurrency(totalInvestment));
  pdf.addKeyValue('Return on Investment (ROI)', `${roi.toFixed(2)}%`);
  if (paybackPeriod > 0 && paybackPeriod < 1000) {
    pdf.addKeyValue('Estimated Payback Period', `${paybackPeriod.toFixed(1)} months`);
  }
  
  // Performance Benchmarks
  pdf.addSectionTitle('Performance Benchmarks');
  const industryBenchmarks = [
    { metric: 'Profit Margin', current: profitMargin, benchmark: 15, unit: '%' },
    { metric: 'ROI', current: roi, benchmark: 20, unit: '%' }
  ];
  
  const benchmarkRows = industryBenchmarks.map(item => [
    item.metric,
    `${item.current.toFixed(1)}${item.unit}`,
    `${item.benchmark}${item.unit}`,
    item.current >= item.benchmark ? 'Above' : 'Below'
  ]);
  
  pdf.addTable(
    ['Metric', 'Current', 'Industry Benchmark', 'Performance'],
    benchmarkRows
  );
  
  // Recommendations
  pdf.addSectionTitle('Profitability Recommendations');
  const recommendations = [];
  
  if (profitMargin < 10) {
    recommendations.push('• Profit margin below 10%. Consider cost reduction strategies.');
  }
  if (roi < 15) {
    recommendations.push('• ROI below industry standard. Evaluate investment efficiency.');
  }
  if (profitVariance < 0) {
    recommendations.push('• Actual profit below budget. Review cost control measures.');
  }
  if (recommendations.length === 0) {
    recommendations.push('• Project profitability is within acceptable parameters.');
  }
  
  recommendations.forEach(rec => {
    pdf.addParagraph(rec);
  });
  
  // Save and open the PDF
  pdf.save(`profitability-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}