import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { logger } from '@/lib/logger';

/**
 * Hook to fetch all projects accessible to the current client portal user
 */
export const useClientAccessibleProjects = () => {
  const { isAuthenticated: isPortalAuth, clientId } = useClientPortalAuth();
  const { data: profile } = useUserProfile();
  const { data: roles = [] } = useUserRoles();
  
  const userId = clientId || profile?.id;
  const isAdmin = roles.some(r => r.role === 'admin');
  const isAuthenticated = isPortalAuth || !!profile;

  return useQuery({
    queryKey: ['clientAccessibleProjects', userId, isAdmin],
    queryFn: async () => {
      if (!userId) {
        logger.warn('[useClientAccessibleProjects] No userId available');
        return [];
      }

      logger.info('[useClientAccessibleProjects] Fetching accessible projects', { userId, isAdmin });

      // If admin, fetch all non-cancelled projects (but NOT architect-owned projects)
      // RLS should handle this, but we add frontend filtering as a safety measure
      if (isAdmin) {
        logger.info('[useClientAccessibleProjects] Admin user detected, fetching all projects');
        const { data: allProjects, error: adminError } = await supabase
          .from('projects')
          .select('*')
          .neq('status', 'cancelled')
          .order('name');

        if (adminError) {
          logger.error('[useClientAccessibleProjects] Failed to fetch all projects as admin', {
            error: adminError.message
          });
          throw adminError;
        }

        // CRITICAL: Filter out architect-owned projects for admins
        // Admins should NOT see projects owned by architects (architect isolation)
        // Check if global_admin (which has access to all projects)
        const isGlobalAdmin = roles.some(r => r.role === 'global_admin');
        
        if (!isGlobalAdmin && allProjects && allProjects.length > 0) {
          // Get all project owner IDs
          const ownerIds = allProjects
            .map((p: any) => p.owner_id)
            .filter((id: string | null) => id !== null && id !== userId) as string[];
          
          if (ownerIds.length > 0) {
            // Check which owners are architects
            const { data: architectOwners } = await supabase
              .from('user_roles')
              .select('user_id')
              .eq('role', 'architect')
              .in('user_id', ownerIds);
            
            const architectOwnerIds = new Set((architectOwners || []).map((r: any) => r.user_id));
            
            // Filter out projects owned by architects (unless user has explicit grant)
            const projectsToCheck = allProjects.filter((p: any) => 
              p.owner_id && architectOwnerIds.has(p.owner_id)
            );
            
            if (projectsToCheck.length > 0) {
              // Check for explicit grants
              const projectIdsToCheck = projectsToCheck.map((p: any) => p.id);
              const { data: grants } = await supabase
                .from('project_access_grants')
                .select('project_id')
                .eq('granted_to_user_id', userId)
                .in('project_id', projectIdsToCheck);
              
              const grantedProjectIds = new Set((grants || []).map((g: any) => g.project_id));
              
              // Remove architect-owned projects unless user has explicit grant
              const filteredProjects = allProjects.filter((p: any) => {
                if (p.owner_id && architectOwnerIds.has(p.owner_id)) {
                  // Keep only if user has explicit grant
                  return grantedProjectIds.has(p.id);
                }
                return true;
              });
              
              logger.info('[useClientAccessibleProjects] Filtered out architect-owned projects for admin', {
                beforeFilter: allProjects.length,
                afterFilter: filteredProjects.length,
                architectOwnedProjects: projectsToCheck.length,
                explicitGrants: grants?.length || 0
              });
              
              return filteredProjects;
            }
          }
        }

        return (allProjects as any[]) || [];
      }

      // Get all projects where user is a team member with client portal access
      const { data: teamMembers, error: teamError } = await supabase
        .from('project_team_members')
        .select(`
          project_id,
          projects (
            *
          )
        `)
        .eq('user_id', userId)
        .in('role', ['client', 'owner', 'project_manager', 'manager']);

      if (teamError) {
        logger.error('[useClientAccessibleProjects] Failed to fetch team member projects', {
          userId,
          error: teamError.message,
          code: teamError.code
        });
      }

      const teamProjects = teamMembers
        ?.map(tm => tm.projects)
        .filter(Boolean) || [];

      // Also check for projects where the user is directly the client
      const { data: clientProjects, error: clientError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', userId)
        .neq('status', 'cancelled'); // Don't show cancelled projects

      if (clientError) {
        logger.error('[useClientAccessibleProjects] Failed to fetch client projects', {
          userId,
          error: clientError.message,
          code: clientError.code
        });
      }

      // Also check for projects where the user has explicit access via client_project_access
      const { data: explicitAccess, error: explicitError } = await supabase
        .from('client_project_access')
        .select(`
          project_id,
          projects (
            *
          )
        `)
        .eq('user_id', userId);

      if (explicitError) {
        logger.error('[useClientAccessibleProjects] Failed to fetch explicit access projects', {
          userId,
          error: explicitError.message,
          code: explicitError.code
        });
      }

      // Prioritize client-owned projects over team member projects
      // For client portal users, their own projects should be primary
      const allProjects: any[] = [];

      // First, add direct client projects (these take priority)
      if (clientProjects) {
        clientProjects.forEach(clientProj => {
          allProjects.push(clientProj);
        });
      }

      // Then add explicit access projects
      if (explicitAccess) {
        explicitAccess.forEach(ea => {
          const project = ea.projects as any;
          if (project && !allProjects.find(p => p.id === project.id)) {
            allProjects.push(project);
          }
        });
      }

      // Then add team member projects (but avoid duplicates)
      if (teamProjects) {
        teamProjects.forEach(teamProj => {
          if (!allProjects.find(p => p.id === teamProj.id)) {
            allProjects.push(teamProj);
          }
        });
      }

      const projects = allProjects;

      logger.info('[useClientAccessibleProjects] Successfully fetched projects', {
        userId,
        projectCount: projects.length,
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      });

      return projects;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
