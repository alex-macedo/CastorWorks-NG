/**
 * useClientPortalPageTitle Hook
 *
 * Manages document title and page heading for all client portal pages
 * Ensures consistent "Client Portal Dashboard - Project: {projectName}" pattern across all pages
 */

import { useEffect, useRef } from 'react';
import { useClientPortalAuth } from './useClientPortalAuth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface PageTitleConfig {
  page: 'dashboard' | 'schedule' | 'team' | 'tasks' | 'meetings' | 'payments' | 'financial' | 'photos' | 'communication' | 'chat' | 'inssPlanning' | 'inssStrategy' | 'definitions';
}

export function useClientPortalPageTitle(config: PageTitleConfig) {
  const { t } = useLocalization();
  const { projectId, isAuthenticated } = useClientPortalAuth();
  const hasLoggedMount = useRef(false);

  useEffect(() => {
    if (hasLoggedMount.current) return;
    logger.info('[useClientPortalPageTitle] Hook mounted', {
      page: config.page,
      projectId,
      isAuthenticated,
    });
    hasLoggedMount.current = true;
  }, [config.page, projectId, isAuthenticated]);

  // Fetch project name
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      return data;
    },
    enabled: isAuthenticated && !!projectId,
  });

  useEffect(() => {
    if (project) {
      logger.debug('[useClientPortalPageTitle] Project name resolved', {
        page: config.page,
        projectId,
        projectName: (project as any).name ?? null,
      });
    }
  }, [project, config.page, projectId]);

  // Get page-specific translation key
  const getPageTranslationKey = () => {
    switch (config.page) {
      case 'dashboard':
        return 'clientPortal.dashboard.title';
      case 'schedule':
        return 'clientPortal.schedule.title';
      case 'team':
        return 'clientPortal.team.title';
      case 'tasks':
        return 'clientPortal.tasks.title';
      case 'meetings':
        return 'clientPortal.meetings.title';
      case 'payments':
        return 'clientPortal.payments.title';
      case 'financial':
        return 'clientPortal.financial.title';
      case 'photos':
        return 'clientPortal.photos.title';
      case 'communication':
        return 'clientPortal.communication.title';
      case 'chat':
        return 'clientPortal.chat.conversations';
      case 'inssPlanning':
        return 'clientPortal.navigation.inssPlanning';
      case 'inssStrategy':
        return 'clientPortal.navigation.inssStrategy';
      case 'definitions':
        return 'clientPortal.definitions.title';
      default:
        return 'clientPortal.portal.subtitle';
    }
  };

  const projectName = (project as any)?.name || 'Project';
  const translationKey = getPageTranslationKey();
  const pageTitle = t(translationKey, { projectName });

  // Set document title (browser tab)
  useEffect(() => {
    if (pageTitle) {
      document.title = pageTitle;
    }

    // Cleanup: Reset to app default on unmount
    return () => {
      document.title = 'CastorWorks';
    };
  }, [pageTitle]);

  return {
    pageTitle,
    projectName,
  };
}
