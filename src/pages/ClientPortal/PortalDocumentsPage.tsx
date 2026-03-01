import { useParams } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { DocumentsPage } from "@/components/Documents/DocumentsPage";
import { ClientPortalPageHeader } from "@/components/ClientPortal/Layout/ClientPortalPageHeader";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function PortalDocumentsPage() {
  const { t } = useLocalization();
  const { id, projectId } = useParams<{ id?: string, projectId?: string }>();
  const effectiveId = id || projectId;

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', effectiveId],
    queryFn: async () => {
      if (!effectiveId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', effectiveId)
        .single();
      return data;
    },
    enabled: !!effectiveId,
  });

  const projName = project?.name || t("clientPortal.dashboard.loading");

  const header = (
    <ClientPortalPageHeader
      title={t("clientPortal.documents.title", { projectName: projName, name: projName })}
      subtitle={t("clientPortal.documents.subtitle")}
    />
  );

  return (
    <DocumentsPage
      portalId={effectiveId}
      isPortal={true}
      backLink={`/portal/${effectiveId}`}
      backText={t("clientPortal.backToDashboard") || "Back to Dashboard"}
      headerComponent={header}
      showProjectHeader={false}
      showAutoCreateFolders={false} // Clients shouldn't auto-create folders
      showApplyTemplates={false} // Clients shouldn't apply templates
    />
  );
}