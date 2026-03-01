import { useState } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProjects } from "@/hooks/useProjects";
import { useActivityTemplates } from "@/hooks/useActivityTemplates";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFromTemplateDialog({ open, onOpenChange }: CreateFromTemplateDialogProps) {
  const { t } = useLocalization();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { projects, isLoading: projectsLoading } = useProjects();
  const { templates, isLoading: templatesLoading } = useActivityTemplates();
  const { createActivitiesFromTemplate } = useProjectActivities(selectedProjectId);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const templateActivities = selectedTemplate?.activities as Array<{
    sequence: number;
    name: string;
    defaultDays: number;
  }> || [];

  const totalDays = templateActivities.reduce((sum, act) => sum + act.defaultDays, 0);
  const activityCount = templateActivities.length;

  const handleCreate = () => {
    if (!selectedProjectId || !selectedTemplateId) return;

    createActivitiesFromTemplate.mutate({
      projectId: selectedProjectId,
      templateActivities,
      startDate: selectedProject?.start_date ? new Date(selectedProject.start_date) : new Date(),
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setSelectedProjectId("");
        setSelectedTemplateId("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('constructionActivities.createFromTemplate')}</DialogTitle>
        </DialogHeader>

          <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">{t('constructionActivities.selectProject')}</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder={t('constructionActivities.chooseProject')} />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">{t('constructionActivities.selectTemplate')}</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger id="template">
                <SelectValue placeholder={t('constructionActivities.chooseTemplate')} />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                      {template.is_default && ` ${t('constructionActivities.defaultSuffix')}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedTemplate && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('constructionActivities.previewInfo', { activityCount, totalDays })}
              </AlertDescription>
            </Alert>
          )}

          {selectedProject && !selectedProject.start_date && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('constructionActivities.noStartDateWarning')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('constructionActivities.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedProjectId || !selectedTemplateId || createActivitiesFromTemplate.isPending}
          >
            {createActivitiesFromTemplate.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('constructionActivities.createActivities')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
