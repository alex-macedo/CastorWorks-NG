/**
 * Brazilian Tax Calculation Utility for Construction Services
 * 
 * Standard Rates (can be overridden by user)
 * - ISS: 2.0% - 5.0%
 * - INSS: 11.0%
 * - Federal (Combined): 4.65% (PIS: 0.65%, COFINS: 3.0%, CSLL: 1.0%)
 */

export const DEFAULT_TAX_RATES = {
  ISS: 5.0,
  INSS: 11.0,
  PIS: 0.65,
  COFINS: 3.0,
  CSLL: 1.0,
  FEDERAL_COMBINED: 4.65
};

export interface TaxBreakdown {
  grossAmount: number;
  issAmount: number;
  inssAmount: number;
  pisAmount: number;
  cofinsAmount: number;
  csllAmount: number;
  totalWithholding: number;
  netAmount: number;
}

/**
 * Calculates withholdings based on a gross amount and specific rates
 */
export function calculateTaxWithholdings(
  grossAmount: number,
  rates: {
    iss?: number;
    inss?: number;
    pis?: number;
    cofins?: number;
    csll?: number;
  } = {}
): TaxBreakdown {
  const issRate = (rates.iss ?? DEFAULT_TAX_RATES.ISS) / 100;
  const inssRate = (rates.inss ?? DEFAULT_TAX_RATES.INSS) / 100;
  const pisRate = (rates.pis ?? DEFAULT_TAX_RATES.PIS) / 100;
  const cofinsRate = (rates.cofins ?? DEFAULT_TAX_RATES.COFINS) / 100;
  const csllRate = (rates.csll ?? DEFAULT_TAX_RATES.CSLL) / 100;

  const issAmount = grossAmount * issRate;
  const inssAmount = grossAmount * inssRate;
  const pisAmount = grossAmount * pisRate;
  const cofinsAmount = grossAmount * cofinsRate;
  const csllAmount = grossAmount * csllRate;

  const totalWithholding = issAmount + inssAmount + pisAmount + cofinsAmount + csllAmount;
  const netAmount = grossAmount - totalWithholding;

  return {
    grossAmount,
    issAmount: parseFloat(issAmount.toFixed(2)),
    inssAmount: parseFloat(inssAmount.toFixed(2)),
    pisAmount: parseFloat(pisAmount.toFixed(2)),
    cofinsAmount: parseFloat(cofinsAmount.toFixed(2)),
    csllAmount: parseFloat(csllAmount.toFixed(2)),
    totalWithholding: parseFloat(totalWithholding.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
}

/**
 * Calculates gross amount from a desired net amount (inverse calculation)
 */
export function calculateGrossFromNet(
  netAmount: number,
  rates: {
    iss?: number;
    inss?: number;
    pis?: number;
    cofins?: number;
    csll?: number;
  } = {}
): number {
  const issRate = (rates.iss ?? DEFAULT_TAX_RATES.ISS) / 100;
  const inssRate = (rates.inss ?? DEFAULT_TAX_RATES.INSS) / 100;
  const pisRate = (rates.pis ?? DEFAULT_TAX_RATES.PIS) / 100;
  const cofinsRate = (rates.cofins ?? DEFAULT_TAX_RATES.COFINS) / 100;
  const csllRate = (rates.csll ?? DEFAULT_TAX_RATES.CSLL) / 100;

  const totalRate = issRate + inssRate + pisRate + cofinsRate + csllRate;
  
  if (totalRate >= 1) return netAmount; // Safety check
  
  const grossAmount = netAmount / (1 - totalRate);
  return parseFloat(grossAmount.toFixed(2));
}
