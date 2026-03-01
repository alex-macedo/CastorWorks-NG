import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/formatters";
import { useBudgetCalculations } from "@/hooks/useBudgetCalculations";
import { useAppSettings } from "@/hooks/useAppSettings";
import { sortPhasesByStandardOrder } from "@/utils/budgetCalculations";
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetReportTabProps {
  budgetId: string;
  projectId: string;
}

export const BudgetReportTab = ({ budgetId, projectId }: BudgetReportTabProps) => {
  const { t } = useLocalization();
  const { settings } = useAppSettings();
  const { getPhaseTotalsWithLS, getGrandTotals, isLoading } = useBudgetCalculations(
    budgetId,
    settings as any
  );

  const phaseTotalsRaw = getPhaseTotalsWithLS();
  const phaseTotals = sortPhasesByStandardOrder(phaseTotalsRaw);
  const grandTotals = getGrandTotals();

  // Calculate percentage of total for each phase
  const getPhasePercentage = (phaseTotal: number) => {
    if (grandTotals.grandTotal === 0) return 0;
    return (phaseTotal / grandTotals.grandTotal) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budgets:reports.title")}</CardTitle>
        <CardDescription>{t("budgets:reports.byPhase")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">
            {t("common:loading")}
          </p>
        ) : phaseTotals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("budgets:reports.noPhaseTotals")}
          </p>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("budgets:overview.phase")}</TableHead>
                  <TableHead className="text-right">{t("budgets:summary.labor")}</TableHead>
                  <TableHead className="text-right">{t("budgets:summary.material")}</TableHead>
                  <TableHead className="text-right">{t("budgets:overview.totalLS")}</TableHead>
                  <TableHead className="text-right">{t("budgets:overview.totalBDI")}</TableHead>
                  <TableHead className="text-right">{t("budgets:summary.total")}</TableHead>
                  <TableHead className="text-right">{t("budgets:summary.percentage")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseTotals.map((phase) => {
                  const phaseTotal = phase.grandTotal;
                  const percentage = getPhasePercentage(phaseTotal);

                  return (
                    <TableRow key={phase.phase_id || phase.phase_name}>
                      <TableCell className="font-medium">{phase.phase_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(phase.totalLabor, "BRL")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(phase.totalMaterials, "BRL")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(phase.totalLS, "BRL")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(phase.totalBDI, "BRL")}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(phaseTotal, "BRL")}
                      </TableCell>
                      <TableCell className="text-right">
                        {percentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Grand Total Row */}
                <TableRow className="bg-primary/10 font-bold text-lg border-t-2 border-primary">
                  <TableCell>{t("budgets:overview.grandTotal")}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotals.totalLabor, "BRL")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotals.totalMaterials, "BRL")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotals.totalLS, "BRL")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotals.totalBDI, "BRL")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(grandTotals.grandTotal, "BRL")}
                  </TableCell>
                  <TableCell className="text-right">100.00%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

