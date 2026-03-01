/**
 * useProjectTeam Hook
 *
 * Manages project team members for the Client Portal.
 * Accepts optional projectId override for app mode (e.g. Team Chat on /chat) where
 * useClientPortalAuth().projectId is empty.
 *
 * For portal: uses get_portal_team (filters is_visible_to_client).
 * For app: useProjectTeamMembers (all team members) - pass projectId to ChatInterface.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectTeamMember } from '@/types/clientPortal';
import { useClientPortalAuth } from './useClientPortalAuth';

export function useProjectTeam(projectIdOverride?: string) {
  const { projectId: portalProjectId, isAuthenticated } = useClientPortalAuth();
  const projectId = projectIdOverride ?? portalProjectId;

  const {
    data: teamMembers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projectTeam', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .rpc('get_portal_team', { p_project_id: projectId });

      if (error) throw error;
      return data as ProjectTeamMember[];
    },
    enabled: (isAuthenticated || !!projectIdOverride) && !!projectId,
  });

  return {
    teamMembers: teamMembers || [],
    isLoading,
    error,
  };
}
