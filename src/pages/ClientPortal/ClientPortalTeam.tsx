import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { TeamGrid } from '@/components/ClientPortal/Team/TeamGrid';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { ClientPortalPageHeader } from '@/components/ClientPortal/Layout/ClientPortalPageHeader';

export default function ClientPortalTeam() {
  const { pageTitle } = useClientPortalPageTitle({ page: 'team' });
  const { t } = useLocalization();
  const { projectId } = useClientPortalAuth();

  // Fetch project name for title display
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
    enabled: !!projectId,
  });

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.team.title", { projectName: project?.name || t("clientPortal.dashboard.loading") })}
        subtitle={t("clientPortal.team.description")}
      />
      <TeamGrid />
    </div>
  );
}
