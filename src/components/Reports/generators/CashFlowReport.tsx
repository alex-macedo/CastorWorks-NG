import { ProfessionalPDF } from '@/utils/pdfGenerator';
import { formatCurrency, formatDate } from '@/utils/reportFormatters';
import { format, parseISO } from 'date-fns';
import type { ReportConfig } from '../ReportConfigDialog';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export async function generateCashFlowReport(
  project: Project,
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings | null,
  config: ReportConfig
) {
  const pdf = new ProfessionalPDF();
  
  // Header
  pdf.addHeader(companySettings, 'CASH FLOW REPORT');
  
  // Project Information
  pdf.addSectionTitle('Project Information');
  pdf.addKeyValue('Project Name', project.name);
  pdf.addKeyValue('Location', project.location || 'N/A');
  pdf.addKeyValue('Manager', project.manager || 'N/A');
  pdf.addKeyValue('Report Date', formatDate(new Date()));
  pdf.addDivider();
  
  // Cash Flow Summary
  pdf.addSectionTitle('Cash Flow Summary');
  const totalIncome = financialEntries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = financialEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0);
  const netCashFlow = totalIncome - totalExpenses;
  
  pdf.addKeyValue('Total Cash Inflow', formatCurrency(totalIncome));
  pdf.addKeyValue('Total Cash Outflow', formatCurrency(totalExpenses));
  pdf.addKeyValue('Net Cash Flow', formatCurrency(netCashFlow));
  pdf.addKeyValue('Cash Flow Status', netCashFlow >= 0 ? 'Positive' : 'Negative');
  pdf.addDivider();
  
  // Monthly Cash Flow Analysis
  pdf.addSectionTitle('Monthly Cash Flow Analysis');
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
  
  const monthlyRows = Object.entries(monthlyFlow)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, flow]) => {
      const netFlow = flow.income - flow.expenses;
      return [
        format(parseISO(month + '-01'), 'MMMM yyyy'),
        formatCurrency(flow.income),
        formatCurrency(flow.expenses),
        formatCurrency(netFlow),
        netFlow >= 0 ? 'Positive' : 'Negative'
      ];
    });
  
  if (monthlyRows.length > 0) {
    pdf.addTable(
      ['Month', 'Income', 'Expenses', 'Net Flow', 'Status'],
      monthlyRows
    );
  }
  
  // Cash Flow by Category
  pdf.addSectionTitle('Cash Flow by Category');
  const categoryFlow = financialEntries.reduce((acc, entry) => {
    const category = entry.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { income: 0, expenses: 0 };
    }
    if (entry.entry_type === 'income') {
      acc[category].income += Number(entry.amount);
    } else {
      acc[category].expenses += Number(entry.amount);
    }
    return acc;
  }, {} as Record<string, { income: number; expenses: number }>);
  
  const categoryRows = Object.entries(categoryFlow).map(([category, flow]) => {
    const netFlow = flow.income - flow.expenses;
    return [
      category,
      formatCurrency(flow.income),
      formatCurrency(flow.expenses),
      formatCurrency(netFlow)
    ];
  });
  
  if (categoryRows.length > 0) {
    pdf.addTable(
      ['Category', 'Income', 'Expenses', 'Net Flow'],
      categoryRows
    );
  }
  
  // Recent Transactions
  if (financialEntries.length > 0) {
    pdf.addSectionTitle('Recent Transactions');
    const recentEntries = financialEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
      
    const transactionRows = recentEntries.map(entry => [
      formatDate(entry.date),
      entry.description || 'N/A',
      entry.category || 'N/A',
      entry.entry_type === 'income' ? 'In' : 'Out',
      formatCurrency(Number(entry.amount))
    ]);
    
    pdf.addTable(
      ['Date', 'Description', 'Category', 'Type', 'Amount'],
      transactionRows
    );
  }
  
  // Cash Flow Projections (if we have recent data)
  if (monthlyRows.length >= 3) {
    pdf.addSectionTitle('Cash Flow Projection');
    const lastThreeMonths = monthlyRows.slice(-3);
    const avgIncome = lastThreeMonths.reduce((sum, row) => sum + parseFloat(row[1].replace(/[^0-9.-]+/g, '')), 0) / 3;
    const avgExpenses = lastThreeMonths.reduce((sum, row) => sum + parseFloat(row[2].replace(/[^0-9.-]+/g, '')), 0) / 3;
    const projectedNetFlow = avgIncome - avgExpenses;
    
    pdf.addKeyValue('Projected Monthly Income', formatCurrency(avgIncome));
    pdf.addKeyValue('Projected Monthly Expenses', formatCurrency(avgExpenses));
    pdf.addKeyValue('Projected Net Cash Flow', formatCurrency(projectedNetFlow));
    
    pdf.addParagraph('* Projection based on average of last 3 months');
  }
  
  // Save and open the PDF
  pdf.save(`cash-flow-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}