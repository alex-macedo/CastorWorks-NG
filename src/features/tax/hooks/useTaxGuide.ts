/**
 * Tax Guide Hook
 * Manages the compliance lifecycle process steps
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TaxGuideStep } from '../types/tax.types';

const TAX_GUIDE_KEY = 'tax_guide_process';

export function useTaxGuide(taxProjectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all steps for a tax project
  const guideQuery = useQuery({
    queryKey: [TAX_GUIDE_KEY, taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return [];

      const { data, error } = await supabase
        .from('tax_guide_process')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as TaxGuideStep[];
    },
    enabled: !!taxProjectId,
  });

  // Update a step (status, dates, etc.)
  const updateStep = useMutation({
    mutationFn: async (params: { 
      id: string; 
      updates: Partial<Pick<TaxGuideStep, 'status' | 'due_date' | 'attachment_url' | 'completed_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('tax_guide_process')
        .update(params.updates)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as TaxGuideStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_GUIDE_KEY, taxProjectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Etapa do processo atualizada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao atualizar etapa: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    steps: guideQuery.data ?? [],
    isLoading: guideQuery.isLoading,
    isError: guideQuery.isError,
    updateStep,
    refetch: guideQuery.refetch,
  };
}
