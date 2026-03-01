import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useActivityTemplates } from "@/hooks/useActivityTemplates";
import { ActivityTemplateItemsTable, type ActivityItem } from "@/components/ConstructionActivities/ActivityTemplateItemsTable";
import { TemplateImageUpload } from "@/components/Templates/TemplateImageUpload";
import { Plus, FileText, ArrowLeft, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/Layout";
import { PageHeader } from "@/components/Layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Component to show collapsed summary for activities
function ActivitiesCollapsedSummary({ activities }: { activities: ActivityItem[] }) {
  const { t } = useLocalization();

  const totalDays = useMemo(() => {
    return activities.reduce((sum, activity) => sum + activity.defaultDays, 0);
  }, [activities]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">
          {t("constructionActivities.summary.totalActivities")}
        </span>
        <span className="font-bold text-lg">{activities.length}</span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-muted-foreground">
          {t("constructionActivities.summary.totalDays")}
        </span>
        <span className="text-sm font-semibold">{totalDays} days</span>
      </div>
    </div>
  );
}

export default function ActivityTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute("/construction-activities/:id/edit");
  }, [loadTranslationsForRoute]);

  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [isActivitiesSectionVisible, setIsActivitiesSectionVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDefaultWarning, setShowDefaultWarning] = useState(false);

  const { templates, updateTemplate, isLoading } = useActivityTemplates();
  const template = templates?.find((t) => t.id === id);
  const currentDefaultTemplate = templates?.find((t) => t.is_default);

  // Form state
  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    is_default: false,
    mode: 'duration' as 'duration' | 'offset',
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load template data
  useEffect(() => {
    if (template) {
      const loadedActivities = (template.activities as unknown as ActivityItem[]) || [];
      console.log('🔍 Loading template:', template.template_name);
      console.log('📊 First activity:', loadedActivities[0]);
      console.log('🔢 Total activities:', loadedActivities.length);
      
      // Auto-detect mode from first activity: offset-based has startOffset/endOffset, duration-based has activityName/defaultDays
      const detectedMode = loadedActivities.length > 0 && 
        ('startOffset' in loadedActivities[0] || 'endOffset' in loadedActivities[0])
        ? 'offset'
        : 'duration';
      
      console.log('🎯 Detected mode:', detectedMode);
      console.log('✅ First activity has startOffset?', 'startOffset' in (loadedActivities[0] || {}));
      console.log('✅ First activity has endOffset?', 'endOffset' in (loadedActivities[0] || {}));
      
       setFormData({
         template_name: template.template_name,
         description: template.description || "",
         is_default: template.is_default || false,
         mode: detectedMode,
       });
       setActivities(loadedActivities);
       setImageUrl((template as any).image_url || null);
    }
  }, [template]);

  const handleToggleActivitiesSection = () => {
    setIsActivitiesSectionVisible(!isActivitiesSectionVisible);
  };

  const handleAddActivity = () => {
    const newActivity: ActivityItem = {
      sequence: activities.length + 1,
      activityName: "",
      defaultDays: 1,
    };
    setActivities([...activities, newActivity]);
    setEditingActivityIndex(activities.length);
    setIsActivityFormOpen(true);
  };

  const handleEditActivity = (activity: ActivityItem, index: number) => {
    setEditingActivityIndex(index);
    setIsActivityFormOpen(true);
  };

  const handleDeleteActivity = (index: number) => {
    const newActivities = activities.filter((_, i) => i !== index);
    // Resequence
    const resequenced = newActivities.map((activity, idx) => ({
      ...activity,
      sequence: idx + 1,
    }));
    setActivities(resequenced);
  };

  const handleReorderActivities = (newActivities: ActivityItem[]) => {
    setActivities(newActivities);
  };

  const handleSaveActivity = (updatedActivity: ActivityItem) => {
    if (editingActivityIndex !== null) {
      const newActivities = [...activities];
      newActivities[editingActivityIndex] = updatedActivity;
      setActivities(newActivities);
    }
    setIsActivityFormOpen(false);
    setEditingActivityIndex(null);
  };

  const handleDefaultToggle = (checked: boolean) => {
    if (checked && currentDefaultTemplate && currentDefaultTemplate.id !== id) {
      setShowDefaultWarning(true);
    } else {
      setFormData({ ...formData, is_default: checked });
    }
  };

  const handleConfirmDefaultChange = () => {
    setFormData({ ...formData, is_default: true });
    setShowDefaultWarning(false);
  };

  const handleSave = async () => {
    if (!id || !template) return;

    setIsSaving(true);

    const templateData = {
        template_name: formData.template_name,
        description: formData.description,
        activities: activities as any,
        is_default: formData.is_default,
        is_system: template.is_system || false,
        image_url: imageUrl,
      };

    updateTemplate.mutate(
      { id, updates: templateData },
      {
        onSuccess: () => {
          toast({
            title: t("common.success"),
            description: t("constructionActivities.updated", "Template updated successfully"),
          });
          navigate(`/construction-activities/${id}`);
        },
        onError: (error: any) => {
          toast({
            title: t("common.error"),
            description: error.message || "Failed to update template",
            variant: "destructive",
          });
          setIsSaving(false);
        },
      }
    );
  };

  const handleCancel = () => {
    navigate(`/construction-activities/${id}`);
  };

  // Calculate total days - must be before early returns (Rules of Hooks)
  const totalDays = useMemo(() => {
    return activities.reduce((sum, activity) => sum + activity.defaultDays, 0);
  }, [activities]);

  const editingActivity = editingActivityIndex !== null ? activities[editingActivityIndex] : null;

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
        </div>
      </Container>
    );
  }

  if (!template) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
            {t("constructionActivities.notFound", "Template not found")}
          </p>
          <Button onClick={() => navigate("/construction-activities")} className="mt-4">
            {t("common.back", "Back")}
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <PageHeader
          title={formData.template_name || t("constructionActivities.editTitle", "Edit Activity Template")}
          description={formData.description || undefined}
          actions={
            <div className="flex gap-2">
              <Button variant="glass-style-white" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                {t("common.cancel", "Cancel")}
              </Button>
              <Button variant="glass-style-white" onClick={handleSave} disabled={isSaving || !formData.template_name}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? t("common.saving", "Saving...") : t("common.save", "Save")}
              </Button>
            </div>
          }
        />

        {/* Template Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("constructionActivities.settings", "Template Settings")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("constructionActivities.templateName", "Template Name")}</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder={t("constructionActivities.templateName", "Template Name")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("constructionActivities.description", "Description")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("constructionActivities.description", "Template description")}
                rows={3}
              />
            </div>
             <div className="flex items-center gap-2">
               <Checkbox
                 id="is-default"
                 checked={formData.is_default}
                 onCheckedChange={handleDefaultToggle}
               />
               <Label htmlFor="is-default" className="text-sm font-medium cursor-pointer">
                 {t("constructionActivities.setAsDefault", "Set as Default Template")}
               </Label>
             </div>
             <TemplateImageUpload
               currentImageUrl={imageUrl}
               onImageUrlChange={setImageUrl}
             />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("constructionActivities.totalActivities", "Total Activities")}
              </p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("constructionActivities.totalDays", "Total Duration")}
              </p>
              <p className="text-2xl font-bold">{totalDays} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Activities Section */}
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("constructionActivities.activities", "Activities")}
            </CardTitle>
            <div className="flex gap-2">
               <Button variant="glass-style-white" className="h-8" onClick={handleToggleActivitiesSection}>
                 {isActivitiesSectionVisible
                   ? t("materials:collapseSection", "Collapse Section")
                   : t("materials:expandSection", "Expand Section")}
               </Button>
               <Button variant="glass-style-white" onClick={handleAddActivity}>
                 <Plus className="h-4 w-4 mr-2" />
                 {t("constructionActivities.addActivity", "Add Activity")}
               </Button>
            </div>
          </CardHeader>
          {isActivitiesSectionVisible ? (
            <CardContent className="p-0">
              <ActivityTemplateItemsTable
                activities={activities}
                onEdit={handleEditActivity}
                onDelete={handleDeleteActivity}
                isReorderable={true}
                onReorderActivities={handleReorderActivities}
                mode={formData.mode}
              />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <ActivitiesCollapsedSummary activities={activities} />
            </CardContent>
          )}
        </Card>

        {/* Activity Edit Dialog */}
        <Dialog open={isActivityFormOpen} onOpenChange={setIsActivityFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingActivityIndex !== null && editingActivity
                  ? t("constructionActivities.editActivity", "Edit Activity")
                  : t("constructionActivities.addActivity", "Add Activity")}
              </DialogTitle>
              <DialogDescription>
                {t("constructionActivities.activityFormDescription", "Enter the activity details below")}
              </DialogDescription>
            </DialogHeader>
            {editingActivity && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("constructionActivities.activityName", "Activity Name")}</Label>
                  <Input
                    value={editingActivity.activityName}
                    onChange={(e) => {
                      const newActivities = [...activities];
                      newActivities[editingActivityIndex!] = {
                        ...editingActivity,
                        activityName: e.target.value,
                      };
                      setActivities(newActivities);
                    }}
                    placeholder={t("constructionActivities.activityNamePlaceholder", "e.g., Foundation Work")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("constructionActivities.duration", "Duration (days)")}</Label>
                  <Input
                    type="number"
                    value={editingActivity.defaultDays}
                    onChange={(e) => {
                      const newActivities = [...activities];
                      newActivities[editingActivityIndex!] = {
                        ...editingActivity,
                        defaultDays: parseInt(e.target.value) || 0,
                      };
                      setActivities(newActivities);
                    }}
                    min="1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsActivityFormOpen(false)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                   <Button variant="glass-style-white"
                     onClick={() => handleSaveActivity(editingActivity)}
                     disabled={!editingActivity.activityName}
                   >
                     {t("common.save", "Save")}
                   </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Default Template Warning */}
        <AlertDialog open={showDefaultWarning} onOpenChange={setShowDefaultWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("constructionActivities.defaultTemplateWarning.title", "Change Default Template?")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "constructionActivities.defaultTemplateWarning.message",
                  `This will replace "${currentDefaultTemplate?.template_name}" as the default template.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDefaultChange}>
                {t("common.confirm", "Confirm")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Container>
  );
}
