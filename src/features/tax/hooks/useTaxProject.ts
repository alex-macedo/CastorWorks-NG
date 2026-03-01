/**
 * Tax Project Hook
 * Manages tax project configuration linked to CastorWorks projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  TaxProject,
  CreateTaxProjectInput,
  UpdateTaxProjectInput,
} from '../types/tax.types';

const TAX_PROJECT_KEY = 'tax_project';

export function useTaxProject(projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tax project for a CastorWorks project
  const taxProjectQuery = useQuery({
    queryKey: [TAX_PROJECT_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('tax_projects')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as TaxProject | null;
    },
    enabled: !!projectId,
  });

  // Create tax project
  const createTaxProject = useMutation({
    mutationFn: async (input: CreateTaxProjectInput) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('tax_projects')
        .insert({
          project_id: input.project_id,
          owner_type: input.owner_type,
          owner_document: input.owner_document,
          pj_has_accounting: input.pj_has_accounting,
          area_main: input.area_main,
          area_complementary: input.area_complementary ?? 0,
          category: input.category ?? 'OBRA_NOVA',
          construction_type: input.construction_type ?? 'ALVENARIA',
          destination: input.destination ?? 'RESIDENCIAL_UNIFAMILIAR',
          state_code: input.state_code,
          municipality: input.municipality,
          start_date: input.start_date,
          expected_end_date: input.expected_end_date,
          notes: input.notes,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaxProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PROJECT_KEY, data.project_id],
      });
      toast({
        title: 'Sucesso',
        description: 'Configuração fiscal criada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao criar configuração fiscal: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update tax project
  const updateTaxProject = useMutation({
    mutationFn: async (input: UpdateTaxProjectInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('tax_projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TaxProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PROJECT_KEY, projectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Configuração fiscal atualizada',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao atualizar: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete tax project
  const deleteTaxProject = useMutation({
    mutationFn: async (taxProjectId: string) => {
      const { error } = await supabase
        .from('tax_projects')
        .delete()
        .eq('id', taxProjectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [TAX_PROJECT_KEY, projectId],
      });
      toast({
        title: 'Sucesso',
        description: 'Configuração fiscal removida',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Falha ao remover: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    taxProject: taxProjectQuery.data,
    isLoading: taxProjectQuery.isLoading,
    isError: taxProjectQuery.isError,
    error: taxProjectQuery.error,
    createTaxProject,
    updateTaxProject,
    deleteTaxProject,
    refetch: taxProjectQuery.refetch,
  };
}

/**
 * Hook to fetch tax project by its own ID
 */
export function useTaxProjectById(taxProjectId?: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: [TAX_PROJECT_KEY, 'byId', taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return null;

      const { data, error } = await supabase
        .from('tax_projects')
        .select(`
          *,
          projects:project_id (
            id,
            name,
            status
          )
        `)
        .eq('id', taxProjectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!taxProjectId,
  });
}
