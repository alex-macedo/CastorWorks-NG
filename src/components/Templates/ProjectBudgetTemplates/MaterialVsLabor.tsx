import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface LineItemData {
  sinapi_code: string;
  description: string;
  quantity: number;
  unit_cost_material: number;
  unit_cost_labor: number;
  total_material: number;
  total_labor: number;
  total_cost: number;
  phase?: {
    name: string;
  };
}

interface MaterialVsLaborProps {
  lineItems: LineItemData[];
  showTopItems?: number;
}

export const MaterialVsLabor = ({ lineItems, showTopItems = 10 }: MaterialVsLaborProps) => {
  const { t } = useLocalization();

  // Calculate totals
  const totalMaterial = lineItems.reduce((sum, item) => sum + item.total_material, 0);
  const totalLabor = lineItems.reduce((sum, item) => sum + item.total_labor, 0);
  const totalCost = totalMaterial + totalLabor;

  const materialPercentage = totalCost > 0 ? (totalMaterial / totalCost) * 100 : 0;
  const laborPercentage = totalCost > 0 ? (totalLabor / totalCost) * 100 : 0;

  // Sort items by total cost (descending) and take top N
  const topItems = [...lineItems]
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, showTopItems);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getMaterialLaborRatio = (material: number, labor: number) => {
    const total = material + labor;
    if (total === 0) return { materialPct: 50, laborPct: 50 };
    return {
      materialPct: (material / total) * 100,
      laborPct: (labor / total) * 100,
    };
  };

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('budgets.charts.materialVsLabor')}</CardTitle>
          <CardDescription>{t('budgets.charts.overallBreakdown')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Material */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-sm font-medium">{t('budgets.editor.material')}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatCurrency(totalMaterial)}</div>
                <div className="text-xs text-muted-foreground">{materialPercentage.toFixed(1)}%</div>
              </div>
            </div>
            <Progress value={materialPercentage} className="h-3" />
          </div>

          {/* Labor */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-sm font-medium">{t('budgets.editor.labor')}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatCurrency(totalLabor)}</div>
                <div className="text-xs text-muted-foreground">{laborPercentage.toFixed(1)}%</div>
              </div>
            </div>
            <Progress value={laborPercentage} className="h-3 [&>div]:bg-green-500" />
          </div>

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">{t('budgets.summary.total')}</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          {/* Insights */}
          <div className="pt-4 space-y-2">
            {materialPercentage > laborPercentage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span>{t('budgets.insights.materialIntensive')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span>{t('budgets.insights.laborIntensive')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Cost Items */}
      <Card>
        <CardHeader>
          <CardTitle>{t('budgets.summary.topCostItems', { count: showTopItems })}</CardTitle>
          <CardDescription>{t('budgets.summary.topCostItemsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('budgets.editor.sinapiCode')}</TableHead>
                <TableHead>{t('budgets.editor.description')}</TableHead>
                <TableHead className="text-right">{t('budgets.editor.material')}</TableHead>
                <TableHead className="text-right">{t('budgets.editor.labor')}</TableHead>
                <TableHead className="text-right">{t('budgets.editor.total')}</TableHead>
                <TableHead className="text-center">{t('budgets.summary.ratio')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topItems.map((item, index) => {
                const ratio = getMaterialLaborRatio(item.total_material, item.total_labor);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{item.sinapi_code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.description}</div>
                        {item.phase && (
                          <div className="text-xs text-muted-foreground">{item.phase.name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_material)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_labor)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 items-center justify-center">
                        <div className="flex gap-1 w-24">
                          <div
                            className="h-4 bg-blue-500 rounded-l"
                            style={{ width: `${ratio.materialPct}%` }}
                            title={`Material: ${ratio.materialPct.toFixed(1)}%`}
                          />
                          <div
                            className="h-4 bg-green-500 rounded-r"
                            style={{ width: `${ratio.laborPct}%` }}
                            title={`Labor: ${ratio.laborPct.toFixed(1)}%`}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">
                          {ratio.materialPct.toFixed(0)}/{ratio.laborPct.toFixed(0)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

