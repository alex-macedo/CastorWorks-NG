import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { useBudgetCalculations } from "@/hooks/useBudgetCalculations";
import { useCostControlBudgetLines } from "@/hooks/useCostControlBudgetLines";
import { useAppSettings } from "@/hooks/useAppSettings";
import { sortPhasesByStandardOrder, groupLineItemsByPhase, calculateSINPhaseTotals, calculateSINGrandTotals, calculateLS } from "@/utils/budgetCalculations";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CostProportionByStageChart,
  LaborVsMaterialsChart,
  CostByStageChart,
  CostByStagePercentChart,
  LaborCostChart,
  OtherCostsChart,
} from "./BudgetCharts";
import { BudgetSCurveChart } from "./BudgetSCurveChart";
import { BudgetTrendChart } from "./BudgetTrendChart";
import { BudgetHealthChart } from "./BudgetHealthChart";

interface BudgetDashboardTabProps {
  budgetId: string;
  projectId: string;
  budgetModel?: string;
}


export const BudgetDashboardTab = ({ budgetId, projectId, budgetModel }: BudgetDashboardTabProps) => {
  const { t } = useLocalization();
  const { settings } = useAppSettings();

  // Use appropriate hook based on budget model
  const simpleBudgetQuery = useBudgetCalculations(
    budgetModel === 'simple' || budgetModel === 'bdi_brazil' ? budgetId : undefined,
    settings as any
  );
  const costControlQuery = useCostControlBudgetLines(
    budgetModel === 'cost_control' ? budgetId : undefined
  );

  // Get data from the appropriate source
  const isCostControl = budgetModel === 'cost_control';
  const isSimple = budgetModel === 'simple';
  const costControlLineItems = costControlQuery.data || [];
  const simpleLineItems = simpleBudgetQuery.getPhaseTotalsWithLS?.() || [];

  // For simple budgets, we need to fetch raw line items to group by group_name
  const { data: rawSimpleLineItems } = useQuery({
    queryKey: ["budget_line_items_for_groups", budgetId],
    queryFn: async () => {
      if (!budgetId || !isSimple) return [];
      
      const { data, error } = await supabase
        .from("budget_line_items")
        .select("*")
        .eq("budget_id", budgetId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId && isSimple,
  });

  // Fetch budget template to check if it has materials (for materials template logic)
  const { data: budgetData } = useQuery({
    queryKey: ["budget_for_template", budgetId],
    queryFn: async () => {
      if (!budgetId || !isSimple) return null;
      
      const { data, error } = await supabase
        .from("project_budgets")
        .select("budget_template_id")
        .eq("id", budgetId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!budgetId && isSimple,
  });

  const { data: budgetTemplate } = useQuery({
    queryKey: ["budget_template_for_dashboard", budgetData?.budget_template_id],
    queryFn: async () => {
      if (!budgetData?.budget_template_id) return null;
      
      const { data, error } = await supabase
        .from("budget_templates")
        .select("id, has_materials")
        .eq("id", budgetData.budget_template_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!budgetData?.budget_template_id,
  });

  const templateHasMaterials = (budgetTemplate as any)?.has_materials === true;

  // Determine which data to use for calculations
  const phaseTotalsRaw = isCostControl 
    ? (() => {
        // For cost_control: group by phase and aggregate by cost code
        // Cost codes: MAT (Materials), LAB (Labor), EQT (Equipment), SUB (Subcontracting), FEE (Fees), OVH (Overhead)
        const phaseMap = new Map<string, any>();
        
        for (const item of costControlLineItems as any[]) {
          // Get phase name and cost code with safety
          const phaseName = item.project_phases?.phase_name || 'Unassigned';
          const costCode = (item.cost_codes?.code || '').trim().toUpperCase();
          const amount = Number(item.amount) || 0;
          
          if (amount > 0) {
            console.log('[BudgetDashboardTab] Processing Item:', { phase: phaseName, code: costCode, amount });
          }

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
              console.warn('[BudgetDashboardTab] Unknown cost code mapping to OVH:', costCode);
            }
            existing.totalOVH += amount;
          }
          
          phaseMap.set(phaseName, existing);
        }
        
        // Convert to phase totals format
        const result = Array.from(phaseMap.values()).map(phase => ({
          phase_id: '',
          phase_name: phase.phase_name,
          totalLabor: phase.totalLAB,
          totalMaterials: phase.totalMAT,
          totalDirectCost: phase.totalMAT + phase.totalLAB + phase.totalEQT + phase.totalSUB + phase.totalFEE + phase.totalOVH,
          totalLS: 0,
          totalBDI: 0,
          grandTotal: phase.totalMAT + phase.totalLAB + phase.totalEQT + phase.totalSUB + phase.totalFEE + phase.totalOVH,
          items: [],
          totalEQT: phase.totalEQT,
          totalSUB: phase.totalSUB,
          totalFEE: phase.totalFEE,
          totalOVH: phase.totalOVH,
        } as any));

        console.log('[BudgetDashboardTab] Final Phase Aggregation:', result);
        return result;
      })()
    : isSimple
      ? (() => {
          // For simple: group by group_name
          // When templateHasMaterials is true, "Mão-de-obra" group should be treated as labor
          const groupMap = new Map<string, { 
            totalMaterial: number; 
            totalLabor: number; 
            totalLS: number;
            totalBDI: number;
          }>();
          
          for (const item of (rawSimpleLineItems || []) as any[]) {
            const groupName = item.group_name || 'Other';
            const isLaborGroup = templateHasMaterials && groupName === 'Mão-de-obra';
            
            const existing = groupMap.get(groupName) || {
              totalMaterial: 0,
              totalLabor: 0,
              totalLS: 0,
              totalBDI: 0
            };
            
            // For materials templates, "Mão-de-obra" items have their value in total_material
            // but should be counted as labor
            if (isLaborGroup) {
              existing.totalLabor += item.total_material || 0;
              // Don't add to materials for labor group
            } else {
              existing.totalMaterial += item.total_material || 0;
              existing.totalLabor += item.total_labor || 0;
            }
            groupMap.set(groupName, existing);
          }
          
          // Calculate LS and BDI for each group
          return Array.from(groupMap.entries()).map(([groupName, totals]) => {
            const totalDirectCost = totals.totalMaterial + totals.totalLabor;
            const totalLS = calculateLS(totals.totalLabor, settings?.bdi_site_overhead || 0);
            const bdiPercentage = (settings?.bdi_central_admin || 0) / 100;
            const totalBDI = (totalDirectCost + totalLS) * bdiPercentage;
            const grandTotal = totalDirectCost + totalLS + totalBDI;
            
            return {
              phase_id: '',
              phase_name: groupName,
              totalLabor: totals.totalLabor,
              totalMaterials: totals.totalMaterial,
              totalDirectCost,
              totalLS,
              totalBDI,
              grandTotal,
              items: []
            };
          });
        })()
      : simpleLineItems; // bdi_brazil uses phase totals

  const phaseTotals = sortPhasesByStandardOrder(phaseTotalsRaw);
  const isLoading = isCostControl ? costControlQuery.isLoading : simpleBudgetQuery.isLoading;

  // Calculate grand totals
  const grandTotals = isCostControl
    ? (() => {
        const totalLabor = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalLabor || 0), 0);
        const totalMaterials = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalMaterials || 0), 0);
        const totalDirectCost = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalDirectCost || 0), 0);
        const grandTotal = phaseTotalsRaw.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
        return {
          totalLabor,
          totalMaterials,
          totalDirectCost,
          totalLS: 0, // Cost control doesn't use LS
          totalBDI: 0, // Cost control doesn't use BDI
          grandTotal
        };
      })()
    : isSimple && templateHasMaterials
      ? (() => {
          // For simple budgets with materials templates, calculate from phaseTotalsRaw
          // which already has the correct labor/materials split from the grouping logic above
          const totalLabor = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalLabor || 0), 0);
          const totalMaterials = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalMaterials || 0), 0);
          const totalDirectCost = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalDirectCost || 0), 0);
          const totalLS = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalLS || 0), 0);
          const totalBDI = phaseTotalsRaw.reduce((sum, p) => sum + (p.totalBDI || 0), 0);
          const grandTotal = phaseTotalsRaw.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
          return {
            totalLabor,
            totalMaterials,
            totalDirectCost,
            totalLS,
            totalBDI,
            grandTotal
          };
        })()
      : simpleBudgetQuery.getGrandTotals?.() || {
          totalLabor: 0,
          totalMaterials: 0,
          totalDirectCost: 0,
          totalLS: 0,
          totalBDI: 0,
          grandTotal: 0
        };

  // Debug: Log data structure to verify it's correct
  if (process.env.NODE_ENV === 'development' && phaseTotals.length > 0) {
    console.log('[BudgetDashboardTab] Phase totals:', phaseTotals);
    console.log('[BudgetDashboardTab] Grand totals:', grandTotals);
    console.log('[BudgetDashboardTab] First phase sample:', phaseTotals[0]);
  }

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="space-y-6">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              {t("common:loading")}
            </div>
          ) : phaseTotals.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t("budgets:reports.noPhaseTotals")}
            </div>
          ) : (
            <>
              {/* Dynamic Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Cost Proportion by Stage - Overall breakdown */}
                {grandTotals.grandTotal > 0 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.costProportionByStage")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <CostProportionByStageChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 2. Labor vs Materials - Pie chart */}
                {(grandTotals.totalLabor > 0 || grandTotals.totalMaterials > 0) && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.laborVsMaterials")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <LaborVsMaterialsChart grandTotals={grandTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 3. Cost by Stage (R$) */}
                {grandTotals.grandTotal > 0 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.costByStage")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <CostByStageChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 4. Budget S-Curve - Cumulative allocation */}
                {grandTotals.grandTotal > 0 && phaseTotals.length > 1 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.budgetSCurve")}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets:dashboard.cumulativeBudgetAllocation")}
                      </p>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <BudgetSCurveChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 5. Budget Trend - Cost progression */}
                {grandTotals.grandTotal > 0 && phaseTotals.length > 1 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.budgetTrend")}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets:dashboard.costProgressionByPhase")}
                      </p>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <BudgetTrendChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 6. Budget Health - Allocation breakdown */}
                {grandTotals.grandTotal > 0 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.budgetHealth")}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t("budgets:dashboard.costAllocationBreakdown")}
                      </p>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 min-h-[350px]">
                      <BudgetHealthChart grandTotals={grandTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 7. Labor Cost per Stage */}
                {grandTotals.totalLabor > 0 && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.laborCost")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <LaborCostChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}

                {/* 8. Other Costs per Stage (Materials + LS + BDI) */}
                {(grandTotals.totalMaterials > 0 || grandTotals.totalLS > 0 || grandTotals.totalBDI > 0) && (
                  <Card className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("budgets:dashboard.otherCosts")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0 pb-4 flex-1 min-h-[450px]">
                      <OtherCostsChart phaseTotals={phaseTotals} />
                    </CardContent>
                  </Card>
                )}\n              </div>\n            </>
          )}
      </div>
    </div>
  );
};

