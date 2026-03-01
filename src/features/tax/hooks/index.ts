/**
 * Tax Module Hooks - Barrel Export
 */

export { useTaxProject, useTaxProjectById } from './useTaxProject';
export {
  useTaxEstimates,
  useINSSCalculation,
  useVauReference,
} from './useTaxEstimate';
export { useTaxSubmissions } from './useTaxSubmissions';
export { useTaxPayments } from './useTaxPayments';

// INSS Reference Data (Database-driven configuration)
export {
  useINSSReferenceData,
  useINSSRates,
  useFatorSocialBrackets,
  useCategoryReductions,
  useLaborPercentages,
  useDestinationFactors,
  useFatorAjusteRules,
  usePrefabRules,
  useUsinadosRules,
  // Helper functions
  getFatorSocialFromBrackets,
  getFatorAjusteRuleForArea,
  checkPrefabEligibility,
  // Types
  type INSSRateHistory,
  type FatorSocialBracket,
  type CategoryReduction,
  type LaborPercentage,
  type DestinationFactor,
  type FatorAjusteRule,
  type PrefabRule,
  type UsinadosRule,
  type INSSReferenceData,
} from './useINSSReferenceData';
