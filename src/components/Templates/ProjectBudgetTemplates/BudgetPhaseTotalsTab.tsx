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
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { useCostControlBudgetLines } from "@/hooks/useCostControlBudgetLines";
import { useAppSettings } from "@/hooks/useAppSettings";
import {
  sortPhasesByStandardOrder,
  groupLineItemsByPhase,
  calculateSINPhaseTotals,
  calculateSINGrandTotals,
  type PhaseTotal,
  type GrandTotal
} from "@/utils/budgetCalculations";
import { useMemo, useRef } from "react";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBudgetCalculations } from "@/hooks/useBudgetCalculations";

interface BudgetPhaseTotalsTabProps {
  budgetId: string;
  projectId: string;
  totalDirectCost: number;
  budgetModel?: string;
}

// Virtualized table component for large datasets
interface VirtualizedPhaseTableProps {
  phaseTotals: PhaseTotal[];
  grandTotals: GrandTotal;
  t: (key: string) => string;
  budgetModel?: string;
}

const VirtualizedPhaseTable = ({ phaseTotals, grandTotals, t, budgetModel }: VirtualizedPhaseTableProps) => {
  const isCostControl = budgetModel === 'cost_control';
  const showLSandBDI = !isCostControl; // Only show LS and BDI for BDI budgets
  const parentRef = useRef<HTMLDivElement>(null);

  // Note: TanStack Virtual's useVirtualizer() is known to be incompatible with React Compiler's
  // memoization optimization, but is safe to use. React Compiler automatically handles this.
  const virtualizer = useVirtualizer({
    count: phaseTotals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Estimated row height
    overscan: 10,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="w-full border rounded-lg overflow-x-auto bg-background flex flex-col">
      <div className="min-w-[990px] flex flex-col">
        {/* Header - Fixed at the top */}
        <div className="flex bg-muted/50 border-b font-medium text-muted-foreground sticky top-0 z-20">
          <div className="h-10 py-1 px-2 text-xs font-semibold w-[400px] flex-shrink-0 flex items-center">
            {t("budgets:overview.phase")}
          </div>
          <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[100px] flex items-center justify-end">
            {t("budgets:overview.totalLabor")}
          </div>
          <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[100px] flex items-center justify-end">
            {t("budgets:overview.totalMaterials")}
          </div>
          <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[100px] flex items-center justify-end">
            {t("budgets:overview.totalDirectCost")}
          </div>
          {showLSandBDI && (
            <>
              <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[90px] flex items-center justify-end">
                {t("budgets:overview.totalLS")}
              </div>
              <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[90px] flex items-center justify-end">
                {t("budgets:overview.totalBDI")}
              </div>
            </>
          )}
          <div className="h-10 py-1 px-2 text-xs font-semibold text-right flex-1 min-w-[110px] flex items-center justify-end">
            {t("budgets:overview.grandTotal")}
          </div>
        </div>

        {/* Scrollable body content */}
        <div
          ref={parentRef}
          className="overflow-y-auto overflow-x-hidden"
          style={{
            height: `${Math.min(400, phaseTotals.length * 32)}px`,
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {items.map((virtualRow) => {
              const phase = phaseTotals[virtualRow.index];

              return (
                <div
                  key={phase?.phase_id || phase?.phase_name || virtualRow.index}
                  className={`flex items-center h-8 hover:bg-muted/50 transition-colors border-b last:border-0 ${
                    virtualRow.index % 2 === 1 ? 'bg-muted/50' : ''
                  }`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="py-1 px-2 text-sm w-[400px] flex-shrink-0 truncate font-medium flex items-center">
                    {phase?.phase_name}
                  </div>
                  <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
                    {formatCurrency(phase?.totalLabor || 0, "BRL")}
                  </div>
                  <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
                    {formatCurrency(phase?.totalMaterials || 0, "BRL")}
                  </div>
                  <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
                    {formatCurrency(phase?.totalDirectCost || 0, "BRL")}
                  </div>
                  {showLSandBDI && (
                    <>
                      <div className="py-1 px-2 text-sm text-right flex-1 min-w-[90px] flex items-center justify-end">
                        {formatCurrency(phase?.totalLS || 0, "BRL")}
                      </div>
                      <div className="py-1 px-2 text-sm text-right flex-1 min-w-[90px] flex items-center justify-end">
                        {formatCurrency(phase?.totalBDI || 0, "BRL")}
                      </div>
                    </>
                  )}
                  <div className="py-1 px-2 text-sm text-right flex-1 min-w-[110px] flex items-center justify-end">
                    {formatCurrency(phase?.grandTotal || 0, "BRL")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grand Total Footer - Always visible at the bottom of the table */}
        <div className="flex bg-primary/10 font-bold border-t-2 border-primary sticky bottom-0 z-20 h-10 items-center shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
          <div className="py-1 px-2 text-sm w-[400px] flex-shrink-0 truncate font-bold flex items-center">
            {t("budgets:overview.grandTotal")}
          </div>
          <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
            {formatCurrency(grandTotals.totalLabor, "BRL")}
          </div>
          <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
            {formatCurrency(grandTotals.totalMaterials, "BRL")}
          </div>
          <div className="py-1 px-2 text-sm text-right flex-1 min-w-[100px] flex items-center justify-end">
            {formatCurrency(grandTotals.totalDirectCost, "BRL")}
          </div>
          {showLSandBDI && (
            <>
              <div className="py-1 px-2 text-sm text-right flex-1 min-w-[90px] flex items-center justify-end">
                {formatCurrency(grandTotals.totalLS, "BRL")}
              </div>
              <div className="py-1 px-2 text-sm text-right flex-1 min-w-[90px] flex items-center justify-end">
                {formatCurrency(grandTotals.totalBDI, "BRL")}
              </div>
            </>
          )}
          <div className="py-1 px-2 text-sm text-right flex-1 min-w-[110px] flex items-center justify-end font-extrabold text-primary">
            {formatCurrency(grandTotals.grandTotal, "BRL")}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BudgetPhaseTotalsTab = ({
  budgetId,
  projectId,
  totalDirectCost,
  budgetModel,
}: BudgetPhaseTotalsTabProps) => {
  console.log('[BudgetPhaseTotalsTab] Component called with:', {
    budgetId,
    projectId,
    totalDirectCost,
    budgetModel,
  });

  const { t } = useLocalization();
  const { settings } = useAppSettings();

  // Use appropriate hook based on budget model
  const simpleBudgetQuery = useBudgetLineItems(budgetModel === 'simple' || budgetModel === 'bdi_brazil' ? budgetId : undefined);
  const costControlQuery = useCostControlBudgetLines(budgetModel === 'cost_control' ? budgetId : undefined);
  
  // For BDI Brazil budgets, use the useBudgetCalculations hook for proper phase totals
  const bdiBudgetQuery = useBudgetCalculations(
    budgetModel === 'bdi_brazil' ? budgetId : undefined,
    settings as any,
    budgetModel === 'bdi_brazil' ? 'bdi_brazil' : undefined
  );

  // Extract data from the appropriate query with proper typing
  const costControlLineItems = costControlQuery.data || [];
  const simpleLineItems = simpleBudgetQuery.lineItems || [];
  const bdiPhaseTotals = useMemo(() => bdiBudgetQuery.getPhaseTotalsWithLS?.() || [], [bdiBudgetQuery]);

  const lineItems = budgetModel === 'cost_control' ? costControlLineItems as any[] : simpleLineItems as any[];
  const isLoading = budgetModel === 'cost_control' 
    ? costControlQuery.isLoading 
    : budgetModel === 'bdi_brazil'
      ? simpleBudgetQuery.isLoading || bdiBudgetQuery.isLoading
      : simpleBudgetQuery.isLoading;

  console.log('[BudgetPhaseTotalsTab] Data loading state:', {
    budgetModel,
    isLoading,
    lineItemsCount: lineItems?.length || 0,
  });

  // Calculate phase totals using appropriate data source for each budget model
  const phaseTotalsRaw = useMemo(() => {
    console.log('[BudgetPhaseTotalsTab] Calculating phase totals:', {
      hasSettings: !!settings,
      budgetModel,
      lineItemsCount: lineItems?.length || 0,
      settingsBDI: settings?.bdi_central_admin,
    });

    // For BDI Brazil budgets, use the hook's getPhaseTotalsWithLS method
    if (budgetModel === 'bdi_brazil') {
      console.log('[BudgetPhaseTotalsTab] Using BDI Brazil hook for phase totals');
      return bdiPhaseTotals;
    }

    // Enhanced input validation
    if (!settings || typeof settings !== 'object') {
      console.warn('[BudgetPhaseTotalsTab] Invalid or missing settings:', settings);
      return [];
    }

    if (!Array.isArray(lineItems)) {
      console.warn('[BudgetPhaseTotalsTab] Invalid lineItems array:', lineItems);
      return [];
    }

    if (!lineItems || lineItems.length === 0) {
      console.log('[BudgetPhaseTotalsTab] No line items, returning empty array');
      return [];
    }

    if (budgetModel === 'cost_control') {
      console.log('[BudgetPhaseTotalsTab] Processing Cost Control budget');

      // Cost Control budget: group by phase and aggregate by cost code
      // Cost codes: MAT (Materials), LAB (Labor), EQT (Equipment), SUB (Subcontracting), FEE (Fees), OVH (Overhead)
      const phaseMap = new Map<string, {
        phase_name: string;
        totalMAT: number;
        totalLAB: number;
        totalEQT: number;
        totalSUB: number;
        totalFEE: number;
        totalOVH: number;
      }>();

      // Group by phase and aggregate by cost code
      for (const item of lineItems as any[]) {
        // Get phase name and cost code with safety
        const phaseName = item.project_phases?.phase_name || 'Unassigned';
        const costCode = (item.cost_codes?.code || '').trim().toUpperCase();
        const amount = Number(item.amount) || 0;

        console.log('[BudgetPhaseTotalsTab] Processing cost control line item:', {
          id: item.id,
          phase_name: phaseName,
          cost_code: costCode,
          amount: amount,
        });

        // Get or create phase entry
        const existing = phaseMap.get(phaseName) || {
          phase_name: phaseName,
          totalMAT: 0,
          totalLAB: 0,
          totalEQT: 0,
          totalSUB: 0,
          totalFEE: 0,
          totalOVH: 0,
        };

        // Map cost code to appropriate category (Extended matching)
        if (costCode === 'MAT' || costCode === 'MATERIAL') {
          existing.totalMAT += amount;
        } else if (costCode === 'LAB' || costCode === 'LABOR') {
          existing.totalLAB += amount;
        } else if (costCode === 'EQT' || costCode === 'EQUIPMENT') {
          existing.totalEQT += amount;
        } else if (costCode === 'SUB' || costCode === 'SUBCONTRACT') {
          existing.totalSUB += amount;
        } else if (costCode === 'FEE') {
          existing.totalFEE += amount;
        } else if (costCode === 'OVH' || costCode === 'ADM' || costCode === 'OVERHEAD') {
          existing.totalOVH += amount;
        } else {
          // Default to Overhead for unknown codes
          if (amount > 0) {
            console.warn('[BudgetPhaseTotalsTab] Unknown cost code mapping to OVH:', costCode);
          }
          existing.totalOVH += amount;
        }

        phaseMap.set(phaseName, existing);
      }

      console.log('[BudgetPhaseTotalsTab] Cost control phase map after grouping:', Object.fromEntries(phaseMap));

      // Convert to PhaseTotal format for cost control
      const phaseTotals: PhaseTotal[] = [];
      for (const phaseData of phaseMap.values()) {
        // Get items for this phase
        const phaseItems = lineItems.filter((item: any) => 
          (item.project_phases?.phase_name || 'Uncategorized') === phaseData.phase_name
        );

        const phaseTotal: PhaseTotal = {
          phase_id: '', // Not needed for display
          phase_name: phaseData.phase_name,
          totalLabor: phaseData.totalLAB, // LAB cost code
          totalMaterials: phaseData.totalMAT, // MAT cost code
          totalDirectCost: phaseData.totalMAT + phaseData.totalLAB + phaseData.totalEQT + phaseData.totalSUB + phaseData.totalFEE + phaseData.totalOVH,
          totalLS: 0, // Cost Control doesn't use LS
          totalBDI: 0, // Cost Control doesn't use BDI
          grandTotal: phaseData.totalMAT + phaseData.totalLAB + phaseData.totalEQT + phaseData.totalSUB + phaseData.totalFEE + phaseData.totalOVH,
          items: phaseItems
        };
        console.log('[BudgetPhaseTotalsTab] Created Cost Control phase total:', phaseTotal);
        phaseTotals.push(phaseTotal);
      }

      console.log('[BudgetPhaseTotalsTab] Final Cost Control phase totals:', phaseTotals);
      return phaseTotals;
    } else {
      console.log('[BudgetPhaseTotalsTab] Processing Simple/BDI budget');

      // Simple/BDI budget: use existing logic with budget_line_items
      const grouped = groupLineItemsByPhase(lineItems as any[]);
      console.log('[BudgetPhaseTotalsTab] Grouped line items:', Object.fromEntries(grouped));

      const phaseTotals: PhaseTotal[] = [];

      for (const [phaseName, items] of grouped.entries()) {
        const phaseTotal = calculateSINPhaseTotals(
          items as any[],
          settings.bdi_central_admin || 0,
          settings.bdi_financial_costs || 0
        );
        console.log('[BudgetPhaseTotalsTab] Created Simple/BDI phase total:', phaseTotal);
        phaseTotals.push(phaseTotal);
      }

      console.log('[BudgetPhaseTotalsTab] Final Simple/BDI phase totals:', phaseTotals);
      return phaseTotals;
    }
  }, [lineItems, settings, budgetModel, bdiPhaseTotals]);

  const phaseTotals = sortPhasesByStandardOrder(phaseTotalsRaw);

  console.log('[BudgetPhaseTotalsTab] After sorting:', {
    phaseTotalsRawCount: phaseTotalsRaw.length,
    phaseTotalsCount: phaseTotals.length,
    phaseTotals: phaseTotals,
  });

  // Calculate grand totals using appropriate data source
  const grandTotals = useMemo((): GrandTotal => {
    // For BDI Brazil budgets, use the hook's getGrandTotals method
    if (budgetModel === 'bdi_brazil') {
      console.log('[BudgetPhaseTotalsTab] Using BDI Brazil hook for grand totals');
      return bdiBudgetQuery.getGrandTotals?.() || {
        totalLabor: 0,
        totalMaterials: 0,
        totalDirectCost: 0,
        totalLS: 0,
        totalBDI: 0,
        grandTotal: 0,
      };
    }

    // Enhanced input validation
    if (!settings || typeof settings !== 'object') {
      console.warn('[BudgetPhaseTotalsTab] Invalid settings for grand totals:', settings);
      return {
        totalLabor: 0,
        totalMaterials: 0,
        totalDirectCost: 0,
        totalLS: 0,
        totalBDI: 0,
        grandTotal: 0,
      };
    }

    if (!Array.isArray(lineItems)) {
      console.warn('[BudgetPhaseTotalsTab] Invalid lineItems for grand totals:', lineItems);
      return {
        totalLabor: 0,
        totalMaterials: 0,
        totalDirectCost: 0,
        totalLS: 0,
        totalBDI: 0,
        grandTotal: 0,
      };
    }

    if (!lineItems || lineItems.length === 0) {
      console.log('[BudgetPhaseTotalsTab] No line items for grand totals');
      return {
        totalLabor: 0,
        totalMaterials: 0,
        totalDirectCost: 0,
        totalLS: 0,
        totalBDI: 0,
        grandTotal: 0,
      };
    }

    if (budgetModel === 'cost_control') {
      // Cost Control budget: calculate from phase totals
      if (!phaseTotalsRaw || phaseTotalsRaw.length === 0) {
        return {
          totalLabor: 0,
          totalMaterials: 0,
          totalDirectCost: 0,
          totalLS: 0,
          totalBDI: 0,
          grandTotal: 0,
        };
      }

      const totalLabor = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalLabor || 0), 0);
      const totalMaterials = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalMaterials || 0), 0);
      const totalDirectCost = totalLabor + totalMaterials;
      const totalBDI = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalBDI || 0), 0);
      const grandTotal = phaseTotalsRaw.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

      return {
        totalLabor,
        totalMaterials,
        totalDirectCost,
        totalLS: 0, // Cost Control doesn't use LS
        totalBDI,
        grandTotal,
      };
    } else {
      // Simple budget: use existing logic
      return calculateSINGrandTotals(
        lineItems as any[],
        settings.bdi_central_admin || 0,
        settings.bdi_financial_costs || 0
      );
    }
  }, [lineItems, phaseTotalsRaw, settings, budgetModel, bdiBudgetQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budgets:phases.title")}</CardTitle>
        <CardDescription>{t("budgets:phases.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {(() => {
          console.log('[BudgetPhaseTotalsTab] Render decision:', {
            isLoading,
            phaseTotalsLength: phaseTotals.length,
            phaseTotals: phaseTotals,
            willShowLoading: isLoading,
            willShowNoTotals: !isLoading && phaseTotals.length === 0,
            willShowTable: !isLoading && phaseTotals.length > 0,
          });

          if (isLoading) {
            return (
              <p className="text-center text-muted-foreground py-8">
                {t("common:loading")}
              </p>
            );
          } else if (phaseTotals.length === 0) {
            console.log('[BudgetPhaseTotalsTab] Showing "no phase totals" message');
            // For cost_control budgets, this is expected if WBS population failed
            // Don't show the error message as it will be handled by the budget creation process
            if (budgetModel === 'cost_control') {
              return (
                <div className="text-center text-muted-foreground py-8">
                  <p className="mb-2">Setting up Cost Control budget...</p>
                  <p className="text-sm">
                    Line items will be populated automatically from your project WBS structure.
                  </p>
                </div>
              );
            }
            return (
              <p className="text-center text-muted-foreground py-8">
                {t("budgets:reports.noPhaseTotals")}
              </p>
            );
          } else {
            console.log('[BudgetPhaseTotalsTab] Showing phase totals table');

            // Disable virtualization - show all rows without scrolling
            const isCostControl = budgetModel === 'cost_control';
            const showLSandBDI = !isCostControl;

            return (
              <Table className="w-full border rounded-lg">
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="h-8 py-1 px-1 text-xs font-semibold w-[350px]">{t("budgets:overview.phase")}</TableHead>
                    <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.totalLabor")}</TableHead>
                    <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.totalMaterials")}</TableHead>
                    <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.totalDirectCost")}</TableHead>
                    {showLSandBDI && (
                      <>
                        <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.totalLS")}</TableHead>
                        <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.totalBDI")}</TableHead>
                      </>
                    )}
                    <TableHead className="h-8 py-1 px-1 text-xs font-semibold text-right w-[110px]">{t("budgets:overview.grandTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {phaseTotals.map((phase, index) => (
                    <TableRow key={phase.phase_id || phase.phase_name} className={`h-8 ${index % 2 === 1 ? 'bg-muted/50' : ''}`}>
                      <TableCell className="font-medium py-1 px-1 text-sm w-[350px]">{phase.phase_name}</TableCell>
                      <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                        {formatCurrency(phase.totalLabor, "BRL")}
                      </TableCell>
                      <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                        {formatCurrency(phase.totalMaterials, "BRL")}
                      </TableCell>
                      <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                        {formatCurrency(phase.totalDirectCost, "BRL")}
                      </TableCell>
                      {showLSandBDI && (
                        <>
                          <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                            {formatCurrency(phase.totalLS, "BRL")}
                          </TableCell>
                          <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                            {formatCurrency(phase.totalBDI, "BRL")}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="text-right py-1 px-1 text-sm font-semibold w-[110px]">
                        {formatCurrency(phase.grandTotal, "BRL")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-primary/10 font-bold border-t-2 border-primary h-8">
                    <TableCell className="py-1 px-1 text-sm w-[350px]">{t("budgets:overview.grandTotal")}</TableCell>
                    <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                      {formatCurrency(grandTotals.totalLabor, "BRL")}
                    </TableCell>
                    <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                      {formatCurrency(grandTotals.totalMaterials, "BRL")}
                    </TableCell>
                    <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                      {formatCurrency(grandTotals.totalDirectCost, "BRL")}
                    </TableCell>
                    {showLSandBDI && (
                      <>
                        <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                          {formatCurrency(grandTotals.totalLS, "BRL")}
                        </TableCell>
                        <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                          {formatCurrency(grandTotals.totalBDI, "BRL")}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right py-1 px-1 text-sm w-[110px]">
                      {formatCurrency(grandTotals.grandTotal, "BRL")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            );
          }
        })()}
      </CardContent>
    </Card>
  );
};

