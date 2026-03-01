import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface UserPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  cursorPosition?: number; // Question index being edited
  lastSeen: string;
}

export interface FormRealtimeState {
  activeUsers: UserPresence[];
  isConnected: boolean;
  questionLocks: Record<string, string>; // questionId -> userId
}

/**
 * useFormRealtime Hook
 * 
 * Provides real-time collaboration features for form editing:
 * - User presence tracking (who's currently editing)
 * - Cursor position broadcasting
 * - Question lock management
 * - Real-time question updates
 */
export const useFormRealtime = (formId: string | undefined, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const [realtimeState, setRealtimeState] = useState<FormRealtimeState>({
    activeUsers: [],
    isConnected: false,
    questionLocks: {},
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    if (!formId || !enabled || !currentUserId) {
      logger.info('Realtime not enabled', { formId, enabled, currentUserId });
      return;
    }

    const channelName = `form:${formId}`;
    logger.info('Setting up realtime channel', { channelName });

    // Create channel
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channelRef.current = channel;

    // Track presence changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: UserPresence[] = [];

        Object.keys(state).forEach((userId) => {
          const presences = state[userId];
          if (presences && presences.length > 0) {
            const presence = presences[0];
            users.push({
              userId,
              displayName: presence.display_name || 'Anonymous',
              avatarUrl: presence.avatar_url,
              cursorPosition: presence.cursor_position,
              lastSeen: new Date().toISOString(),
            });
          }
        });

        setRealtimeState((prev) => ({
          ...prev,
          activeUsers: users.filter(u => u.userId !== currentUserId),
        }));

        logger.info('Presence synced', { 
          activeUsers: users.length,
          formId 
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.info('User joined', { userId: key, formId });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.info('User left', { userId: key, formId });
      });

    // Listen for question updates
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'form_questions',
        filter: `form_id=eq.${formId}`,
      },
      (payload) => {
        logger.info('Question updated via realtime', { 
          event: payload.eventType,
          questionId: payload.new?.id || payload.old?.id 
        });

        // Invalidate questions cache to refetch
        queryClient.invalidateQueries({ 
          queryKey: ['form_questions', formId] 
        });
      }
    );

    // Listen for form updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'forms',
        filter: `id=eq.${formId}`,
      },
      (payload) => {
        logger.info('Form updated via realtime', { formId });

        // Invalidate form cache
        queryClient.invalidateQueries({ 
          queryKey: ['forms', formId] 
        });
      }
    );

    // Subscribe to channel
    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Get user profile for presence
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, avatar_url')
            .eq('user_id', currentUserId)
            .maybeSingle();

          // Track presence
          await channel.track({
            user_id: currentUserId,
            display_name: profile?.display_name || 'Anonymous',
            avatar_url: profile?.avatar_url,
            cursor_position: null,
            online_at: new Date().toISOString(),
          });

          setRealtimeState((prev) => ({
            ...prev,
            isConnected: true,
          }));

          logger.info('Realtime channel subscribed', { formId });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Realtime channel error', { formId });
          setRealtimeState((prev) => ({
            ...prev,
            isConnected: false,
          }));
        }
      });

    // Cleanup on unmount
    return () => {
      logger.info('Cleaning up realtime channel', { formId });
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [formId, enabled, currentUserId, queryClient]);

  // Broadcast cursor position
  const broadcastCursorPosition = useCallback(
    async (questionIndex: number | null) => {
      if (!channelRef.current || !currentUserId) return;

      try {
        await channelRef.current.track({
          user_id: currentUserId,
          cursor_position: questionIndex,
          online_at: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to broadcast cursor position:', error);
      }
    },
    [currentUserId]
  );

  // Lock a question for editing
  const lockQuestion = useCallback(
    (questionId: string) => {
      if (!currentUserId) return;

      setRealtimeState((prev) => ({
        ...prev,
        questionLocks: {
          ...prev.questionLocks,
          [questionId]: currentUserId,
        },
      }));

      logger.info('Question locked', { questionId, userId: currentUserId });
    },
    [currentUserId]
  );

  // Unlock a question
  const unlockQuestion = useCallback(
    (questionId: string) => {
      setRealtimeState((prev) => {
        const newLocks = { ...prev.questionLocks };
        delete newLocks[questionId];
        return {
          ...prev,
          questionLocks: newLocks,
        };
      });

      logger.info('Question unlocked', { questionId });
    },
    []
  );

  // Check if a question is locked by another user
  const isQuestionLocked = useCallback(
    (questionId: string): boolean => {
      const lockedBy = realtimeState.questionLocks[questionId];
      return !!lockedBy && lockedBy !== currentUserId;
    },
    [realtimeState.questionLocks, currentUserId]
  );

  // Get who locked a question
  const getQuestionLockOwner = useCallback(
    (questionId: string): UserPresence | null => {
      const lockOwnerId = realtimeState.questionLocks[questionId];
      if (!lockOwnerId) return null;

      return (
        realtimeState.activeUsers.find((u) => u.userId === lockOwnerId) || null
      );
    },
    [realtimeState.questionLocks, realtimeState.activeUsers]
  );

  return {
    ...realtimeState,
    broadcastCursorPosition,
    lockQuestion,
    unlockQuestion,
    isQuestionLocked,
    getQuestionLockOwner,
  };
};
