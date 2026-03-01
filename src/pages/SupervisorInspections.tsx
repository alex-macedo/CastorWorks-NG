import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, Plus, Check, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { CameraCapture } from "@/components/Photos/CameraCapture";
import { resolveStorageUrl } from '@/utils/storage';
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Badge } from "@/components/ui/badge";
import { offlineStorage } from "@/lib/offlineStorage";
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { SyncStatusBar } from "@/components/supervisor/SyncStatusBar";
import { OfflineQueueIndicator } from "@/components/supervisor/OfflineQueueIndicator";
import { toast as toastHelper } from "@/lib/toast-helpers";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/supervisor/EmptyState";
import { useSupervisorProject } from "@/contexts/SupervisorProjectContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InspectionTimeline } from "@/components/supervisor/InspectionTimeline";
import { BeforeAfterPhotoViewer } from "@/components/supervisor/BeforeAfterPhotoViewer";
import { List } from "lucide-react";

interface ChecklistItem {
  id: string;
  item: string;
  itemKey?: string; // Translation key for default items
  status: "passed" | "failed" | "conditional" | null;
  notes: string;
  photos: { url: string; caption?: string; preview?: string }[];
  before_photo?: string | null;
  after_photo?: string | null;
}

interface Inspection {
  id: string;
  inspection_date: string;
  overall_status: string;
  checklist_items: any;
}

// Default checklist items - these are translation keys, not hardcoded text
const DEFAULT_CHECKLIST_ITEM_KEYS = [
  "foundationLevel",
  "concreteStrength",
  "rebarPlacement",
  "formworkAlignment",
  "safetyBarriers",
  "materialStorage",
  "workmanshipQuality",
  "siteCleanliness",
];

export default function SupervisorInspections() {
  const { t } = useLocalization();
  useRouteTranslations();
  const { toast } = useToast();
  const { selectedProject } = useSupervisorProject();

  const [phases, setPhases] = useState<any[]>([]);
  const [selectedPhase, setSelectedPhase] = useState("");
  const [loading, setLoading] = useState(false);
  const [inspectionDate, setInspectionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  // Initialize checklist items with translated text
  const getDefaultChecklistItems = useCallback(() => {
    return DEFAULT_CHECKLIST_ITEM_KEYS.map(key => ({
      id: crypto.randomUUID(),
      item: t(`supervisor.defaultChecklistItems.${key}`),
      itemKey: key, // Store the key for translation updates
      status: null,
      notes: "",
      photos: [],
    }));
  }, [t]);

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(getDefaultChecklistItems());
  const [overallStatus, setOverallStatus] = useState<"passed" | "failed" | "conditional" | null>(null);
  const [notes, setNotes] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'new'>('timeline');

  const fetchPhases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("project_phases")
        .select("id, phase_name")
        .eq("project_id", selectedProject)
        .eq("type", "schedule") // Only get schedule phases for inspections
        .order("start_date", { ascending: true });

      if (error) throw error;
      setPhases(data || []);
    } catch (error) {
      console.error("Error fetching phases:", error);
    }
  }, [selectedProject]);

  const fetchInspections = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quality_inspections")
        .select("*")
        .eq("project_id", selectedProject)
        .order("inspection_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      fetchPhases();
      fetchInspections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // Reset selectedPhase if it doesn't match any available phase
  useEffect(() => {
    if (selectedPhase && phases.length > 0) {
      const phaseExists = phases.some(phase => phase.id === selectedPhase) || selectedPhase === 'none';
      if (!phaseExists) {
        setSelectedPhase("");
      }
    }
  }, [phases, selectedPhase]);

  // Update default checklist items when language changes (only if using default items)
  useEffect(() => {
    // Only update if all items are default items (have itemKey) and we have the expected count
    const allHaveKeys = checklistItems.every(item => item.itemKey);
    const isDefaultSet = checklistItems.length === DEFAULT_CHECKLIST_ITEM_KEYS.length;
    
    if (allHaveKeys && isDefaultSet) {
      setChecklistItems(getDefaultChecklistItems());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handlePhotoCapture = async (itemId: string, file: File) => {
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

      // Do not persist signed URL. Store canonical storage path and generate preview for UI
      const preview = await resolveStorageUrl(filePath, 60 * 60 * 24 * 7).catch(() => undefined);

      setChecklistItems(items =>
        items.map(item =>
          item.id === itemId
            ? { ...item, photos: [...item.photos, { url: filePath, caption: '', preview }] }
            : item
        )
      );

      toast({
        title: t("supervisor.success"),
        description: t("supervisor.photoAdded"),
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: t("supervisor.error"),
        description: t("supervisor.photoUploadFailed"),
        variant: "destructive",
      });
    }
  };

  const updateItemStatus = (itemId: string, status: "passed" | "failed" | "conditional") => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, status } : item
      )
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  useEffect(() => {
    const statuses = checklistItems.map(item => item.status).filter(Boolean);
    if (statuses.length === 0) {
      setOverallStatus(null);
      return;
    }

    const hasFailed = statuses.includes("failed");
    const hasConditional = statuses.includes("conditional");

    if (hasFailed) {
      setOverallStatus("failed");
    } else if (hasConditional) {
      setOverallStatus("conditional");
    } else if (statuses.every(s => s === "passed")) {
      setOverallStatus("passed");
    } else {
      setOverallStatus(null);
    }
  }, [checklistItems]);

  // Resolve any photo previews for photos that only have a storage path (no preview)
  useEffect(() => {
    let mounted = true;

    const resolvePreviews = async () => {
      const toResolve: { itemIndex: number; photoIndex: number; url: string }[] = [];
      checklistItems.forEach((it, itemIndex) =>
        it.photos.forEach((ph, photoIndex) => {
          if (ph.url && !ph.preview && !ph.url.startsWith('http')) {
            toResolve.push({ itemIndex, photoIndex, url: ph.url });
          }
        })
      );

      if (toResolve.length === 0) return;

      const results = await Promise.all(
        toResolve.map(async ({ url }) => {
          try {
            const p = await resolveStorageUrl(url, 60 * 60 * 24 * 7);
            return p;
          } catch (e) {
            return undefined;
          }
        })
      );

      if (!mounted) return;

      setChecklistItems(prev => {
        const next = prev.map(it => ({ ...it, photos: it.photos.map(ph => ({ ...ph })) }));
        toResolve.forEach((info, idx) => {
          const preview = results[idx];
          if (preview) {
            if (next[info.itemIndex] && next[info.itemIndex].photos[info.photoIndex]) {
              next[info.itemIndex].photos[info.photoIndex].preview = preview;
            }
          }
        });
        return next;
      });
    };

    resolvePreviews();

    return () => { mounted = false; };
  }, [checklistItems]);

  const addCustomItem = () => {
    setChecklistItems([
      ...checklistItems,
      {
        id: crypto.randomUUID(),
        item: "",
        status: null,
        notes: "",
        photos: [],
      }
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedProject) {
      toastHelper.error(t("supervisor.selectProjectFirst"));
      return;
    }

    setSubmitting(true);
    try {
      const inspectionData = {
        project_id: selectedProject,
        phase_id: selectedPhase && selectedPhase !== 'none' ? selectedPhase : null,
        inspection_date: inspectionDate,
        overall_status: overallStatus || 'conditional',
        checklist_items: JSON.parse(JSON.stringify(checklistItems)),
        notes: notes,
        signature_data: signatureData,
      };

      if (navigator.onLine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await supabase.from("quality_inspections").insert([{
          ...inspectionData,
          inspector_id: user.id,
        }]);

        if (error) throw error;

        toastHelper.success(t("supervisor.inspectionSubmitted"));
      } else {
        await offlineStorage.addToQueue('inspection', inspectionData);
        
        toastHelper.success(t("supervisor.savedOffline"));
      }

      // Reset form
      setSelectedPhase("");
      setOverallStatus(null);
      setChecklistItems(getDefaultChecklistItems());
      setNotes("");
      setSignatureData(null);
      setInspectionDate(format(new Date(), 'yyyy-MM-dd'));
      setActiveTab('timeline');
      await fetchInspections();
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toastHelper.error(t("supervisor.inspectionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "passed":
        return <Check className="h-4 w-4 text-green-600" />;
      case "failed":
        return <X className="h-4 w-4 text-red-600" />;
      case "conditional":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      passed: "default",
      failed: "destructive",
      conditional: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={fetchInspections} disabled={false}>
        <div className="supervisor-mobile w-full min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={fetchInspections}
            refreshing={false}
          />

        {loading ? (
          <div className="w-full p-4 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <div className="w-full p-4 space-y-4">
            {/* Quality Inspection Header - Mobile Optimized */}
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <h1 className="text-xl font-bold">{t("supervisor.qualityCheck")}</h1>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs for Timeline View and New Inspection */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'timeline' | 'new')} variant="pill" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline" className="gap-2">
                  <List className="h-4 w-4" />
                  {t("supervisor.timelineView", "Timeline View")}
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("supervisor.newInspection", "New Inspection")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-4">
                {selectedProject ? (
                  <InspectionTimeline projectId={selectedProject} />
                ) : (
                  <EmptyState
                    icon={CheckSquare}
                    title={t("supervisor.selectProjectFirst")}
                    description={t("supervisor.selectProjectToViewInspections")}
                    iconClassName="text-muted-foreground"
                  />
                )}
              </TabsContent>

              <TabsContent value="new" className="mt-4">
            <>
              {/* Project & Date Selection */}
              <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phase">{t("supervisor.phaseOptional")}</Label>
                <Select 
                  value={selectedPhase && (selectedPhase === 'none' || phases.some(p => p.id === selectedPhase)) ? selectedPhase : undefined} 
                  onValueChange={setSelectedPhase}
                >
                  <SelectTrigger id="phase">
                    <SelectValue placeholder={t("supervisor.selectPhase")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("supervisor.none")}</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.phase_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{t("supervisor.inspectionDate")}</Label>
                <DateInput
                  value={inspectionDate}
                  onChange={setInspectionDate}
                  placeholder={t('common.selectDate')}
                  className="h-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Overall Status */}
          {overallStatus && (
            <Card className={cn(
              "border-2",
              overallStatus === "passed" && "border-green-500 bg-green-50/50",
              overallStatus === "failed" && "border-red-500 bg-red-50/50",
              overallStatus === "conditional" && "border-yellow-500 bg-yellow-50/50"
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {getStatusIcon(overallStatus)}
                  <span className="font-semibold text-lg">{t("supervisor.overallStatus")}: {overallStatus.toUpperCase()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist Items */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("supervisor.qualityChecklist")}</h2>
            
            {checklistItems.map((item, index) => (
              <Card key={item.id} className={cn(
                "border-2",
                item.status === "passed" && "border-green-200",
                item.status === "failed" && "border-red-200",
                item.status === "conditional" && "border-yellow-200"
              )}>
                <CardContent className="pt-6 space-y-4">
                  {/* Number and Title Row */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary text-lg">{index + 1}</span>
                    </div>
                    <h3 className="font-semibold text-lg flex-1">{item.item}</h3>
                  </div>
                  
                  {/* Status Selection - Large Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={item.status === "passed" ? "default" : "outline"}
                      className={cn(
                        "h-14 flex-col gap-1",
                        item.status === "passed" && "bg-green-600 hover:bg-green-700 border-green-600"
                      )}
                      onClick={() => updateItemStatus(item.id, "passed")}
                    >
                      <Check className="h-5 w-5" />
                      <span className="text-xs">{t("supervisor.passed")}</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={item.status === "conditional" ? "default" : "outline"}
                      className={cn(
                        "h-14 flex-col gap-1",
                        item.status === "conditional" && "bg-yellow-600 hover:bg-yellow-700 border-yellow-600"
                      )}
                      onClick={() => updateItemStatus(item.id, "conditional")}
                    >
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-xs">{t("supervisor.conditional")}</span>
                    </Button>
                    
                    <Button
                      type="button"
                      variant={item.status === "failed" ? "default" : "outline"}
                      className={cn(
                        "h-14 flex-col gap-1",
                        item.status === "failed" && "bg-red-600 hover:bg-red-700 border-red-600"
                      )}
                      onClick={() => updateItemStatus(item.id, "failed")}
                    >
                      <X className="h-5 w-5" />
                      <span className="text-xs">{t("supervisor.failed")}</span>
                    </Button>
                  </div>

                  {/* Notes */}
                  <Textarea
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    placeholder={t("supervisor.notesOrObservations")}
                    rows={3}
                    className="min-h-[80px] text-base"
                  />

                  {/* Before/After Photos */}
                  {(item.before_photo || item.after_photo) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Before/After Comparison:</p>
                      <BeforeAfterPhotoViewer
                        beforeUrl={item.before_photo}
                        afterUrl={item.after_photo}
                        beforeLabel={t('supervisor.inspections.planView')}
                        afterLabel={t('supervisor.inspections.fieldPhoto')}
                        size="md"
                        showLabels={true}
                      />
                    </div>
                  )}

                  {/* Photo Capture */}
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <CameraCapture 
                        onCapture={(file) => handlePhotoCapture(item.id, file)} 
                        size="sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Add before photo capture
                          console.log('Before photo capture for item', item.id);
                        }}
                      >
                        Before
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Add after photo capture
                          console.log('After photo capture for item', item.id);
                        }}
                      >
                        After
                      </Button>
                    </div>
                    {item.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {item.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo.preview || photo.url}
                            alt={t('supervisor.inspections.photoAltNumbered', { number: idx + 1 })}
                            className="w-full h-32 object-cover rounded-lg border-2 border-border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Item Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addCustomItem}
            className="w-full h-14 text-base border-dashed"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t("supervisor.addCustomItem")}
          </Button>

          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("supervisor.inspectorSignature")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SignatureCanvas
                onSave={(data) => {
              setSignatureData(data);
              toast({
                title: t("supervisor.success"),
                description: t("supervisor.signatureSaved"),
              });
            }}
            onClear={() => setSignatureData(null)}
          />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setActiveTab('timeline')} className="flex-1 h-14 text-base">
              {t("supervisor.cancelInspection")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 h-14 text-base">
              <CheckSquare className="h-5 w-5 mr-2" />
              {submitting ? t("supervisor.submitting") : t("supervisor.submitInspection")}
            </Button>
          </div>
            </>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      </PullToRefresh>

      <MobileBottomNav />
    </>
  );
}
