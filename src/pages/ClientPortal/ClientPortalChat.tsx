import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { ChatInterface } from '@/components/ClientPortal/Chat/ChatInterface';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';

import { ClientPortalPageHeader } from '@/components/ClientPortal/Layout/ClientPortalPageHeader';

export default function ClientPortalChat() {
  const { pageTitle } = useClientPortalPageTitle({ page: 'chat' });
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

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.chat.title", { projectName: projName, name: projName })}
        subtitle={t("clientPortal.chat.subtitle")}
      />
      <div className="h-[calc(90vh-12rem)]">
        <ChatInterface />
      </div>
    </div>
  );
}
