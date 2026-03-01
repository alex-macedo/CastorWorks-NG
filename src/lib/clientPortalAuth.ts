/**
 * Client Portal Authentication Utilities
 * 
 * Handles token validation and authentication for the Client Portal.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { ClientPortalToken, ClientPortalAuthContext } from '@/types/clientPortal';

/**
 * Error type for better distinction between session expiry and access denied
 */
export interface AuthError extends Error {
  code?: string;
  isSessionExpired?: boolean;
}

/**
 * Validates client portal access by projectId using role-based access control
 * @param projectId - The project ID
 * @returns Promise<ClientPortalAuthContext | null>
 * @throws AuthError with isSessionExpired flag if session has expired
 */
export async function validateClientPortalToken(
  projectId: string
): Promise<ClientPortalAuthContext | null> {
  try {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    logger.info('[ClientPortalAuth] validateClientPortalToken start', { projectId });

    // Get the current authenticated user
    const userLookupStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const userLookupElapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - userLookupStartedAt;

    logger.info('[ClientPortalAuth] Auth user lookup complete', {
      projectId,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError ? { message: authError.message, status: authError.status } : null,
      elapsedMs: Math.round(userLookupElapsed),
    });

    console.log('[ClientPortalAuth] Auth check:', {
      projectId,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
    });

    if (authError || !user) {
      console.warn('[ClientPortalAuth] User not authenticated');
      // User is not authenticated - this is a session expiry
      const sessionExpiredError = new Error('Session expired or no user found') as AuthError;
      sessionExpiredError.isSessionExpired = true;
      throw sessionExpiredError;
    }

    // First check if user is an admin - admins can access any project
    const adminCheckStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { data: userRoles, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const adminCheckElapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - adminCheckStartedAt;

    const isAdmin = userRoles && userRoles.some(r => r.role === 'admin');

    logger.info('[ClientPortalAuth] Admin role check complete', {
      projectId,
      userId: user.id,
      userRoles: userRoles?.map(r => r.role),
      isAdmin,
      adminError: adminError ? { message: adminError.message, code: adminError.code } : null,
      elapsedMs: Math.round(adminCheckElapsed),
    });

    if (isAdmin) {
      // User is an admin - grant access with admin role
      logger.info('[ClientPortalAuth] Admin access granted', {
        projectId,
        userId: user.id,
        role: 'admin',
      });

    console.log('[ClientPortalAuth] Admin access granted for project:', {
      projectId,
      userId: user.id,
      role: 'admin',
      userEmail: user.email,
    });

      // Prefer names in user metadata (e.g., OAuth / provider data)
      const metadataFirst = (user?.user_metadata as any)?.first_name;
      const metadataLast = (user?.user_metadata as any)?.last_name;
      const metadataFull = (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name;

      if (metadataFirst || metadataLast || metadataFull) {
        const displayName = metadataFull
          ? String(metadataFull).trim()
          : `${String(metadataFirst || '').trim()} ${String(metadataLast || '').trim()}`.trim();

        const metadataAvatar = (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture || null;

        return {
          token: null,
          projectId: projectId,
          clientId: user.id,
          isValid: true,
          expiresAt: null,
          role: 'admin',
          userName: displayName || (user.email ?? 'Admin'),
          userEmail: user.email ?? '',
          avatarUrl: metadataAvatar,
          canViewDocuments: true,
          canViewFinancials: true,
          canDownloadReports: true,
        };
      }

      // Try to enrich display name and avatar from user_profiles when metadata isn't present
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        const displayName = profile?.display_name || user.email || 'Admin';

        const profileAvatar = profile?.avatar_url || null;

        return {
          token: null, // No longer using tokens
          projectId: projectId,
          clientId: user.id,
          isValid: true,
          expiresAt: null, // Role-based access doesn't expire
          role: 'admin',
          userName: displayName,
          userEmail: user.email || '',
          avatarUrl: profileAvatar,
          canViewDocuments: true,
          canViewFinancials: true,
          canDownloadReports: true,
        };
      } catch (err) {
        // If profile lookup fails, fall back to previous behavior
        logger.warn('[ClientPortalAuth] Failed to enrich admin profile, falling back to email', { projectId, userId: user.id, error: err });
        return {
          token: null, // No longer using tokens
          projectId: projectId,
          clientId: user.id,
          isValid: true,
          expiresAt: null, // Role-based access doesn't expire
          role: 'admin',
          userName: user.email || 'Admin', // Fallback to email
          userEmail: user.email || '',
          canViewDocuments: true,
          canViewFinancials: true,
          canDownloadReports: true,
        };
      }
    }

    // For non-admin users, check if they are a team member of this project
    const membershipLookupStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { data: teamMember, error: teamError } = await supabase
      .from('project_team_members')
      .select('id, project_id, user_id, role, user_name, email, avatar_url')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();
    const membershipLookupElapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - membershipLookupStartedAt;

    logger.info('[ClientPortalAuth] Team membership lookup complete', {
      projectId,
      userId: user.id,
      hasTeamMember: !!teamMember,
      teamError: teamError ? { message: teamError.message, code: teamError.code } : null,
      elapsedMs: Math.round(membershipLookupElapsed),
    });

    if (teamError) {
      console.error('[ClientPortalAuth] Error looking up team membership:', { projectId, userId: user.id, error: teamError });
      return null;
    }

    if (!teamMember) {
      logger.info('[ClientPortalAuth] User not a team member, checking client_project_access', { projectId, userId: user.id });
      
      const { data: legacyAccess, error: legacyError } = await supabase
        .from('client_project_access')
        .select('id, project_id, user_id, can_view_documents, can_view_financials, can_download_reports')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (legacyError) {
        logger.error('[ClientPortalAuth] Error looking up client_project_access:', { projectId, userId: user.id, error: legacyError });
        return null;
      }

      if (!legacyAccess) {
        console.warn('[ClientPortalAuth] User not a team member or invited client of project:', { projectId, userId: user.id });
        return null;
      }

      // User has access via client_project_access
      const access = legacyAccess as any;
      
      // Try to fetch profile for display name
      let displayName = user.email || 'Client';
      let avatarUrl = null;
      
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile) {
          if (profile.display_name?.trim()) displayName = profile.display_name.trim();
          if (profile.avatar_url) avatarUrl = profile.avatar_url;
        }
      } catch (profileErr) {
        logger.warn('[ClientPortalAuth] Failed to fetch user_profiles for client display name', { projectId, userId: user.id, error: profileErr });
      }

      return {
        token: null,
        projectId: access.project_id,
        clientId: user.id,
        isValid: true,
        expiresAt: null,
        role: 'client',
        userName: displayName,
        userEmail: user.email || '',
        avatarUrl: avatarUrl,
        canViewDocuments: access.can_view_documents,
        canViewFinancials: access.can_view_financials,
        canDownloadReports: access.can_download_reports,
      };
    }

    // Cast to unknown first to avoid type overlap issues, then to the expected type
    // This is necessary because the Supabase client types might be out of sync or inferring incorrectly
    const member = teamMember as any;

    // Check if user has a role that grants client portal access
    // Roles that can access client portal: 'client', 'owner', 'project_manager', 'manager', 'admin'
    const allowedRoles = ['client', 'owner', 'project_manager', 'manager', 'admin'];
    if (!allowedRoles.includes(member.role.toLowerCase())) {
      logger.warn('[ClientPortalAuth] Role not authorized for portal', {
        projectId,
        userId: user.id,
        role: member.role,
      });
      console.warn('[ClientPortalAuth] User role not authorized for client portal:', {
        projectId,
        userId: user.id,
        role: member.role
      });
      return null;
    }

    // If display name / avatar_url is missing in team_member, try to fetch from user_profiles
    let avatarUrl = member.avatar_url;
    let displayName = member.user_name || member.email || '';
    if (user.id) {
       try {
         const { data: profile } = await supabase
           .from('user_profiles')
           .select('display_name, avatar_url')
           .eq('user_id', user.id)
           .maybeSingle();

         if (profile) {
           // Prefer display name when available
           if (profile.display_name?.trim()) displayName = profile.display_name.trim();

           if (profile.avatar_url) {
             avatarUrl = profile.avatar_url;
           }
         }
       } catch (profileErr) {
         logger.warn('[ClientPortalAuth] Failed to fetch user_profiles for display name/avatar', { projectId, userId: user.id, error: profileErr });
       }
    }

    const totalElapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt;
    logger.info('[ClientPortalAuth] Access granted', {
      projectId,
      userId: user.id,
      role: member.role,
      elapsedMs: Math.round(totalElapsed),
    });

    console.log('[ClientPortalAuth] Access granted for project:', {
      projectId,
      userId: user.id,
      role: member.role
    });

    return {
      token: null, // No longer using tokens
      projectId: member.project_id,
      clientId: user.id,
      isValid: true,
      expiresAt: null, // Role-based access doesn't expire
      role: member.role,
      userName: displayName,
      userEmail: member.email,
      avatarUrl: avatarUrl,
      canViewDocuments: true, // Team members generally have access, or we could refine this later
      canViewFinancials: ['owner', 'admin', 'project_manager'].includes(member.role.toLowerCase()),
      canDownloadReports: true,
    };
  } catch (error) {
    // Re-throw session expiry errors so they can be handled by the hook
    if ((error as AuthError)?.isSessionExpired) {
      logger.warn('[ClientPortalAuth] Session expired during validation', { projectId });
      throw error;
    }

    console.error('[ClientPortalAuth] Unexpected error validating project access:', {
      projectId,
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    logger.error('[ClientPortalAuth] Unexpected error validating project access', {
      projectId,
      error,
    });
    return null;
  }
}


/**
 * Stores projectId in session storage for client portal access
 * @param projectId - The project ID
 */
export function storeClientPortalToken(projectId: string): void {
  sessionStorage.setItem('client_portal_project_id', projectId);
}

/**
 * Retrieves projectId from session storage
 * @returns string | null - The stored project ID
 */
export function getStoredClientPortalToken(): string | null {
  return sessionStorage.getItem('client_portal_project_id');
}

/**
 * Removes projectId from session storage
 */
export function clearClientPortalToken(): void {
  sessionStorage.removeItem('client_portal_project_id');
}
