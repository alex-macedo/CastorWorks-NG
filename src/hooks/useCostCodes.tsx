import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';

export type CostCode = {
  id: string;
  code: string;
  name: string;
  language: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

const QUERY_KEY = ['costCodes'] as const;

/**
 * Hook to fetch cost codes from the database
 * Returns Level 1 cost codes with canonical English keys (LAB, MAT, EQT, etc.)
 * and localized names based on the current language
 * @param level - Cost code level (default: 1)
 * @param language - Language code (default: user's current language from LocalizationContext)
 */
export function useCostCodes(level: number = 1, language?: string) {
  const { language: userLanguage } = useLocalization();
  const targetLanguage = language || userLanguage;

  return useQuery({
    queryKey: [...QUERY_KEY, level, targetLanguage],
    queryFn: async () => {
      // Fetch cost codes for the target language
      // All languages now use the same canonical English keys (LAB, MAT, EQT, SUB, FEE, OVH, ADM)
      // Only the 'name' field differs per language
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('level', level)
        .eq('language', targetLanguage)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as any as CostCode[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since codes rarely change
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount, rely on query key changes
  });
}

/**
 * Get cost code by code string (e.g., 'LAB', 'MAT', 'MO', 'EQP')
 * @param code - Cost code string
 * @param language - Language code (default: user's current language from LocalizationContext)
 */
export function useCostCodeByCode(code: string, language?: string) {
  const { language: userLanguage } = useLocalization();
  const targetLanguage = language || userLanguage;

  return useQuery({
    queryKey: [...QUERY_KEY, 'byCode', code, targetLanguage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_codes')
        .select('*')
        .eq('code', code)
        .eq('language', targetLanguage)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as any as CostCode | null;
    },
    enabled: !!code,
    staleTime: 1000 * 60 * 60,
  });
}
