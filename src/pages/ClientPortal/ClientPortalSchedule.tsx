import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProjectPhases from "@/pages/ProjectPhases";

import { ClientPortalPageHeader } from '@/components/ClientPortal/Layout/ClientPortalPageHeader';

export default function ClientPortalSchedule() {
  const { pageTitle } = useClientPortalPageTitle({ page: 'schedule' });
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();

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

  if (!projectId) {
    return <div>{t("clientPortal.portal.loadingProjects")}</div>;
  }

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.schedule.title", { projectName: project?.name || t("clientPortal.dashboard.loading") })}
        subtitle={t("clientPortal.portal.sections.schedule.description")}
      />
      <div>
        <ProjectPhases projectId={projectId} isWidget={true} />
      </div>
    </div>
  );
}
