/**
 * INSS de Obra Calculator V2
 * Database-driven implementation for Brazilian construction tax estimation
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
} from '../types/tax.types';
import type { INSSReferenceData } from '../hooks/useINSSReferenceData';
import { 
  getFatorSocialFromBrackets, 
  getFatorAjusteRuleForArea, 
  checkPrefabEligibility 
} from '../hooks/useINSSReferenceData';

/**
 * Calculate Decadência (Statute of Limitations)
 */
export function calculateDecadencia(
  startDate: Date | string | null,
  endDate: Date | string | null,
  assessmentDate: Date | string = new Date()
): { isFullExemption: boolean; partialExemption: number; yearsSinceCompletion: number } {
  if (!endDate) {
    return { isFullExemption: false, partialExemption: 0, yearsSinceCompletion: 0 };
  }

  const end = new Date(endDate);
  const start = startDate ? new Date(startDate) : end;
  const now = new Date(assessmentDate);
  
  // 5 years from completion
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  const diffMs = now.getTime() - end.getTime();
  const yearsSinceCompletion = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  // Full Decadência: Completed more than 5 years ago
  if (end < fiveYearsAgo) {
    return { isFullExemption: true, partialExemption: 1.0, yearsSinceCompletion };
  }

  // Partial Decadência: Started more than 5 years ago
  if (start < fiveYearsAgo) {
    const totalDuration = end.getTime() - start.getTime();
    if (totalDuration <= 0) return { isFullExemption: false, partialExemption: 0, yearsSinceCompletion };
    
    const decadentPeriod = fiveYearsAgo.getTime() - start.getTime();
    const partialExemption = Math.max(0, Math.min(1.0, decadentPeriod / totalDuration));
    
    return { isFullExemption: false, partialExemption, yearsSinceCompletion };
  }

  return { isFullExemption: false, partialExemption: 0, yearsSinceCompletion };
}

/**
 * Creates a zeroed result when full decadência applies
 */
function createZeroResult(decadencia: any): INSSCalculatorResult {
  return {
    cod: 0,
    rmtBase: 0,
    rmtFinal: 0,
    baseCalculo: 0,
    fatorSocial: null,
    categoryReduction: 0,
    prefabReduction: 0,
    readyMixDeduction: 0,
    fatorAjusteReduction: 0,
    popularHousingReduction: 0,
    decadenciaReduction: 1.0,
    inssEstimate: 0,
    inssWithoutStrategy: 0,
    savings: 0,
    savingsPercentage: 0,
    isDecadencia: true,
    issEstimate: 0,
    breakdown: {
      vauUsed: 0,
      equivalenceFactor: 0,
      laborPercentage: 0,
      categoryMultiplier: 0,
      inssRate: 0,
      yearsSinceCompletion: decadencia.yearsSinceCompletion
    }
  };
}

/**
 * Helper: Get VAU for state (fallback to hardcoded if not in refData)
 */
function getVAUForState(state: BrazilianState, refData: INSSReferenceData): number {
  // Note: VAU is not in refData structure yet - this would come from tax_vau_reference table
  // For now, use fallback values
  const FALLBACK_VAU: Record<string, number> = {
    AC: 1350, AL: 1320, AP: 1340, AM: 1380, BA: 1350, CE: 1340, DF: 1500,
    ES: 1420, GO: 1400, MA: 1300, MT: 1420, MS: 1410, MG: 1380, PA: 1350,
    PB: 1310, PR: 1410, PE: 1340, PI: 1280, RJ: 1489, RN: 1330, RS: 1449.25,
    RO: 1380, RR: 1360, SC: 1445, SP: 1520, SE: 1320, TO: 1370,
  };
  return FALLBACK_VAU[state] ?? 1400;
}

/**
 * Calculate INSS using database-driven reference data
 * @param params - Calculation input parameters
 * @param refData - Reference data from useINSSReferenceData hook
 */
export function calculateINSSWithRefData(
  params: INSSCalculatorParams,
  refData: INSSReferenceData
): INSSCalculatorResult {
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
    issRate = 0.05,
    issMaterialDeduction = 0,
    totalRemunerationPaid = 0,
    constructionMonths = 1,
    monthlyDCTFWebSubmissions = 0,
  } = params;

  // Step 0: Check Decadência (statute of limitations)
  const decadencia = calculateDecadencia(startDate, actualEndDate, new Date());
  if (decadencia.isFullExemption) {
    return createZeroResult(decadencia);
  }

  // Step 1: Get VAU from reference or override
  const vau = vauOverride ?? getVAUForState(state, refData);

  // Step 2: Get equivalence factor from refData
  const destFactor = refData.destinationFactors[destination];
  const equivalenceFactor = destFactor?.equivalence_factor ?? 1.0;

  // Step 3: Calculate COD (Custo da Obra por Destinação)
  const cod = area * vau * equivalenceFactor;

  // Step 4: Get labor percentage from refData
  const laborPct = refData.laborPercentages[constructionType];
  const laborDecimal = laborPct?.labor_decimal ?? 0.40;

  // Step 5: Calculate base RMT
  const rmtBase = cod * laborDecimal;
  let rmt = rmtBase;

  // Step 6: Apply usinados deduction (subtract from RMT, not multiply)
  let usinadosDeduction = 0;
  if (usesUsinados && refData.usinadosRules) {
    usinadosDeduction = cod * (refData.usinadosRules.deduction_pct_of_cod / 100);
    rmt = Math.max(0, rmt - usinadosDeduction);
  }

  // Step 7: Apply category multiplier
  const catReduction = refData.categoryReductions[category];
  const categoryMultiplier = catReduction?.multiplier ?? 1.0;
  rmt = rmt * categoryMultiplier;

  // Step 8: Apply Fator Social (PF only)
  let fatorSocial: number | null = null;
  if (ownerType === 'PF') {
    fatorSocial = getFatorSocialFromBrackets(area, refData.fatorSocialBrackets);
    rmt = rmt * fatorSocial;
  }

  // Step 9: Apply prefab reduction
  let prefabReduction = 0;
  if (usesPrefab && refData.prefabRules) {
    const eligibility = checkPrefabEligibility(prefabInvoiceValue, cod, refData.prefabRules);
    if (eligibility.eligible) {
      prefabReduction = eligibility.reductionPct / 100;
      rmt = rmt * (1 - prefabReduction);
    }
  }

  // Step 10: Apply popular housing reduction (area ≤ 70m²)
  let popularReduction = 0;
  if (destination === 'CASA_POPULAR' && destFactor?.area_limit && area <= destFactor.area_limit) {
    popularReduction = (destFactor.special_reduction_pct ?? 0) / 100;
    rmt = rmt * (1 - popularReduction);
  }

  // Step 11: Deduct labor already declared
  // Important: laborDeductions (from previous SERO) and totalRemunerationPaid (current GFIP/eSocial)
  const totalPreviousDeductions = laborDeductions + totalRemunerationPaid;
  let baseCalculo = Math.max(0, rmt - totalPreviousDeductions);

  // Step 12: Check Fator de Ajuste eligibility (Article 33)
  const fatorAjusteRule = getFatorAjusteRuleForArea(area, refData.fatorAjusteRules);
  let fatorAjusteEligible = false;
  let fatorAjustePotentialSavings = 0;

  if (fatorAjusteRule && ownerType === 'PF') {
    const minRemuneration = rmt * (fatorAjusteRule.min_remuneration_pct / 100);
    const meetsRemuneration = totalPreviousDeductions >= minRemuneration;
    // Mandatory monthly submissions (except first month)
    const meetsDCTFWeb = monthlyDCTFWebSubmissions >= Math.max(0, constructionMonths - 1);

    fatorAjusteEligible = meetsRemuneration && meetsDCTFWeb;
    
    // Task 5.3 Fix: Apply graduated reduction if eligible
    if (fatorAjusteEligible) {
      const reductionMultiplier = 1 - (fatorAjusteRule.max_reduction_pct / 100);
      baseCalculo = baseCalculo * reductionMultiplier;
    }
  }

  // Step 13: Apply partial decadência
  const taxableBase = baseCalculo * (1 - decadencia.partialExemption);

  // Step 14: Calculate INSS using rate from refData
  const inssRate = refData.rates?.total_rate ?? 0.368;
  const inssEstimate = taxableBase * inssRate;

  // Step 15: Calculate INSS without strategy (for comparison)
  const rmtNoStrategy = cod * (ownerType === 'PF' ? getFatorSocialFromBrackets(area, refData.fatorSocialBrackets) : 1.0);
  const inssWithoutStrategy = rmtNoStrategy * inssRate;

  // Step 16: Calculate ISS
  const issBase = Math.max(0, rmt - totalPreviousDeductions - issMaterialDeduction);
  const issEstimate = issBase * issRate;

  // Final potential savings with Fator de Ajuste (if not already applied)
  if (!fatorAjusteEligible && fatorAjusteRule && ownerType === 'PF') {
     fatorAjustePotentialSavings = inssEstimate * (fatorAjusteRule.max_reduction_pct / 100);
  }

  // Calculate savings
  const savings = Math.max(0, inssWithoutStrategy - inssEstimate);
  const savingsPercentage = inssWithoutStrategy > 0
    ? (savings / inssWithoutStrategy) * 100
    : 0;

  return {
    cod: Math.round(cod * 100) / 100,
    rmtBase: Math.round(rmtBase * 100) / 100,
    rmtFinal: Math.round(rmt * 100) / 100,
    baseCalculo: Math.round(taxableBase * 100) / 100,
    fatorSocial,
    categoryReduction: 1 - categoryMultiplier,
    prefabReduction,
    readyMixDeduction: usinadosDeduction,
    fatorAjusteReduction: fatorAjusteEligible ? fatorAjusteRule?.max_reduction_pct ?? 0 : 0,
    popularHousingReduction: popularReduction,
    decadenciaReduction: decadencia.partialExemption,
    inssEstimate: Math.round(inssEstimate * 100) / 100,
    inssWithoutStrategy: Math.round(inssWithoutStrategy * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsPercentage: Math.round(savingsPercentage * 100) / 100,
    isDecadencia: decadencia.isFullExemption,
    issEstimate: Math.round(issEstimate * 100) / 100,
    breakdown: {
      vauUsed: vau,
      equivalenceFactor,
      laborPercentage: laborDecimal,
      categoryMultiplier,
      inssRate,
      yearsSinceCompletion: Math.round(decadencia.yearsSinceCompletion * 100) / 100,
      issRateUsed: issRate,
      issBase: Math.round(issBase * 100) / 100,
    },
    plannedScenario: {
      totalINSS: Math.round(inssEstimate * 100) / 100,
      monthlyPayment: Math.round((inssEstimate / Math.max(1, constructionMonths)) * 100) / 100,
      totalSavings: Math.round(savings * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      recommendation: `O planejamento estratégico pode reduzir seu INSS para aproximadamente R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(inssEstimate)}.`,
    },
  };
}

/**
 * Format currency in BRL
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
