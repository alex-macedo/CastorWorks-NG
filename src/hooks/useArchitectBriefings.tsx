import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ArchitectBriefing = Database['public']['Tables']['architect_briefings']['Row'];
type ArchitectBriefingInsert = Database['public']['Tables']['architect_briefings']['Insert'];
type ArchitectBriefingUpdate = Database['public']['Tables']['architect_briefings']['Update'];

const briefingKeys = {
  all: ['architect-briefings'] as const,
  lists: () => [...briefingKeys.all, 'list'] as const,
  list: (projectId?: string) => [...briefingKeys.lists(), { projectId }] as const,
  details: () => [...briefingKeys.all, 'detail'] as const,
  detail: (id: string) => [...briefingKeys.details(), id] as const,
};

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useArchitectBriefings = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: briefing, isLoading, error } = useQuery({
    queryKey: briefingKeys.list(projectId),
    queryFn: async () => {
      if (!projectId) return null;

      // If projectId is not a valid UUID, skip database query (likely mock data scenario)
      if (!isValidUUID(projectId)) {
        return null;
      }

      const { data, error } = await supabase
        .from('architect_briefings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is OK
        throw error;
      }

      return data as ArchitectBriefing | null;
    },
    enabled: !!projectId,
  });

  const saveBriefing = useMutation({
    mutationFn: async (data: ArchitectBriefingInsert | ArchitectBriefingUpdate) => {
      if (!projectId) throw new Error('Project ID required');

      if ('id' in data && data.id) {
        // Update existing briefing
        const { data: result, error } = await supabase
          .from('architect_briefings')
          .update(data)
          .eq('id', data.id)
          .select()
          .single();

        if (error) throw error;
        return result as ArchitectBriefing;
      } else {
        // Create new briefing (ensure project_id is set)
        const briefingData = { ...data, project_id: projectId };
        const { data: result, error } = await supabase
          .from('architect_briefings')
          .insert(briefingData)
          .select()
          .single();

        if (error) throw error;
        return result as ArchitectBriefing;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: briefingKeys.all });
    },
  });

  const deleteBriefing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_briefings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: briefingKeys.all });
    },
  });

  return {
    briefing,
    isLoading,
    error,
    saveBriefing,
    deleteBriefing,
  };
};
