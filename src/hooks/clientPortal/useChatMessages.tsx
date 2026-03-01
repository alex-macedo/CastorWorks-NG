/**
 * useChatMessages Hook
 * 
 * Manages chat messages for a specific conversation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessageWithAttachments } from '@/types/clientPortal';
import { useClientPortalAuth } from './useClientPortalAuth';
import { useEffect } from 'react';

export function useChatMessages(conversationId: string | null, mode: 'portal' | 'app' = 'portal') {
  const portalAuth = useClientPortalAuth();
  const isAuthenticated = mode === 'app' ? true : portalAuth.isAuthenticated;
  const queryClient = useQueryClient();

  // Fetch messages
  const {
    data: messages,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chatMessages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .rpc('get_portal_messages', { 
          p_conversation_id: conversationId
        });

      if (error) {
        console.error('[useChatMessages] get_portal_messages error:', error);
        throw error;
      }

      if (!Array.isArray(data)) {
        console.warn('[useChatMessages] Unexpected response:', data);
        return [];
      }

      // Map RPC result to ChatMessageWithAttachments
      return data.map((msg: any) => ({
        id: msg.id,
        conversation_id: conversationId,
        text: msg.text,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender: {
          id: msg.sender_id || 'client',
          name: msg.sender_name || 'User',
          avatar_url: null
        },
        attachments: msg.attachments || []
      })) as ChatMessageWithAttachments[];
    },
    enabled: isAuthenticated && !!conversationId,
    // Poll every 3s as fallback when realtime subscription misses events
    refetchInterval: 3000,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ text, attachments = [] }: { text: string; attachments?: File[] }) => {
      if (!conversationId) throw new Error('No conversation selected');

      // Send message via RPC
      const { data: messageId, error: msgError } = await supabase
        .rpc('send_portal_message', {
          p_conversation_id: conversationId,
          p_text: text
        });

      if (msgError) throw msgError;

      // 2. Upload attachments if any
      if (attachments.length > 0) {
        // Upload logic would go here
      }

      return { id: messageId, text, created_at: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] }); // Update last message
    },
  });

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (!conversationId || !isAuthenticated) return;

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatMessages', conversationId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && import.meta.env.DEV) {
          console.log(`[useChatMessages] Realtime subscribed for conversation ${conversationId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isAuthenticated, queryClient]);

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
  };
}
