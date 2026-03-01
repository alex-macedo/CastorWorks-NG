import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportViewProps } from './types';

export function FinancialSummaryReportView({ data }: ReportViewProps) {
  const { formatDate, formatMonthYear } = useDateFormat();
  const { project, budgetItems, financialEntries, companySettings } = data;
  const { t, currency } = useLocalization();
  const reportCurrency = companySettings?.currency || currency;

  const summary = useMemo(() => {
    const totalBudget = budgetItems.reduce(
      (sum, item) => sum + Number(item.budgeted_amount || 0),
      0
    );
    // Use standardized actual computation from financial entries
    const totalActual = computeTotalActual(financialEntries, 'all');
    const totalIncome = financialEntries
      .filter(entry => entry.entry_type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalExpenses = financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      budgetUtilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    };
  }, [budgetItems, financialEntries]);

  const incomeByCategory = useMemo(() => {
    return financialEntries
      .filter(entry => entry.entry_type === 'income')
      .reduce((acc, entry) => {
        const category = entry.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(entry.amount || 0);
        return acc;
      }, {} as Record<string, number>);
  }, [financialEntries]);

  const expenseByCategory = useMemo(() => {
    return financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .reduce((acc, entry) => {
        const category = entry.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(entry.amount || 0);
        return acc;
      }, {} as Record<string, number>);
  }, [financialEntries]);

  const monthlyCashFlow = useMemo(() => {
    const monthly = financialEntries.reduce((acc, entry) => {
      const month = new Date(entry.date).toISOString().slice(0, 7);
      if (!acc[month]) {
        acc[month] = { income: 0, expenses: 0 };
      }
      if (entry.entry_type === 'income') {
        acc[month].income += Number(entry.amount || 0);
      } else {
        acc[month].expenses += Number(entry.amount || 0);
      }
      return acc;
    }, {} as Record<string, { income: number; expenses: number }>);

    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({
        month,
        income: values.income,
        expenses: values.expenses,
        net: values.income - values.expenses,
      }));
  }, [financialEntries]);

  const paymentMethods = useMemo(() => {
    return financialEntries.reduce((acc, entry) => {
      const method = entry.payment_method || 'Unspecified';
      acc[method] = (acc[method] || 0) + Number(entry.amount || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [financialEntries]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
            {/* Header */}
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports:financialSummary.title')}</h1>
        <p className="text-gray-600 mt-1">{project.name}</p>
        <p className="text-sm text-gray-500">
          {t('reports:viewer.generatedOn')} {formatDate(new Date())} •
          {companySettings?.company_name || 'Construction Company'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.financialSummary.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.financialSummary.totalBudget')}</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.totalBudget)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.financialSummary.amountSpent')}</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(summary.totalActual)}</p>
            <p className="text-xs text-green-600 mt-1">{t('reports.budgetVsActual.utilization')}: {summary.budgetUtilization.toFixed(1)}%</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.financialSummary.netProfitLoss')}</p>
            <p className="text-xl font-semibold text-indigo-700">{formatMoney(summary.netProfit)}</p>
            <p className="text-xs text-indigo-600 mt-1">{t('reports.financialSummary.profitMargin')}: {summary.profitMargin.toFixed(1)}%</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.financialSummary.incomeVsExpenses')}</p>
            <p className="text-lg font-semibold text-amber-700">
              {formatMoney(summary.totalIncome)} / {formatMoney(summary.totalExpenses)}
            </p>
          </div>
        </CardContent>
      </Card>

      {Object.keys(incomeByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.financialSummary.incomeBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.amount')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(incomeByCategory).map(([category, amount]) => (
                    <tr key={category}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amount)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        {summary.totalIncome > 0 ? ((amount / summary.totalIncome) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(expenseByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.financialSummary.expenseBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.amount')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expenseByCategory).map(([category, amount]) => (
                    <tr key={category}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amount)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        {summary.totalExpenses > 0 ? ((amount / summary.totalExpenses) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {monthlyCashFlow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.cashFlow.monthlyAnalysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('reports.cashFlow.month')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.inflow')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.outflow')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.netFlow')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyCashFlow.map(({ month, income, expenses, net }) => (
                    <tr key={month}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {formatMonthYear(new Date(`${month}-01`))}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(income)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(expenses)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(paymentMethods).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.financialSummary.paymentMethods')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.paymentMethod')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.amount')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(paymentMethods).map(([method, amount]) => {
                    const total = Object.values(paymentMethods).reduce((sum, value) => sum + value, 0);
                    return (
                      <tr key={method}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{method}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amount)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
