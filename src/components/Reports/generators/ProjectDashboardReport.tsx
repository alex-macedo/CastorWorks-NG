import { BarChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalization } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];

interface CompanySettings {
  id?: string;
  company_name?: string;
  currency?: string;
  [key: string]: unknown;
}

interface ProjectDashboardReportProps {
  project: Project;
  budgetItems: BudgetItem[];
  financialEntries: FinancialEntry[];
  companySettings?: CompanySettings;
}

export function ProjectDashboardReport({ 
  project, 
  budgetItems, 
  financialEntries,
  companySettings 
}: ProjectDashboardReportProps) {
  const { t, language, currency } = useLocalization();
  
  // Helper function to format currency based on current locale
  const formatCurrency = (value: number) => {
    return value.toLocaleString(language, { 
      style: 'currency', 
      currency: currency 
    });
  };

  // Helper function to get date-fns locale based on current language
  const getDateLocale = () => {
    const locales = {
      'en-US': enUS,
      'pt-BR': ptBR,
      'es-ES': es,
      'fr-FR': fr,
    };
    return locales[language] || enUS;
  };

  // Calculate project metrics
  const totalBudget = budgetItems?.reduce((sum, item) => sum + item.budgeted_amount, 0) || 0;
  const totalExpenses = financialEntries?.filter(e => e.entry_type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0) || 0;
  const completionPercentage = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  // Get current date for header
  const currentDate = new Date();
  const formattedDate = format(currentDate, 'dd/MMM/yy', { locale: getDateLocale() }).toUpperCase();

  // Process monthly spending data for chart
  const monthlySpending = financialEntries
    ?.filter(e => e.entry_type === 'expense')
    .reduce((acc, entry) => {
      const month = format(new Date(entry.date), 'MMM', { locale: getDateLocale() }).toUpperCase();
      acc[month] = (acc[month] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

  // Generate all months data for chart (even if no data)
  const allMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthlyData = allMonths.map(month => ({
    month,
    amount: monthlySpending?.[month] || 0
  }));

  // Process category spending data
  const categorySpending = financialEntries
    ?.filter(e => e.entry_type === 'expense')
    .reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
      return acc;
    }, {} as Record<string, number>);

  const categoryBudget = budgetItems?.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.budgeted_amount;
    return acc;
  }, {} as Record<string, number>);

  // Create category data with proper names and values
  const predefinedCategories = [
    'FINISHING AND COMPLETION',
    'ADDITIONAL ITEMS', 
    'RENTALS',
    'MASONRY AND PLASTER',
    'ELECTRICAL',
    'HARDWARE',
    'PLUMBING',
    'TAXES/FEES',
    'SLAB',
    'WOOD',
    'LABOR',
    'PAINTING AND PUTTY',
    'PROJECT',
    'ROOFING',
    'EARTHWORKS'
  ];

  const categoryData = predefinedCategories.map(category => {
    const budget = categoryBudget?.[category] || 0;
    const spent = categorySpending?.[category] || 0;
    const status = spent <= budget ? 'OK' : '#REF!';
    
    return {
      category,
      budget: budget,
      spent: spent,
      status
    };
  }).filter(item => item.budget > 0 || item.spent > 0); // Only show categories with data

  return (
    <div className="w-full bg-white font-sans">
      {/* Header with blue background */}
      <div className="bg-blue-900 text-white text-center py-4">
        <h1 className="text-2xl font-bold">PROJECT REPORT {formattedDate}</h1>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Top info cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Project Info */}
          <div className="border border-gray-300 p-3 bg-gray-50">
            <div className="text-sm font-medium mb-1">{t('reports:dashboard.projectOf')}</div>
            <div className="text-sm mb-3">{project.name || 'xxx'}</div>
            <div className="text-sm font-medium mb-1">{t('reports:dashboard.address')}</div>
            <div className="text-sm">{project.construction_address || 'xxx'}</div>
          </div>

          {/* Completion Percentage */}
          <div className="border border-gray-300 p-3 text-center">
            <div className="text-sm font-medium mb-1">{t('reports:dashboard.completionPercentage')}</div>
            <div className="text-3xl font-bold text-gray-700">{completionPercentage.toFixed(1)}%</div>
          </div>

          {/* Delivery Date */}
          <div className="border border-gray-300 p-3 text-center">
            <div className="text-sm font-medium mb-1">{t('reports:dashboard.expectedDeliveryDate')}</div>
            <div className="text-lg font-semibold">
              {project.end_date ? format(new Date(project.end_date), 'dd-MMM-yy', { locale: getDateLocale() }) : '26-Oct-26'}
            </div>
          </div>

          {/* Budget Info */}
          <div className="border border-gray-300 p-3">
            <div className="text-sm mb-2">
              <span className="font-medium">{t('reports:dashboard.totalSpent')}</span>
              <span className="float-right">{totalExpenses.toFixed(2)}</span>
            </div>
            <div className="text-sm mb-3">
              <span className="font-medium">{t('reports:dashboard.budget')}</span>
              <span className="float-right">{totalBudget.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-600">{t('reports:dashboard.abcCurveTitle')}</div>
            <div className="flex mt-1 h-3">
              <div className="flex-1 bg-orange-400"></div>
              <div className="flex-1 bg-yellow-300"></div>
              <div className="flex-1 bg-blue-300"></div>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>A</span>
              <span>B</span>
              <span>C</span>
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Monthly Spending Chart */}
          <div className="border border-gray-300">
            <div className="text-center font-medium p-2 bg-gray-50 border-b">
{t('reports:dashboard.monthlySpendingTitle')}
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={10}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip 
                    formatter={(value: number) => [
                      formatCurrency(value),
                      t('reports:dashboard.spentLabel')
                    ]}
                  />
                  <Bar dataKey="amount" fill="#FF8C00" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget vs Actual Chart */}
          <div className="border border-gray-300">
            <div className="text-center font-medium p-2 bg-gray-50 border-b">
{t('reports:dashboard.budgetVsActualTitle')}
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold mb-2">
                {((totalExpenses / totalBudget) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {((totalExpenses / totalBudget) * 100).toFixed(1)}%
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { name: 'Start', totalSpent: 0, available: 100 },
                  { name: 'Current', totalSpent: (totalExpenses / totalBudget) * 100, available: 100 - (totalExpenses / totalBudget) * 100 },
                  { name: 'Final', totalSpent: 100, available: 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="totalSpent" stroke="#FF8C00" strokeWidth={2} name={t('reports:dashboard.totalSpending')} />
                  <Line type="monotone" dataKey="available" stroke="#87CEEB" strokeWidth={2} name={t('reports:dashboard.available')} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex justify-center mt-2 text-xs">
                <span className="mr-4">● {t('reports:dashboard.totalSpending')}</span>
                <span>● {t('reports:dashboard.available')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Analysis */}
        <div className="border border-gray-300">
          <div className="text-center font-medium p-2 bg-gray-50 border-b">
{t('reports:dashboard.categorySpendingTitle')}
          </div>
          
          {/* Status indicators row */}
          <div className="flex justify-center gap-4 p-2 bg-gray-100 border-b text-xs">
            {categoryData.slice(0, 15).map((cat, index) => (
              <div 
                key={index} 
                className={`px-2 py-1 border rounded ${
                  cat.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {cat.status}
              </div>
            ))}
          </div>

          <div className="p-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={8}
                  interval={0}
                />
                <YAxis fontSize={10} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'budget' ? t('reports:dashboard.budgetLabel') : t('reports:dashboard.spentLabel')
                  ]}
                />
                <Bar dataKey="budget" fill="#87CEEB" name={t('reports:dashboard.budgetLabel')} />
                <Bar dataKey="spent" fill="#FF8C00" name={t('reports:dashboard.spentLabel')} />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Values table below chart */}
            <div className="mt-4 text-xs">
              <div className="grid grid-cols-2 gap-1">
                <div className="font-medium">● {t('reports:dashboard.budgetLabel')}</div>
                <div className="font-medium">● {t('reports:dashboard.spentLabel')}</div>
              </div>
              <div className="grid grid-cols-15 gap-1 mt-2 text-center">
                {categoryData.map((cat, index) => (
                  <div key={index} className="border-r border-gray-300 pr-1">
                    <div className="text-xs text-orange-600">{formatCurrency(cat.budget)}</div>
                    <div className="text-xs text-blue-600">{formatCurrency(cat.spent)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

