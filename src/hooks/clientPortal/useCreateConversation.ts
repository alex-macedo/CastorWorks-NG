import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/** projectIdOverride: use when not in portal route (e.g. app mode on /chat) */
export function useCreateConversation(projectIdOverride?: string) {
  const { projectId: paramsProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = projectIdOverride ?? paramsProjectId;

  return useMutation({
    mutationFn: async (members: string[]) => {
      if (!projectId) throw new Error('Project ID is required to create a conversation');
      const { data: conv, error: convError } = await supabase
        .from('chat_conversations')
        .insert({ project_id: projectId })
        .select()
        .single();
      if (convError) throw convError;

      // Add participants (user_ids for conversation_participants)
      const participantRows = members.map((userId) => ({
        conversation_id: conv.id,
        user_id: userId,
        is_client: false,
      }));
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participantRows);
      if (partError) throw partError;

      // Add current user as participant if not already in members
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !members.includes(user.id)) {
        await supabase.from('conversation_participants').insert({
          conversation_id: conv.id,
          user_id: user.id,
          is_client: false,
        });
      }

      return conv;
    },
    onSuccess: (data: any) => {
      if (data?.id && projectId) {
        queryClient.invalidateQueries({ queryKey: ['chatConversations', projectId] });
        if (paramsProjectId) {
          navigate(`/portal/${paramsProjectId}/chat/${data.id}`);
        }
      }
    },
  });
}
