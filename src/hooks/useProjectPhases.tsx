import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

/** Maps UI/calculated phase status to DB phase_status enum (pending, in_progress, completed). */
function mapPhaseStatusForDb(status: string | null | undefined): 'pending' | 'in_progress' | 'completed' | undefined {
  if (status == null) return undefined;
  const s = String(status).toLowerCase();
  switch (s) {
    case 'not_started':
    case 'pending':
      return 'pending';
    case 'in_progress':
    case 'in-progress':
    case 'at_risk':
    case 'delayed':
    case 'on_hold':
    case 'on-hold':
      return 'in_progress';
    case 'completed':
      return 'completed';
    default:
      return 'pending';
  }
}

type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];
type ProjectPhaseInsert = Database['public']['Tables']['project_phases']['Insert'];
type ProjectPhaseUpdate = Database['public']['Tables']['project_phases']['Update'];

export const useProjectPhases = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: phases, isLoading } = useQuery({
    queryKey: ['project_phases', projectId],
    queryFn: async () => {
      /*
      console.log('[useProjectPhases] Query source: project_phases');
      */
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      /*
      console.log('[useProjectPhases] Raw data from project_phases:', data);
      console.log('[useProjectPhases] Number of records:', data?.length || 0);
      */
      return data;
    },

    enabled: !!projectId,
  });

  const createPhase = useMutation({
    mutationFn: async (phase: ProjectPhaseInsert) => {
      const { data, error } = await supabase
        .from('project_phases')
        .insert(phase)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      toast.success('Phase created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create phase: ${error.message}`);
    }
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, updates, silent }: { id: string; updates: ProjectPhaseUpdate; silent?: boolean }) => {
      const sanitized = { ...updates };
      if (updates.status != null) {
        const mapped = mapPhaseStatusForDb(updates.status);
        if (mapped) sanitized.status = mapped as any;
      }
      // Try to update by ID first
      const { data, error } = await supabase
        .from('project_phases')
        .update(sanitized)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // If no rows were updated, try by wbs_item_id (for WBS projects)
      if (!data || data.length === 0) {
        const { data: wbsData, error: wbsError } = await supabase
          .from('project_phases')
          .update(sanitized)
          .eq('wbs_item_id', id)
          .select();
        
        if (wbsError) throw wbsError;
        return { data: wbsData?.[0], silent };
      }
      return { data: data[0], silent };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      // Only show toast if NOT silent
      if (!result.silent && Object.keys(result.data || {}).length > 0) {
        // toast.success('Phase updated successfully'); // Kept disabled by default as per original
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to update phase: ${error.message}`);
    }
  });

  const bulkUpdatePhases = useMutation({
    mutationFn: async (updates: Array<{ id: string; updates: ProjectPhaseUpdate }>) => {
      const sanitize = (u: ProjectPhaseUpdate) => {
        const s = { ...u };
        if (u.status != null) {
          const mapped = mapPhaseStatusForDb(u.status);
          if (mapped) s.status = mapped as any;
        }
        return s;
      };
      // Use Promise.allSettled to handle missing phases gracefully
      const results = await Promise.allSettled(
        updates.map(async ({ id, updates: phaseUpdates }) => {
          const { data, error } = await supabase
            .from('project_phases')
            .update(sanitize(phaseUpdates))
            .eq('id', id)
            .select()
            .maybeSingle();
          
          if (error) throw error;
          if (!data) {
            // Phase not found - log warning but don't throw
            // console.warn(`Phase with id ${id} not found - skipping update`);
            return null;
          }
          return data;
        })
      );
      
      // Extract successful results and log any failures
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
        .map((result) => result.value);
      
      const failed = results.filter((result) => result.status === 'rejected');
      if (failed.length > 0) {
        // console.warn(`Failed to update ${failed.length} phase(s) out of ${updates.length}`);
      }
      
      return successful;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      toast.success(`Updated ${variables.length} phase(s) successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update phases: ${error.message}`);
    }
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      toast.success('Phase deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete phase: ${error.message}`);
    }
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status, progressPercentage }: { 
      ids: string[]; 
      status?: string;
      progressPercentage?: number;
    }) => {
      const updates: ProjectPhaseUpdate = {};
      if (status !== undefined) {
        const mapped = mapPhaseStatusForDb(status);
        if (mapped) updates.status = mapped as any;
      }
      if (progressPercentage !== undefined) updates.progress_percentage = progressPercentage;

      const { error } = await supabase
        .from('project_phases')
        .update(updates)
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      toast.success(`Updated ${variables.ids.length} phase(s) successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update phases: ${error.message}`);
    }
  });

  const bulkDeletePhases = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      toast.success(`Successfully deleted ${ids.length} phase(s)`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete phases: ${error.message}`);
    }
  });

  const deleteAllPhases = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      
      const { error } = await supabase
        .from('project_phases')
        .delete()
        .eq('project_id', projectId)
        .eq('type', 'schedule'); // Only delete schedule phases
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
      // Don't show toast - this is an internal operation
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete phases: ${error.message}`);
    }
  });

  const reorderPhases = useMutation({
    mutationFn: async (phaseUpdates: { id: string; sort_order: number }[]) => {
      const updates = phaseUpdates.map(({ id, sort_order }) =>
        supabase
          .from('project_phases')
          .update({ sort_order })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error('Failed to reorder some phases');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project_phases'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder phases: ${error.message}`);
    }
  });

  const createPhasesFromTemplate = useMutation({
    mutationFn: async ({ 
      projectId, 
      templatePhases, 
      projectStartDate,
      projectBudget 
    }: { 
      projectId: string; 
      templatePhases: Array<{
        sequence: number;
        phaseName: string;
        defaultDurationDays: number;
        defaultBudgetPercentage: number;
      }>; 
      projectStartDate: Date | null;
      projectBudget: number;
    }) => {
      let currentDate = projectStartDate || new Date();
      
      const phasesToInsert = templatePhases.map(template => {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        // Subtract 1 because the start date counts as day 1
        endDate.setDate(endDate.getDate() + template.defaultDurationDays - 1);

        const budgetAllocated = (projectBudget * template.defaultBudgetPercentage) / 100;

        currentDate = new Date(endDate);
        currentDate.setDate(currentDate.getDate() + 1);
        
        return {
          project_id: projectId,
          phase_name: template.phaseName,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          budget_allocated: budgetAllocated,
          progress_percentage: 0,
          status: 'pending' as const,
          type: 'schedule' as const, // Schedule phases have dates
          sort_order: template.sequence, // Preserve template sequence as sort_order
        };
      });

      const { data, error } = await supabase
        .from('project_phases')
        .insert(phasesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_phases', variables.projectId] });
      toast.success('Phases created successfully from template');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create phases from template: ${error.message}`);
    }
  });

  return {
    phases,
    isLoading,
    createPhase,
    updatePhase,
    deletePhase,
    bulkUpdateStatus,
    bulkUpdatePhases,
    bulkDeletePhases,
    deleteAllPhases,
    reorderPhases,
    createPhasesFromTemplate,
  };
};
