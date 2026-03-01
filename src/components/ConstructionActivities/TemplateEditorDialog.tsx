import { useState, useEffect } from "react";
import { useActivityTemplates } from "@/hooks/useActivityTemplates";
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
import { ActivityListItem } from "./ActivityListItem";
import { Plus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";

type ActivityTemplate = Database['public']['Tables']['activity_templates']['Row'];

interface Activity {
  sequence: number;
  name: string;
  defaultDays: number;
}

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ActivityTemplate | null;
  isCreating: boolean;
  readOnly?: boolean;
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  isCreating,
  readOnly = false,
}: TemplateEditorDialogProps) {
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);

  const { createTemplate, updateTemplate } = useActivityTemplates();
  const { t } = useLocalization();

  useEffect(() => {
    if (template) {
      setTemplateName(template.template_name);
       
      setDescription(template.description || "");
      const templateActivities = (template.activities as unknown as Array<Record<string, any>>) || [];

      const normalizedActivities: Activity[] = templateActivities.map((activity, index) => ({
        sequence: activity.sequence ?? index + 1,
        name: activity.name ?? activity.activityName ?? "",
        defaultDays: typeof activity.defaultDays === "number" ? activity.defaultDays : 1,
      }));
      
      setActivities(normalizedActivities);
    } else {
       
      setTemplateName("");
       
      setDescription("");
       
      setActivities([]);
    }
  }, [template]);

  const handleAddActivity = () => {
    const newSequence = activities.length > 0 
      ? Math.max(...activities.map(a => a.sequence)) + 1 
      : 1;
    
    setActivities([
      ...activities,
      { sequence: newSequence, name: "", defaultDays: 1 },
    ]);
  };

  const handleUpdateActivity = (sequence: number, updates: Partial<Activity>) => {
    setActivities(activities.map(a => 
      a.sequence === sequence ? { ...a, ...updates } : a
    ));
  };

  const handleRemoveActivity = (sequence: number) => {
    setActivities(activities.filter(a => a.sequence !== sequence));
  };

  const handleSave = () => {
    const templateData = {
      template_name: templateName,
      description,
      activities: activities.map((activity) => ({
        sequence: activity.sequence,
        activityName: activity.name,
        defaultDays: activity.defaultDays,
      })),
      is_default: false,
      is_system: false,
    };

    if (isCreating) {
      createTemplate.mutate(templateData);
    } else if (template) {
      updateTemplate.mutate({ 
        id: template.id, 
        updates: templateData 
      });
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? t('constructionActivities.viewTemplate') : isCreating ? t('constructionActivities.newTemplate') : t('constructionActivities.editTemplate')}
          </DialogTitle>
          <DialogDescription>
            {readOnly 
              ? t('constructionActivities.viewTemplateDesc') 
              : isCreating 
                ? t('constructionActivities.newTemplateDesc') 
                : t('constructionActivities.editTemplateDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="templateName">{t('constructionActivities.templateNameLabel')}</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              disabled={readOnly}
              placeholder={t('constructionActivities.templateNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('constructionActivities.descriptionLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={readOnly}
              placeholder={t('constructionActivities.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('constructionActivities.activitiesLabel')} ({activities.length})</Label>
              {!readOnly && (
                <Button onClick={handleAddActivity} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('constructionActivities.addActivity')}
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('constructionActivities.noActivitiesYet')}
                </p>
              ) : (
                activities.map((activity) => (
                  <ActivityListItem
                    key={activity.sequence}
                    activity={activity}
                    onUpdate={handleUpdateActivity}
                    onRemove={handleRemoveActivity}
                    readOnly={readOnly}
                  />
                ))
              )}
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('constructionActivities.cancel')}
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!templateName || activities.length === 0}
              >
                {isCreating ? t('constructionActivities.createTemplateButton') : t('constructionActivities.saveChanges')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
