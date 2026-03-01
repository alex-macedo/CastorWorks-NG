import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/DateInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CameraCapture } from "@/components/Photos/CameraCapture";
import { resolveStorageUrl } from '@/utils/storage';
import { format } from "date-fns";
import { Save, List, Plus } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { cn } from "@/lib/utils";
import { offlineStorage } from "@/lib/offlineStorage";
import { SyncStatusBar } from "@/components/supervisor/SyncStatusBar";
import { OfflineQueueIndicator } from "@/components/supervisor/OfflineQueueIndicator";
import { useFormAutoSave } from "@/hooks/useFormAutoSave";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { DailyLogTimeline } from "@/components/supervisor/DailyLogTimeline";

interface PhotoData {
  url: string;
  caption?: string;
  preview?: string;
}

export default function SupervisorActivityLog() {
  const { toast } = useToast();
  const { t } = useLocalization();
  useRouteTranslations();
  const { selectedProject } = useSupervisorProject();

  const [activityDate, setActivityDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weatherConditions, setWeatherConditions] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Auto-save form data
  const { clearFormData } = useFormAutoSave({
    formKey: 'supervisor-activity-log',
    formData: {
      activityDate,
      weatherConditions,
      crewCount,
      notes,
      photos,
    },
    onRestore: (data) => {
      setActivityDate(data.activityDate || format(new Date(), "yyyy-MM-dd"));
      setWeatherConditions(data.weatherConditions || '');
      setCrewCount(data.crewCount || '');
      setNotes(data.notes || '');
      setPhotos(data.photos || []);
    },
  });


  const handlePhotoCapture = async (file: File) => {
    if (!selectedProject) {
      toast({
        title: t("common.error.somethingWentWrong"),
        description: t("supervisor.selectProjectRequired"),
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: t("common.error.somethingWentWrong"),
        description: t("common.error.unexpectedError"),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `site-activity/${selectedProject}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('project-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store canonical storage path in-memory and generate preview signed URL for UI only
      const storagePath = fileName;
      const previewUrl = await resolveStorageUrl(storagePath, 60 * 60 * 24 * 365);
      setPhotos([...photos, { url: storagePath, caption: '', preview: previewUrl }]);
      toast({
        title: t("common.success"),
        description: t("common.photoAdded"),
      });
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      const errorMessage = error?.message || t("common.photoUploadError");
      toast({
        title: t("common.error.somethingWentWrong"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Ensure any photos without a preview get a resolved signed URL for UI display
  useEffect(() => {
    let cancelled = false;
    const populatePreviews = async () => {
      if (!photos || photos.length === 0) return;
      const needs = photos.some((p) => !(p as any).preview);
      if (!needs) return;

      const updated = await Promise.all(
        photos.map(async (p) => {
          if ((p as any).preview) return p;
          try {
            const preview = await resolveStorageUrl(p.url, 60 * 60 * 24);
            return { ...p, preview } as PhotoData;
          } catch (e) {
            return p;
          }
        })
      );

      if (!cancelled) setPhotos(updated);
    };

    populatePreviews();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const handleSubmit = async () => {
    if (!selectedProject) {
      toast({
        title: t("supervisor.error"),
        description: t("supervisor.selectProjectRequired"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const activityData = {
        project_id: selectedProject,
        activity_date: activityDate,
        weather_conditions: weatherConditions,
        crew_count: crewCount ? parseInt(crewCount) : 0,
        notes: notes,
        photos: JSON.parse(JSON.stringify(photos)),
      };

      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from("site_activity_logs").insert([{
          ...activityData,
          supervisor_id: user.id,
        }]);

        if (error) throw error;

        toast({
          title: t("supervisor.success"),
          description: t("supervisor.activityLogSaved"),
        });
      } else {
        await offlineStorage.addToQueue('activity_log', activityData);
        
        toast({
          title: t("common.success"),
          description: t("supervisor.activityLog.savedOffline"),
        });
      }

      // Reset form and clear auto-save
      setActivityDate(format(new Date(), "yyyy-MM-dd"));
      setWeatherConditions("");
      setCrewCount("");
      setNotes("");
      setPhotos([]);
      clearFormData(); // Clear saved form data after successful submission
    } catch (error) {
      console.error("Error saving activity log:", error);
      toast({
        title: t("supervisor.error"),
        description: t("supervisor.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={async () => {}} disabled={false}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={() => {}}
            refreshing={false}
          />
        
        <div className="p-4 space-y-6">
          <OfflineQueueIndicator />
          
          <Tabs defaultValue="timeline" variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                {t("supervisor.timelineView", "Timeline View")}
              </TabsTrigger>
              <TabsTrigger value="form" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t("supervisor.newEntry", "New Entry")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              {selectedProject ? (
                <DailyLogTimeline
                  projectId={selectedProject}
                  selectedDate={activityDate}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {t("supervisor.selectProjectRequired")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="form" className="mt-4">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl">{t("supervisor.logDailyActivity")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base font-semibold">{t("supervisor.date")}</Label>
                <DateInput
                  value={activityDate}
                  onChange={setActivityDate}
                  placeholder={t('common.selectDate')}
                  className="h-14 text-base"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">{t("supervisor.weatherConditions")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "sunny", label: t("supervisor.sunny"), icon: "☀️" },
                    { value: "cloudy", label: t("supervisor.cloudy"), icon: "☁️" },
                    { value: "rainy", label: t("supervisor.rainy"), icon: "🌧️" },
                    { value: "stormy", label: t("supervisor.stormy"), icon: "⛈️" },
                  ].map(({ value, label, icon }) => (
                    <Button
                      key={value}
                      type="button"
                      variant={weatherConditions === value ? "default" : "outline"}
                      onClick={() => setWeatherConditions(value)}
                      className="h-16 flex flex-col gap-1 text-base"
                    >
                      <span className="text-2xl">{icon}</span>
                      <span>{label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crew" className="text-base font-semibold">{t("supervisor.crewCount")}</Label>
                <Input
                  id="crew"
                  type="number"
                  min="0"
                  value={crewCount}
                  onChange={(e) => setCrewCount(e.target.value)}
                  placeholder={t('supervisor.activityLog.crewCountPlaceholder')}
                  className="h-14 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base font-semibold">{t("supervisor.notes")}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("supervisor.notesPlaceholder")}
                  className="min-h-[120px] text-base"
                />
              </div>

              <Card className="border-2 bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("supervisor.photos")} ({photos.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CameraCapture onCapture={handlePhotoCapture} />
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo.preview || photo.url}
                          alt={t('supervisor.activityLog.photoAltNumbered', { number: index + 1 })}
                          className="w-full h-32 object-cover rounded-lg border-2"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

                  <Button
                    className="w-full h-16 text-base font-semibold"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {submitting ? t("supervisor.saving") : t("supervisor.saveLog")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
