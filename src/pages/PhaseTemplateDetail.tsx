import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import { PhaseTemplateItemsTable } from "@/components/ProjectPhases/PhaseTemplateItemsTable";
import { ArrowLeft, Edit, Copy, Trash2, Layers, ChevronsDown, ChevronsUp } from "lucide-react";
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

// Component to show collapsed summary for phases
function PhasesCollapsedSummary({ phases }: { phases: any[] }) {
  const { t } = useLocalization();

  const { totalDays, totalBudget } = useMemo(() => {
    const days = phases.reduce((sum, phase) => sum + phase.defaultDurationDays, 0);
    const budget = phases.reduce((sum, phase) => sum + phase.defaultBudgetPercentage, 0);
    return { totalDays: days, totalBudget: budget };
  }, [phases]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{t("phaseTemplates.summary.totalPhases")}</span>
        <span className="font-bold text-lg">{phases.length}</span>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-muted-foreground">{t("phaseTemplates.summary.totalDays")}</span>
        <span className="text-sm font-semibold">{totalDays} {t("phaseTemplates.days")}</span>
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm text-muted-foreground">{t("phaseTemplates.summary.totalBudget")}</span>
        <span className={`text-sm font-semibold ${totalBudget !== 100 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
          {totalBudget}%
        </span>
      </div>
    </div>
  );
}

export default function PhaseTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute("/phase-templates/:id");
  }, [loadTranslationsForRoute]);

  const [isPhasesSectionVisible, setIsPhasesSectionVisible] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { templates, deleteTemplate, isLoading } = usePhaseTemplates();
  const template = templates?.find((t) => t.id === id);

  const phases = template?.phases || [];

  // Calculate totals
  const totalDays = phases.reduce((sum: number, phase: any) => sum + phase.defaultDurationDays, 0);
  const totalBudget = phases.reduce((sum: number, phase: any) => sum + phase.defaultBudgetPercentage, 0);

  const handleTogglePhasesSection = () => {
    setIsPhasesSectionVisible(!isPhasesSectionVisible);
  };

  const handleEditTemplate = () => {
    navigate(`/phase-templates/${id}/edit`, { state: { template } });
  };

  const handleDuplicateTemplate = async () => {
    // TODO: Implement duplicate functionality when available in hook
    toast({
      title: t("common.info"),
      description: "Duplicate functionality coming soon",
    });
  };

  const handleDeleteTemplate = async () => {
    if (!id) return;
    deleteTemplate.mutate(id, {
      onSuccess: () => {
        toast({
          title: t("common.success"),
          description: t("phaseTemplates.deleted", "Template deleted successfully"),
        });
        navigate("/phase-templates");
      },
      onError: (error: any) => {
        toast({
          title: t("common.error"),
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
          <p className="text-muted-foreground">{t("common.loading", "Loading...")}</p>
        </div>
      </Container>
    );
  }

  if (!template) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t("phaseTemplates.notFound", "Template not found")}</p>
          <Button onClick={() => navigate("/phase-templates")} className="mt-4">
            {t("common.back", "Back")}
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
                <Button variant="glass-style-white" onClick={() => navigate("/phase-templates")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {(t as any)("common.back", "Back")}
                </Button>
                <Button variant="glass-style-white" onClick={handleEditTemplate}>
                  <Edit className="h-4 w-4 mr-2" />
                  {(t as any)("common.edit", "Edit")}
                </Button>
                <Button variant="glass-style-white" onClick={handleDuplicateTemplate}>
                  <Copy className="h-4 w-4 mr-2" />
                  {(t as any)("phaseTemplates.duplicate", "Duplicate")}
                </Button>
                <Button variant="glass-style-destructive"
                  onClick={() => setDeleteConfirm(template.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {(t as any)("common.delete", "Delete")}
                </Button>
              </div>
            }
        />

        <div className="flex items-center gap-2">
          {template.is_default && (
            <Badge variant="secondary">{t("phaseTemplates.default", "Default")}</Badge>
          )}
          {template.is_system && (
            <Badge variant="outline">{t("phaseTemplates.system", "System")}</Badge>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("phaseTemplates.totalPhases", "Total Phases")}
              </p>
              <p className="text-2xl font-bold">{phases.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("phaseTemplates.totalDays", "Total Duration")}
              </p>
              <p className="text-2xl font-bold">{totalDays} {t("phaseTemplates.days")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">
                {t("phaseTemplates.totalBudget", "Total Budget")}
              </p>
              <p
                className={`text-2xl font-bold ${
                  totalBudget !== 100 ? "text-yellow-600 dark:text-yellow-400" : ""
                }`}
              >
                {totalBudget}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Phases Section */}
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t("phaseTemplates.phases", "Phases")}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="glass-style-white" onClick={handleTogglePhasesSection}
                className="h-8"
              >
                {isPhasesSectionVisible
                  ? t("materials:collapseSection", "Collapse Section")
                  : t("materials:expandSection", "Expand Section")}
              </Button>
            </div>
          </CardHeader>
          {isPhasesSectionVisible ? (
            <CardContent className="p-0">
              <PhaseTemplateItemsTable phases={phases} readOnly={true} />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <PhasesCollapsedSummary phases={phases} />
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
              <AlertDialogTitle>{t("common.confirmDelete", "Confirm Delete")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "phaseTemplates.deleteConfirm",
                  "This template will be permanently deleted. This action cannot be undone."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
                {t("common.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTemplate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("common.delete", "Delete")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Container>
  );
}
