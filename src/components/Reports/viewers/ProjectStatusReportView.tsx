import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { computeActualsByCategory, computeTotalActual } from '@/utils/budgetActualsComputation';
import type { ReportViewProps } from './types';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { getScheduleStatusTranslationKey } from '@/utils/badgeVariants';

export function ProjectStatusReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { project, budgetItems, financialEntries, companySettings } = data;
  const { t, currency } = useLocalization();
  const reportCurrency = companySettings?.currency || currency;
  const scheduleStatus = getProjectScheduleStatus(project as any)

  const { totalBudget, totalActual, progressPercentage } = useMemo(() => {
    const totalBudgetValue = budgetItems.reduce(
      (sum, item) => sum + Number(item.budgeted_amount || 0),
      0
    );
    // Use standardized actual computation from financial entries
    const totalActualValue = computeTotalActual(financialEntries, 'all');
    const progress = totalBudgetValue > 0 ? (totalActualValue / totalBudgetValue) * 100 : 0;

    return {
      totalBudget: totalBudgetValue,
      totalActual: totalActualValue,
      progressPercentage: progress,
    };
  }, [budgetItems, financialEntries]);

  const categoryStatus = useMemo(() => {
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

  const recentEntries = useMemo(() => {
    return [...financialEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [financialEntries]);

  const getStatusColor = (progress: number) => {
    if (progress < 25) return 'bg-gray-100 text-gray-800';
    if (progress < 75) return 'bg-yellow-100 text-yellow-800';
    if (progress < 100) return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (progress: number) => {
    if (progress < 25) return t('projects:status.notStarted');
    if (progress < 75) return t('projects:status.inProgress'); 
    if (progress < 100) return t('projects:status.nearCompletion');
    return t('projects:status.completed');
  };

  const formatMoney = (value: number) => formatCurrency(value, reportCurrency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">{t('reports:projectStatus.title')}</h1>
        <p className="text-gray-600 mt-2">{t('reports:viewer.generatedOn')}: {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports:projectStatus.projectOverview')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:name')}</label>
              <p className="font-semibold">{project.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:location')}</label>
              <p className="font-semibold">{project.location || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:manager')}</label>
              <p className="font-semibold">{project.manager || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-sm font-medium text-gray-600">{t('reports:projectStatus.status')}</label>
                <div>
                  <Badge variant="outline">{t(getScheduleStatusTranslationKey(scheduleStatus))}</Badge>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:startDate')}</label>
              <p className="font-semibold">
                {project.start_date ? formatDate(project.start_date) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:endDate')}</label>
              <p className="font-semibold">
                {project.end_date ? formatDate(project.end_date) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">{t('projects:totalArea')}</label>
              <p className="font-semibold">{project.total_area ? `${project.total_area} m²` : 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports:projectStatus.progressPercentage')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="text-sm font-medium text-gray-600">{t('reports:projectStatus.progressPercentage')}</label>
            <p className="text-2xl font-bold text-blue-600">{progressPercentage.toFixed(1)}%</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <label className="text-sm font-medium text-gray-600">{t('reports:projectStatus.totalBudget')}</label>
            <p className="text-lg font-bold text-green-600">{formatMoney(totalBudget)}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <label className="text-sm font-medium text-gray-600">{t('reports:projectStatus.totalActual')}</label>
            <p className="text-lg font-bold text-orange-600">{formatMoney(totalActual)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="text-sm font-medium text-gray-600">{t('budget:remaining')}</label>
            <p className="text-lg font-bold text-blue-600">{formatMoney(totalBudget - totalActual)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports:projectStatus.budgetStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50 text-sm">
                  <th className="border border-gray-200 px-4 py-2 text-left">{t('reports:projectStatus.category')}</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">{t('reports:projectStatus.budgeted')}</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">{t('reports:projectStatus.actual')}</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">{t('reports:projectStatus.progressPercentage')}</th>
                  <th className="border border-gray-200 px-4 py-2 text-center">{t('reports:projectStatus.status')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(categoryStatus).map(([category, amounts]) => {
                  const progress = amounts.budgeted > 0 ? (amounts.actual / amounts.budgeted) * 100 : 0;
                  const status = getStatusText(progress);

                  return (
                    <tr key={category} className="text-sm">
                      <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amounts.budgeted)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amounts.actual)}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{progress.toFixed(1)}%</td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Badge className={getStatusColor(progress)}>{status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Financial Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-sm">
                    <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Amount</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEntries.map((entry) => (
                    <tr key={entry.id} className="text-sm">
                      <td className="border border-gray-200 px-4 py-2">
                        {formatDate(entry.date)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">{entry.description || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2">{entry.category || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">
                        <span className={entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {entry.entry_type === 'income' ? '+' : '-'}
                          {formatMoney(Number(entry.amount))}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">{entry.payment_method || 'N/A'}</td>
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
