import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useContentHub } from "@/hooks/useContentHub";
import { supabase } from "@/integrations/supabase/client";
import { ContentEditor, type ContentEditorValues } from "@/components/ContentHub/ContentEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ContentHubCreate() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { createContent } = useContentHub();

  const handleSubmit = useCallback(async (values: ContentEditorValues) => {
    try {
      // Get current user for author_id
      const { data: authData } = await supabase.auth.getUser();
      const authorId = authData.data.user?.id;

      if (!authorId) {
        toast.error(t("contentHub.errors.userNotFound"));
        return;
      }

      await createContent.mutateAsync({
        ...values,
        author_id: authorId,
        status: "draft",
      });

      // Success is handled by the toast in the hook

      toast.success(t("contentHub.success.savedAsDraft"));
      navigate("/admin/content-hub/list");
    } catch (err) {
      console.error("Error creating content:", err);
      toast.error(t("contentHub.errors.createFailed"));
    }
  }, [createContent, navigate, t]);

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <SidebarHeaderShell>
<div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/content-hub/list")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("contentHub.createNew")}</h1>
      </div>
</SidebarHeaderShell>

      <ContentEditor
        onSubmit={handleSubmit}
        isSubmitting={createContent.isPending}
        allowStatusChange={true}
      />
    </div>
  );
}
