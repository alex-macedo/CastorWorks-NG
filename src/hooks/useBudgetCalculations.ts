import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateLS,
  calculateBDIPercentage as calcBDI,
  groupLineItemsByPhase,
  calculatePhaseTotals,
  calculateGrandTotals,
  type PhaseTotal,
  type GrandTotal,
} from "@/utils/budgetCalculations";
import type { BudgetLineItem } from "./useBudgetLineItems";

export interface BDIComponent {
  component_type: string;
  percentage: number;
  amount: number;
}

export interface BudgetTotal {
  totalMaterial: number;
  totalLabor: number;
  totalDirectCost: number;
  bdiPercentage: number;
  bdiAmount: number;
  finalTotal: number;
}

// PhaseTotal is imported from budgetCalculations.ts
// This local interface was conflicting with the imported one

interface AppSettings {
  bdi_central_admin: number;
  bdi_site_overhead: number;
  bdi_financial_costs: number;
  bdi_risks_insurance: number;
  bdi_taxes: number;
  bdi_profit_margin: number;
  bdi_pis?: number;
  bdi_cofins?: number;
  bdi_iss?: number;
  bdi_social_taxes?: number;
}

/**
 * Calculate BDI using the Excel formula
 * BDI = ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
 * Where: AC=Central Admin, CF=Financial Costs, R=Risk/Insurance, L=Profit Margin
 * TotalTaxes = PIS + COFINS + ISS (NOT including Other Taxes or Social Taxes)
 */
function calculateBDIPercentage(settings: AppSettings): number {
  // Convert percentages to decimals
  const ac = (settings.bdi_central_admin || 0) / 100;
  const cf = (settings.bdi_financial_costs || 0) / 100;
  const r = (settings.bdi_risks_insurance || 0) / 100;
  const l = (settings.bdi_profit_margin || 0) / 100;
  
  // TotalTaxes = PIS + COFINS + ISS (use separate fields if available, otherwise fall back to bdi_taxes)
  const totalTaxes = (settings.bdi_pis || 0) + (settings.bdi_cofins || 0) + (settings.bdi_iss || 0);
  const taxes = totalTaxes > 0 ? totalTaxes / 100 : (settings.bdi_taxes || 0) / 100;

  // Numerator: (1+AC) * (1+CF) * (1+R) * (1+L)
  const numerator = (1 + ac) * (1 + cf) * (1 + r) * (1 + l);
  
  // Denominator: 1 - TotalTaxes
  const denominator = 1 - taxes;

  if (denominator === 0) return 0;

  // BDI = (numerator / denominator) - 1
  const bdiTotal = (numerator / denominator) - 1;
  return Math.max(0, bdiTotal * 100); // Return as percentage
}

export function useBudgetCalculations(
  budgetId?: string,
  appSettings?: AppSettings,
  budgetModel?: string
) {
  const isCostControl = budgetModel === 'cost_control';

  // Fetch standard budget line items
  const lineItemsQuery = useQuery({
    queryKey: ["budget_line_items", budgetId],
    queryFn: async () => {
      if (!budgetId || isCostControl) return [];

      const { data, error } = await supabase
        .from("budget_line_items")
        .select(`
          *,
          project_phases (
            phase_name,
            type
          )
        `)
        .eq("budget_id", budgetId);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        ...item,
        phase_name: item.project_phases?.phase_name || item.project_phases?.[0]?.phase_name || null,
      }));
    },
    enabled: !!budgetId && !isCostControl,
  });

  // Fetch cost control budget lines
  const costControlQuery = useQuery({
    queryKey: ["cost_control_budget_lines", budgetId],
    queryFn: async () => {
      if (!budgetId || !isCostControl) return [];

      // Get the budget to find the project_id
      const { data: budgetData, error: budgetError } = await supabase
        .from("project_budgets")
        .select("project_id")
        .eq("id", budgetId)
        .single();

      if (budgetError || !budgetData) throw budgetError || new Error('Budget not found');

      // Get the baseline version
      const { data: versionData, error: versionError } = await supabase
        .from("project_budget_versions")
        .select("id")
        .eq("project_id", budgetData.project_id)
        .eq("status", "baseline")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionError || !versionData?.id) return [];

      const { data: linesData, error: linesError } = await supabase
        .from("project_budget_lines")
        .select("*")
        .eq("version_id", versionData.id);

      if (linesError) throw linesError;
      return linesData || [];
    },
    enabled: !!budgetId && isCostControl,
  });

  // Fetch phase totals
  const phaseTotalsQuery = useQuery({
    queryKey: ["budget_phase_totals", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from("budget_phase_totals")
        .select("*, project_phases(name)")
        .eq("budget_id", budgetId);

      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

  // Fetch BDI components
  const bdiComponentsQuery = useQuery({
    queryKey: ["budget_bdi_components", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from("budget_bdi_components")
        .select("*")
        .eq("budget_id", budgetId);

      if (error) throw error;
      return data as BDIComponent[];
    },
    enabled: !!budgetId,
  });

  // Helper function to filter out zero-cost items
  const filterValidItems = (items: BudgetLineItem[]): BudgetLineItem[] => {
    return items.filter((item) => {
      const material = item.total_material || 0;
      const labor = item.total_labor || 0;
      return material !== 0 || labor !== 0;
    });
  };

  // Calculate totals from line items
  const calculateBudgetTotal = (): BudgetTotal => {
    if (isCostControl) {
      const lines = costControlQuery.data || [];
      
      // Need to fetch cost codes to properly categorize
      // For now, aggregate by cost_code_id patterns or just sum amounts
      const totalLabor = 0;
      const totalMaterial = 0;
      const totalOther = 0;
      
      // We need to join with cost_codes to determine the type
      // Since this hook doesn't have the joined data, we'll need to fetch it
      // For now, use a simple approach - the Dashboard tab has the correct logic
      // This is a fallback that sums all amounts
      const totalAmount = lines.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      // TODO: Properly integrate with cost_codes table
      // For now, return the direct cost total and let the Dashboard tab handle the breakdown
      const bdiPercent = 0; // Cost control doesn't use BDI
      const bdiAmount = 0;
      
      return {
        totalMaterial: totalAmount, // Direct cost (sum of all codes)
        totalLabor: 0, // Will be calculated in the Dashboard tab with joined data
        totalDirectCost: totalAmount,
        bdiPercentage: bdiPercent,
        bdiAmount: bdiAmount,
        finalTotal: totalAmount + bdiAmount,
      };
    }

    const lineItems = lineItemsQuery.data || [];
    const validItems = filterValidItems(lineItems);

    const totalMaterial = validItems.reduce(
      (sum, item) => sum + (item.total_material || 0),
      0
    );
    const totalLabor = validItems.reduce(
      (sum, item) => sum + (item.total_labor || 0),
      0
    );
    const totalDirectCost = totalMaterial + totalLabor;

    let bdiPercentage = 0;
    let bdiAmount = 0;
    let finalTotal = totalDirectCost;

    if (appSettings) {
      bdiPercentage = calculateBDIPercentage(appSettings);
      bdiAmount = totalDirectCost * (bdiPercentage / 100);
      
      // For BDI budgets, include Legal Services (LS) in final total
      if (budgetModel === 'bdi_brazil') {
        const lsAmount = calculateLS(totalLabor, appSettings.bdi_financial_costs || 0);
        finalTotal = totalDirectCost + lsAmount + bdiAmount;
      } else {
        finalTotal = totalDirectCost + bdiAmount;
      }
    }

    return {
      totalMaterial,
      totalLabor,
      totalDirectCost,
      bdiPercentage,
      bdiAmount,
      finalTotal,
    };
  };

  // Get total for specific phase
  const getPhaseTotal = (phaseId: string): BudgetTotal => {
    const lineItems = lineItemsQuery.data || [];
    const phaseItems = lineItems.filter((item) => item.phase_id === phaseId);
    // Filter out zero-cost items
    const validItems = filterValidItems(phaseItems);

    const totalMaterial = validItems.reduce(
      (sum, item) => sum + (item.total_material || 0),
      0
    );
    const totalLabor = validItems.reduce(
      (sum, item) => sum + (item.total_labor || 0),
      0
    );
    const totalDirectCost = totalMaterial + totalLabor;

    let bdiPercentage = 0;
    if (appSettings) {
      bdiPercentage = calculateBDIPercentage(appSettings);
    }

    const bdiAmount = totalDirectCost * (bdiPercentage / 100);
    const finalTotal = totalDirectCost + bdiAmount;

    return {
      totalMaterial,
      totalLabor,
      totalDirectCost,
      bdiPercentage,
      bdiAmount,
      finalTotal,
    };
  };

  // Get breakdown of BDI components
  const getBDIBreakdown = (directCost: number) => {
    if (!appSettings) return {};

    const admin = directCost * (appSettings.bdi_central_admin / 100);
    const adminBase = directCost + admin;

    const siteOH = adminBase * (appSettings.bdi_site_overhead / 100);
    const siteOHBase = adminBase + siteOH;

    const financial = siteOHBase * (appSettings.bdi_financial_costs / 100);
    const financialBase = siteOHBase + financial;

    const risk = financialBase * (appSettings.bdi_risks_insurance / 100);
    const riskBase = financialBase + risk;

    // Taxes are calculated differently
    const subtotal = riskBase;
    const taxes = subtotal * (appSettings.bdi_taxes / 100);

    // Profit is the remainder
    const bdiTotal = calculateBDIPercentage(appSettings) / 100;
    const totalBDI = directCost * bdiTotal;
    const profit = totalBDI - (admin + siteOH + financial + risk + taxes);

    return {
      direct_cost: directCost,
      central_admin: admin,
      site_overhead: siteOH,
      financial_costs: financial,
      risks_insurance: risk,
      taxes: taxes,
      profit_margin: Math.max(0, profit),
      total_bdi: totalBDI,
      final_total: directCost + totalBDI,
    };
  };

  const budgetTotal = calculateBudgetTotal();

  // Get phase totals with LS calculation
  const getPhaseTotalsWithLS = (): PhaseTotal[] => {
    if (!appSettings) return [];
    const lineItems = (lineItemsQuery.data || []) as BudgetLineItem[];
    const grouped = groupLineItemsByPhase(lineItems);
    const phaseTotals: PhaseTotal[] = [];

    for (const [phaseName, items] of grouped.entries()) {
      const phaseTotal = calculatePhaseTotals(items, appSettings, budgetModel);
      phaseTotals.push(phaseTotal);
    }

    // Sort by phase name for consistent display
    return phaseTotals.sort((a, b) =>
      a.phase_name.localeCompare(b.phase_name)
    );
  };

  // Get grand totals including LS
  const getGrandTotals = (): GrandTotal => {
    const phaseTotals = getPhaseTotalsWithLS();
    return calculateGrandTotals(phaseTotals);
  };

  return {
    totalMaterial: budgetTotal.totalMaterial,
    totalLabor: budgetTotal.totalLabor,
    totalDirectCost: budgetTotal.totalDirectCost,
    bdiPercentage: budgetTotal.bdiPercentage,
    bdiAmount: budgetTotal.bdiAmount,
    finalTotal: budgetTotal.finalTotal,
    bdiComponents: bdiComponentsQuery.data || [],
    phaseTotals: phaseTotalsQuery.data || [],
    calculateBDI: calculateBDIPercentage,
    calculateLS: (totalLabor: number, financialExpensesPercent: number) =>
      calculateLS(totalLabor, financialExpensesPercent),
    getPhaseTotal,
    getPhaseTotalsWithLS,
    getGrandTotals,
    getBDIBreakdown,
    isLoading:
      lineItemsQuery.isLoading ||
      phaseTotalsQuery.isLoading ||
      bdiComponentsQuery.isLoading,
  };
}
