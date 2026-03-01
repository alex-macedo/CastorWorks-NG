import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useContentHub, useContentHubItem } from "@/hooks/useContentHub";
import { ContentEditor, type ContentEditorValues } from "@/components/ContentHub/ContentEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ContentHubEdit() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { updateContent } = useContentHub();
  const { data: content, isLoading } = useContentHubItem(id);

  const handleSubmit = useCallback(async (values: ContentEditorValues) => {
    if (!id) return;

    try {
      await updateContent.mutateAsync({
        id,
        updates: values,
      });

      toast.success(t("contentHub.success.updated"));
      navigate("/admin/content-hub/list");
    } catch (err) {
      console.error("Error updating content:", err);
      toast.error(t("contentHub.errors.updateFailed"));
    }
  }, [id, updateContent, navigate, t]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <SidebarHeaderShell>
<div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/content-hub/list")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t("contentHub.edit")}</h1>
        </div>
</SidebarHeaderShell>
        <p className="text-muted-foreground">{t("contentHub.errors.notFound")}</p>
      </div>
    );
  }

  const initialValues = {
    title: content.title,
    slug: content.slug,
    content: content.content,
    type: content.type,
    status: content.status,
    visibility: content.visibility,
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/content-hub/list")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("contentHub.edit")}</h1>
      </div>

      <ContentEditor
        initialValues={initialValues}
        onSubmit={handleSubmit}
        isSubmitting={updateContent.isPending}
        allowStatusChange={true}
      />
    </div>
  );
}
