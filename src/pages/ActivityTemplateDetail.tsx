import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useActivityTemplates } from "@/hooks/useActivityTemplates";
import { ActivityTemplateItemsTable } from "@/components/ConstructionActivities/ActivityTemplateItemsTable";
import { Edit, Copy, Trash2, FileText, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/Layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getLocalizedTemplate } from "@/utils/templateLocalization";
import { PageHeader } from "@/components/Layout/PageHeader";

// Component to show collapsed summary for activities
function ActivitiesCollapsedSummary({ activities, mode }: { activities: any[]; mode: 'duration' | 'offset' }) {
  const { t } = useLocalization();

  const totalDays = useMemo(() => {
    if (mode === 'offset') {
      // For offset mode: find max endOffset + 1
      return activities.reduce((max, activity) => 
        Math.max(max, (activity.endOffset || 0)), -1) + 1;
    }
    // For duration mode: sum defaultDays
    return activities.reduce((sum, activity) => 
      sum + (activity.defaultDays || 0), 0);
  }, [activities, mode]);

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

export default function ActivityTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute("/construction-activities/:id");
  }, [loadTranslationsForRoute]);

  const [isActivitiesSectionVisible, setIsActivitiesSectionVisible] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { templates, deleteTemplate, isLoading } = useActivityTemplates();
  const template = templates?.find((t) => t.id === id);
  const activities = (template?.activities as any[]) || [];

  const mode: 'duration' | 'offset' = useMemo(() => {
    const currentActivities = (template?.activities as any[]) || [];
    if (currentActivities.length > 0) {
      const firstActivity = currentActivities[0];
      return ('startOffset' in firstActivity || 'endOffset' in firstActivity) ? 'offset' : 'duration';
    }
    return 'duration';
  }, [template?.activities]);

  // Calculate totals based on mode
  const totalDays = useMemo(() => {
    const currentActivities = (template?.activities as any[]) || [];
    if (mode === 'offset') {
      // For offset mode: find max endOffset + 1
      return currentActivities.reduce((max, activity) => 
        Math.max(max, (activity.endOffset || 0)), -1) + 1;
    }
    // For duration mode: sum defaultDays
    return currentActivities.reduce((sum, activity) => 
      sum + (activity.defaultDays || 0), 0);
  }, [template?.activities, mode]);

  const handleToggleActivitiesSection = () => {
    setIsActivitiesSectionVisible(!isActivitiesSectionVisible);
  };

  const handleEditTemplate = () => {
    navigate(`/construction-activities/${id}/edit`);
  };

  const handleDuplicateTemplate = async () => {
    toast({
      title: (t as any)("common.info"),
      description: "Duplicate functionality coming soon",
    });
  };

  const handleDeleteTemplate = async () => {
    if (!id) return;
    deleteTemplate.mutate(id, {
      onSuccess: () => {
        toast({
          title: (t as any)("common.success"),
          description: (t as any)("constructionActivities.deleted"),
        });
        navigate("/construction-activities");
      },
      onError: (error: any) => {
        toast({
          title: (t as any)("common.error"),
          description: error.message || "Failed to delete template",
          variant: "destructive",
        });
      },
    });
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{(t as any)("common.loading")}</p>
        </div>
      </Container>
    );
  }

  if (!template) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
            {(t as any)("constructionActivities.notFound")}
          </p>
          <Button onClick={() => navigate("/construction-activities")} className="mt-4">
            {(t as any)("common.back")}
          </Button>
        </div>
      </Container>
    );
  }

  const { displayName, displayDescription } = getLocalizedTemplate(
    template.template_name,
    template.description,
    t
  );

  return (
    <Container size="lg">
      <div className="flex-1 space-y-6">
        {/* Header */}
         <PageHeader
           title={displayName}
           description={displayDescription || undefined}
           actions={
             <div className="flex gap-2">
                <Button variant="glass-style-white" onClick={() => navigate("/construction-activities")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {(t as any)("common.back")}
                </Button>
                <Button variant="glass-style-white" onClick={handleEditTemplate}>
                  <Edit className="h-4 w-4 mr-2" />
                  {(t as any)("common.edit")}
                </Button>
                <Button variant="glass-style-white" onClick={handleDuplicateTemplate}>
                  <Copy className="h-4 w-4 mr-2" />
                  {(t as any)("constructionActivities.duplicate")}
                </Button>
                <Button variant="glass-style-destructive"
                  onClick={() => setDeleteConfirm(template.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {(t as any)("common.delete")}
                </Button>
             </div>
           }
         />

        <div className="flex items-center gap-2">
          {template.is_default && (
            <Badge variant="secondary">
              {(t as any)("constructionActivities.default")}
            </Badge>
          )}
          {template.is_system && (
            <Badge variant="outline">
              {(t as any)("constructionActivities.system")}
            </Badge>
          )}
        </div>


        {/* Template Image */}
        {template.image_url && (
          <Card>
            <CardContent className="p-0">
              <img
                src={template.image_url}
                alt={displayName || "Template"}
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {(t as any)("constructionActivities.totalActivities")}
              </p>
              <p className="text-2xl font-bold">{activities.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {(t as any)("constructionActivities.totalDays")}
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
              {(t as any)("constructionActivities.activities")}
            </CardTitle>
            <div className="flex gap-2">
               <Button variant="glass-style-white" className="h-8" onClick={handleToggleActivitiesSection}>
                 {isActivitiesSectionVisible
                   ? (t as any)("materials:collapseSection")
                   : (t as any)("materials:expandSection")}
               </Button>
            </div>
          </CardHeader>
          {isActivitiesSectionVisible ? (
            <CardContent className="p-0">
              <ActivityTemplateItemsTable activities={activities} readOnly={true} mode={mode} />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <ActivitiesCollapsedSummary activities={activities} mode={mode} />
            </CardContent>
          )}
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog
          open={deleteConfirm !== null}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{(t as any)("common.confirmDelete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {(t as any)(
                  "constructionActivities.deleteConfirm"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
                {(t as any)("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTemplate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {(t as any)("common.delete")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Container>
  );
}
