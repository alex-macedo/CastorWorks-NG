import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useClientProjects } from "@/hooks/useClientProjects";
import { getStoredClientPortalToken } from "@/lib/clientPortalAuth";
import { useLocalization } from "@/contexts/LocalizationContext";
import { NoAccessPage } from "@/components/ClientPortal/NoAccessPage";
import { ProjectSelectionModal } from "@/components/ClientPortal/Dialogs/ProjectSelectionModal";
import { logger } from "@/lib/logger";

export default function ClientPortal() {
  const { data: projects, isLoading, error } = useClientProjects();
  const storedProjectIdFromStorage = getStoredClientPortalToken();
  const navigate = useNavigate();
  const { t } = useLocalization();

  useEffect(() => {
    if (!projects || (projects as any[]).length === 0) return;
    if ((projects as any[]).length === 1) {
      const singleProjectId = (projects as any[])[0].id;
      logger.info("[ClientPortal] Single project found, redirecting", { projectId: singleProjectId });
      navigate(`/portal/${singleProjectId}`, { replace: true });
    }
  }, [projects, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("clientPortal.portal.loadingProjects")}</div>
      </div>
    );
  }

  const projectList = (projects as any[]) ?? [];
  if (error || projectList.length === 0) {
    return (
      <NoAccessPage
        reason="no_projects"
        adminEmail={import.meta.env.VITE_ADMIN_EMAIL}
        supportUrl={import.meta.env.VITE_SUPPORT_URL}
      />
    );
  }

  if (storedProjectIdFromStorage && projectList.some((p) => p.id === storedProjectIdFromStorage)) {
    return <Navigate to={`/portal/${storedProjectIdFromStorage}`} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ProjectSelectionModal isOpen={true} onClose={() => navigate("/")} />
    </div>
  );
}
