/**
 * INSS de Obra Calculator
 * TypeScript implementation for Brazilian construction tax estimation
 * Based on IN RFB 2021/2021
 */

import type {
  BrazilianState,
  TaxOwnerType,
  TaxWorkCategory,
  TaxConstructionType,
  TaxDestination,
  INSSCalculatorParams,
  INSSCalculatorResult,
  FatorSocialWarning,
} from '../types/tax.types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** VAU reference values by state (updated periodically by RFB) */
export const VAU_BY_STATE: Record<BrazilianState, number> = {
  AC: 1350.00, AL: 1320.00, AP: 1340.00, AM: 1380.00,
  BA: 1350.00, CE: 1340.00, DF: 1500.00, ES: 1420.00,
  GO: 1400.00, MA: 1300.00, MT: 1420.00, MS: 1410.00,
  MG: 1380.00, PA: 1350.00, PB: 1310.00, PR: 1410.00,
  PE: 1340.00, PI: 1280.00, RJ: 1489.00, RN: 1330.00,
  RS: 1449.25, RO: 1380.00, RR: 1360.00, SC: 1445.00,
  SP: 1520.00, SE: 1320.00, TO: 1370.00,
};

/** Labor percentage by construction type (Legacy/Reference) */
export const LABOR_PERCENTAGE: Record<TaxConstructionType, number> = {
  ALVENARIA: 0.40,
  MISTA: 0.30,
  MADEIRA: 0.30,
  PRE_MOLDADO: 0.12,
  METALICA: 0.18,
};

/** Category multiplier (reduction factor) */
export const CATEGORY_MULTIPLIER: Record<TaxWorkCategory, number> = {
  OBRA_NOVA: 1.00,
  ACRESCIMO: 1.00,
  REFORMA: 0.35,    // 65% reduction
  DEMOLICAO: 0.10,  // 90% reduction
};

/** Equivalence factors by destination */
export const EQUIVALENCE_FACTORS: Record<TaxDestination, number> = {
  CASA_POPULAR: 0.55,
  RESIDENCIAL_UNIFAMILIAR: 1.00,
  RESIDENCIAL_MULTIFAMILIAR: 1.00,
  COMERCIAL: 1.00,
  CONJUNTO_HABITACIONAL: 0.60,
  GALPAO_INDUSTRIAL: 0.70,
  EDIFICIO_GARAGENS: 0.64, // 0.80 * 0.80 (additional 20% reduction)
};

/** Fator Social boundaries (area limits in m²) */
export const FATOR_SOCIAL_BOUNDARIES = [100, 200, 300, 400] as const;

/** Fator Social rates by area bracket */
export const FATOR_SOCIAL_RATES: Record<number, number> = {
  100: 0.20,  // <= 100m²
  200: 0.40,  // 100.01 - 200m²
  300: 0.55,  // 200.01 - 300m²
  400: 0.70,  // 300.01 - 400m²
  999999: 0.90, // > 400m²
};

/** INSS contribution rate (standard combined rate for SERO) */
export const INSS_RATE = 0.368;

/** Usinados deduction percentage of COD */
export const USINADOS_DEDUCTION_RATE = 0.05;

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get Fator Social based on area (PF only)
 * Progressive reduction for individual owners based on construction area
 */
export function getFatorSocial(areaM2: number): number {
  if (areaM2 <= 100) return 0.20;
  if (areaM2 <= 200) return 0.40;
  if (areaM2 <= 300) return 0.55;
  if (areaM2 <= 400) return 0.70;
  return 0.90;
}

/**
 * Get equivalence factor for destination
 */
export function getEquivalenceFactor(destination: TaxDestination): number {
  return EQUIVALENCE_FACTORS[destination] ?? 1.00;
}

/**
 * Calculate Decadência (Statute of Limitations)
 * @param startDate Start date of the work
 * @param endDate End date of the work
 * @param assessmentDate Current date for assessment
 */
export function calculateDecadencia(
  startDate: Date | string | null,
  endDate: Date | string | null,
  assessmentDate: Date | string = new Date()
): { isDecadencia: boolean; reduction: number; yearsSinceCompletion: number } {
  if (!endDate) {
    return { isDecadencia: false, reduction: 0, yearsSinceCompletion: 0 };
  }

  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : end;
  const now = new Date(assessmentDate);
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const diffMs = now.getTime() - end.getTime();
  const yearsSinceCompletion = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  // Full Decadência: Completed more than 5 years ago
  if (end < fiveYearsAgo) {
    return { isDecadencia: true, reduction: 1.0, yearsSinceCompletion };
  }

  // Partial Decadência: Started more than 5 years ago
  if (start < fiveYearsAgo) {
    const totalDuration = end.getTime() - start.getTime();
    if (totalDuration <= 0) return { isDecadencia: false, reduction: 0, yearsSinceCompletion };
    
    const decadentPeriod = fiveYearsAgo.getTime() - start.getTime();
    const reduction = Math.max(0, Math.min(1.0, decadentPeriod / totalDuration));
    
    return { isDecadencia: false, reduction, yearsSinceCompletion };
  }

  return { isDecadencia: false, reduction: 0, yearsSinceCompletion };
}

/**
 * Check Fator de Ajuste eligibility (Article 33 of IN RFB 2021)
 * Benefit for individual owners (PF) that can reduce INSS by up to 73%
 */
export function isEligibleForFatorAjuste(
  area: number,
  totalRemunerationPaid: number,
  rmtCalculated: number,
  monthlyDCTFWebSubmissions: number,
  constructionMonths: number
): boolean {
  // Threshold: 50% for works up to 350m2, 70% for works above 350m2
  const threshold = area <= 350 ? 0.50 : 0.70;
  const minRemuneration = rmtCalculated * threshold;

  const meetsRemunerationRequirement = totalRemunerationPaid >= minRemuneration;
  // Mandatory monthly submissions (except first month)
  const meetsDCTFWebRequirement = monthlyDCTFWebSubmissions >= Math.max(0, constructionMonths - 1);

  return meetsRemunerationRequirement && meetsDCTFWebRequirement;
}

/**
 * Calculate INSS de Obra estimate
 * Main calculation function implementing the IN RFB 2021/2021 formula
 */
export function calculateINSS(params: INSSCalculatorParams): INSSCalculatorResult {
  const {
    area,
    state,
    ownerType,
    category,
    constructionType,
    destination,
    laborDeductions = 0,
    usesUsinados = false,
    usesPrefab = false,
    prefabInvoiceValue = 0,
    vauOverride,
    actualEndDate,
    startDate,
    calculationDate = new Date().toISOString(),
    issRate = 0.05,
    issMaterialDeduction = 0,
    totalRemunerationPaid = 0,
    constructionMonths = 1,
    monthlyDCTFWebSubmissions = 0,
  } = params;

  // Step 0: Check for Decadência (Statute of Limitations)
  const decadencia = calculateDecadencia(startDate, actualEndDate, calculationDate);

  // Step 1: Get VAU value
  const vauUsed = vauOverride ?? VAU_BY_STATE[state] ?? 1400;

  // Step 2: Get equivalence factor
  const equivalenceFactor = getEquivalenceFactor(destination);

  // Step 3: Calculate COD (Custo da Obra por Destinação)
  const cod = area * vauUsed * equivalenceFactor;

  // Step 4: Calculate base RMT (Remuneração Mão de Obra)
  // VAU (Valor Atualizado Unitário) already represents the labor cost per m2
  // We apply a construction type coefficient if applicable
  const typeCoefficient = constructionType === 'MADEIRA' || constructionType === 'MISTA' ? 0.70 : 1.00;
  const rmtBase = cod * typeCoefficient;
  let rmt = rmtBase;

  // Step 5: Apply Category Reduction
  const categoryMultiplier = CATEGORY_MULTIPLIER[category];
  const categoryReduction = 1 - categoryMultiplier;
  rmt = rmt * categoryMultiplier;

  // Step 6: Apply Fator Social (PF only)
  let fatorSocial: number | null = null;
  if (ownerType === 'PF') {
    fatorSocial = getFatorSocial(area);
    rmt = rmt * fatorSocial;
  }

  // Step 7: Apply Prefab Reduction (70% reduction)
  let prefabReduction = 0;
  if (usesPrefab && prefabInvoiceValue >= cod * 0.40) {
    prefabReduction = 0.70;
    rmt = rmt * (1 - prefabReduction);
  }

  // Step 8: Apply Ready-Mix Deduction (5% of COD)
  let readyMixDeductionAmount = 0;
  if (usesUsinados) {
    readyMixDeductionAmount = cod * USINADOS_DEDUCTION_RATE;
    rmt = Math.max(0, rmt - readyMixDeductionAmount);
  }

  // Step 9: Apply Popular Housing Reduction
  let popularHousingReduction = 0;
  if (destination === 'CASA_POPULAR' && area <= 70) {
    popularHousingReduction = 0.50;
    rmt = rmt * (1 - popularHousingReduction);
  }

  // Step 10: Apply Fator de Ajuste
  let fatorAjusteReduction = 0;
  const isEligible = ownerType === 'PF' && isEligibleForFatorAjuste(
    area,
    totalRemunerationPaid + laborDeductions,
    rmt,
    monthlyDCTFWebSubmissions,
    constructionMonths
  );

  if (isEligible) {
    // Fator de Ajuste eliminates remaining difference if requirements met
    fatorAjusteReduction = 1.0; 
  }

  // Step 11: Final RMT and Base de Cálculo
  // Deduct previous remuneration declared
  let baseCalculo = Math.max(0, rmt - laborDeductions - totalRemunerationPaid);
  
  // Apply Fator de Ajuste (Art. 33) - eliminates remaining difference
  if (fatorAjusteReduction > 0) {
    baseCalculo = 0;
  }

  // Apply decadencia reduction if any
  const finalBaseCalculo = baseCalculo * (1 - decadencia.reduction);

  // Step 12: Calculate INSS
  const inssEstimate = finalBaseCalculo * INSS_RATE;

  // Step 13: Calculate ISS (Municipal Tax)
  const issBase = Math.max(0, rmt - laborDeductions - totalRemunerationPaid - issMaterialDeduction);
  const issEstimate = issBase * issRate;

  // Baseline for savings comparison (Standard Aferição - PF, Alvenaria, No strategy)
  const rmtNoStrategy = cod * (ownerType === 'PF' ? getFatorSocial(area) : 1.0);
  const inssWithoutStrategy = rmtNoStrategy * INSS_RATE;

  // Calculate savings
  const savings = Math.max(0, inssWithoutStrategy - inssEstimate);
  const savingsPercentage = inssWithoutStrategy > 0
    ? (savings / inssWithoutStrategy) * 100
    : 0;

  // Step 14: Installment Simulation
  const installmentCount = 60;
  const installments = inssEstimate > 0 ? {
    totalValue: inssEstimate,
    monthlyValue: round(inssEstimate / installmentCount),
    count: installmentCount,
    isInterestFree: false,
  } : undefined;

  // Step 15: Planned Scenario Reference
  const economyMultiplier = area <= 350 ? (1 - 0.7352) : (1 - 0.62);
  const plannedTotalINSS = inssWithoutStrategy * economyMultiplier;
  
  const plannedScenario = {
    totalINSS: round(plannedTotalINSS),
    monthlyPayment: round(plannedTotalINSS / Math.max(1, constructionMonths)),
    totalSavings: round(inssWithoutStrategy - plannedTotalINSS),
    savingsPercentage: round((1 - economyMultiplier) * 100, 2),
    recommendation: `O planejamento estratégico pode reduzir seu INSS para aproximadamente R$ ${formatCurrency(plannedTotalINSS)}.`,
  };

  return {
    cod: round(cod),
    rmtBase: round(rmtBase),
    rmtFinal: round(rmt),
    baseCalculo: round(finalBaseCalculo),
    fatorSocial,
    categoryReduction,
    prefabReduction,
    readyMixDeduction: usesUsinados ? USINADOS_DEDUCTION_RATE : 0,
    fatorAjusteReduction,
    popularHousingReduction: popularHousingReduction,
    decadenciaReduction: decadencia.reduction,
    inssEstimate: round(inssEstimate),
    inssWithoutStrategy: round(inssWithoutStrategy),
    savings: round(savings),
    savingsPercentage: round(savingsPercentage),
    isDecadencia: decadencia.isDecadencia,
    issEstimate: round(issEstimate),
    installments,
    plannedScenario,
    breakdown: {
      vauUsed,
      equivalenceFactor,
      laborPercentage: typeCoefficient,
      categoryMultiplier,
      inssRate: INSS_RATE,
      yearsSinceCompletion: round(decadencia.yearsSinceCompletion, 2),
      issRateUsed: issRate,
      issBase: round(issBase),
    },
  };
}

/**
 * Quick INSS estimate with minimal inputs
 * Uses standard assumptions: Obra Nova, Alvenaria, Residencial Unifamiliar
 */
export function quickEstimate(
  areaM2: number,
  state: BrazilianState,
  isPF: boolean = true
): INSSCalculatorResult {
  return calculateINSS({
    area: areaM2,
    state,
    ownerType: isPF ? 'PF' : 'PJ',
    category: 'OBRA_NOVA',
    constructionType: 'ALVENARIA',
    destination: 'RESIDENCIAL_UNIFAMILIAR',
  });
}

// ============================================================================
// FATOR SOCIAL OPTIMIZATION
// ============================================================================

/**
 * Check if area is near a Fator Social boundary
 * Returns warning if small area adjustment could result in significant savings
 */
export function checkFatorSocialBoundary(
  area: number,
  state: BrazilianState,
  ownerType: TaxOwnerType,
  category: TaxWorkCategory = 'OBRA_NOVA',
  constructionType: TaxConstructionType = 'ALVENARIA'
): FatorSocialWarning | null {
  // Only applies to PF
  if (ownerType !== 'PF') return null;

  // Find if we're just above a boundary
  const nearBoundary = FATOR_SOCIAL_BOUNDARIES.find(
    (boundary) => area > boundary && area <= boundary + 5
  );

  if (!nearBoundary) return null;

  const currentFactor = getFatorSocial(area);
  const potentialFactor = getFatorSocial(nearBoundary);

  // Calculate savings
  const currentResult = calculateINSS({
    area,
    state,
    ownerType,
    category,
    constructionType,
    destination: 'RESIDENCIAL_UNIFAMILIAR',
  });

  const potentialResult = calculateINSS({
    area: nearBoundary,
    state,
    ownerType,
    category,
    constructionType,
    destination: 'RESIDENCIAL_UNIFAMILIAR',
  });

  const potentialSavings = currentResult.inssEstimate - potentialResult.inssEstimate;

  // Only warn if savings are significant (> R$ 1,000)
  if (potentialSavings < 1000) return null;

  return {
    currentArea: area,
    currentFactor,
    nearestBoundary: nearBoundary,
    potentialFactor,
    potentialSavings: round(potentialSavings),
    recommendation: `Reduzir a área para ${nearBoundary}m² poderia economizar R$ ${formatCurrency(potentialSavings)} em INSS. Verifique com o arquiteto.`,
  };
}

/**
 * Get all Fator Social brackets with their tax implications
 */
export function getFatorSocialBrackets(
  state: BrazilianState,
  constructionType: TaxConstructionType = 'ALVENARIA'
) {
  const vau = VAU_BY_STATE[state];
  const laborPct = constructionType === 'ALVENARIA' ? 1.0 : 0.70;

  return [
    {
      maxArea: 100,
      factor: 0.20,
      effectiveRate: round(0.20 * laborPct * INSS_RATE * 100, 2),
      description: 'Até 100m²',
    },
    {
      maxArea: 200,
      factor: 0.40,
      effectiveRate: round(0.40 * laborPct * INSS_RATE * 100, 2),
      description: '100,01 - 200m²',
    },
    {
      maxArea: 300,
      factor: 0.55,
      effectiveRate: round(0.55 * laborPct * INSS_RATE * 100, 2),
      description: '200,01 - 300m²',
    },
    {
      maxArea: 400,
      factor: 0.70,
      effectiveRate: round(0.70 * laborPct * INSS_RATE * 100, 2),
      description: '300,01 - 400m²',
    },
    {
      maxArea: Infinity,
      factor: 0.90,
      effectiveRate: round(0.90 * laborPct * INSS_RATE * 100, 2),
      description: 'Acima de 400m²',
    },
  ];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Round to 2 decimal places
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format value as Brazilian currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Get category label in Portuguese
 */
export function getCategoryLabel(category: TaxWorkCategory): string {
  const labels: Record<TaxWorkCategory, string> = {
    OBRA_NOVA: 'Obra Nova',
    ACRESCIMO: 'Acréscimo',
    REFORMA: 'Reforma',
    DEMOLICAO: 'Demolição',
  };
  return labels[category];
}

/**
 * Get construction type label in Portuguese
 */
export function getConstructionTypeLabel(type: TaxConstructionType): string {
  const labels: Record<TaxConstructionType, string> = {
    ALVENARIA: 'Alvenaria',
    MISTA: 'Mista',
    MADEIRA: 'Madeira',
    PRE_MOLDADO: 'Pré-moldado',
    METALICA: 'Metálica',
  };
  return labels[type];
}

/**
 * Get destination label in Portuguese
 */
export function getDestinationLabel(destination: TaxDestination): string {
  const labels: Record<TaxDestination, string> = {
    CASA_POPULAR: 'Casa Popular',
    RESIDENCIAL_UNIFAMILIAR: 'Residencial Unifamiliar',
    RESIDENCIAL_MULTIFAMILIAR: 'Residencial Multifamiliar',
    COMERCIAL: 'Comercial',
    CONJUNTO_HABITACIONAL: 'Conjunto Habitacional',
    GALPAO_INDUSTRIAL: 'Galpão Industrial',
    EDIFICIO_GARAGENS: 'Edifício Garagens',
  };
  return labels[destination];
}

/**
 * Get state name
 */
export function getStateName(state: BrazilianState): string {
  const names: Record<BrazilianState, string> = {
    AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas',
    BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
    GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
    PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
    SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
  };
  return names[state];
}

/**
 * Get all Brazilian states as options
 */
export function getStateOptions(): Array<{ value: BrazilianState; label: string }> {
  return (Object.keys(VAU_BY_STATE) as BrazilianState[]).map((state) => ({
    value: state,
    label: `${state} - ${getStateName(state)}`,
  }));
}
