import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PhaseData {
  phase: {
    name: string;
    description?: string;
  };
  total_material: number;
  total_labor: number;
  total_direct_cost: number;
  bdi_percentage: number;
  bdi_amount: number;
  final_total: number;
}

interface CostByPhaseProps {
  phaseTotals: PhaseData[];
  showPercentages?: boolean;
}

export const CostByPhase = ({ phaseTotals, showPercentages = true }: CostByPhaseProps) => {
  const { t } = useLocalization();

  // Calculate totals
  const grandTotalMaterial = phaseTotals.reduce((sum, p) => sum + p.total_material, 0);
  const grandTotalLabor = phaseTotals.reduce((sum, p) => sum + p.total_labor, 0);
  const grandTotalDirect = phaseTotals.reduce((sum, p) => sum + p.total_direct_cost, 0);
  const grandTotalBDI = phaseTotals.reduce((sum, p) => sum + p.bdi_amount, 0);
  const grandTotal = phaseTotals.reduce((sum, p) => sum + p.final_total, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0.0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('budgets.phases.title')}</CardTitle>
        <CardDescription>{t('budgets.phases.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>{t('budgets.phases.caption')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">{t('budgets.phases.phase')}</TableHead>
              <TableHead className="text-right">{t('budgets.editor.material')}</TableHead>
              <TableHead className="text-right">{t('budgets.editor.labor')}</TableHead>
              <TableHead className="text-right">{t('budgets.phases.directCost')}</TableHead>
              <TableHead className="text-right">
                {t('budgets.bdi.title')}
                <span className="text-xs ml-1">(%)</span>
              </TableHead>
              <TableHead className="text-right">{t('budgets.phases.bdiAmount')}</TableHead>
              <TableHead className="text-right font-semibold">{t('budgets.phases.finalTotal')}</TableHead>
              {showPercentages && <TableHead className="text-right">{t('budgets.summary.percentage')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {phaseTotals.map((phase, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  <div>
                    <div>{phase.phase.name}</div>
                    {phase.phase.description && (
                      <div className="text-xs text-muted-foreground">{phase.phase.description}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(phase.total_material)}</TableCell>
                <TableCell className="text-right">{formatCurrency(phase.total_labor)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(phase.total_direct_cost)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{phase.bdi_percentage.toFixed(2)}%</Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(phase.bdi_amount)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(phase.final_total)}
                </TableCell>
                {showPercentages && (
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatPercentage(phase.final_total, grandTotal)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">{t('budgets.summary.grandTotal')}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(grandTotalMaterial)}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(grandTotalLabor)}</TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(grandTotalDirect)}</TableCell>
              <TableCell className="text-right">
                <Badge variant="default">
                  {grandTotalDirect > 0 ? ((grandTotalBDI / grandTotalDirect) * 100).toFixed(2) : '0.00'}%
                </Badge>
              </TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(grandTotalBDI)}</TableCell>
              <TableCell className="text-right font-bold text-primary text-lg">
                {formatCurrency(grandTotal)}
              </TableCell>
              {showPercentages && <TableCell className="text-right font-bold">100.0%</TableCell>}
            </TableRow>
          </TableFooter>
        </Table>

        {/* Summary Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">{t('budgets.summary.materialRatio')}</div>
            <div className="text-2xl font-semibold">
              {formatPercentage(grandTotalMaterial, grandTotalDirect)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">{t('budgets.summary.laborRatio')}</div>
            <div className="text-2xl font-semibold">{formatPercentage(grandTotalLabor, grandTotalDirect)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">{t('budgets.summary.bdiRatio')}</div>
            <div className="text-2xl font-semibold">{formatPercentage(grandTotalBDI, grandTotalDirect)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

