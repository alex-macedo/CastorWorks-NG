/**
 * useClientPortalAuth Hook
 * 
 * Manages Client Portal authentication and token validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  validateClientPortalToken,
  storeClientPortalToken,
  getStoredClientPortalToken,
  clearClientPortalToken,
} from '@/lib/clientPortalAuth';
import { logger } from '@/lib/logger';
import type { ClientPortalAuthContext } from '@/types/clientPortal';

export function useClientPortalAuth() {
  // URL parameter can be id or projectId
  const { id, projectId } = useParams<{ id?: string, projectId?: string }>();
  const effectiveProjectId = id || projectId;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Only validate client portal auth for portal routes
  const isPortalRoute = location.pathname.startsWith('/portal');

  // Validate access using effectiveProjectId
  const {
    data: authContext,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clientPortalAuth', effectiveProjectId, isPortalRoute],
    queryFn: async () => {
      if (!effectiveProjectId) return null;

      // Only validate for portal routes
      if (!isPortalRoute) {
        logger.debug('[useClientPortalAuth] Skipping validation - not a portal route', { 
          pathname: location.pathname,
          effectiveProjectId 
        });
        return null;
      }

      // Always lookup by effectiveProjectId
      logger.debug('[useClientPortalAuth] Validating client portal token', { effectiveProjectId });
      const context = await validateClientPortalToken(effectiveProjectId);

      if (context) {
        storeClientPortalToken(effectiveProjectId);
      } else {
        clearClientPortalToken();
      }

      return context;
    },
    enabled: !!effectiveProjectId && isPortalRoute,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  useEffect(() => {
    if (authContext) {
      logger.info('[useClientPortalAuth] Client portal auth result', {
        projectId: effectiveProjectId,
        isValid: authContext.isValid,
        role: authContext.role,
        clientId: authContext.clientId,
        userName: authContext.userName,
        avatarUrl: authContext.avatarUrl,
      });
    }
  }, [authContext, effectiveProjectId]);

  useEffect(() => {
    if (error) {
      logger.error('[useClientPortalAuth] Client portal auth validation failed', {
        projectId: effectiveProjectId,
        error,
      });
    }
  }, [error, effectiveProjectId]);

  useEffect(() => {
    logger.debug('[useClientPortalAuth] Auth state update', {
      projectId: effectiveProjectId,
      isLoading,
      isAuthenticated: !!authContext?.isValid,
      hasAuthContext: !!authContext,
      userName: authContext?.userName,
      avatarUrl: authContext?.avatarUrl,
      hasError: !!error,
    });
  }, [effectiveProjectId, isLoading, authContext, error]);

  // Output authContext to browser console for quick runtime inspection
  useEffect(() => {
    try {
      console.debug('[useClientPortalAuth] authContext', authContext);
    } catch (e) {
      // ignore
    }
  }, [authContext]);

  // Redirect based on error type - only for portal routes
  useEffect(() => {
    // Only redirect if this is actually a portal route
    if (!isPortalRoute) {
      return;
    }

    if (!isLoading && !authContext && effectiveProjectId) {
      // Check if this is a session expiry error vs access denied error
      const isSessionExpired = error && (error as any)?.cause?.isSessionExpired === true;

      if (isSessionExpired) {
        // Session expired - redirect to login
        logger.warn('[useClientPortalAuth] Session expired, redirecting to login', { projectId: effectiveProjectId });
        navigate('/login', { replace: true });
      } else {
        // No auth context means access denied - show error page
        logger.warn('[useClientPortalAuth] Access denied or error, showing error page', {
          projectId: effectiveProjectId,
          error,
        });
        navigate('/portal-error', { replace: true, state: { projectId: effectiveProjectId } });
      }
    }
  }, [isLoading, authContext, effectiveProjectId, navigate, error, isPortalRoute]);

  return {
    authContext,
    isLoading,
    isAuthenticated: !!authContext?.isValid,
    error,
    projectId: authContext?.projectId || effectiveProjectId, // Always return projectId from context or params
    clientId: authContext?.clientId,
    token: authContext?.token,
    expiresAt: authContext?.expiresAt,
    userName: authContext?.userName,
    userEmail: authContext?.userEmail,
    role: authContext?.role,
    avatarUrl: authContext?.avatarUrl,
    canViewDocuments: authContext?.canViewDocuments,
    canViewFinancials: authContext?.canViewFinancials,
    canDownloadReports: authContext?.canDownloadReports,
    refetch,
  };
}

/**
 * Hook to check if user has access to client portal
 */
export function useHasClientPortalAccess() {
  const { authContext, isLoading } = useClientPortalAuth();

  return {
    hasAccess: !!authContext?.isValid,
    isLoading,
  };
}

/**
 * Hook to get stored token from session
 */
export function useStoredClientPortalToken() {
  return getStoredClientPortalToken();
}
