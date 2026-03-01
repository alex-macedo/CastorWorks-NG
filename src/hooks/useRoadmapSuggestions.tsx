import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { Database } from '@/integrations/supabase/types';

export type RoadmapSuggestion = Database['public']['Tables']['roadmap_suggestions']['Row'];
type RoadmapSuggestionInsert = Database['public']['Tables']['roadmap_suggestions']['Insert'];

export const useRoadmapSuggestions = () => {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['roadmap_suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roadmap_suggestions')
        .select('*')
        .eq('is_imported', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RoadmapSuggestion[];
    },
  });

  return { suggestions, isLoading };
};

export const useCreateSuggestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion: RoadmapSuggestionInsert) => {
      const { data, error } = await supabase
        .from('roadmap_suggestions')
        .insert(suggestion)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_suggestions'] });
      toast({
        title: 'Success',
        description: 'Suggestion added successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add suggestion',
        variant: 'destructive',
      });
    },
  });
};

export const useImportSuggestions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatDate } = useDateFormat();

  return useMutation({
    mutationFn: async (suggestionIds: string[]) => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        throw new Error('User not authenticated');
      }

      // Get suggestions to import
      const { data: suggestions, error: fetchError } = await supabase
        .from('roadmap_suggestions')
        .select('*')
        .in('id', suggestionIds);

      if (fetchError) throw fetchError;
      if (!suggestions || suggestions.length === 0) {
        throw new Error('No suggestions found');
      }

      // Create roadmap items from suggestions
      const roadmapItems = suggestions.map(s => ({
        title: s.title,
        description: s.description,
        status: 'backlog' as const,
        category: s.category as 'feature' | 'bug_fix' | 'integration' | 'refinement',
        priority: s.priority as 'low' | 'medium' | 'high' | 'urgent',
        estimated_effort: s.estimated_effort as 'small' | 'medium' | 'large' | 'xlarge',
        created_by: userData.user.id,
        notes: `Imported from AI suggestion on ${formatDate(new Date())}`,
      }));

      const { error: insertError } = await supabase
        .from('roadmap_items')
        .insert(roadmapItems);

      if (insertError) throw insertError;

      // Mark suggestions as imported
      const { error: updateError } = await supabase
        .from('roadmap_suggestions')
        .update({ is_imported: true, imported_at: new Date().toISOString() })
        .in('id', suggestionIds);

      if (updateError) throw updateError;

      return suggestions;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
      toast({
        title: 'Success',
        description: `${data.length} suggestion(s) imported to roadmap`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import suggestions',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSuggestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roadmap_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap_suggestions'] });
      toast({
        title: 'Success',
        description: 'Suggestion deleted',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete suggestion',
        variant: 'destructive',
      });
    },
  });
};
