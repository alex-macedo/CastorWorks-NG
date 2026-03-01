import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ReportViewProps } from './types';

export function ProfitabilityReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { project, budgetItems, financialEntries, companySettings } = data;
  const currency = companySettings?.currency || 'BRL';

  const profitability = useMemo(() => {
    const totalRevenue = financialEntries
      .filter(entry => entry.entry_type === 'income')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const totalCosts = financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const grossProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const totalInvestment = budgetItems.reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0);
    const budgetedProfit = Number(project.budget_total || 0) - totalInvestment;
    const profitVariance = grossProfit - budgetedProfit;
    const roi = totalInvestment > 0 ? (grossProfit / totalInvestment) * 100 : 0;
    const paybackPeriod = grossProfit > 0 ? totalInvestment / (grossProfit / 12) : 0;
    const profitPerSqm = project.total_area && project.total_area > 0 ? grossProfit / project.total_area : 0;

    return {
      totalRevenue,
      totalCosts,
      grossProfit,
      profitMargin,
      totalInvestment,
      budgetedProfit,
      profitVariance,
      roi,
      paybackPeriod,
      profitPerSqm,
    };
  }, [project, budgetItems, financialEntries]);

  const costByCategory = useMemo(() => {
    return financialEntries
      .filter(entry => entry.entry_type === 'expense')
      .reduce((acc, entry) => {
        const category = entry.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(entry.amount || 0);
        return acc;
      }, {} as Record<string, number>);
  }, [financialEntries]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">PROFITABILITY ANALYSIS REPORT</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profitability Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(profitability.totalRevenue)}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Costs</p>
            <p className="text-xl font-semibold text-rose-700">{formatMoney(profitability.totalCosts)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Gross Profit</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(profitability.grossProfit)}</p>
            <p className="text-xs text-blue-600 mt-1">Margin: {profitability.profitMargin.toFixed(2)}%</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Budgeted Profit</p>
            <p className="text-xl font-semibold text-indigo-700">{formatMoney(profitability.budgetedProfit)}</p>
            <p className="text-xs text-indigo-600 mt-1">Variance: {formatMoney(profitability.profitVariance)}</p>
          </div>
        </CardContent>
      </Card>

      {project.total_area && project.total_area > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Profit per m²</p>
              <p className="text-xl font-semibold text-emerald-700">{formatMoney(profitability.profitPerSqm)}</p>
            </div>
            <div className="bg-sky-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Return on Investment (ROI)</p>
              <p className="text-xl font-semibold text-sky-700">{profitability.roi.toFixed(2)}%</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Estimated Payback Period</p>
              <p className="text-xl font-semibold text-amber-700">
                {profitability.paybackPeriod > 0 && profitability.paybackPeriod < 1000
                  ? `${profitability.paybackPeriod.toFixed(1)} months`
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(costByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Structure Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Cost Category</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">Amount</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">% of Costs</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">% of Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(costByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <tr key={category}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(amount)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {profitability.totalCosts > 0 ? ((amount / profitability.totalCosts) * 100).toFixed(1) : '0.0'}%
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-right">
                          {profitability.totalRevenue > 0 ? ((amount / profitability.totalRevenue) * 100).toFixed(1) : '0.0'}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Performance Benchmarks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">Metric</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Current</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">Industry Benchmark</th>
                  <th className="border border-gray-200 px-4 py-2 text-center">Performance</th>
                </tr>
              </thead>
              <tbody>
                {[{ metric: 'Profit Margin', current: profitability.profitMargin, benchmark: 15 }, { metric: 'ROI', current: profitability.roi, benchmark: 20 }].map(item => (
                  <tr key={item.metric}>
                    <td className="border border-gray-200 px-4 py-2 font-medium">{item.metric}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{item.current.toFixed(1)}%</td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{item.benchmark}%</td>
                    <td className="border border-gray-200 px-4 py-2 text-center">
                      <Badge variant={item.current >= item.benchmark ? 'secondary' : 'destructive'}>
                        {item.current >= item.benchmark ? 'Above Benchmark' : 'Below Benchmark'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.recommendations") }</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            {(() => {
              const recommendations: string[] = [];
              if (profitability.profitMargin < 10) {
                recommendations.push('Profit margin below 10%. Consider cost reduction strategies.');
              }
              if (profitability.roi < 15) {
                recommendations.push('ROI below industry standard. Evaluate investment efficiency.');
              }
              if (profitability.profitVariance < 0) {
                recommendations.push('Actual profit below budget. Review cost control measures.');
              }
              if (recommendations.length === 0) {
                recommendations.push('Project profitability is within acceptable parameters.');
              }
              return recommendations;
            })().map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
