import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import { computeTotalActual } from '@/utils/budgetActualsComputation';
import { format, parseISO } from 'date-fns';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateFinancialSummaryReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig,
  language: string
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'FINANCIAL SUMMARY REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Manager', project.manager || 'N/A');
  pdf.addKeyValue('Report Date', 
    new Intl.DateTimeFormat(language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  );
  pdf.addDivider();
  
  // Financial Overview
  pdf.addSectionTitle('Financial Overview');
  const totalBudget = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount), 0);
  // Use standardized actual computation from financial entries
  const totalActual = computeTotalActual(financialEntries, 'all');
  const totalIncome = financialEntries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = financialEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;
  
  pdf.addKeyValue('Total Project Budget', formatCurrency(totalBudget));
  pdf.addKeyValue('Amount Spent (Budget)', formatCurrency(totalActual));
  pdf.addKeyValue('Budget Utilization', `${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%`);
  pdf.addKeyValue('Total Income', formatCurrency(totalIncome));
  pdf.addKeyValue('Total Expenses', formatCurrency(totalExpenses));
  pdf.addKeyValue('Net Profit/Loss', formatCurrency(netProfit));
  pdf.addKeyValue('Profit Margin', `${profitMargin.toFixed(1)}%`);
  pdf.addDivider();
  
  // Income Breakdown
  if (financialEntries.some(e => e.entry_type === 'income')) {
    pdf.addSectionTitle('Income Breakdown');
    const incomeByCategory = financialEntries
      .filter(e => e.entry_type === 'income')
      .reduce((acc, entry) => {
        const category = entry.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(entry.amount);
        return acc;
      }, {} as Record<string, number>);
    
    const incomeRows = Object.entries(incomeByCategory).map(([category, amount]) => [
      category,
      formatCurrency(amount),
      `${totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : 0}%`
    ]);
    
    pdf.addTable(
      ['Category', 'Amount', 'Percentage'],
      incomeRows
    );
  }
  
  // Expense Breakdown
  if (financialEntries.some(e => e.entry_type === 'expense')) {
    pdf.addSectionTitle('Expense Breakdown');
    const expenseByCategory = financialEntries
      .filter(e => e.entry_type === 'expense')
      .reduce((acc, entry) => {
        const category = entry.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(entry.amount);
        return acc;
      }, {} as Record<string, number>);
    
    const expenseRows = Object.entries(expenseByCategory).map(([category, amount]) => [
      category,
      formatCurrency(amount),
      `${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%`
    ]);
    
    pdf.addTable(
      ['Category', 'Amount', 'Percentage'],
      expenseRows
    );
  }
  
  // Cash Flow Analysis
  pdf.addSectionTitle('Monthly Cash Flow');
  const monthlyFlow = financialEntries.reduce((acc, entry) => {
    const month = new Date(entry.date).toISOString().slice(0, 7); // YYYY-MM format
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0 };
    }
    if (entry.entry_type === 'income') {
      acc[month].income += Number(entry.amount);
    } else {
      acc[month].expenses += Number(entry.amount);
    }
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>);
  
  const cashFlowRows = Object.entries(monthlyFlow)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, flow]) => [
              new Intl.DateTimeFormat(language, {
                year: 'numeric',
                month: 'long'
              }).format(parseISO(month + '-01')),
      formatCurrency(flow.income),
      formatCurrency(flow.expenses),
      formatCurrency(flow.income - flow.expenses)
    ]);
  
  if (cashFlowRows.length > 0) {
    pdf.addTable(
      ['Month', 'Income', 'Expenses', 'Net Flow'],
      cashFlowRows
    );
  }
  
  // Payment Methods Analysis
  pdf.addSectionTitle('Payment Methods Usage');
  const paymentMethods = financialEntries.reduce((acc, entry) => {
    const method = entry.payment_method || 'Unspecified';
    acc[method] = (acc[method] || 0) + Number(entry.amount);
    return acc;
  }, {} as Record<string, number>);
  
  const totalPayments = Object.values(paymentMethods).reduce((sum, amount) => sum + amount, 0);
  const paymentRows = Object.entries(paymentMethods).map(([method, amount]) => [
    method,
    formatCurrency(amount),
    `${totalPayments > 0 ? ((amount / totalPayments) * 100).toFixed(1) : 0}%`
  ]);
  
  if (paymentRows.length > 0) {
    pdf.addTable(
      ['Payment Method', 'Total Amount', 'Percentage'],
      paymentRows
    );
  }
  
  // Save and open the PDF
  pdf.save(`financial-summary-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}