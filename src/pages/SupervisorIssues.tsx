import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Calendar, ArrowLeft, ArrowRight, CheckCircle2, Image, Camera, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { CameraCapture } from "@/components/Photos/CameraCapture";
import { offlineStorage } from "@/lib/offlineStorage";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { SyncStatusBar } from "@/components/supervisor/SyncStatusBar";
import { OfflineQueueIndicator } from "@/components/supervisor/OfflineQueueIndicator";
import { EmptyState } from "@/components/supervisor/EmptyState";
import { useFormAutoSave } from "@/hooks/useFormAutoSave";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { Progress } from "@/components/ui/progress";
import { IssueFilters, IssueFilterType, IssueSeverityFilter } from "@/components/supervisor/IssueFilters";
import { BeforeAfterPhotos } from "@/components/supervisor/BeforeAfterPhotos";
import { StatusIndicator } from "@/components/supervisor/StatusIndicator";
import { PhotoGalleryModal } from "@/components/supervisor/PhotoGalleryModal";
import { resolveStorageUrl } from "@/utils/storage";

interface Issue {
  id: string;
  title: string;
  issue_type: string;
  severity: string;
  status: string;
  created_at: string;
  description?: string;
  photos?: any[] | null;
  before_photo?: string | null;
  after_photo?: string | null;
  location?: string | null;
}

export default function SupervisorIssues() {
  const { t } = useLocalization();
  useRouteTranslations();
  const { toast } = useToast();
  const { formatDateTime } = useDateFormat();
  const { selectedProject } = useSupervisorProject();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IssueFilterType>('all');
  const [severityFilter, setSeverityFilter] = useState<IssueSeverityFilter>('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Auto-save form data
  const { clearFormData } = useFormAutoSave({
    formKey: 'supervisor-issues',
    formData: {
      title,
      issueType,
      severity,
      description,
      location,
      photos,
    },
    enabled: isSheetOpen,
    onRestore: (data) => {
      setTitle(data.title || '');
      setIssueType(data.issueType || '');
      setSeverity(data.severity || '');
      setDescription(data.description || '');
      setLocation(data.location || '');
      setPhotos(data.photos || []);
    },
  });

  const fetchIssues = useCallback(async () => {
    if (!selectedProject) {
      setIssues([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_issues")
        .select(`
          id,
          title,
          issue_type,
          severity,
          status,
          created_at,
          description,
          photos,
          location
        `)
        .eq("project_id", selectedProject)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast({
        title: t("common.errorTitle"),
        description: t("supervisor.fetchIssuesFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedProject, toast, t]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handlePhotoCapture = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL (delivery-photos is a private bucket)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('delivery-photos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

      if (urlError) throw urlError;

      setPhotos([...photos, { url: urlData.signedUrl, caption: '' }]);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const isStepComplete = (currentStep: 1 | 2 | 3) => {
    if (currentStep === 1) return Boolean(title && location);
    if (currentStep === 2) return Boolean(issueType && severity);
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !isStepComplete(1)) return;
    if (step === 2 && !isStepComplete(2)) return;
    setStep((prev) => Math.min(3, prev + 1) as 1 | 2 | 3);
  };

  const prevStep = () => setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3);

  const handleSubmit = async () => {
    if (!selectedProject || !title || !issueType || !severity) {
      toast({
        title: t("common.errorTitle"),
        description: t("supervisor.fillRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const issueData = {
        project_id: selectedProject,
        title,
        issue_type: issueType,
        severity,
        description,
        location,
        photos: JSON.parse(JSON.stringify(photos)),
        status: "open",
      };

      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from("site_issues").insert([{
          ...issueData,
          reported_by: user.id,
        }]);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("supervisor.issueReported"),
        });
      } else {
        await offlineStorage.addToQueue('issue', issueData);
        
        toast({
          title: t("common.success"),
          description: t("supervisor.issueDetails.savedOffline"),
        });
      }

      // Reset form and clear auto-save
      setTitle("");
      setIssueType("");
      setSeverity("");
      setDescription("");
      setLocation("");
      setPhotos([]);
      setStep(1);
      setIsSheetOpen(false);
      clearFormData(); // Clear saved form data after successful submission
      
      await fetchIssues();
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast({
        title: t("common.errorTitle"),
        description: t("supervisor.reportFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "destructive";
      case "in_progress": return "default";
      case "resolved": return "secondary";
      case "closed": return "outline";
      default: return "secondary";
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) {
      return false;
    }
    if (severityFilter !== 'all' && issue.severity !== severityFilter) {
      return false;
    }
    return true;
  });

  const handleViewGallery = async (issue: Issue) => {
    if (!issue.photos || issue.photos.length === 0) return;
    
    const resolvedUrls = await Promise.all(
      issue.photos.map((photo: any) => {
        const path = typeof photo === 'string' ? photo : photo.url || photo.path;
        return resolveStorageUrl(path, 60 * 60 * 24);
      })
    );
    
    setGalleryPhotos(resolvedUrls.filter(Boolean) as string[]);
    setGalleryOpen(true);
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={fetchIssues} disabled={false}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={fetchIssues}
            refreshing={false}
          />

        {loading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Issues Header - Mobile Optimized */}
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold">{t("supervisor.issues")}</h1>
                  </div>
                  
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="default" onClick={() => setIsSheetOpen(true)} size="sm" className="h-9">
                        <Plus className="h-4 w-4 mr-1" />
                        {t("common.new")}
                      </Button>
                    </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-3 border-b">
                      <SheetTitle>{t("supervisor.reportNewIssue")}</SheetTitle>
                      <SheetDescription className="text-muted-foreground">
                        {t("supervisor.issueStepperHint") || "Capture details, severity, and photos in three quick steps."}
                      </SheetDescription>
                      <div className="flex items-center gap-2 pt-3">
                        {[1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-1.5 rounded-full transition-colors ${
                              step >= idx ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </SheetHeader>

                    <div className="p-6 space-y-6">
                      {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right">
                          <div className="space-y-2">
                            <Label htmlFor="title">{t("supervisor.issueTitle")} *</Label>
                            <Input
                              id="title"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder={t("supervisor.issueTitlePlaceholder")}
                              className="h-14"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="location">{t("supervisor.location")}</Label>
                            <Input
                              id="location"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder={t("supervisor.locationPlaceholder")}
                              className="h-14"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="description" className="text-base">{t("supervisor.description")}</Label>
                            <Textarea
                              id="description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder={t("supervisor.descriptionPlaceholder")}
                              className="min-h-[120px] text-base"
                            />
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-5 animate-in slide-in-from-right">
                          <div className="space-y-3">
                            <Label className="text-base font-semibold">{t("supervisor.issueType")} *</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { value: "safety", label: t("supervisor.safety"), icon: "🛡️" },
                                { value: "quality", label: t("supervisor.quality"), icon: "✓" },
                                { value: "material", label: t("supervisor.material"), icon: "📦" },
                                { value: "equipment", label: t("supervisor.equipment"), icon: "🔧" },
                                { value: "other", label: t("supervisor.other"), icon: "•" },
                              ].map(({ value, label, icon }) => (
                                <Button
                                  key={value}
                                  type="button"
                                  variant={issueType === value ? "default" : "outline"}
                                  onClick={() => setIssueType(value)}
                                  className="h-16 flex flex-col gap-1 text-base"
                                >
                                  <span className="text-2xl">{icon}</span>
                                  <span>{label}</span>
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-base font-semibold flex items-center gap-2">
                              {t("supervisor.severity")} *
                              {severity && (
                                <Badge variant="outline" className="capitalize">
                                  {t(`supervisor.${severity}`)}
                                </Badge>
                              )}
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { value: "low", label: t("supervisor.low"), className: "from-green-100 to-green-200 text-green-900" },
                                { value: "medium", label: t("supervisor.medium"), className: "from-yellow-100 to-yellow-200 text-yellow-900" },
                                { value: "high", label: t("supervisor.high"), className: "from-orange-100 to-orange-200 text-orange-900" },
                                { value: "critical", label: t("supervisor.critical"), className: "from-red-100 to-red-200 text-red-900" },
                              ].map(({ value, label, className }) => (
                                <Button
                                  key={value}
                                  type="button"
                                  variant="outline"
                                  onClick={() => setSeverity(value)}
                                  className={`h-16 text-base border-2 transition-all ${
                                    severity === value ? "border-primary shadow-md" : "border-transparent"
                                  } bg-gradient-to-br ${className}`}
                                >
                                  {label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right">
                          <Card className="border-2">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Image className="h-4 w-4" />
                                {t("supervisor.photos")} ({photos.length})
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => setPhotos([...photos])}
                                >
                                  <Camera className="h-4 w-4" />
                                  {t("supervisor.addPhoto") || "Add photo"}
                                </Button>
                                <CameraCapture onCapture={handlePhotoCapture} />
                              </div>
                              {photos.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                  {photos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={photo.url}
                                        alt={t('supervisor.issueDetails.photoAltNumbered', { number: index + 1 })}
                                        className="w-full h-32 object-cover rounded-lg border-2"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="destructive"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Image className="h-4 w-4" />
                                  {t("supervisor.noPhotosYet")}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>

                    <SheetFooter className="border-t p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <Progress value={(step / 3) * 100} className="flex-1" />
                        <span className="text-xs text-muted-foreground">{step}/3</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevStep}
                          disabled={step === 1 || submitting}
                          className="flex-1 h-11"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          {t("common.previous") || "Previous"}
                        </Button>
                        {step < 3 ? (
                          <Button
                            type="button"
                            onClick={nextStep}
                            disabled={!isStepComplete(step) || submitting}
                            className="flex-1 h-11"
                          >
                            {t("common.next") || "Next"}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        ) : (
                          <Button
                            className="flex-1 h-11 text-base font-semibold"
                            onClick={handleSubmit}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            {submitting ? t("supervisor.reporting") : t("supervisor.submitReport")}
                          </Button>
                        )}
                      </div>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </CardContent>
            </Card>

            {/* Issue Filters */}
            <IssueFilters
              activeStatusFilter={statusFilter}
              activeSeverityFilter={severityFilter}
              onStatusFilterChange={setStatusFilter}
              onSeverityFilterChange={setSeverityFilter}
              totalCount={issues.length}
              filteredCount={filteredIssues.length}
            />

            <div className="space-y-4 pb-8">
              {filteredIssues.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title={t("supervisor.noIssues")}
                  description={
                    issues.length === 0
                      ? t("supervisor.noIssuesDescription")
                      : t("supervisor.noFilteredIssues", "No issues match the selected filters")
                  }
                  iconClassName="text-primary"
                />
              ) : (
                filteredIssues.map((issue) => {
                  const hasPhotos = issue.photos && issue.photos.length > 0;
                  const hasBeforeAfter = issue.before_photo || issue.after_photo;
                  const isResolved = issue.status === 'resolved' || issue.status === 'closed';

                  return (
                    <Card key={issue.id} className="border-2 hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <StatusIndicator 
                                status={issue.status === 'open' ? 'open' : issue.status === 'in_progress' ? 'in_progress' : 'resolved'} 
                                variant="dot" 
                                size="md" 
                              />
                              <CardTitle className="text-lg">{issue.title}</CardTitle>
                            </div>
                            {issue.location && (
                              <p className="text-sm text-muted-foreground">{issue.location}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <Badge variant={getSeverityColor(issue.severity)} className="text-xs">
                              {t(`supervisor.${issue.severity}`)}
                            </Badge>
                            <Badge variant={getStatusColor(issue.status)} className="text-xs">
                              {issue.status === 'in_progress' ? t('supervisor.inprogress') : t(`supervisor.${issue.status}`)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDateTime(new Date(issue.created_at))}
                          </div>
                          {issue.description && (
                            <p className="text-muted-foreground">{issue.description}</p>
                          )}
                          <div className="flex gap-2">
                            <Badge variant="outline">{t(`supervisor.${issue.issue_type}`)}</Badge>
                          </div>
                        </div>

                        {/* Before/After Photos for Resolved Issues */}
                        {isResolved && hasBeforeAfter && (
                          <div className="pt-2 border-t">
                            <BeforeAfterPhotos
                              beforePhoto={issue.before_photo}
                              afterPhoto={issue.after_photo}
                              beforeLabel={t('supervisor.issueDetails.before')}
                              afterLabel={t('supervisor.issueDetails.after')}
                              size="md"
                            />
                          </div>
                        )}

                        {/* Photo Gallery Thumbnail */}
                        {hasPhotos && !hasBeforeAfter && (
                          <div className="pt-2 border-t">
                            <div className="grid grid-cols-3 gap-2">
                              {issue.photos?.slice(0, 3).map((photo: any, idx: number) => {
                                const photoPath = typeof photo === 'string' ? photo : photo.url || photo.path;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleViewGallery(issue)}
                                    className="relative aspect-square rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
                                  >
                                    <img
                                      src={photoPath}
                                      alt={t('supervisor.issueDetails.photoAltNumbered', { number: idx + 1 })}
                                      className="w-full h-full object-cover"
                                    />
                                    {idx === 2 && issue.photos && issue.photos.length > 3 && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold">
                                        +{issue.photos.length - 3}
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            {issue.photos && issue.photos.length > 3 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => handleViewGallery(issue)}
                              >
                                <Image className="h-4 w-4 mr-2" />
                                View all {issue.photos.length} photos
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      </PullToRefresh>

      <PhotoGalleryModal
        photos={galleryPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={t('supervisor.issueDetails.photosTitle')}
      />

      <MobileBottomNav />
    </>
  );
}
