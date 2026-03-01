import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ProjectAccessGrant = Database['public']['Tables']['project_access_grants']['Row'];
type ProjectAccessGrantInsert = Database['public']['Tables']['project_access_grants']['Insert'];

export interface GrantableUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  roles: string[];
}

/**
 * Hook to fetch access grants for a specific project
 */
export const useProjectAccessGrants = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-access-grants', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data: grants, error } = await supabase
        .from('project_access_grants')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!grants || grants.length === 0) return [];

      // Fetch user profiles for granted users
      const userIds = grants.map(g => g.granted_to_user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        // Return grants without profile data
        return grants.map(g => ({ ...g, granted_to_user: null }));
      }

      // Combine grants with user profiles
      return grants.map(grant => ({
        ...grant,
        granted_to_user: profiles?.find(p => p.user_id === grant.granted_to_user_id) || null,
      }));
    },
    enabled: !!projectId,
  });
};

/**
 * Hook to grant project access to a user
 */
export const useGrantProjectAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      grantedToUserId,
    }: {
      projectId: string;
      grantedToUserId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify the user is the project owner
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, owner_id, name')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      if (project.owner_id !== user.id) {
        throw new Error('Only project owners can grant access');
      }

      // Verify the target user has admin or project_manager role
      const { data: targetUserRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', grantedToUserId)
        .in('role', ['admin', 'project_manager']);

      if (rolesError) throw rolesError;
      if (!targetUserRoles || targetUserRoles.length === 0) {
        throw new Error('Access can only be granted to administrators or project managers');
      }

      const { data, error } = await supabase
        .from('project_access_grants')
        .insert({
          project_id: projectId,
          granted_by_user_id: user.id,
          granted_to_user_id: grantedToUserId,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate key error gracefully
        if (error.code === '23505') {
          throw new Error('Access has already been granted to this user');
        }
        throw error;
      }

      // Get user profile for notification
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('display_name, email')
        .eq('user_id', grantedToUserId)
        .single();

      return { grant: data, project, userProfile };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-access-grants'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(
        `Access granted to ${result.userProfile?.display_name || result.userProfile?.email || 'user'}`
      );
    },
    onError: (error: any) => {
      toast.error(`Failed to grant access: ${error.message || 'Unknown error'}`);
    },
  });
};

/**
 * Hook to revoke project access from a user
 */
export const useRevokeProjectAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (grantId: string) => {
      // Get grant details before deleting for notification
      const { data: grant, error: grantError } = await supabase
        .from('project_access_grants')
        .select(`
          *,
          granted_to_user:user_profiles!project_access_grants_granted_to_user_id_fkey(
            display_name,
            email
          )
        `)
        .eq('id', grantId)
        .single();

      if (grantError) throw grantError;

      const { error } = await supabase
        .from('project_access_grants')
        .delete()
        .eq('id', grantId);

      if (error) throw error;

      return grant;
    },
    onSuccess: (grant) => {
      queryClient.invalidateQueries({ queryKey: ['project-access-grants'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      const userName = (grant as any).granted_to_user?.display_name || (grant as any).granted_to_user?.email || 'user';
      toast.success(`Access revoked from ${userName}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to revoke access: ${error.message || 'Unknown error'}`);
    },
  });
};

/**
 * Hook to fetch users who can receive grants (admins and project managers)
 */
export const useGrantableUsers = () => {
  return useQuery({
    queryKey: ['grantable-users'],
    queryFn: async () => {
      // Get all users with admin or project_manager role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'project_manager']);

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return [];

      const userIds = [...new Set(userRoles.map(r => r.user_id))];

      // Get user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, display_name, avatar_url')
        .in('user_id', userIds)
        .order('display_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Combine roles with profiles
      const grantableUsers: GrantableUser[] = (profiles || []).map(profile => {
        const userRolesForUser = userRoles.filter(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email || '',
          display_name: profile.display_name || profile.email || 'Unknown User',
          avatar_url: profile.avatar_url || undefined,
          roles: userRolesForUser.map(r => r.role),
        };
      });

      return grantableUsers;
    },
  });
};

/**
 * Hook to fetch projects owned by the current user (for architects)
 */
export const useArchitectOwnedProjects = () => {
  return useQuery({
    queryKey: ['architect-owned-projects'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('owner_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data as any[]) || [];
    },
  });
};
