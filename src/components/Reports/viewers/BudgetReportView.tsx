import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportViewProps } from './types';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { getScheduleStatusTranslationKey } from '@/utils/badgeVariants';

export function BudgetReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { project, budgetItems, financialEntries, companySettings } = data;
  const currency = companySettings?.currency || 'BRL';
  const scheduleStatus = getProjectScheduleStatus(project as any)

  const groupedBudget = useMemo(() => {
    // Build budget by category
    const budgetByCategory = budgetItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = 0;
      }
      acc[item.category] += Number(item.budgeted_amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Get standardized actuals by category from financial entries
    const actualByCategory = computeActualsByCategory(financialEntries, 'all');
    const actualByCategoryMap = Object.fromEntries(
      actualByCategory.map((a) => [a.category, a.actual])
    );

    // Combine budget and actual data
    return Object.entries(budgetByCategory).reduce((acc, [category, budgeted]) => {
      acc[category] = {
        budgeted,
        actual: actualByCategoryMap[category] ?? 0,
      };
      return acc;
    }, {} as Record<string, { budgeted: number; actual: number }>);
  }, [budgetItems, financialEntries]);

  const totals = useMemo(() => {
    const totalBudgeted = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0);
    // Use standardized actual computation from financial entries
    const totalActual = computeTotalActual(financialEntries, 'all');
    const variance = totalBudgeted - totalActual;
    const usage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    return { totalBudgeted, totalActual, variance, usage };
  }, [budgetItems, financialEntries]);

  const recentExpenses = useMemo(() => {
    return financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [financialEntries]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">BUDGET REPORT</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.projectInformation") }</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t("commonUI.location") }</p>
            <p className="font-medium">{project.location || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Manager</p>
            <p className="font-medium">{project.manager || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">Status</p>
            <Badge variant="outline" className="mt-1">
              {t(getScheduleStatusTranslationKey(scheduleStatus))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t("commonUI.totalBudgeted") }</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(totals.totalBudgeted)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(totals.totalActual)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Remaining</p>
            <p className="text-xl font-semibold text-amber-700">{formatMoney(totals.variance)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Budget Usage</p>
            <p className="text-xl font-semibold text-blue-700">{totals.usage.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedBudget).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Budgeted</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Actual</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Variance</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">% Used</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedBudget).map(([category, amounts]) => {
                    const variance = amounts.budgeted - amounts.actual;
                    const percentUsed = amounts.budgeted > 0 ? (amounts.actual / amounts.budgeted) * 100 : 0;
                    return (
                      <tr key={category}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amounts.budgeted)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amounts.actual)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(variance)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{percentUsed.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {recentExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.map(entry => (
                    <tr key={entry.id}>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatDate(entry.date)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">{entry.description || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2">{entry.category || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(Number(entry.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
