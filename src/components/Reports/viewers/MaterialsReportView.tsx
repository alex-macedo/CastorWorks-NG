import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, groupMaterialsByCategory } from '@/utils/reportFormatters';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { ReportViewProps } from './types';

export function MaterialsReportView({ data }: ReportViewProps) {
  const { formatDate } = useDateFormat();
  const { t } = useLocalization();
  const { project, materials, companySettings } = data;
  const currency = companySettings?.currency || 'BRL';
  const unitSymbol = 'm²';

  const groupedMaterials = useMemo(() => groupMaterialsByCategory(materials), [materials]);

  const summary = useMemo(() => {
    const totalMaterials = materials.reduce((sum, material) => sum + Number(material.total || 0), 0);
    const totalLabor = Number(project.labor_cost || 0);
    const totalTaxes = Number(project.taxes_and_fees || 0);
    const grandTotal = totalMaterials + totalLabor + totalTaxes;
    const costPerUnit = project.total_area ? grandTotal / Number(project.total_area) : 0;

    return {
      totalMaterials,
      totalLabor,
      totalTaxes,
      grandTotal,
      costPerUnit,
    };
  }, [materials, project]);

  const formatMoney = (value: number) => formatCurrency(value, currency);

  return (
    <div className="space-y-6">
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-blue-600">{t('reports.materials.title')}</h1>
        <p className="text-gray-600 mt-2">{project.name} • {formatDate(new Date())}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("commonUI.projectInformation") }</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t('reports.materials.totalArea')}</p>
            <p className="font-medium">{project.total_area ? `${project.total_area} ${unitSymbol}` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-600">{t("commonUI.location") }</p>
            <p className="font-medium">{project.location || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedMaterials).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
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
                  {items.map(material => (
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
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{t('reports.materials.costSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t("commonUI.totalMaterials") }</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.totalMaterials)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materials.totalLabor')}</p>
            <p className="text-xl font-semibold text-green-700">{formatMoney(summary.totalLabor)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materials.taxesAndFees')}</p>
            <p className="text-xl font-semibold text-amber-700">{formatMoney(summary.totalTaxes)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materials.grandTotal')}</p>
            <p className="text-xl font-semibold text-blue-700">{formatMoney(summary.grandTotal)}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">{t('reports.materials.costPerUnit', { unit: unitSymbol })}</p>
            <p className="text-xl font-semibold text-slate-700">{formatMoney(summary.costPerUnit)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
