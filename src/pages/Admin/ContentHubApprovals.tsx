import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useContentHub } from "@/hooks/useContentHub";
import { useContentApproval } from "@/hooks/useContentApproval";
import { ContentCard } from "@/components/ContentHub/ContentCard";
import { Button } from "@/components/ui/button";
import { CheckCircle, Archive, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ContentHubApprovals() {
  const { t } = useLocalization();
  const { data: pendingContent, isLoading, refetch } = useContentHub({ status: "pending_approval" });
  const { approveContent, archiveContent, restoreContent } = useContentApproval();

  const handleApprove = useCallback(async (id: string) => {
    try {
      await approveContent.mutateAsync(id);
      toast.success(t("contentHub.success.approved"));
      refetch();
    } catch (err) {
      console.error("Error approving content:", err);
      toast.error(t("contentHub.errors.approveFailed"));
    }
  }, [approveContent, refetch, t]);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveContent.mutateAsync(id);
      toast.success(t("contentHub.success.archived"));
      refetch();
    } catch (err) {
      console.error("Error archiving content:", err);
      toast.error(t("contentHub.errors.archiveFailed"));
    }
  }, [archiveContent, refetch, t]);

  const handleRestore = useCallback(async (id: string) => {
    try {
      await restoreContent.mutateAsync(id);
      toast.success(t("contentHub.success.restored"));
      refetch();
    } catch (err) {
      console.error("Error restoring content:", err);
      toast.error(t("contentHub.errors.restoreFailed"));
    }
  }, [restoreContent, refetch, t]);

  if (isLoading) {
    return (
      <SidebarHeaderShell>
<div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">{t("contentHub.pendingApprovals")}</h1>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
</SidebarHeaderShell>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("contentHub.pendingApprovals")}</h1>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t("common.refresh")}
        </Button>
      </div>

      {pendingContent && pendingContent.length > 0 ? (
        <div className="grid gap-4">
          {pendingContent.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 bg-card">
              <ContentCard
                content={item}
                onView={(c) => window.location.href = `/content/${c.slug}`}
                onEdit={(c) => navigate(`/admin/content-hub/${c.id}/edit`)}
              />

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  size="sm"
                  onClick={() => handleApprove(item.id)}
                  disabled={approveContent.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("contentHub.actions.approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArchive(item.id)}
                  disabled={archiveContent.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {t("contentHub.actions.archive")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t("contentHub.noPendingApprovals")}</p>
        </div>
      )}
    </div>
  );
}
