import { useState } from "react";
import { Save, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useViewTemplates, ViewTemplateInput } from "@/hooks/useViewTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ViewTemplateManagerProps {
  currentFilters: {
    status: string[];
    progressMin: number | null;
    progressMax: number | null;
    startDateFrom: string;
    startDateTo: string;
    endDateFrom: string;
    endDateTo: string;
  };
  currentSort: { field?: string; direction?: 'asc' | 'desc' };
  currentVisibleColumns: string[];
  onLoadTemplate: (template: ViewTemplateInput) => void;
}

export function ViewTemplateManager({
  currentFilters,
  currentSort,
  currentVisibleColumns,
  onLoadTemplate,
}: ViewTemplateManagerProps) {
  const { t } = useLocalization();
  const { templates, createTemplate, deleteTemplate } = useViewTemplates("project_plan");
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;

    await createTemplate.mutateAsync({
      name: templateName,
      description: templateDescription,
      filters: currentFilters,
      sort_config: currentSort,
      visible_columns: currentVisibleColumns,
    });

    setTemplateName("");
    setTemplateDescription("");
    setSaveDialogOpen(false);
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      onLoadTemplate({
        name: template.name,
        filters: template.filters as any,
        sort_config: template.sort_config,
        visible_columns: template.visible_columns,
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Load Template Dropdown */}
      <Select onValueChange={handleLoadTemplate}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t("projectPhases.viewTemplates.loadTemplate")} />
        </SelectTrigger>
        <SelectContent>
          {templates?.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                {template.is_default && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                <span>{template.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Save Template Button */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            {t("projectPhases.viewTemplates.saveView")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectPhases.viewTemplates.saveViewTemplate")}</DialogTitle>
            <DialogDescription>
              {t("projectPhases.viewTemplates.saveViewDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t("projectPhases.viewTemplates.templateName")}</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t("projectPhases.viewTemplates.templateNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">{t("projectPhases.viewTemplates.description")}</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder={t("projectPhases.viewTemplates.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t("projectPhases.viewTemplates.cancel")}
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              {t("projectPhases.viewTemplates.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Button (only if templates exist) */}
      {templates && templates.length > 0 && (
        <Select onValueChange={(id) => {
          setTemplateToDelete(id);
          setDeleteDialogOpen(true);
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("projectPhases.viewTemplates.manageTemplates")} />
          </SelectTrigger>
          <SelectContent>
            {templates?.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="truncate">{template.name}</span>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projectPhases.viewTemplates.deleteTemplate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("projectPhases.viewTemplates.deleteTemplateConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("projectPhases.viewTemplates.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("projectPhases.viewTemplates.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
