/**
 * Tax Estimate Hook
 * Manages INSS/ISS estimates and calculation history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import type { TaxEstimate, TaxProject, INSSCalculatorParams, INSSCalculatorResult } from '../types/tax.types';
import {
  calculateINSS,
  VAU_BY_STATE,
} from '../utils/inssCalculator';
import { useINSSReferenceData } from './useINSSReferenceData';
import { calculateINSSWithRefData } from '../utils/inssCalculatorV2';

const TAX_ESTIMATES_KEY = 'tax_estimates';

export function useTaxEstimates(taxProjectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all estimates for a tax project
  const estimatesQuery = useQuery({
    queryKey: [TAX_ESTIMATES_KEY, taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return [];

      const { data, error } = await supabase
        .from('tax_estimates')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('calculated_at', { ascending: false });

      if (error) throw error;
      return data as TaxEstimate[];
    },
    enabled: !!taxProjectId,
  });

  // Get latest estimate
  const latestEstimate = useMemo(() => {
    return estimatesQuery.data?.[0] ?? null;
  }, [estimatesQuery.data]);

  // Save a new estimate to the database
  const saveEstimate = useMutation({
    mutationFn: async (params: {
      taxProjectId: string;
      result: INSSCalculatorResult;
      vauReferenceDate: string;
      constructionMonths?: number; // Add constructionMonths parameter
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();

      // Extract plannedScenario data if available
      const plannedScenario = params.result.plannedScenario;
      // Calculate constructionMonths from plannedScenario if not provided
      // Formula: constructionMonths = totalINSS / monthlyPayment
      const constructionMonths = params.constructionMonths ?? 
        (plannedScenario && plannedScenario.monthlyPayment > 0
          ? Math.ceil(plannedScenario.totalINSS / plannedScenario.monthlyPayment)
          : null);

      const { data, error } = await supabase
        .from('tax_estimates')
        .insert({
          tax_project_id: params.taxProjectId,
          vau_used: params.result.breakdown.vauUsed,
          vau_reference_date: params.vauReferenceDate,
          cod: params.result.cod,
          rmt_base: params.result.rmtBase,
          fator_social: params.result.fatorSocial,
          category_reduction: params.result.categoryReduction,
          pre_moldados_applied: params.result.prefabReduction > 0,
          rmt_final: params.result.rmtFinal,
          labor_deductions: 0,
          inss_estimate: params.result.inssEstimate,
          inss_without_strategy: params.result.inssWithoutStrategy,
          // Planned scenario data (prevents regression)
          construction_months: constructionMonths,
          planned_total_inss: plannedScenario?.totalINSS ?? null,
          planned_monthly_payment: plannedScenario?.monthlyPayment ?? null,
          planned_total_savings: plannedScenario?.totalSavings ?? null,
          planned_savings_percentage: plannedScenario?.savingsPercentage ?? null,
          calculation_method: 'AREA_VAU',
          confidence_score: 85,
          assumptions: params.result.breakdown as any,
          notes: params.notes,
          calculated_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaxEstimate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_ESTIMATES_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Estimativa salva',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao salvar estimativa: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    estimates: estimatesQuery.data ?? [],
    latestEstimate,
    isLoading: estimatesQuery.isLoading,
    isError: estimatesQuery.isError,
    saveEstimate,
    refetch: estimatesQuery.refetch,
  };
}

/**
 * Hook to calculate INSS estimate based on tax project data
 * @param taxProject - Tax project configuration
 * @param constructionMonths - Optional override for construction duration in months. If not provided, defaults to 1.
 */
export function useINSSCalculation(taxProject: TaxProject | null, constructionMonths?: number) {
  const refData = useINSSReferenceData();

  return useMemo(() => {
    if (!taxProject || refData.isLoading) return null;

    const params: INSSCalculatorParams = {
      area: taxProject.area_total,
      state: taxProject.state_code,
      ownerType: taxProject.owner_type,
      category: taxProject.category,
      constructionType: taxProject.construction_type,
      destination: taxProject.destination as any,
      laborDeductions: 0,
      usesUsinados: false,
      actualEndDate: taxProject.actual_end_date,
      startDate: taxProject.start_date,
      constructionMonths: constructionMonths ?? 1,
    };

    return calculateINSSWithRefData(params, refData);
  }, [taxProject, refData, constructionMonths]);
}

/**
 * Hook to fetch VAU reference values
 */
export function useVauReference(
  stateCode?: string,
  destinationCode?: string
) {
  return useQuery({
    queryKey: ['tax_vau_reference', stateCode, destinationCode],
    queryFn: async () => {
      if (!stateCode) return null;

      const { data, error } = await supabase
        .from('tax_vau_reference')
        .select('*')
        .eq('state_code', stateCode)
        .eq('destination_code', destinationCode ?? 'RESIDENCIAL_UNIFAMILIAR')
        .order('ref_month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Fall back to hardcoded values if no DB entry
      if (!data && stateCode) {
        return {
          vau_value: VAU_BY_STATE[stateCode as keyof typeof VAU_BY_STATE] ?? 1400,
          ref_month: new Date().toISOString().slice(0, 7) + '-01',
          source_note: 'Valor de referência padrão',
        };
      }

      return data;
    },
    enabled: !!stateCode,
  });
}
