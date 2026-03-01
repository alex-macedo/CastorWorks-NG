import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { toast } from "@/lib/toast-helpers";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { EmptyState } from "@/components/supervisor/EmptyState";
import { PhotoAIAnalysisPanel } from "@/components/Photos/PhotoAIAnalysisPanel";
import { Camera, Loader2 } from "lucide-react";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { PhotoGallery } from "@/components/Photos/PhotoGallery";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { useQueryClient } from "@tanstack/react-query";
import { CameraCapture } from "@/components/Photos/CameraCapture";

export default function SupervisorPhotoGallery() {
  const { t } = useLocalization();
  useRouteTranslations();
  const { selectedProject } = useSupervisorProject();
  const { photos, isLoading } = useProjectPhotos(selectedProject || "");
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    if (!selectedProject) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["project-photos", selectedProject] });
    setRefreshing(false);
    toast.success(t("supervisor.refreshed"));
  };

  const handleCameraCapture = async (file: File) => {
    if (!file || !selectedProject) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name?.split(".").pop() || "jpg";
      const filePath = `${selectedProject}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(filePath, file, { cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase
        .from("project_photos")
        .insert({
          project_id: selectedProject,
          file_path: filePath,
          category: "field_capture",
          caption: null,
          uploaded_by: user?.id || null,
        });

      if (dbError) throw dbError;

      toast.success(t("supervisor.photoUploadSuccess") || "Photo uploaded successfully");
      await queryClient.invalidateQueries({ queryKey: ["project-photos", selectedProject] });
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(
        t("supervisor.photoUploadError") || "Failed to upload photo",
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const content = !selectedProject ? (
    <EmptyState
      icon={Camera}
      title={t("supervisor.selectProjectRequired")}
      description={t("supervisor.selectProjectRequired")}
      iconClassName="text-primary"
    />
  ) : isLoading ? (
    <div className="space-y-4">
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
    </div>
  ) : photos.length === 0 ? (
    <EmptyState
      icon={Camera}
      title={t("supervisor.noPhotosYet")}
      description={t("supervisor.noPhotosDescription")}
      iconClassName="text-primary"
    />
  ) : (
    <div className="rounded-xl border bg-card p-2">
      <PhotoGallery
        photos={photos as any}
        projectId={selectedProject}
        canEdit={false}
        onPhotoDeleted={() =>
          queryClient.invalidateQueries({ queryKey: ["project-photos", selectedProject] })
        }
      />
    </div>
  );

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing || !selectedProject}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">{t("supervisor.photoGallery")}</h2>
              </div>
              {selectedProject && (
                <div className="flex items-center">
                  {uploadingPhoto ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg border">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">
                        {t("supervisor.uploadingPhoto") || "Uploading photo..."}
                      </span>
                    </div>
                  ) : (
                    <CameraCapture
                      onCapture={handleCameraCapture}
                      disabled={uploadingPhoto}
                      label={t("supervisor.takePhoto") || "Take Picture"}
                    />
                  )}
                </div>
              )}
            </div>

            <PhotoAIAnalysisPanel />
            {content}
          </div>
        </div>
      </PullToRefresh>

      <MobileBottomNav />
    </>
  );
}
