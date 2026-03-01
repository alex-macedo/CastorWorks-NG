import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import { PhaseTemplateItemsTable, type PhaseItem } from "@/components/ProjectPhases/PhaseTemplateItemsTable";
import { TemplateImageUpload } from "@/components/Templates/TemplateImageUpload";
import { Plus, ChevronsDown, ChevronsUp, Layers, ArrowLeft, Save, X } from "lucide-react";
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

// Component to show collapsed summary for phases
function PhasesCollapsedSummary({ phases }: { phases: PhaseItem[] }) {
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

export default function PhaseTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute("/phase-templates/:id/edit");
  }, [loadTranslationsForRoute]);

  const [isPhaseFormOpen, setIsPhaseFormOpen] = useState(false);
  const [editingPhaseIndex, setEditingPhaseIndex] = useState<number | null>(null);
  const [isPhasesSectionVisible, setIsPhasesSectionVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showStandardWarning, setShowStandardWarning] = useState(false);

  const { templates, updateTemplate, isLoading } = usePhaseTemplates();
  const template = templates?.find((t) => t.id === id);
  const currentStandardTemplate = templates?.find((t) => t.is_default);

  // Form state
  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    is_default: false,
  });

  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load template data
  useEffect(() => {
    if (template) {
      setFormData({
        template_name: template.template_name,
        description: template.description || "",
        is_default: template.is_default || false,
      });
      setPhases(template.phases || []);
      setImageUrl(template.image_url || null);
    }
  }, [template]);

  const handleTogglePhasesSection = () => {
    setIsPhasesSectionVisible(!isPhasesSectionVisible);
  };

  const handleAddPhase = () => {
    const newPhase: PhaseItem = {
      sequence: phases.length + 1,
      phaseName: "",
      defaultDurationDays: 7,
      defaultBudgetPercentage: 10,
    };
    setPhases([...phases, newPhase]);
    setEditingPhaseIndex(phases.length);
    setIsPhaseFormOpen(true);
  };

  const handleEditPhase = (phase: PhaseItem, index: number) => {
    setEditingPhaseIndex(index);
    setIsPhaseFormOpen(true);
  };

  const handleDeletePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    // Resequence
    const resequenced = newPhases.map((phase, idx) => ({
      ...phase,
      sequence: idx + 1,
    }));
    setPhases(resequenced);
  };

  const handleReorderPhases = (newPhases: PhaseItem[]) => {
    setPhases(newPhases);
  };

  const handleSavePhase = (updatedPhase: PhaseItem) => {
    if (editingPhaseIndex !== null) {
      const newPhases = [...phases];
      newPhases[editingPhaseIndex] = updatedPhase;
      setPhases(newPhases);
    }
    setIsPhaseFormOpen(false);
    setEditingPhaseIndex(null);
  };

  const handleStandardToggle = (checked: boolean) => {
    if (checked && currentStandardTemplate && currentStandardTemplate.id !== id) {
      setShowStandardWarning(true);
    } else {
      setFormData({ ...formData, is_default: checked });
    }
  };

  const handleConfirmStandardChange = () => {
    setFormData({ ...formData, is_default: true });
    setShowStandardWarning(false);
  };

  const handleSave = async () => {
    if (!id || !template) return;

    setIsSaving(true);

    const templateData = {
      template_name: formData.template_name,
      description: formData.description,
      phases,
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
            description: t("phaseTemplates.updated", "Template updated successfully"),
          });
          navigate(`/phase-templates/${id}`);
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
    navigate(`/phase-templates/${id}`);
  };

  // Calculate totals - must be before early returns (Rules of Hooks)
  const { totalDays, totalBudget } = useMemo(() => {
    const days = phases.reduce((sum, phase) => sum + phase.defaultDurationDays, 0);
    const budget = phases.reduce((sum, phase) => sum + phase.defaultBudgetPercentage, 0);
    return { totalDays: days, totalBudget: budget };
  }, [phases]);

  const editingPhase = editingPhaseIndex !== null ? phases[editingPhaseIndex] : null;

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

  return (
    <Container size="lg">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <PageHeader
          title={formData.template_name || t("phaseTemplates.editTitle", "Edit Phase Template")}
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
             <CardTitle>{t("phaseTemplates.settings", "Template Settings")}</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>{t("phaseTemplates.templateName", "Template Name")}</Label>
               <Input
                 value={formData.template_name}
                 onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                 placeholder={t("phaseTemplates.templateName", "Template Name")}
               />
             </div>
             <div className="space-y-2">
               <Label>{t("phaseTemplates.description", "Description")}</Label>
               <Textarea
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 placeholder={t("phaseTemplates.description", "Template description")}
                 rows={3}
               />
             </div>
             <div className="flex items-center gap-2">
               <Checkbox
                 id="is-default"
                 checked={formData.is_default}
                 onCheckedChange={handleStandardToggle}
               />
               <Label htmlFor="is-default" className="text-sm font-medium cursor-pointer">
                 {t("phaseTemplates.setAsDefault", "Set as Default Template")}
               </Label>
             </div>
             <TemplateImageUpload
               currentImageUrl={imageUrl}
               onImageUrlChange={setImageUrl}
             />
           </CardContent>
         </Card>

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
              <Button onClick={handleAddPhase}>
                <Plus className="h-4 w-4 mr-2" />
                {t("phaseTemplates.addPhase", "Add Phase")}
              </Button>
            </div>
          </CardHeader>
          {isPhasesSectionVisible ? (
            <CardContent className="p-0">
              <PhaseTemplateItemsTable
                phases={phases}
                onEdit={handleEditPhase}
                onDelete={handleDeletePhase}
                isReorderable={true}
                onReorderPhases={handleReorderPhases}
              />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <PhasesCollapsedSummary phases={phases} />
            </CardContent>
          )}
        </Card>

        {/* Phase Edit Dialog */}
        <Dialog open={isPhaseFormOpen} onOpenChange={setIsPhaseFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPhaseIndex !== null && editingPhase
                  ? t("phaseTemplates.editPhase", "Edit Phase")
                  : t("phaseTemplates.addPhase", "Add Phase")}
              </DialogTitle>
              <DialogDescription>
                {t("phaseTemplates.phaseFormDescription", "Enter the phase details below")}
              </DialogDescription>
            </DialogHeader>
            {editingPhase && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("phaseTemplates.phaseName", "Phase Name")}</Label>
                  <Input
                    value={editingPhase.phaseName}
                    onChange={(e) => {
                      const newPhases = [...phases];
                      newPhases[editingPhaseIndex!] = {
                        ...editingPhase,
                        phaseName: e.target.value,
                      };
                      setPhases(newPhases);
                    }}
                    placeholder={t("phaseTemplates.phaseNamePlaceholder", "e.g., Foundation")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("phaseTemplates.duration", "Duration (days)")}</Label>
                    <Input
                      type="number"
                      value={editingPhase.defaultDurationDays}
                      onChange={(e) => {
                        const newPhases = [...phases];
                        newPhases[editingPhaseIndex!] = {
                          ...editingPhase,
                          defaultDurationDays: parseInt(e.target.value) || 0,
                        };
                        setPhases(newPhases);
                      }}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("phaseTemplates.budget", "Budget (%)")}</Label>
                    <Input
                      type="number"
                      value={editingPhase.defaultBudgetPercentage}
                      onChange={(e) => {
                        const newPhases = [...phases];
                        newPhases[editingPhaseIndex!] = {
                          ...editingPhase,
                          defaultBudgetPercentage: parseFloat(e.target.value) || 0,
                        };
                        setPhases(newPhases);
                      }}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsPhaseFormOpen(false)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button
                    onClick={() => handleSavePhase(editingPhase)}
                    disabled={!editingPhase.phaseName}
                  >
                    {t("common.save", "Save")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Standard Template Warning */}
        <AlertDialog open={showStandardWarning} onOpenChange={setShowStandardWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("phaseTemplates.standardTemplateWarning.title", "Change Default Template?")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "phaseTemplates.standardTemplateWarning.message",
                  `This will replace "${currentStandardTemplate?.template_name}" as the default template.`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>
                {t("common.cancel", "Cancel")}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStandardChange}>
                {t("common.confirm", "Confirm")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Container>
  );
}
