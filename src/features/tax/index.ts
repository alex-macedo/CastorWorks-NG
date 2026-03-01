/**
 * CastorWorks INSS Obra Module
 * Brazilian Construction Tax Compliance Management
 *
 * This module provides:
 * - Tax project configuration linked to CastorWorks projects
 * - Interactive INSS calculator with Fator Social optimization
 * - Monthly SERO/DCTFWeb submission tracking
 * - Payment management and DARF tracking
 * - Document checklist and compliance alerts
 */

// Types
export * from './types/tax.types';

// Calculator utilities
export {
  calculateINSS,
  quickEstimate,
  checkFatorSocialBoundary,
  getFatorSocial,
  getFatorSocialBrackets,
  formatCurrency,
  formatPercentage,
  getCategoryLabel,
  getConstructionTypeLabel,
  getDestinationLabel,
  getStateName,
  getStateOptions,
  VAU_BY_STATE,
  LABOR_PERCENTAGE,
  CATEGORY_MULTIPLIER,
  EQUIVALENCE_FACTORS,
  FATOR_SOCIAL_BOUNDARIES,
  INSS_RATE,
} from './utils/inssCalculator';

export {
  calculateINSSWithRefData,
  formatCurrencyBRL,
} from './utils/inssCalculatorV2';

// Hooks
export {
  useTaxProject,
  useTaxProjectById,
  useTaxEstimates,
  useINSSCalculation,
  useVauReference,
  useTaxSubmissions,
  useTaxPayments,
} from './hooks';

// Components
export { TaxEstimator } from './components';
export { PrefabInvoiceManager } from './components/PrefabInvoiceManager';
