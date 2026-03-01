/**
 * useChatConversations Hook
 * 
 * Manages chat conversations for the Client Portal
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChatConversationWithDetails } from '@/types/clientPortal';
import { useClientPortalAuth } from './useClientPortalAuth';
import { useEffect } from 'react';
import { useAppProject } from '@/contexts/AppProjectContext';

export function useChatConversations(mode: 'portal' | 'app' = 'portal') {
  const portalAuth = useClientPortalAuth();
  const appProject = useAppProject();
  
  const projectId = mode === 'app' ? appProject.selectedProject?.id : portalAuth.projectId;
  const isAuthenticated = mode === 'app' ? true : portalAuth.isAuthenticated;
  
  const queryClient = useQueryClient();

  // Fetch conversations
  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chatConversations', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      console.log(`[useChatConversations] Fetching for project: ${projectId}`);

      // 1. Fetch Portal Conversations using RPC
      const { data: portalData, error: portalError } = await supabase
        .rpc('get_portal_conversations', { 
          p_project_id: projectId 
        });

      if (portalError) {
        console.error('[useChatConversations] RPC Error:', portalError);
        throw portalError;
      }

      const portalMapped = (portalData || []).map((conv: any) => ({
        id: conv.id,
        project_id: projectId,
        title: conv.title,
        created_at: '',
        updated_at: conv.updated_at,
        participants: conv.participants || [],
        lastMessage: conv.last_message ? {
          id: conv.last_message.id,
          text: conv.last_message.text,
          created_at: conv.last_message.created_at,
          sender_id: conv.last_message.sender_id
        } : null,
        unreadCount: 0,
        source: 'portal'
      }));

      console.log(`[useChatConversations] Final list: ${portalMapped.length}`);
      return portalMapped as ChatConversationWithDetails[];
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Subscribe to real-time updates for conversations
  useEffect(() => {
    if (!projectId || !isAuthenticated) return;

    const channel = supabase
      .channel(`chat-conversations-updates-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chatConversations', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, isAuthenticated, queryClient]);

  return {
    conversations: conversations || [],
    isLoading,
    error,
  };
}
