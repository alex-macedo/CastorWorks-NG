
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  INSSRateHistory, 
  FatorSocialBracket, 
  CategoryReduction, 
  LaborPercentage, 
  DestinationFactor, 
  FatorAjusteRule, 
  PrefabRule, 
  UsinadosRule 
} from './useINSSReferenceData';

export function useUpdateINSSReference() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inss_reference'] });
  };

  const updateRates = useMutation({
    mutationFn: async (updates: Partial<INSSRateHistory> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_rates_history')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateFatorSocial = useMutation({
    mutationFn: async (updates: Partial<FatorSocialBracket> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_fator_social_brackets')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateCategoryReduction = useMutation({
    mutationFn: async (updates: Partial<CategoryReduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_category_reductions')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateLaborPercentage = useMutation({
    mutationFn: async (updates: Partial<LaborPercentage> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_labor_percentages')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateDestinationFactor = useMutation({
    mutationFn: async (updates: Partial<DestinationFactor> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_destination_factors')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateFatorAjusteRule = useMutation({
    mutationFn: async (updates: Partial<FatorAjusteRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_fator_ajuste_rules')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updatePrefabRule = useMutation({
    mutationFn: async (updates: Partial<PrefabRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_prefab_rules')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updateUsinadosRule = useMutation({
    mutationFn: async (updates: Partial<UsinadosRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('inss_usinados_rules')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  return {
    updateRates,
    updateFatorSocial,
    updateCategoryReduction,
    updateLaborPercentage,
    updateDestinationFactor,
    updateFatorAjusteRule,
    updatePrefabRule,
    updateUsinadosRule,
  };
}
