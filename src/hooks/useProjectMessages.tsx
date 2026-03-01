/**
 * useProjectMessages - Real-time project chat hook for mobile app
 *
 * Manages project messages with:
 * - Real-time subscriptions via Supabase
 * - Message send mutation
 * - Optimistic updates
 * - User presence tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  thread_count?: number;
  parent_message_id?: string;
  user?: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
}

export interface SendMessageInput {
  project_id: string;
  content: string;
  parent_message_id?: string;
}

export const useProjectMessages = (projectId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project_messages', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const { data, error: queryError } = await supabase
          .from('project_messages')
          .select(
            `*,
            user:user_profiles!user_id(user_id, display_name, avatar_url),
            reactions:message_reactions(*)`
          )
          .eq('project_id', projectId)
          .is('parent_message_id', null)
          .order('created_at', { ascending: true })
          .limit(100);

        if (queryError) {
          if (queryError.code === '42P01' || /does not exist/i.test(queryError.message)) {
            console.warn('[useProjectMessages] Table not yet created:', queryError.message);
            return [];
          }
          throw queryError;
        }

        return (data || []) as ProjectMessage[];
      } catch (err: any) {
        console.error('[useProjectMessages] Query error:', err);
        throw err;
      }
    },
    enabled: !!projectId,
  });

  // Setup real-time subscription
  useEffect(() => {
    if (!projectId) return;

    const subscription = supabase
      .channel(`project_messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMessage = payload.new as ProjectMessage;
          queryClient.setQueryData(
            ['project_messages', projectId],
            (old: ProjectMessage[] = []) => [...old, newMessage]
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('project_messages')
        .insert([
          {
            project_id: input.project_id,
            user_id: userId,
            content: input.content,
            parent_message_id: input.parent_message_id || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // If this is a reply, increment parent's thread_count
      if (input.parent_message_id) {
        const { data: parent } = await supabase
          .from('project_messages')
          .select('thread_count')
          .eq('id', input.parent_message_id)
          .single();
          
        await supabase
          .from('project_messages')
          .update({ thread_count: (parent?.thread_count || 0) + 1 })
          .eq('id', input.parent_message_id);
      }

      return data as ProjectMessage;
    },
    onMutate: async (variables) => {
      // Optimistic update
      const optimisticMessage: ProjectMessage = {
        id: `temp-${Date.now()}`,
        project_id: variables.project_id,
        user_id: '',
        content: variables.content,
        created_at: new Date().toISOString(),
        parent_message_id: variables.parent_message_id,
        thread_count: 0,
      };

      queryClient.setQueryData(
        ['project_messages', projectId],
        (old: ProjectMessage[] = []) => [...old, optimisticMessage]
      );
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('message_reactions')
        .insert([{ message_id: messageId, user_id: userId, emoji }])
        .select()
        .single();

      if (error) throw error;
      return data as MessageReaction;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);

      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return {
    messages,
    isLoading,
    error,
    refetch,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    addReaction: addReactionMutation.mutate,
    removeReaction: removeReactionMutation.mutate,
    isAddingReaction: addReactionMutation.isPending,
  };
};

/**
 * Hook to fetch replies to a specific message (thread)
 */
export const useMessageThread = (parentMessageId?: string) => {
  return useQuery({
    queryKey: ['message-thread', parentMessageId],
    queryFn: async () => {
      if (!parentMessageId) return [];

      try {
        const { data, error: queryError } = await supabase
          .from('project_messages')
          .select(
            `*,
            user:user_profiles!user_id(user_id, display_name, avatar_url),
            reactions:message_reactions(*)`
          )
          .eq('parent_message_id', parentMessageId)
          .order('created_at', { ascending: true });

        if (queryError) {
          console.error('[useMessageThread] Query error:', queryError);
          return [];
        }

        return (data || []) as ProjectMessage[];
      } catch (err: any) {
        console.error('[useMessageThread] Error:', err);
        return [];
      }
    },
    enabled: !!parentMessageId,
  });
};
