import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportViewProps } from './types';

export function BudgetVsActualReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { project, budgetItems, financialEntries = [], companySettings } = data;
  const currency = companySettings?.currency || 'BRL';

  const summary = useMemo(() => {
    const totalBudget = budgetItems.reduce(
      (sum, item) => sum + Number(item.budgeted_amount || 0),
      0
    );
    // Use standardized actual computation from financial entries
    const totalActual = computeTotalActual(financialEntries, 'all');
    const variance = totalBudget - totalActual;
    const variancePercentage = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      variance,
      variancePercentage,
      utilization: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
    };
  }, [budgetItems, financialEntries]);

  const categoryRows = useMemo(() => {
    // Build budget by category
    const budgetByCategory = budgetItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { budgeted: 0, items: 0 };
      }
      acc[item.category].budgeted += Number(item.budgeted_amount || 0);
      acc[item.category].items += 1;
      return acc;
    }, {} as Record<string, { budgeted: number; items: number }>);

    // Get standardized actuals by category from financial entries
    const actualByCategory = computeActualsByCategory(financialEntries, 'all');
    const actualByCategoryMap = Object.fromEntries(
      actualByCategory.map((a) => [a.category, a.actual])
    );

    // Combine budget and actual data
    return Object.entries(budgetByCategory).map(([category, budgetData]) => {
      const actual = actualByCategoryMap[category] ?? 0;
      const variance = budgetData.budgeted - actual;
      const variancePercentage = budgetData.budgeted > 0 ? (variance / budgetData.budgeted) * 100 : 0;
      const status = variance > 0 ? 'Under Budget' : variance < 0 ? 'Over Budget' : 'On Budget';

      return {
        category,
        budgeted: budgetData.budgeted,
        actual,
        items: budgetData.items,
        variance,
        variancePercentage,
        status,
      };
    });
  }, [budgetItems, financialEntries]);

  const varianceStats = useMemo(() => {
    const overBudget = categoryRows.filter(row => row.variance < 0).length;
    const underBudget = categoryRows.filter(row => row.variance > 0).length;
    const onBudget = categoryRows.filter(row => row.variance === 0).length;
    const total = categoryRows.length;
    const accuracy = total > 0 ? ((onBudget + underBudget) / total) * 100 : 0;

    return { overBudget, underBudget, onBudget, total, accuracy };
  }, [categoryRows]);

  const significantVariances = useMemo(() => {
    // Get actuals by category for comparison
    const actualByCategory = computeActualsByCategory(financialEntries, 'all');
    const actualByCategoryMap = Object.fromEntries(
      actualByCategory.map((a) => [a.category, a.actual])
    );

    return budgetItems
      .filter(item => {
        const budgeted = Number(item.budgeted_amount || 0);
        const actual = actualByCategoryMap[item.category] ?? 0;
        if (budgeted === 0) {
          return false;
        }
        const variance = Math.abs((budgeted - actual) / budgeted) * 100;
        return variance > 10;
      })
      .sort((a, b) => {
        const budgetA = Number(a.budgeted_amount || 0);
        const actualA = actualByCategoryMap[a.category] ?? 0;
        const varianceA = Math.abs(budgetA - actualA);

        const budgetB = Number(b.budgeted_amount || 0);
        const actualB = actualByCategoryMap[b.category] ?? 0;
        const varianceB = Math.abs(budgetB - actualB);
        return varianceB - varianceA;
      });
  }, [budgetItems, financialEntries]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">{t('reports.budgetVsActual.title')}</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.budgetVsActual.overallPerformance')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t("commonUI.totalBudgeted") }</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.totalBudget)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.totalActual')}</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(summary.totalActual)}</p>
            <p className="text-xs text-green-600 mt-1">{t('reports.budgetVsActual.utilization')}: {summary.utilization.toFixed(1)}%</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.variance')}</p>
            <p className="text-xl font-semibold text-amber-700">{formatMoney(summary.variance)}</p>
            <p className="text-xs text-amber-600 mt-1">{summary.variancePercentage.toFixed(1)}%</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.performanceStatus')}</p>
            <p className="text-lg font-semibold text-blue-700">
              {summary.variance > 0 ? t('reports.budgetVsActual.underBudget') : summary.variance < 0 ? t('reports.budgetVsActual.overBudget') : t('reports.budgetVsActual.onBudget')}
            </p>
          </div>
        </CardContent>
      </Card>

      {categoryRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.budgetVsActual.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.items')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.budgeted')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.totalActual')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.variance')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.variancePercentage')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">{t('projectStatus.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map(row => (
                    <tr key={row.category}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{row.category}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{row.items}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.budgeted)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.actual)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.variance)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{row.variancePercentage.toFixed(1)}%</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Badge
                          variant={
                            row.status === 'Under Budget'
                              ? 'secondary'
                              : row.status === 'Over Budget'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {row.status === 'Under Budget' ? t('reports.budgetVsActual.underBudget') : row.status === 'Over Budget' ? t('reports.budgetVsActual.overBudget') : t('reports.budgetVsActual.onBudget')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {significantVariances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.budgetVsActual.significantVariances')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.description')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.budgeted')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.totalActual')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.variance')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.budgetVsActual.variancePercentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {significantVariances.slice(0, 15).map(item => {
                    const budgeted = Number(item.budgeted_amount || 0);
                    // Get actual from category map
                    const actualByCategory = computeActualsByCategory(financialEntries, 'all');
                    const actualByCategoryMap = Object.fromEntries(
                      actualByCategory.map((a) => [a.category, a.actual])
                    );
                    const actual = actualByCategoryMap[item.category] ?? 0;
                    const variance = budgeted - actual;
                    const variancePercentage = budgeted > 0 ? ((variance / budgeted) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={item.id}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{item.category}</td>
                        <td className="border border-gray-200 px-4 py-2">{item.description || 'N/A'}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(budgeted)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(actual)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(variance)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{variancePercentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.budgetVsActual.indicators.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.indicators.underBudget')}</p>
            <p className="text-xl font-semibold text-emerald-700">{varianceStats.underBudget} / {varianceStats.total}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.indicators.overBudget')}</p>
            <p className="text-xl font-semibold text-rose-700">{varianceStats.overBudget} / {varianceStats.total}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.indicators.onBudget')}</p>
            <p className="text-xl font-semibold text-slate-700">{varianceStats.onBudget} / {varianceStats.total}</p>
          </div>
          <div className="bg-sky-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.budgetVsActual.indicators.accuracy')}</p>
            <p className="text-xl font-semibold text-sky-700">{varianceStats.accuracy.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
