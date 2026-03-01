/**
 * useAnnotations - Annotations/Issue Tracking hook for mobile app
 *
 * Fetches and manages floor plan annotations with:
 * - Real-time query of annotation data
 * - Create, update, delete mutations
 * - Optimistic updates for better UX
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Annotation {
  id: string;
  project_id: string;
  floor_plan_id?: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignee_id?: string;
  location_x?: number;
  location_y?: number;
  photo_url?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CreateAnnotationInput {
  project_id: string;
  floor_plan_id?: string;
  title: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high';
  assignee_id?: string;
  location_x?: number;
  location_y?: number;
  photo_url?: string;
}

export const useAnnotations = (projectId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: annotations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['annotations', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        // Gracefully handle case where table doesn't exist yet
        const { data, error: queryError } = await supabase
          .from('floor_plan_annotations')
          .select(
            `*,
            assignee:user_profiles!assignee_id(user_id, display_name, avatar_url),
            created_by_user:user_profiles!created_by(user_id, display_name)`
          )
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (queryError) {
          if (queryError.code === '42P01' || /does not exist/i.test(queryError.message)) {
            console.warn('[useAnnotations] Table not yet created:', queryError.message);
            return [];
          }
          throw queryError;
        }

        return (data || []) as Annotation[];
      } catch (err: any) {
        console.error('[useAnnotations] Query error:', err);
        throw err;
      }
    },
    enabled: !!projectId,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnnotationInput) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('floor_plan_annotations')
        .insert([
          {
            ...input,
            created_by: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as Annotation;
    },
    onSuccess: (newAnnotation) => {
      queryClient.setQueryData(
        ['annotations', projectId],
        (old: Annotation[] = []) => [newAnnotation, ...old]
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: Partial<Annotation> & { id: string }) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('floor_plan_annotations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Annotation;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['annotations', projectId],
        (old: Annotation[] = []) =>
          old.map((a) => (a.id === updated.id ? updated : a))
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('floor_plan_annotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData(
        ['annotations', projectId],
        (old: Annotation[] = []) => old.filter((a) => a.id !== id)
      );
    },
  });

  return {
    annotations,
    isLoading,
    error,
    refetch,
    createAnnotation: createMutation.mutate,
    updateAnnotation: updateMutation.mutate,
    deleteAnnotation: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
