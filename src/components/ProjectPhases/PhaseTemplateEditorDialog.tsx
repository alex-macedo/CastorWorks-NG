import { useState, useEffect } from "react";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import type { PhaseTemplate } from "@/types/phaseTemplate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PhaseTemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
}

interface PhaseItem {
  sequence: number;
  phaseName: string;
  defaultDurationDays: number;
  defaultBudgetPercentage: number;
}

export function PhaseTemplateEditorDialog({
  open,
  onOpenChange,
  templateId,
}: PhaseTemplateEditorDialogProps) {
  const { t } = useLocalization();
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [isStandard, setIsStandard] = useState(false);
  const [phases, setPhases] = useState<PhaseItem[]>([
    { sequence: 1, phaseName: "", defaultDurationDays: 7, defaultBudgetPercentage: 10 }
  ]);
  const [showStandardWarning, setShowStandardWarning] = useState(false);

  const { templates, createTemplate, updateTemplate } = usePhaseTemplates();
  const template = templates?.find((t: PhaseTemplate) => t.id === templateId);
  const currentStandardTemplate = templates?.find((t: PhaseTemplate) => t.is_default);

  useEffect(() => {
    if (template) {
      setTemplateName(template.template_name);

      setDescription(template.description || "");
      setIsStandard(template.is_default || false);

      setPhases(template.phases || []);
    } else {

      setTemplateName("");

      setDescription("");
      setIsStandard(false);
      setPhases([{ sequence: 1, phaseName: "", defaultDurationDays: 7, defaultBudgetPercentage: 10 }]);
    }
  }, [template]);

  const addPhase = () => {
    setPhases([
      ...phases,
      {
        sequence: phases.length + 1,
        phaseName: "",
        defaultDurationDays: 7,
        defaultBudgetPercentage: 10,
      }
    ]);
  };

  const removePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    newPhases.forEach((phase, i) => {
      phase.sequence = i + 1;
    });
    setPhases(newPhases);
  };

  const updatePhase = (index: number, field: keyof PhaseItem, value: any) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setPhases(newPhases);
  };

  const handleStandardToggle = (checked: boolean) => {
    if (checked && currentStandardTemplate && currentStandardTemplate.id !== templateId) {
      setShowStandardWarning(true);
    } else {
      setIsStandard(checked);
    }
  };

  const handleConfirmStandardChange = () => {
    setIsStandard(true);
    setShowStandardWarning(false);
  };

  const handleSave = () => {
    const templateData = {
      template_name: templateName,
      description,
      phases,
      is_default: isStandard,
      is_system: false,
    };

    if (templateId) {
      updateTemplate.mutate({ id: templateId, updates: templateData });
    } else {
      createTemplate.mutate(templateData);
    }

    onOpenChange(false);
  };

  const totalDays = phases.reduce((sum, p) => sum + p.defaultDurationDays, 0);
  const totalBudget = phases.reduce((sum, p) => sum + p.defaultBudgetPercentage, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {templateId ? t("phaseTemplates.editor.editTitle") : t("phaseTemplates.editor.title")}
          </DialogTitle>
          <DialogDescription>
            {t("phaseTemplates.editor.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">{t("phaseTemplates.editor.templateNameLabel")}</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t("phaseTemplates.editor.templateNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("phaseTemplates.editor.descriptionLabel")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("phaseTemplates.editor.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="isStandard"
                checked={isStandard}
                onCheckedChange={handleStandardToggle}
              />
              <div className="flex-1">
                <Label htmlFor="isStandard" className="text-base font-medium cursor-pointer">
                  {t("phaseTemplates.editor.standardLabel")}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("phaseTemplates.editor.standardDescription")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("phaseTemplates.editor.phasesLabel")}</Label>
              <Button size="sm" variant="outline" onClick={addPhase}>
                <Plus className="h-4 w-4 mr-1" />
                {t("phaseTemplates.editor.addPhase")}
              </Button>
            </div>

            <div className="space-y-2">
              {phases.map((phase, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <Label className="text-xs">{t("phaseTemplates.editor.phaseNameLabel")}</Label>
                        <Input
                          value={phase.phaseName}
                          onChange={(e) => updatePhase(index, 'phaseName', e.target.value)}
                          placeholder={t("phaseTemplates.editor.phaseNamePlaceholder")}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">{t("phaseTemplates.editor.daysLabel")}</Label>
                        <Input
                          type="number"
                          value={phase.defaultDurationDays}
                          onChange={(e) => updatePhase(index, 'defaultDurationDays', parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">{t("phaseTemplates.editor.budgetLabel")}</Label>
                        <Input
                          type="number"
                          value={phase.defaultBudgetPercentage}
                          onChange={(e) => updatePhase(index, 'defaultBudgetPercentage', parseFloat(e.target.value))}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhase(index)}
                          disabled={phases.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
              <span>{t("phaseTemplates.editor.totalSummary", { count: phases.length })}</span>
              <span>·</span>
              <span>{t("phaseTemplates.editor.totalDays", { days: totalDays })}</span>
              <span>·</span>
              <span className={totalBudget !== 100 ? "text-warning" : "text-success"}>
                {t("phaseTemplates.editor.totalBudget", { budget: totalBudget })} {totalBudget !== 100 && t("phaseTemplates.editor.budgetWarning")}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("phaseTemplates.editor.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!templateName || phases.some(p => !p.phaseName)}>
              {templateId ? t("phaseTemplates.editor.saveChanges") : t("phaseTemplates.createTemplate")}
            </Button>
          </div>
        </div>

        <AlertDialog open={showStandardWarning} onOpenChange={setShowStandardWarning}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("phaseTemplates.standardTemplateWarning.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("phaseTemplates.standardTemplateWarning.message", {
                  currentTemplate: currentStandardTemplate?.template_name || "current"
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>{t("phaseTemplates.standardTemplateWarning.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmStandardChange}>
                {t("phaseTemplates.standardTemplateWarning.confirm")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
