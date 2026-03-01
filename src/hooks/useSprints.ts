import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-helpers';

export interface Sprint {
  id: string;
  sprint_identifier: string;
  year: number;
  week_number: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'closed';
  release_notes?: string;
  release_notes_html?: string;
  closed_at?: string;
  closed_by?: string;
  total_items: number;
  completed_items: number;
  created_at: string;
  updated_at: string;
}

export const useSprints = () => {
  return useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });
      
      if (error) throw error;
      return data as Sprint[];
    },
  });
};

export const useOpenSprint = () => {
  return useQuery({
    queryKey: ['sprints', 'open'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('status', 'open')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Sprint | null;
    },
  });
};

export const useCreateSprint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sprintData: {
      sprint_identifier: string;
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
    }) => {
      const identifier = sprintData.sprint_identifier.trim();
      let year: number;
      let week: number;
      
      // Check if it's a sprint format (YYYY-WW) or a release version format
      const sprintFormatMatch = identifier.match(/^(\d{4})-(\d{1,2})$/);
      
      if (sprintFormatMatch) {
        // Sprint format: YYYY-WW
        year = parseInt(sprintFormatMatch[1], 10);
        week = parseInt(sprintFormatMatch[2], 10);
        
        if (year < 2000 || year > 2100) {
          throw new Error('Invalid year in sprint identifier (must be 2000-2100)');
        }
        
        if (week < 1 || week > 53) {
          throw new Error('Invalid week number in sprint identifier (must be 1-53)');
        }
      } else {
        // Release version format (e.g., "1.0.0", "v2.5", "2024.1")
        // Calculate year and week from start_date
        const startDate = new Date(sprintData.start_date);
        year = startDate.getFullYear();
        
        // Calculate ISO week number from start date
        const d = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        
        if (isNaN(year) || isNaN(week)) {
          throw new Error('Invalid start date for release');
        }
      }
      
      const { data, error } = await supabase
        .from('sprints')
        .insert({
          ...sprintData,
          year,
          week_number: week,
          status: 'open',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast.success('Sprint created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create sprint: ${error.message}`);
    },
  });
};

export const useCloseSprint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sprintId: string) => {
      const { data, error } = await supabase
        .rpc('close_sprint', { p_sprint_id: sprintId });

      if (error) throw error;
      const result = data as { sprint_id: string; completed_items: number; total_items: number };
      try {
        await supabase.functions.invoke('generate-sprint-release-notes', {
          body: { sprint_id: result.sprint_id },
        });
      } catch (aiErr) {
        console.warn('AI release notes generation failed; template notes saved.', aiErr);
      }
      return result;
    },
    onSuccess: (data: { completed_items: number; total_items: number }) => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      queryClient.invalidateQueries({ queryKey: ['sprint_items'] });
      toast.success(`Sprint closed! ${data.completed_items}/${data.total_items} items completed. Release notes generated.`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to close sprint: ${error.message}`);
    },
  });
};

/** Lightweight query for items in a sprint only. Use in SprintBoard to avoid loading all roadmap items. */
export const useSprintItems = (sprintId: string | null | undefined) => {
  return useQuery({
    queryKey: ['sprint_items', sprintId],
    queryFn: async () => {
      if (!sprintId) return [];
      const { data, error } = await supabase
        .from('roadmap_items')
        .select('id, title, status, category, priority')
        .eq('sprint_id', sprintId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as Array<{ id: string; title: string; status: string; category?: string; priority?: string }>;
    },
    enabled: !!sprintId,
  });
};

export const useAssignItemToSprint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, sprintId }: { itemId: string; sprintId: string | null }) => {
      const { error } = await supabase
        .from('roadmap_items')
        .update({ sprint_id: sprintId })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      queryClient.invalidateQueries({ queryKey: ['sprint_items'] });
      toast.success('Item assigned to sprint!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign item: ${error.message}`);
    },
  });
};
