import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ReportViewProps } from './types';

export function CashFlowReportView({ data }: ReportViewProps) {
  const { formatDate, formatMonthYear } = useDateFormat();
  const { t } = useLocalization();
  const { project, financialEntries, companySettings } = data;
  const currency = companySettings?.currency || 'BRL';

  const summary = useMemo(() => {
    const totalIncome = financialEntries
      .filter(entry => entry.entry_type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalExpenses = financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const netFlow = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netFlow,
      status: netFlow >= 0 ? 'Positive' : 'Negative',
    };
  }, [financialEntries]);

  const monthlyFlow = useMemo(() => {
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
        status: values.income - values.expenses >= 0 ? 'Positive' : 'Negative',
      }));
  }, [financialEntries]);

  const categoryFlow = useMemo(() => {
    const categories = financialEntries.reduce((acc, entry) => {
      const category = entry.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { income: 0, expenses: 0 };
      }
      if (entry.entry_type === 'income') {
        acc[category].income += Number(entry.amount || 0);
      } else {
        acc[category].expenses += Number(entry.amount || 0);
      }
      return acc;
    }, {} as Record<string, { income: number; expenses: number }>);

    return Object.entries(categories).map(([category, values]) => ({
      category,
      income: values.income,
      expenses: values.expenses,
      net: values.income - values.expenses,
    }));
  }, [financialEntries]);

  const recentTransactions = useMemo(() => {
    return [...financialEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [financialEntries]);

  const projections = useMemo(() => {
    if (monthlyFlow.length < 3) {
      return null;
    }

    const lastThree = monthlyFlow.slice(-3);
    const avgIncome = lastThree.reduce((sum, row) => sum + row.income, 0) / lastThree.length;
    const avgExpenses = lastThree.reduce((sum, row) => sum + row.expenses, 0) / lastThree.length;
    const projectedNet = avgIncome - avgExpenses;

    return {
      avgIncome,
      avgExpenses,
      projectedNet,
    };
  }, [monthlyFlow]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">{t('reports.cashFlow.title')}</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.cashFlow.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.cashFlow.totalInflow')}</p>
            <p className="text-xl font-semibold text-emerald-700">{formatMoney(summary.totalIncome)}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.cashFlow.totalOutflow')}</p>
            <p className="text-xl font-semibold text-rose-700">{formatMoney(summary.totalExpenses)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.cashFlow.netCashFlow')}</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.netFlow)}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.cashFlow.status')}</p>
            <Badge variant={summary.status === 'Positive' ? 'secondary' : 'destructive'} className="mt-2">
              {summary.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {monthlyFlow.length > 0 && (
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
                    <th className="border border-gray-200 px-4 py-2 text-center">{t('projectStatus.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyFlow.map(row => (
                    <tr key={row.month}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">
                        {formatMonthYear(new Date(`${row.month}-01`))}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.income)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.expenses)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.net)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Badge variant={row.status === 'Positive' ? 'secondary' : 'destructive'}>{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {categoryFlow.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.cashFlow.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.inflow')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.outflow')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.cashFlow.netFlow')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryFlow.map(row => (
                    <tr key={row.category}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{row.category}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.income)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.expenses)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(row.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.cashFlow.transactionHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.date')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.description')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">{t('projectStatus.type')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(entry => (
                    <tr key={entry.id}>
                      <td className="border border-gray-200 px-4 py-2">
                        {formatDate(entry.date)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">{entry.description || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2">{entry.category || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Badge variant={entry.entry_type === 'income' ? 'secondary' : 'outline'}>
                          {entry.entry_type === 'income' ? 'In' : 'Out'}
                        </Badge>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(Number(entry.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {projections && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.cashFlow.projection.title')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('reports.cashFlow.projection.monthlyInflow')}</p>
              <p className="text-xl font-semibold text-blue-700">{formatMoney(projections.avgIncome)}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('reports.cashFlow.projection.monthlyOutflow')}</p>
              <p className="text-xl font-semibold text-amber-700">{formatMoney(projections.avgExpenses)}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('reports.cashFlow.projection.netFlow')}</p>
              <p className="text-xl font-semibold text-emerald-700">{formatMoney(projections.projectedNet)}</p>
              <p className="text-xs text-gray-500 mt-1">{t('reports.cashFlow.projection.disclaimer')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
