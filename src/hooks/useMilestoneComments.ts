import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TimelineComment } from '@/types/timeline';

/**
 * Custom hook to manage threaded comments for a specific milestone
 * @param milestoneId - The ID of the milestone to fetch and manage comments for
 * @returns Comments thread, loading state, and mutation functions
 */
export const useMilestoneComments = (milestoneId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch comments for a milestone (including user profile info)
  const { data: comments, isLoading, error } = useQuery({
    queryKey: ['milestone-comments', milestoneId],
    queryFn: async () => {
      if (!milestoneId) return [];

      const { data, error: queryError } = await supabase
        .from('milestone_comments')
        .select(`
          *,
          user_profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('milestone_id', milestoneId)
        .order('created_at', { ascending: true });

      if (queryError) {
        console.error('[Comments] Error fetching comments:', queryError);
        throw queryError;
      }

      // Step 1: Transform flat list to TimelineComment objects
      const transformComment = (c: any): TimelineComment => ({
        id: c.id,
        milestoneId: c.milestone_id,
        parentId: c.parent_id,
        userId: c.user_id,
        userName: c.user_profiles?.display_name || 'Unknown User',
        avatarUrl: c.user_profiles?.avatar_url || null,
        text: c.content,
        attachmentUrl: c.attachment_url,
        timestamp: new Date(c.created_at),
        replies: []
      });

      const allComments = data.map(transformComment);
      const commentMap = new Map<string, TimelineComment>();
      const rootComments: TimelineComment[] = [];

      // Step 2: Map comments by ID for quick lookup
      allComments.forEach(c => {
        commentMap.set(c.id, c);
      });

      // Step 3: Build the tree structure
      allComments.forEach(c => {
        if (c.parentId && commentMap.has(c.parentId)) {
          commentMap.get(c.parentId)!.replies!.push(c);
        } else {
          rootComments.push(c);
        }
      });

      return rootComments;
    },
    enabled: !!milestoneId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Post a new comment or a reply
  const postComment = useMutation({
    mutationFn: async ({
      content,
      parentId = null,
      attachmentUrl = null,
    }: {
      content: string;
      parentId?: string | null;
      attachmentUrl?: string | null;
    }) => {
      if (!milestoneId) throw new Error('Milestone ID is required');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: insertError } = await supabase
        .from('milestone_comments')
        .insert({
          milestone_id: milestoneId,
          parent_id: parentId,
          user_id: user.id,
          content,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-comments', milestoneId] });
      // Invalidate milestone definitions to update localized 'hasComments' counts/flags
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Comment added');
    },
    onError: (err: Error) => {
      console.error('[Comments] Error posting comment:', err);
      toast.error(`Failed to post comment: ${err.message}`);
    },
  });

  // Delete a comment (cascade handles children in DB, but we invalidate to refresh UI)
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error: deleteError } = await supabase
        .from('milestone_comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone-comments', milestoneId] });
      queryClient.invalidateQueries({ queryKey: ['milestone-definitions'] });
      toast.success('Comment deleted');
    },
    onError: (err: Error) => {
      console.error('[Comments] Error deleting comment:', err);
      toast.error(`Failed to delete comment: ${err.message}`);
    },
  });

  return {
    comments,
    isLoading,
    error,
    postComment,
    deleteComment,
  };
};
