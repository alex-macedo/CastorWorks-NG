import { useEffect, useRef, useState } from 'react';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Calendar as CalendarIcon, Users } from 'lucide-react';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UpcomingScheduleCard } from './UpcomingScheduleCard';
import { KeyTeamContactsCard } from './KeyTeamContactsCard';
import { MyTasksCard } from './MyTasksCard';
import { UpcomingMeetingsCard } from './UpcomingMeetingsCard';
import { RecentPaymentsCard } from './RecentPaymentsCard';
import { FinancialSummaryCard } from './FinancialSummaryCard';
import { PicturesLibraryCard } from './PicturesLibraryCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { resolveStorageUrl } from '@/utils/storage';

import { Button } from '@/components/ui/button';
import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

export function DashboardOverview({ showHeader = true }: { showHeader?: boolean }) {
  const auth = useClientPortalAuth();
  const { projectId, userName, role, avatarUrl } = auth;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const clientId = searchParams.get('clientId');
  const today = new Date();
  const { formatLongDate } = useDateFormat();
  const { t } = useLocalization();
  useClientPortalPageTitle({ page: 'dashboard' });
  const hasLoggedRender = useRef(false);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (avatarUrl) {
      resolveStorageUrl(avatarUrl).then(url => {
        if (url) setResolvedAvatar(url);
      });
    } else {
      setResolvedAvatar(null);
    }
  }, [avatarUrl]);

  // Dev-only debug UI toggle
  const [showAuthDebug, setShowAuthDebug] = useState(false);

  useEffect(() => {
    if (hasLoggedRender.current) {
      return;
    }
    logger.info('[ClientPortalDashboard] Rendering dashboard overview', {
      projectId,
      clientId,
      hasUserName: !!userName,
      role,
    });
    hasLoggedRender.current = true;
  }, [projectId, clientId, userName, role]);

  useEffect(() => {
    logger.debug('[ClientPortalDashboard] Dashboard query params resolved', { clientId });
  }, [clientId]);

  // Fetch project name
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      logger.debug('[ClientPortalDashboard] Fetching project name', { projectId });
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      
      if (error) {
        logger.error('[ClientPortalDashboard] Failed to load project name', {
          projectId,
          error,
        });
        return null;
      }
      return data;
    },
    enabled: !!projectId,
  });

  // Helper to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { period: 'morning', emoji: '☀️', message: t('clientPortal.dashboard.greetings.morning') };
    } else if (hour >= 12 && hour < 18) {
      return { period: 'afternoon', emoji: '☀️', message: t('clientPortal.dashboard.greetings.afternoon') };
    } else if (hour >= 18 && hour < 22) {
      return { period: 'evening', emoji: '🐝', message: t('clientPortal.dashboard.greetings.evening') };
    } else {
      return { period: 'night', emoji: '🌙', message: t('clientPortal.dashboard.greetings.night') };
    }
  };

  const greeting = getTimeBasedGreeting();

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      {showHeader && (
        <ClientPortalPageHeader
          title={t("clientPortal.dashboard.title", { defaultValue: "Dashboard" })}
          subtitle={
            (userName 
              ? t('clientPortal.dashboard.greeting', { name: userName }) 
              : t('clientPortal.dashboard.welcomeDefault')
            ) + " " + greeting.message + " " + greeting.emoji
          }
          actions={
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center text-muted-foreground bg-primary-dark/20 text-white border-primary-light/30 backdrop-blur-sm px-4 py-1.5 rounded-full border shadow-sm">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary-light" />
                <span className="text-sm font-bold tracking-tight">{formatLongDate(today)}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-primary-dark/20 text-white border-primary-light/30 hover:bg-primary-dark/40 backdrop-blur-sm h-10 px-6 rounded-full font-bold shadow-sm transition-all"
                onClick={() => navigate('/portal')}
              >
                <Users className="mr-2 h-4 w-4 text-primary-light" />
                {t('clientPortal.portal.switchProject') || 'Switch Project'}
              </Button>
            </div>
          }
        />
      )}

      
      {showAuthDebug && (
        <pre
          className="max-w-xs overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-800 border mb-4"
          aria-live="polite"
        >
          {JSON.stringify(auth, null, 2)}
        </pre>
      )}

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Row 1 */}
        <UpcomingScheduleCard clientId={clientId} />
        <KeyTeamContactsCard />
        <MyTasksCard clientId={clientId} />

        {/* Row 2 */}
        <UpcomingMeetingsCard clientId={clientId} />
        <RecentPaymentsCard clientId={clientId} />
        <FinancialSummaryCard clientId={clientId} />
      </div>

      {/* Row 3 - Full Width */}
      <div className="w-full">
        <PicturesLibraryCard clientId={clientId} />
      </div>
    </div>
  );
}
