import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, groupMaterialsByCategory } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ReportViewProps } from './types';

export function MaterialsUsageReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { project, materials, companySettings } = data;
  const currency = companySettings?.currency || 'BRL';

  const summary = useMemo(() => {
    const totalMaterials = materials.length;
    const totalCost = materials.reduce((sum, material) => sum + Number(material.total || 0), 0);
    const avgCost = totalMaterials > 0 ? totalCost / totalMaterials : 0;
    const costPerSqm = project.total_area && project.total_area > 0 ? totalCost / project.total_area : 0;

    return {
      totalMaterials,
      totalCost,
      avgCost,
      costPerSqm,
    };
  }, [project, materials]);

  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materials), [materials]);

  const unitUsage = useMemo(() => {
    return materials.reduce((acc, material) => {
      acc[material.unit] = (acc[material.unit] || 0) + Number(material.quantity || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [materials]);

  const topMaterials = useMemo(() => {
    return [...materials]
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .slice(0, 10);
  }, [materials]);

  const highCostMaterialsCount = useMemo(() => {
    return materials.filter(material => Number(material.price_per_unit || 0) > summary.avgCost).length;
  }, [materials, summary.avgCost]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">{t('reports.materialsUsage.title')}</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.materialsUsage.summary.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materialsUsage.summary.totalItems')}</p>
            <p className="text-xl font-semibold text-blue-700">{summary.totalMaterials}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materialsUsage.summary.totalCost')}</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(summary.totalCost)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materialsUsage.summary.avgCost')}</p>
            <p className="text-xl font-semibold text-amber-700">{formatMoney(summary.avgCost)}</p>
          </div>
          {project.total_area && project.total_area > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('reports.materialsUsage.summary.costPerSqm')}</p>
              <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.costPerSqm)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(groupedMaterials).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.materialsUsage.byCategory.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.category')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.itemsCount')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.totalCost')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedMaterials).map(([category, items]) => {
                    const categoryTotal = items.reduce((sum, material) => sum + Number(material.total || 0), 0);
                    const categoryPercentage = summary.totalCost > 0 ? (categoryTotal / summary.totalCost) * 100 : 0;
                    return (
                      <tr key={category}>
                        <td className="border border-gray-200 px-4 py-2 font-medium">{category}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{items.length}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(categoryTotal)}</td>
                        <td className="border border-gray-200 px-4 py-2 text-right">{categoryPercentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {topMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.materialsUsage.topMaterials.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('reports.materialsUsage.sinapiCode')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.description')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.quantity')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('common.unit')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.unitPrice')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('common.total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topMaterials.map(material => (
                    <tr key={material.id}>
                      <td className="border border-gray-200 px-4 py-2">{material.sinapi_code || 'N/A'}</td>
                      <td className="border border-gray-200 px-4 py-2">{material.description}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{material.quantity}</td>
                      <td className="border border-gray-200 px-4 py-2">{material.unit}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(Number(material.price_per_unit || 0))}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{formatMoney(Number(material.total || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(unitUsage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.materialsUsage.byUnit.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">{t('reports.materialsUsage.byUnit.type')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.totalQuantity')}</th>
                    <th className="border border-gray-200 px-4 py-2 text-right">{t('reports.materialsUsage.itemsCount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(unitUsage).map(([unit, quantity]) => (
                    <tr key={unit}>
                      <td className="border border-gray-200 px-4 py-2 font-medium">{unit}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{quantity}</td>
                      <td className="border border-gray-200 px-4 py-2 text-right">{materials.filter(m => m.unit === unit).length}</td>
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
          <CardTitle>{t("commonUI.recommendations") }</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            {(() => {
              const recommendations: string[] = [];
              if (summary.totalMaterials > 0 && highCostMaterialsCount > summary.totalMaterials * 0.3) {
                recommendations.push(t('reports.materialsUsage.recommendations.bulkPurchase'));
              }
              if (summary.totalCost > Number(project.budget_total || 0) * 0.4) {
                recommendations.push(t('reports.materialsUsage.recommendations.overBudget'));
              }
              const uniqueSuppliers = new Set(materials.map(m => m.group_name).filter(Boolean)).size;
              if (uniqueSuppliers < 3) {
                recommendations.push(t('reports.materialsUsage.recommendations.diversifySuppliers'));
              }
              if (recommendations.length === 0) {
                recommendations.push(t('reports.materialsUsage.recommendations.optimized'));
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
