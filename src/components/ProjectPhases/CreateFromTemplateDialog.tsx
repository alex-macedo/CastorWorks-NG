import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import { useActivityTemplates } from "@/hooks/useActivityTemplates";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useWbsTemplates } from "@/hooks/useWbsTemplates";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { PhaseTemplate } from "@/types/phaseTemplate";
import { formatDate } from "@/utils/reportFormatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Layers, ListTodo, Network } from "lucide-react";

interface CreateFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedProjectId?: string;
}

export function CreateFromTemplateDialog({
  open,
  onOpenChange,
  preSelectedProjectId,
}: CreateFromTemplateDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => preSelectedProjectId || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedActivityTemplateId, setSelectedActivityTemplateId] = useState<string>("");
  const [selectedWbsTemplateId, setSelectedWbsTemplateId] = useState<string>("");

  const { t, dateFormat } = useLocalization();
  const { toast } = useToast();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { templates, isLoading: templatesLoading } = usePhaseTemplates();
  const { templates: activityTemplates, isLoading: activityTemplatesLoading } = useActivityTemplates();
  const { templates: wbsTemplates, isLoading: wbsTemplatesLoading, useTemplateItems } = useWbsTemplates();

  // Find default templates
  const defaultPhaseTemplate = templates?.find(t => t.is_default);
  const defaultActivityTemplate = activityTemplates?.find(t => t.is_default);
  const defaultWbsTemplate = wbsTemplates?.find(t => t.is_default);

  // Set default template IDs on mount
  useEffect(() => {
    if (defaultPhaseTemplate && !selectedTemplateId) {
      setSelectedTemplateId(defaultPhaseTemplate.id);
    }
    if (defaultActivityTemplate && !selectedActivityTemplateId) {
      setSelectedActivityTemplateId(defaultActivityTemplate.id);
    }
    if (defaultWbsTemplate && !selectedWbsTemplateId) {
      setSelectedWbsTemplateId(defaultWbsTemplate.id);
    }
  }, [defaultPhaseTemplate, defaultActivityTemplate, defaultWbsTemplate, selectedTemplateId, selectedActivityTemplateId, selectedWbsTemplateId]);
  const { createPhasesFromTemplate } = useProjectPhases(selectedProjectId || undefined);
  const { createActivitiesFromTemplate } = useProjectActivities(selectedProjectId || undefined);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);
  const selectedTemplate = templates?.find((t: PhaseTemplate) => t.id === selectedTemplateId);
  const selectedActivityTemplate = activityTemplates?.find(t => t.id === selectedActivityTemplateId);
  const selectedWbsTemplate = wbsTemplates?.find(t => t.id === selectedWbsTemplateId);

  // Calculate total duration from selected phase template
  const totalDuration = selectedTemplate?.phases?.reduce((sum, phase) => sum + (phase.defaultDurationDays || 0), 0) || 0;

  // Calculate estimated end date
  const estimatedEndDate = selectedProject && selectedProject.start_date && totalDuration > 0
    ? new Date(new Date(selectedProject.start_date).getTime() + (totalDuration - 1) * 24 * 60 * 60 * 1000)
    : null;

  const handleCreate = async () => {
    if (!selectedProject) return;

    try {
      let firstPhaseId: string | undefined;

      // Step 1: Create phases from template if selected
      if (selectedTemplateId && selectedTemplateId !== "none") {
        const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
        if (selectedTemplate) {
          const createdPhases = await createPhasesFromTemplate.mutateAsync({
            projectId: selectedProject.id,
            templatePhases: selectedTemplate.phases,
            projectStartDate: selectedProject.start_date ? new Date(selectedProject.start_date) : null,
            projectBudget: selectedProject.budget_total || 0,
          });

          firstPhaseId = (createdPhases as any[])?.[0]?.id;
        }
      }

      // Step 2: Create activities from template if selected and project has a start date
      // Explicitly check that activity template is selected (not "none" and not empty)
      if (selectedActivityTemplateId && selectedActivityTemplateId !== "none" && selectedActivityTemplate && selectedProject.start_date) {
        const templateActivities = selectedActivityTemplate.activities as any[];

        if (templateActivities && templateActivities.length > 0) {
          // Map template activities to the format expected by createActivitiesFromTemplate
          const mappedActivities = templateActivities.map((act) => ({
            sequence: act.sequence,
            name: act.description || act.activityName || act.name || `Activity ${act.sequence}`,
            defaultDays: act.duration || act.defaultDays || 1,
            startOffset: act.startOffset,
            endOffset: act.endOffset,
            duration: act.duration,
            description: act.description,
          }));

          await createActivitiesFromTemplate.mutateAsync({
            projectId: selectedProject.id,
            templateActivities: mappedActivities,
            startDate: new Date(selectedProject.start_date),
          });
        }
      }

      // Step 3: Apply WBS template if selected
      if (selectedWbsTemplateId && selectedWbsTemplateId !== "none") {
        const { error: wbsError } = await supabase.rpc(
          'apply_wbs_template_to_project_internal',
          {
            _project_id: selectedProject.id,
            _template_id: selectedWbsTemplateId,
          }
        );

        if (wbsError) {
          console.error('Failed to apply WBS template:', wbsError);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to create WBS items from template",
          });
        }
      }

      const description = `Your project schedule has been created with phases${selectedActivityTemplateId && selectedActivityTemplateId !== "none" ? ', activities' : ''}${selectedWbsTemplateId && selectedWbsTemplateId !== "none" ? ', and WBS structure' : ''}`;
      toast({
        title: t('toast.scheduleCreated', { defaultValue: 'Schedule created successfully' }),
        description: description
      });

      onOpenChange(false);
      setSelectedProjectId(preSelectedProjectId || "");
      setSelectedTemplateId("");
      setSelectedActivityTemplateId("");
      setSelectedWbsTemplateId("");
    } catch (error) {
      console.error('Error creating schedule from template:', error);
      // Errors are already shown by the mutation's onError handler
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Activities, Phases, and Schedule from Templates</DialogTitle>
          <DialogDescription>
            Select templates to automatically create your project schedule structure
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!preSelectedProjectId && (
            <div className="space-y-2">
              <Label>{t("projectPhases.createFromTemplate.selectProjectLabel")}</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("projectPhases.createFromTemplate.selectProjectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {selectedProject && (
            <div className="text-sm text-muted-foreground flex items-center gap-6 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date: {selectedProject.start_date ? formatDate(selectedProject.start_date, dateFormat) : 'Not set'}
              </span>
              {totalDuration > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Total Duration: {totalDuration} days
                </span>
              )}
              {estimatedEndDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. End Date: {formatDate(estimatedEndDate, dateFormat)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Budget: ${selectedProject.budget_total?.toLocaleString() || 0}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Phase Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a phase template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No phases</SelectItem>
                {templates?.map((template: PhaseTemplate) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.template_name}
                      {template.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Activity Template</Label>
            <Select value={selectedActivityTemplateId} onValueChange={setSelectedActivityTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No activities</SelectItem>
                {activityTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.template_name}
                      {template.is_default && <Badge variant="secondary" className="ml-2">Default</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>WBS Template (Optional)</Label>
            <Select
              value={selectedWbsTemplateId}
              onValueChange={setSelectedWbsTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select WBS template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No WBS</SelectItem>
                {wbsTemplates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.template_name}
                      {template.is_default && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!selectedProjectId || !selectedTemplateId || createPhasesFromTemplate.isPending || createActivitiesFromTemplate.isPending}
            >
              {(createPhasesFromTemplate.isPending || createActivitiesFromTemplate.isPending) ? 'Creating Schedule...' : 'Create Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
