import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MilestoneData, MilestoneStatus } from '@/types/timeline';

/**
 * Custom hook to manage milestone definitions for a project
 * @param projectId - Project ID to fetch milestones for
 * @returns Milestone data and mutation functions
 */
export const useMilestoneDefinitions = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch milestones for a project
  const { data: milestones, isLoading, error } = useQuery({
    queryKey: ['milestone-definitions', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error: queryError } = await supabase
        .from('project_milestone_definitions')
        .select('*')
        .eq('project_id', projectId)
        .order('target_date', { ascending: true });

      if (queryError) throw queryError;

      return data?.map(m => ({
        id: m.id,
        phaseId: m.phase_id,
        name: m.milestone_name,
        targetDate: new Date(m.target_date),
        adjustedTargetDate: m.adjusted_target_date ? new Date(m.adjusted_target_date) : null,
        actualDate: m.actual_date ? new Date(m.actual_date) : null,
        status: m.status as MilestoneStatus,
        definition: m.definition_text,
        justification: m.justification_text,
        hasComments: Array.isArray(m.comments) && m.comments.length > 0,
      })) as MilestoneData[] || [];
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Add a comment to a milestone
  const addComment = useMutation({
    mutationFn: async ({ milestoneId, comment }: { milestoneId: string; comment: string }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      const userName = session?.session?.user?.email?.split('@')[0] || 'Unknown';

      // Fetch current comments
      const { data: milestone } = await supabase
        .from('project_milestone_definitions')
        .select('comments')
        .eq('id', milestoneId)
        .single();

      const currentComments = (milestone?.comments as any[]) || [];
      const newComment = {
        id: crypto.randomUUID(),
        userId,
        userName,
        text: comment,
        timestamp: new Date().toISOString(),
      };

      // Update with new comment
      const { error: updateError } = await supabase
        .from('project_milestone_definitions')
        .update({ comments: [...currentComments, newComment] })
        .eq('id', milestoneId);

      if (updateError) throw updateError;

      return newComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Comment added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add comment: ${error.message}`);
    },
  });

  // Update milestone definition or justification
  const updateDefinition = useMutation({
    mutationFn: async ({
      milestoneId,
      definition,
      justification,
      actualDate,
      status,
    }: {
      milestoneId: string;
      definition?: string;
      justification?: string;
      actualDate?: Date | null;
      status?: MilestoneStatus;
    }) => {
      const updates: Record<string, any> = {};

      if (definition !== undefined) updates.definition_text = definition;
      if (justification !== undefined) updates.justification_text = justification;
      if (actualDate !== undefined) {
        updates.actual_date = actualDate ? actualDate.toISOString().split('T')[0] : null;
      }
      if (status !== undefined) updates.status = status;

      const { error: updateError } = await supabase
        .from('project_milestone_definitions')
        .update(updates)
        .eq('id', milestoneId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Milestone updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });

  // Create a new milestone
  const createMilestone = useMutation({
    mutationFn: async ({
      projectId: pid,
      phaseId,
      milestoneName,
      targetDate,
      definition,
    }: {
      projectId: string;
      phaseId?: string;
      milestoneName: string;
      targetDate: Date;
      definition?: string;
    }) => {
      const { data, error: insertError } = await supabase
        .from('project_milestone_definitions')
        .insert({
          project_id: pid,
          phase_id: phaseId || null,
          milestone_name: milestoneName,
          target_date: targetDate.toISOString().split('T')[0],
          definition_text: definition || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Milestone created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });

  // Delete a milestone
  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error: deleteError } = await supabase
        .from('project_milestone_definitions')
        .delete()
        .eq('id', milestoneId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Milestone deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });

  return {
    milestones,
    isLoading,
    error,
    addComment,
    updateDefinition,
    createMilestone,
    deleteMilestone,
  };
};
