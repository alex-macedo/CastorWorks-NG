import type { BudgetLineItem } from "@/hooks/useBudgetLineItems";

/**
 * Standard phase order based on SINAPI construction phases
 * This order matches the typical construction workflow
 */
export const STANDARD_PHASE_ORDER: string[] = [
  "SERVIÇOS INICIAIS",
  "MOVIMENTAÇÃO DE TERRA",
  "FUNDAÇÃO",
  "ESTRUTURA EM CONCRETO ARMADO",
  "PAREDE",
  "ESQUADRIAS",
  "COBERTURA",
  "IMPERMEABILIZAÇÃO",
  "REVESTIMENTOS",
  "PREVENTIVO CONTRA INCÊNDIO",
  "PROJETO ELÉTRICO",
  "PROJETO HIDROSSANITÁRIO",
  "LOUÇAS E METAIS",
  "SERVIÇOS COMPLEMENTARES",
  "PINTURAS",
  "RETIRADA DE ENTULHO",
];

/**
 * Get the order index for a phase name
 * Returns a high number for phases not in the standard order (so they appear at the end)
 */
export function getPhaseOrderIndex(phaseName: string): number {
  // Validate input
  if (!phaseName || typeof phaseName !== 'string') {
    console.warn('[getPhaseOrderIndex] Invalid phase name:', phaseName);
    return 9999;
  }

  const normalizedPhaseName = phaseName.trim();
  if (normalizedPhaseName === '') {
    console.warn('[getPhaseOrderIndex] Empty phase name after trimming');
    return 9999;
  }

  const index = STANDARD_PHASE_ORDER.findIndex(
    (standardPhase) => standardPhase.toUpperCase() === normalizedPhaseName.toUpperCase()
  );
  // If phase is not in standard order, return a high number to place it at the end
  return index === -1 ? 9999 : index;
}

/**
 * Sort phases according to standard construction workflow order
 */
export function sortPhasesByStandardOrder<T extends { phase_name: string }>(
  phases: T[]
): T[] {
  return [...phases].sort((a, b) => {
    const orderA = getPhaseOrderIndex(a.phase_name);
    const orderB = getPhaseOrderIndex(b.phase_name);
    
    // If both are in standard order, sort by order index
    if (orderA < 9999 && orderB < 9999) {
      return orderA - orderB;
    }
    
    // If one is in standard order and one isn't, standard order comes first
    if (orderA < 9999) return -1;
    if (orderB < 9999) return 1;
    
    // If neither is in standard order, sort alphabetically
    return a.phase_name.localeCompare(b.phase_name);
  });
}

export interface AppSettings {
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

export interface PhaseTotal {
  phase_id?: string;
  phase_name: string;
  totalLabor: number;
  totalMaterials: number;
  totalDirectCost: number;
  totalLS: number;
  totalBDI: number;
  grandTotal: number;
  items: BudgetLineItem[];
}

export interface GrandTotal {
  totalLabor: number;
  totalMaterials: number;
  totalDirectCost: number;
  totalLS: number;
  totalBDI: number;
  grandTotal: number;
}

/**
 * Calculate LS (Labor Benefits/costs) = Labor * Financial Expenses %
 */
export function calculateLS(
  totalLabor: number,
  financialExpensesPercent: number
): number {
  return totalLabor * (financialExpensesPercent / 100);
}

/**
 * Calculate BDI percentage using the Excel formula
 * BDI = ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
 * Where: AC=Central Admin, CF=Financial Costs, R=Risk/Insurance, L=Profit Margin
 * TotalTaxes = PIS + COFINS + ISS (NOT including Other Taxes or Social Taxes)
 */
export function calculateBDIPercentage(settings: AppSettings): number {
  // Validate input
  if (!settings || typeof settings !== 'object') {
    console.warn('[calculateBDIPercentage] Invalid settings object:', settings);
    return 0;
  }

  // Convert percentages to decimals with validation
  const ac = (typeof settings.bdi_central_admin === 'number' ? settings.bdi_central_admin : 0) / 100;
  const cf = (typeof settings.bdi_financial_costs === 'number' ? settings.bdi_financial_costs : 0) / 100;
  const r = (typeof settings.bdi_risks_insurance === 'number' ? settings.bdi_risks_insurance : 0) / 100;
  const l = (typeof settings.bdi_profit_margin === 'number' ? settings.bdi_profit_margin : 0) / 100;

  // Validate percentage ranges (should be reasonable values)
  if (ac < -1 || ac > 10 || cf < -1 || cf > 10 || r < -1 || r > 10 || l < -1 || l > 10) {
    console.warn('[calculateBDIPercentage] Unusual percentage values detected:', { ac, cf, r, l });
  }

  // TotalTaxes = PIS + COFINS + ISS (use separate fields if available, otherwise fall back to bdi_taxes)
  const totalTaxes = (typeof settings.bdi_pis === 'number' ? settings.bdi_pis : 0) +
                    (typeof settings.bdi_cofins === 'number' ? settings.bdi_cofins : 0) +
                    (typeof settings.bdi_iss === 'number' ? settings.bdi_iss : 0);
  const taxes = totalTaxes > 0 ? totalTaxes / 100 : (typeof settings.bdi_taxes === 'number' ? settings.bdi_taxes : 0) / 100;

  // Validate tax percentage (should be reasonable)
  if (taxes < 0 || taxes >= 1) {
    console.warn('[calculateBDIPercentage] Invalid tax percentage:', taxes);
    return 0;
  }

  // Numerator: (1+AC) * (1+CF) * (1+R) * (1+L)
  const numerator = (1 + ac) * (1 + cf) * (1 + r) * (1 + l);

  // Denominator: 1 - TotalTaxes
  const denominator = 1 - taxes;

  // Enhanced validation for division by zero and edge cases
  if (denominator === 0) {
    console.warn('[calculateBDIPercentage] Division by zero prevented (taxes = 100%)');
    return 0;
  }

  if (!isFinite(numerator) || !isFinite(denominator)) {
    console.warn('[calculateBDIPercentage] Invalid calculation result:', { numerator, denominator });
    return 0;
  }

  // BDI = (numerator / denominator) - 1
  const bdiTotal = (numerator / denominator) - 1;

  // Validate final result
  if (!isFinite(bdiTotal)) {
    console.warn('[calculateBDIPercentage] Invalid BDI calculation result:', bdiTotal);
    return 0;
  }

  const result = Math.max(0, bdiTotal * 100); // Return as percentage

  // Log unusual results for debugging
  if (result > 1000) {
    console.warn('[calculateBDIPercentage] Unusually high BDI percentage:', result);
  }

  return result;
}

/**
 * Group line items by phase_name
 */
export function groupLineItemsByPhase(
  lineItems: BudgetLineItem[]
): Map<string, BudgetLineItem[]> {
  // Validate input
  if (!Array.isArray(lineItems)) {
    console.warn('[groupLineItemsByPhase] Invalid lineItems array:', lineItems);
    return new Map();
  }

  const grouped = new Map<string, BudgetLineItem[]>();

  for (const item of lineItems) {
    // Validate each item
    if (!item || typeof item !== 'object') {
      console.warn('[groupLineItemsByPhase] Invalid item found:', item);
      continue;
    }

    const phaseName = (typeof item.phase_name === 'string' && item.phase_name.trim())
      ? item.phase_name.trim()
      : "Sem Fase";

    if (!grouped.has(phaseName)) {
      grouped.set(phaseName, []);
    }
    grouped.get(phaseName)!.push(item);
  }

  return grouped;
}

/**
 * Filter out zero-cost items that shouldn't be included in calculations
 * Items are excluded if both material and labor totals are zero
 */
function filterValidItems(items: BudgetLineItem[]): BudgetLineItem[] {
  // Validate input
  if (!Array.isArray(items)) {
    console.warn('[filterValidItems] Invalid items array:', items);
    return [];
  }

  return items.filter((item) => {
    // Validate item structure
    if (!item || typeof item !== 'object') {
      console.warn('[filterValidItems] Invalid item found:', item);
      return false;
    }

    const material = (typeof item.total_material === 'number') ? item.total_material : 0;
    const labor = (typeof item.total_labor === 'number') ? item.total_labor : 0;

    // Include items that have at least one non-zero cost
    // Also include items with valid structure even if costs are zero (for debugging)
    return material !== 0 || labor !== 0 || (material === 0 && labor === 0 && item.id);
  });
}

/**
 * Calculate totals for a phase including LS and BDI
 */
export function calculatePhaseTotals(
  phaseItems: BudgetLineItem[],
  bdiConfig: AppSettings,
  budgetModel?: string
): PhaseTotal {
  // Validate inputs
  if (!Array.isArray(phaseItems)) {
    console.warn('[calculatePhaseTotals] Invalid phaseItems array:', phaseItems);
    return {
      phase_name: "Error",
      totalLabor: 0,
      totalMaterials: 0,
      totalDirectCost: 0,
      totalLS: 0,
      totalBDI: 0,
      grandTotal: 0,
      items: [],
    };
  }

  if (!bdiConfig || typeof bdiConfig !== 'object') {
    console.warn('[calculatePhaseTotals] Invalid bdiConfig:', bdiConfig);
    return {
      phase_name: phaseItems[0]?.phase_name || "Sem Fase",
      totalLabor: 0,
      totalMaterials: 0,
      totalDirectCost: 0,
      totalLS: 0,
      totalBDI: 0,
      grandTotal: 0,
      items: [],
    };
  }

  // Filter out zero-cost items
  const validItems = filterValidItems(phaseItems);

  const totalLabor = validItems.reduce(
    (sum, item) => sum + ((typeof item.total_labor === 'number') ? item.total_labor : 0),
    0
  );
  const totalMaterials = validItems.reduce(
    (sum, item) => sum + ((typeof item.total_material === 'number') ? item.total_material : 0),
    0
  );
  const totalDirectCost = totalLabor + totalMaterials;

  // Validate calculation results
  if (!isFinite(totalLabor) || !isFinite(totalMaterials) || !isFinite(totalDirectCost)) {
    console.warn('[calculatePhaseTotals] Invalid calculation results:', {
      totalLabor, totalMaterials, totalDirectCost
    });
  }

  const bdiPercentage = calculateBDIPercentage(bdiConfig);
  // For BDI Brazil budgets, use the complex BDI formula (percentage already in decimal form)
  // For other budgets, use the simplified BDI formula (need to divide by 100)
  const totalBDI = budgetModel === 'bdi_brazil' 
    ? totalDirectCost * bdiPercentage  // bdiPercentage is already a decimal (e.g., 0.255)
    : totalDirectCost * (bdiPercentage / 100); // Convert percentage to decimal
  const totalLS = calculateLS(totalLabor, bdiConfig.bdi_financial_costs);
  // Grand Total = Direct Cost + LS + BDI (as per Excel SIN worksheet)
  const grandTotal = totalDirectCost + totalLS + totalBDI;

  return {
    phase_name: validItems[0]?.phase_name || phaseItems[0]?.phase_name || "Sem Fase",
    phase_id: validItems[0]?.phase_id || phaseItems[0]?.phase_id,
    totalLabor,
    totalMaterials,
    totalDirectCost,
    totalLS,
    totalBDI,
    grandTotal,
    items: validItems, // Return only valid items
  };
}

/**
 * Calculate grand totals from phase totals
 * This is the standard calculation used in most tabs
 */
export function calculateGrandTotals(phaseTotals: PhaseTotal[]): GrandTotal {
  const totalLabor = phaseTotals.reduce(
    (sum, phase) => sum + phase.totalLabor,
    0
  );
  const totalMaterials = phaseTotals.reduce(
    (sum, phase) => sum + phase.totalMaterials,
    0
  );
  const totalDirectCost = totalLabor + totalMaterials;
  const totalLS = phaseTotals.reduce((sum, phase) => sum + phase.totalLS, 0);
  const totalBDI = phaseTotals.reduce((sum, phase) => sum + phase.totalBDI, 0);
  // Grand Total = Direct Cost + LS + BDI (standard calculation)
  const grandTotal = totalDirectCost + totalLS + totalBDI;

  return {
    totalLabor,
    totalMaterials,
    totalDirectCost,
    totalLS,
    totalBDI,
    grandTotal,
  };
}

/**
 * Calculate grand totals for SIN worksheet (Overview tab)
 * Uses simplified formulas matching Excel SIN worksheet:
 * - Labor = SUMPRODUCT(Quantity * Unit Cost Labor)
 * - Materials = SUMPRODUCT(Quantity * Unit Cost Material)
 * - Total = Labor + Materials
 * - LS = Total Labor * Financial Expenses
 * - BDI = (Total Labor + Total Materials) * Central Administration %
 * - Grand Total = Total Labor + Total Materials + LS + BDI
 */
export function calculateSINGrandTotals(
  lineItems: BudgetLineItem[],
  centralAdminPercent: number,
  financialExpensesPercent?: number
): GrandTotal {
  // Filter out zero-cost items
  const validItems = filterValidItems(lineItems);
  
  // Calculate totals: Use stored total_material and total_labor (generated columns)
  // These are calculated as: quantity * unit_cost_material and quantity * unit_cost_labor
  // This matches Excel SUMPRODUCT(Quantity * Unit Cost)
  const totalLabor = validItems.reduce(
    (sum, item) => sum + (item.total_labor || 0),
    0
  );
  const totalMaterials = validItems.reduce(
    (sum, item) => sum + (item.total_material || 0),
    0
  );
  const totalDirectCost = totalLabor + totalMaterials;
  
  // LS = Total Labor * Financial Expenses
  const totalLS = financialExpensesPercent 
    ? calculateLS(totalLabor, financialExpensesPercent)
    : 0;
  
  // BDI = (Total Labor + Total Materials) * Central Administration %
  const totalBDI = totalDirectCost * (centralAdminPercent / 100);
  
  // Grand Total = Total Labor + Total Materials + LS + BDI (per Excel SIN worksheet)
  // Formula: Total + LS + BDI = 709,007.45 + 11,210.97 + 28,016.50 = 748,234.92
  const grandTotal = totalDirectCost + totalLS + totalBDI;

  return {
    totalLabor,
    totalMaterials,
    totalDirectCost,
    totalLS,
    totalBDI,
    grandTotal,
  };
}

/**
 * Calculate phase totals using simplified SIN formula (matching summary card)
 * Uses simplified BDI: BDI = Direct Cost * Central Admin %
 * (NOT the complex BDI formula with all components)
 */
export function calculateSINPhaseTotals(
  phaseItems: BudgetLineItem[],
  centralAdminPercent: number,
  financialExpensesPercent?: number
): PhaseTotal {
  // Filter out zero-cost items
  const validItems = filterValidItems(phaseItems);
  
  const totalLabor = validItems.reduce(
    (sum, item) => sum + (item.total_labor || 0),
    0
  );
  const totalMaterials = validItems.reduce(
    (sum, item) => sum + (item.total_material || 0),
    0
  );
  const totalDirectCost = totalLabor + totalMaterials;
  
  // LS = Total Labor * Financial Expenses
  const totalLS = financialExpensesPercent 
    ? calculateLS(totalLabor, financialExpensesPercent)
    : 0;
  
  // Simplified BDI = Direct Cost * Central Admin % (matching summary card)
  const totalBDI = totalDirectCost * (centralAdminPercent / 100);
  
  // Grand Total = Direct Cost + LS + Simplified BDI (matching summary card)
  const grandTotal = totalDirectCost + totalLS + totalBDI;

  return {
    phase_name: validItems[0]?.phase_name || phaseItems[0]?.phase_name || "Sem Fase",
    phase_id: validItems[0]?.phase_id || phaseItems[0]?.phase_id,
    totalLabor,
    totalMaterials,
    totalDirectCost,
    totalLS,
    totalBDI,
    grandTotal,
    items: validItems,
  };
}

