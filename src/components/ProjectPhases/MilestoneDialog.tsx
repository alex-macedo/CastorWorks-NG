import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Milestone } from "@/hooks/useMilestones";
import { useLocalization } from "@/contexts/LocalizationContext";

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone?: Milestone | null;
  projectId: string;
  phases: any[];
  onSave: (milestone: Partial<Milestone>) => void;
}

export function MilestoneDialog({
  open,
  onOpenChange,
  milestone,
  projectId,
  phases,
  onSave,
}: MilestoneDialogProps) {
  const { t } = useLocalization();
  const [formData, setFormData] = useState<Partial<Milestone>>({
    name: "",
    description: "",
    due_date: "",
    phase_id: null,
    notify_days_before: 7,
    status: "pending",
  });

  useEffect(() => {
    if (milestone) {
      setFormData(milestone);
    } else {
       
      setFormData({
        name: "",
        description: "",
        due_date: "",
        phase_id: null,
        notify_days_before: 7,
        status: "pending",
      });
    }
  }, [milestone, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.due_date) return;

    const validPhaseIds = new Set((phases || []).map((phase) => phase.id));
    const normalizedPhaseId =
      formData.phase_id && validPhaseIds.has(formData.phase_id) ? formData.phase_id : null;
    
    onSave({
      ...formData,
      phase_id: normalizedPhaseId,
      project_id: projectId,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {milestone ? t("projectPhases.milestoneDialog.editTitle") : t("projectPhases.milestoneDialog.createTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("projectPhases.milestoneDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("projectPhases.milestoneDialog.nameLabel")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("projectPhases.milestoneDialog.namePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("projectPhases.milestoneDialog.descriptionLabel")}</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("projectPhases.milestoneDialog.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase">{t("projectPhases.milestoneDialog.phaseLabel")}</Label>
              <Select
                value={formData.phase_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, phase_id: value === "none" ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("projectPhases.milestoneDialog.phasePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("projectPhases.milestoneDialog.phaseNone")}</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.phase_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">{t("projectPhases.milestoneDialog.dueDateLabel")}</Label>
              <DateInput
                value={formData.due_date}
                onChange={(value) => setFormData({ ...formData, due_date: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify_days">{t("projectPhases.milestoneDialog.notificationLabel")}</Label>
              <Select
                value={formData.notify_days_before?.toString() || "7"}
                onValueChange={(value) => setFormData({ ...formData, notify_days_before: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("projectPhases.milestoneDialog.notification1Day")}</SelectItem>
                  <SelectItem value="3">{t("projectPhases.milestoneDialog.notification3Days")}</SelectItem>
                  <SelectItem value="7">{t("projectPhases.milestoneDialog.notification7Days")}</SelectItem>
                  <SelectItem value="14">{t("projectPhases.milestoneDialog.notification14Days")}</SelectItem>
                  <SelectItem value="30">{t("projectPhases.milestoneDialog.notification30Days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("projectPhases.milestoneDialog.cancelButton")}
            </Button>
            <Button type="submit" disabled={!formData.due_date}>
              {milestone ? t("projectPhases.milestoneDialog.updateButton") : t("projectPhases.milestoneDialog.createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
