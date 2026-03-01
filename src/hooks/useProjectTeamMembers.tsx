import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { ProjectTeamMember } from '@/types/contacts';

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

type TeamMember = Database['public']['Tables']['project_team_members']['Row'];
type TeamMemberInsert = Database['public']['Tables']['project_team_members']['Insert'];
type TeamMemberUpdate = Database['public']['Tables']['project_team_members']['Update'];

export const useProjectTeamMembers = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team_members', projectId],
    queryFn: async () => {
      // If projectId is not provided, return empty array
      if (!projectId) {
        return [];
      }

      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (!isValidUUID(projectId)) {
        return [];
      }

      const query = supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', projectId) // Always filter by project_id when provided
        .order('sort_order', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return [];
      }

      // Fetch user profiles for team members that have user_id
      const userIds = data
        .map((m: any) => m.user_id)
        .filter((id: string | null): id is string => id !== null && id !== undefined);
      
      let userProfiles: Record<string, { avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, avatar_url')
          .in('user_id', userIds);
        
        if (!profilesError && profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            acc[profile.user_id] = { avatar_url: profile.avatar_url };
            return acc;
          }, {} as Record<string, { avatar_url: string | null }>);
        }
      }

      // Merge team members with user profile avatars (prefer user_profiles.avatar_url)
      return data.map((member: any) => {
        const userProfile = member.user_id ? userProfiles[member.user_id] : null;
        return {
          ...member,
          avatar_url: userProfile?.avatar_url || member.avatar_url || null,
        } as ProjectTeamMember;
      });
    },
    enabled: !!projectId && isValidUUID(projectId), // Only enable query when projectId is valid
  });

  const createTeamMember = useMutation({
    mutationFn: async (member: TeamMemberInsert) => {
      const { data, error } = await supabase
        .from('project_team_members')
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Team member added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add team member: ${error.message}`);
    },
  });

  const updateTeamMember = useMutation({
    mutationFn: async ({ id, ...updates }: TeamMemberUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('project_team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Team member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update team member: ${error.message}`);
    },
  });

  const deleteTeamMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast.success('Team member removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove team member: ${error.message}`);
    },
  });

  return {
    teamMembers,
    isLoading,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
  };
};
