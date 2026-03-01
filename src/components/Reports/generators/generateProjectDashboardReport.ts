import type { Database } from '@/integrations/supabase/types';
import { formatDate as formatDateUtil } from '@/utils/formatters';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];

interface CompanySettings {
  id?: string;
  company_name?: string;
  currency?: string;
  [key: string]: unknown;
}

interface ReportConfig {
  projectId: string;
  dateRange?: { from: Date; to: Date };
  includeCharts?: boolean;
  includeMaterials?: boolean;
  includeLabor?: boolean;
  groupBy?: 'category' | 'phase' | 'month';
}

interface LocalizationConfig {
  t: (key: string) => string;
  language: string;
  currency: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';
}

export async function generateProjectDashboardReport(
  project: Project,
  budgetItems: BudgetItem[],
  financialEntries: FinancialEntry[],
  companySettings: CompanySettings,
  config: ReportConfig,
  localization: LocalizationConfig
) {
  const { t, language, currency, dateFormat } = localization;

  // Helper function to format currency based on current locale
  const formatCurrency = (value: number) => {
    return value.toLocaleString(language, {
      style: 'currency',
      currency: currency
    });
  };

  // Helper function to format date based on user preferences
  const formatDate = (date: Date) => {
    return formatDateUtil(date, dateFormat);
  };

  // Calculate project metrics
  const totalBudget = budgetItems?.reduce((sum, item) => sum + item.budgeted_amount, 0) || 0;
  const totalExpenses = financialEntries?.filter(e => e.entry_type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0) || 0;
  const completionPercentage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  // Create a new window with the report
  const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  if (!reportWindow) {
    // Pop-ups are blocked - the calling code will handle showing the dialog
    throw new Error('Pop-up blocked');
  }

  // Create a simple HTML document with the report data
  const reportContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${t('reports:dashboard.title')} - ${project.name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #1e40af;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 2.5em;
          }
          .header h2 {
            color: #666;
            margin: 10px 0;
            font-weight: normal;
          }
          .metrics { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .metric-card { 
            border: 1px solid #e5e7eb; 
            padding: 20px; 
            border-radius: 12px; 
            background: #f9fafb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .metric-card h3 {
            margin-top: 0;
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .chart-container { 
            margin-bottom: 30px; 
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            background: white;
          }
          .print-button { 
            margin: 20px 0; 
            text-align: center; 
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
          }
          .print-button button {
            background: #1e40af;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .print-button button:hover {
            background: #1d4ed8;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 15px;
            background: white;
          }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 12px;
            text-align: left;
          }
          th {
            background: #f3f4f6;
            font-weight: bold;
            color: #1e40af;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          @media print { 
            .print-button { display: none; }
            body { margin: 0; }
            .header { border-bottom: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t('reports:dashboard.title')}</h1>
          <h2>${project.name}</h2>
          <p>${t('reports:dashboard.generatedOn')}: ${formatDate(new Date())}</p>
        </div>
        
        <div class="print-button">
          <button onclick="window.print()" title="${t('reports:dashboard.printReport')}">
            📄 ${t('reports:dashboard.printReport')}
          </button>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <h3>${t('reports:dashboard.project')}</h3>
            <p><strong>${t('reports:dashboard.name')}:</strong> ${project.name}</p>
            <p><strong>${t('reports:dashboard.address')}:</strong> ${project.construction_address || 'N/A'}</p>
          </div>
          <div class="metric-card">
            <h3>${t('reports:dashboard.completionPercentage')}</h3>
            <p style="font-size: 2em; text-align: center;">${completionPercentage.toFixed(1)}%</p>
          </div>
          <div class="metric-card">
            <h3>${t('reports:dashboard.expectedDeliveryDate')}</h3>
            <p style="text-align: center;">${project.end_date ? formatDate(new Date(project.end_date)) : 'N/A'}</p>
          </div>
          <div class="metric-card">
            <h3>${t('reports:dashboard.budget')}</h3>
            <p><strong>${t('reports:dashboard.totalSpent')}:</strong> ${formatCurrency(totalExpenses)}</p>
            <p><strong>${t('reports:dashboard.budget')}:</strong> ${formatCurrency(totalBudget)}</p>
          </div>
        </div>

        <div class="chart-container">
          <h3>${t('reports:dashboard.projectSummary')}</h3>
          <p>${t('reports:dashboard.summaryDescription')}</p>
          
          <h4>${t('reports:dashboard.categoryBreakdown')}:</h4>
          <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 8px;">${t('reports:dashboard.category')}</th>
                <th style="padding: 8px;">${t('reports:dashboard.budget')}</th>
                <th style="padding: 8px;">${t('reports:dashboard.spent')}</th>
                <th style="padding: 8px;">${t('reports:dashboard.percentUsed')}</th>
                <th style="padding: 8px;">${t('reports:dashboard.status')}</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(budgetItems?.reduce((acc, item) => {
                acc[item.category] = (acc[item.category] || 0) + item.budgeted_amount;
                return acc;
              }, {} as Record<string, number>) || {}).map(category => {
                const budgetAmount = budgetItems?.filter(item => item.category === category).reduce((sum, item) => sum + item.budgeted_amount, 0) || 0;
                const spentAmount = financialEntries?.filter(e => e.entry_type === 'expense' && e.category === category).reduce((sum, entry) => sum + entry.amount, 0) || 0;
                const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
                const status = percentage <= 100 ? t('reports:dashboard.statusOk') : t('reports:dashboard.statusExceeded');
                const statusColor = percentage <= 100 ? 'green' : 'red';
                
                return `
                  <tr>
                    <td style="padding: 8px;">${category}</td>
                    <td style="padding: 8px;">${formatCurrency(budgetAmount)}</td>
                    <td style="padding: 8px;">${formatCurrency(spentAmount)}</td>
                    <td style="padding: 8px;">${percentage.toFixed(1)}%</td>
                    <td style="padding: 8px; color: ${statusColor}; font-weight: bold;">${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;

  reportWindow.document.write(reportContent);
  reportWindow.document.close();
  
  // Focus the new window
  reportWindow.focus();
}