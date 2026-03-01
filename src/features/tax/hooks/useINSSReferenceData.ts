/**
 * INSS Reference Data Hook
 * Fetches all INSS calculation parameters from database tables
 * Provides database-driven configuration with fallback to hardcoded values
 *
 * Tables used:
 * - inss_rates_history
 * - inss_fator_social_brackets
 * - inss_category_reductions
 * - inss_labor_percentages
 * - inss_destination_factors
 * - inss_fator_ajuste_rules
 * - inss_prefab_rules
 * - inss_usinados_rules
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import type {
  TaxWorkCategory,
  TaxConstructionType,
  TaxDestination,
} from '../types/tax.types';

// ============================================================================
// REFERENCE DATA TYPES
// ============================================================================

/** INSS rate components from inss_rates_history table */
export interface INSSRateHistory {
  id: string;
  effective_from: string;
  effective_to: string | null;
  patronal_rate: number;
  sat_gilrat_rate: number;
  terceiros_rate: number;
  additional_rate: number;
  total_rate: number;
  legal_reference: string | null;
  notes: string | null;
}

/** Fator Social bracket from inss_fator_social_brackets table */
export interface FatorSocialBracket {
  id: string;
  effective_from: string;
  effective_to: string | null;
  area_min: number;
  area_max: number;
  fator_social: number;
  legal_reference: string | null;
  notes: string | null;
}

/** Category reduction from inss_category_reductions table */
export interface CategoryReduction {
  id: string;
  effective_from: string;
  effective_to: string | null;
  category_code: TaxWorkCategory;
  category_name_pt: string;
  category_name_en: string;
  reduction_percentage: number;
  multiplier: number;
  legal_reference: string | null;
  notes: string | null;
}

/** Labor percentage from inss_labor_percentages table */
export interface LaborPercentage {
  id: string;
  effective_from: string;
  effective_to: string | null;
  construction_type_code: TaxConstructionType;
  construction_type_name_pt: string;
  construction_type_name_en: string;
  labor_percentage: number;
  labor_decimal: number;
  notes: string | null;
  legal_reference: string | null;
}

/** Destination factor from inss_destination_factors table */
export interface DestinationFactor {
  id: string;
  effective_from: string;
  effective_to: string | null;
  destination_code: TaxDestination;
  destination_name_pt: string;
  destination_name_en: string;
  equivalence_factor: number;
  area_limit: number | null;
  special_reduction_pct: number | null;
  notes: string | null;
  legal_reference: string | null;
}

/** Fator de Ajuste rules from inss_fator_ajuste_rules table */
export interface FatorAjusteRule {
  id: string;
  effective_from: string;
  effective_to: string | null;
  area_threshold: number;
  min_remuneration_pct: number;
  max_reduction_pct: number;
  requires_dctfweb: boolean;
  dctfweb_exempt_first_month: boolean;
  legal_reference: string | null;
  notes: string | null;
}

/** Prefab rules from inss_prefab_rules table */
export interface PrefabRule {
  id: string;
  effective_from: string;
  effective_to: string | null;
  min_invoice_pct_of_cod: number;
  reduction_pct: number;
  excluded_items: string[];
  apply_selic_adjustment: boolean;
  selic_additional_pct: number;
  legal_reference: string | null;
  notes: string | null;
}

/** Usinados rules from inss_usinados_rules table */
export interface UsinadosRule {
  id: string;
  effective_from: string;
  effective_to: string | null;
  deduction_pct_of_cod: number;
  applies_to: string[];
  legal_reference: string | null;
  notes: string | null;
}

/** Complete INSS reference data structure */
export interface INSSReferenceData {
  rates: INSSRateHistory | null;
  fatorSocialBrackets: FatorSocialBracket[];
  categoryReductions: Record<TaxWorkCategory, CategoryReduction>;
  laborPercentages: Record<TaxConstructionType, LaborPercentage>;
  destinationFactors: Record<TaxDestination, DestinationFactor>;
  fatorAjusteRules: FatorAjusteRule[];
  prefabRules: PrefabRule | null;
  usinadosRules: UsinadosRule | null;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
}

// ============================================================================
// FALLBACK VALUES (used when database is empty or unavailable)
// ============================================================================

const FALLBACK_INSS_RATE: INSSRateHistory = {
  id: 'fallback',
  effective_from: '2021-06-01',
  effective_to: null,
  patronal_rate: 0.2,
  sat_gilrat_rate: 0.08,
  terceiros_rate: 0.058,
  additional_rate: 0.03,
  total_rate: 0.368,
  legal_reference: 'IN RFB 2021/2021, Art. 26',
  notes: 'Fallback value - database unavailable',
};

const FALLBACK_FATOR_SOCIAL: FatorSocialBracket[] = [
  { id: 'f1', effective_from: '2021-06-01', effective_to: null, area_min: 0, area_max: 100, fator_social: 0.2, legal_reference: null, notes: null },
  { id: 'f2', effective_from: '2021-06-01', effective_to: null, area_min: 100.01, area_max: 200, fator_social: 0.4, legal_reference: null, notes: null },
  { id: 'f3', effective_from: '2021-06-01', effective_to: null, area_min: 200.01, area_max: 300, fator_social: 0.55, legal_reference: null, notes: null },
  { id: 'f4', effective_from: '2021-06-01', effective_to: null, area_min: 300.01, area_max: 400, fator_social: 0.7, legal_reference: null, notes: null },
  { id: 'f5', effective_from: '2021-06-01', effective_to: null, area_min: 400.01, area_max: 999999.99, fator_social: 0.9, legal_reference: null, notes: null },
];

const FALLBACK_PREFAB: PrefabRule = {
  id: 'fallback',
  effective_from: '2021-06-01',
  effective_to: null,
  min_invoice_pct_of_cod: 40,
  reduction_pct: 70,
  excluded_items: ['lajes_pre_moldadas', 'fundacoes', 'pisos', 'cobertura', 'reparticoes_internas'],
  apply_selic_adjustment: true,
  selic_additional_pct: 1,
  legal_reference: 'IN RFB 2021/2021, Art. 26, § 2º',
  notes: 'Fallback value',
};

const FALLBACK_USINADOS: UsinadosRule = {
  id: 'fallback',
  effective_from: '2021-06-01',
  effective_to: null,
  deduction_pct_of_cod: 5,
  applies_to: ['concreto_usinado', 'argamassa_usinada', 'massa_asfaltica'],
  legal_reference: 'IN RFB 2021/2021, Art. 26, § 5º',
  notes: 'Fallback value',
};

// ============================================================================
// QUERY KEYS
// ============================================================================

const QUERY_KEYS = {
  rates: ['inss_reference', 'rates'],
  fatorSocial: ['inss_reference', 'fator_social'],
  categories: ['inss_reference', 'categories'],
  labor: ['inss_reference', 'labor'],
  destinations: ['inss_reference', 'destinations'],
  fatorAjuste: ['inss_reference', 'fator_ajuste'],
  prefab: ['inss_reference', 'prefab'],
  usinados: ['inss_reference', 'usinados'],
} as const;

// Cache for 1 hour (reference data changes infrequently)
const STALE_TIME = 60 * 60 * 1000;

// ============================================================================
// INDIVIDUAL HOOKS
// ============================================================================

/**
 * Fetch current INSS rates
 */
export function useINSSRates(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.rates, targetDate],
    queryFn: async (): Promise<INSSRateHistory> => {
      const { data, error } = await supabase
        .from('inss_rates_history')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? FALLBACK_INSS_RATE;
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch Fator Social brackets
 */
export function useFatorSocialBrackets(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.fatorSocial, targetDate],
    queryFn: async (): Promise<FatorSocialBracket[]> => {
      const { data, error } = await supabase
        .from('inss_fator_social_brackets')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('area_min', { ascending: true });

      if (error) throw error;
      return data?.length ? data : FALLBACK_FATOR_SOCIAL;
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch category reductions
 */
export function useCategoryReductions(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.categories, targetDate],
    queryFn: async (): Promise<CategoryReduction[]> => {
      const { data, error } = await supabase
        .from('inss_category_reductions')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch labor percentages
 */
export function useLaborPercentages(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.labor, targetDate],
    queryFn: async (): Promise<LaborPercentage[]> => {
      const { data, error } = await supabase
        .from('inss_labor_percentages')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch destination factors
 */
export function useDestinationFactors(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.destinations, targetDate],
    queryFn: async (): Promise<DestinationFactor[]> => {
      const { data, error } = await supabase
        .from('inss_destination_factors')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`);

      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch Fator de Ajuste rules
 */
export function useFatorAjusteRules(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.fatorAjuste, targetDate],
    queryFn: async (): Promise<FatorAjusteRule[]> => {
      const { data, error } = await supabase
        .from('inss_fator_ajuste_rules')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('area_threshold', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch prefab rules
 */
export function usePrefabRules(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.prefab, targetDate],
    queryFn: async (): Promise<PrefabRule> => {
      const { data, error } = await supabase
        .from('inss_prefab_rules')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? FALLBACK_PREFAB;
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Fetch usinados rules
 */
export function useUsinadosRules(referenceDate?: string) {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: [...QUERY_KEYS.usinados, targetDate],
    queryFn: async (): Promise<UsinadosRule> => {
      const { data, error } = await supabase
        .from('inss_usinados_rules')
        .select('*')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ?? FALLBACK_USINADOS;
    },
    staleTime: STALE_TIME,
  });
}

// ============================================================================
// COMBINED HOOK - ALL REFERENCE DATA
// ============================================================================

/**
 * Main hook to fetch all INSS reference data at once
 * Provides a unified interface for calculator with proper caching
 *
 * @param referenceDate - Date for which to fetch applicable rules (defaults to today)
 * @returns Complete reference data structure with loading/error states
 */
export function useINSSReferenceData(referenceDate?: string): INSSReferenceData {
  const targetDate = referenceDate ?? new Date().toISOString().split('T')[0];

  // Fetch all reference data in parallel
  const queries = useQueries({
    queries: [
      {
        queryKey: [...QUERY_KEYS.rates, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_rates_history')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          return (data as INSSRateHistory) ?? FALLBACK_INSS_RATE;
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.fatorSocial, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_fator_social_brackets')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
            .order('area_min', { ascending: true });
          if (error) throw error;
          return (data as FatorSocialBracket[])?.length ? data : FALLBACK_FATOR_SOCIAL;
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.categories, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_category_reductions')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`);
          if (error) throw error;
          return (data as CategoryReduction[]) ?? [];
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.labor, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_labor_percentages')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`);
          if (error) throw error;
          return (data as LaborPercentage[]) ?? [];
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.destinations, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_destination_factors')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`);
          if (error) throw error;
          return (data as DestinationFactor[]) ?? [];
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.fatorAjuste, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_fator_ajuste_rules')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
            .order('area_threshold', { ascending: true });
          if (error) throw error;
          return (data as FatorAjusteRule[]) ?? [];
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.prefab, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_prefab_rules')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          return (data as PrefabRule) ?? FALLBACK_PREFAB;
        },
        staleTime: STALE_TIME,
      },
      {
        queryKey: [...QUERY_KEYS.usinados, targetDate],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('inss_usinados_rules')
            .select('*')
            .lte('effective_from', targetDate)
            .or(`effective_to.is.null,effective_to.gt.${targetDate}`)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          return (data as UsinadosRule) ?? FALLBACK_USINADOS;
        },
        staleTime: STALE_TIME,
      },
    ],
  });

  // Destructure query results
  const [
    ratesQuery,
    fatorSocialQuery,
    categoriesQuery,
    laborQuery,
    destinationsQuery,
    fatorAjusteQuery,
    prefabQuery,
    usinadosQuery,
  ] = queries;

  // Build category reductions map
  const categoryReductions = useMemo(() => {
    const map: Record<TaxWorkCategory, CategoryReduction> = {} as Record<TaxWorkCategory, CategoryReduction>;
    const categories = (categoriesQuery.data ?? []) as CategoryReduction[];

    for (const cat of categories) {
      map[cat.category_code] = cat;
    }

    // Fallback values if not in DB
    const fallbackCategories: TaxWorkCategory[] = ['OBRA_NOVA', 'ACRESCIMO', 'REFORMA', 'DEMOLICAO'];
    const fallbackReductions: Record<TaxWorkCategory, number> = {
      OBRA_NOVA: 0,
      ACRESCIMO: 0,
      REFORMA: 65,
      DEMOLICAO: 90,
    };

    for (const code of fallbackCategories) {
      if (!map[code]) {
        map[code] = {
          id: `fallback_${code}`,
          effective_from: '2021-06-01',
          effective_to: null,
          category_code: code,
          category_name_pt: code,
          category_name_en: code,
          reduction_percentage: fallbackReductions[code],
          multiplier: 1 - fallbackReductions[code] / 100,
          legal_reference: null,
          notes: 'Fallback value',
        };
      }
    }

    return map;
  }, [categoriesQuery.data]);

  // Build labor percentages map
  const laborPercentages = useMemo(() => {
    const map: Record<TaxConstructionType, LaborPercentage> = {} as Record<TaxConstructionType, LaborPercentage>;
    const labor = (laborQuery.data ?? []) as LaborPercentage[];

    for (const item of labor) {
      map[item.construction_type_code] = item;
    }

    // Fallback values if not in DB
    const fallbackLabor: Record<TaxConstructionType, number> = {
      ALVENARIA: 40,
      MISTA: 30,
      MADEIRA: 30,
      PRE_MOLDADO: 12,
      METALICA: 18,
    };

    for (const [code, pct] of Object.entries(fallbackLabor)) {
      const typedCode = code as TaxConstructionType;
      if (!map[typedCode]) {
        map[typedCode] = {
          id: `fallback_${code}`,
          effective_from: '2021-06-01',
          effective_to: null,
          construction_type_code: typedCode,
          construction_type_name_pt: code,
          construction_type_name_en: code,
          labor_percentage: pct,
          labor_decimal: pct / 100,
          notes: 'Fallback value',
          legal_reference: null,
        };
      }
    }

    return map;
  }, [laborQuery.data]);

  // Build destination factors map
  const destinationFactors = useMemo(() => {
    const map: Record<TaxDestination, DestinationFactor> = {} as Record<TaxDestination, DestinationFactor>;
    const destinations = (destinationsQuery.data ?? []) as DestinationFactor[];

    for (const dest of destinations) {
      map[dest.destination_code] = dest;
    }

    // Fallback values if not in DB
    const fallbackDestinations: Record<TaxDestination, { factor: number; limit?: number; reduction?: number }> = {
      CASA_POPULAR: { factor: 0.55, limit: 70, reduction: 50 },
      RESIDENCIAL_UNIFAMILIAR: { factor: 1.0 },
      RESIDENCIAL_MULTIFAMILIAR: { factor: 1.0 },
      COMERCIAL: { factor: 1.0 },
      CONJUNTO_HABITACIONAL: { factor: 0.6 },
      GALPAO_INDUSTRIAL: { factor: 0.7 },
      EDIFICIO_GARAGENS: { factor: 0.8, reduction: 20 },
    };

    for (const [code, config] of Object.entries(fallbackDestinations)) {
      const typedCode = code as TaxDestination;
      if (!map[typedCode]) {
        map[typedCode] = {
          id: `fallback_${code}`,
          effective_from: '2021-06-01',
          effective_to: null,
          destination_code: typedCode,
          destination_name_pt: code,
          destination_name_en: code,
          equivalence_factor: config.factor,
          area_limit: config.limit ?? null,
          special_reduction_pct: config.reduction ?? null,
          notes: 'Fallback value',
          legal_reference: null,
        };
      }
    }

    return map;
  }, [destinationsQuery.data]);

  // Aggregate loading and error states
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const errors = queries.filter((q) => q.error).map((q) => q.error as Error);

  return {
    rates: (ratesQuery.data as INSSRateHistory) ?? FALLBACK_INSS_RATE,
    fatorSocialBrackets: (fatorSocialQuery.data as FatorSocialBracket[]) ?? FALLBACK_FATOR_SOCIAL,
    categoryReductions,
    laborPercentages,
    destinationFactors,
    fatorAjusteRules: (fatorAjusteQuery.data as FatorAjusteRule[]) ?? [],
    prefabRules: (prefabQuery.data as PrefabRule) ?? FALLBACK_PREFAB,
    usinadosRules: (usinadosQuery.data as UsinadosRule) ?? FALLBACK_USINADOS,
    isLoading,
    isError,
    errors,
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR CALCULATOR
// ============================================================================

/**
 * Get the Fator Social for a given area from brackets
 */
export function getFatorSocialFromBrackets(
  area: number,
  brackets: FatorSocialBracket[]
): number {
  const bracket = brackets.find(
    (b) => area >= b.area_min && area <= b.area_max
  );
  return bracket?.fator_social ?? 0.9; // Default to highest if not found
}

/**
 * Get the Fator de Ajuste rule for a given area
 */
export function getFatorAjusteRuleForArea(
  area: number,
  rules: FatorAjusteRule[]
): FatorAjusteRule | null {
  // Rules are ordered by area_threshold ascending
  // Find the first rule where area <= threshold
  for (const rule of rules) {
    if (area <= rule.area_threshold) {
      return rule;
    }
  }
  // If no rule found, return the last one (highest threshold)
  return rules[rules.length - 1] ?? null;
}

/**
 * Check if prefab invoice value meets the reduction threshold
 */
export function checkPrefabEligibility(
  prefabInvoiceValue: number,
  cod: number,
  rules: PrefabRule
): { eligible: boolean; reductionPct: number } {
  const threshold = cod * (rules.min_invoice_pct_of_cod / 100);
  const eligible = prefabInvoiceValue >= threshold;
  return {
    eligible,
    reductionPct: eligible ? rules.reduction_pct : 0,
  };
}
