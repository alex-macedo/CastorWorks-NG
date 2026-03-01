import { useState, useEffect } from "react";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalization } from "@/contexts/LocalizationContext";

interface PhaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phaseId?: string;
}

export function PhaseFormDialog({
  open,
  onOpenChange,
  projectId,
  phaseId,
}: PhaseFormDialogProps) {
  const { t } = useLocalization();
  const [phaseName, setPhaseName] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [budgetAllocated, setBudgetAllocated] = useState("");
  const [progressPercentage, setProgressPercentage] = useState("0");
  const [status, setStatus] = useState<string>("pending");

  const { phases, createPhase, updatePhase } = useProjectPhases(projectId);

  const phase = phases?.find(p => p.id === phaseId);

  useEffect(() => {
    if (phase) {
      setPhaseName(phase.phase_name);
       
      setStartDate(phase.start_date || "");
       
      setEndDate(phase.end_date || "");
       
      setBudgetAllocated(phase.budget_allocated?.toString() || "0");
       
      setProgressPercentage(phase.progress_percentage?.toString() || "0");
       
      setStatus(phase.status || "pending");
    } else {
      setPhaseName("");
      setStartDate("");
      setEndDate("");
      setBudgetAllocated("0");
      setProgressPercentage("0");
      setStatus("pending");
    }
  }, [phase]);

  const handleSave = () => {
    const phaseData = {
      project_id: projectId,
      phase_name: phaseName,
      start_date: startDate || null,
      end_date: endDate || null,
      budget_allocated: parseFloat(budgetAllocated) || 0,
      progress_percentage: parseInt(progressPercentage) || 0,
      status: status as any,
      type: (startDate ? 'schedule' : 'budget') as 'schedule' | 'budget', // Set type based on whether dates are provided
    };

    if (phaseId) {
      updatePhase.mutate({ id: phaseId, updates: phaseData });
    } else {
      createPhase.mutate(phaseData);
    }
    
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{phaseId ? t("phases:editPhase") : t("phases:newPhase")}</SheetTitle>
          <SheetDescription>
            {phaseId ? t("projectPhases.phaseForm.modifyDescription") : t("projectPhases.phaseForm.createDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phaseName">{t("projectPhases.phaseForm.nameLabel")}</Label>
            <Input
              id="phaseName"
              value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)}
              placeholder={t("projectPhases.phaseForm.namePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("projectPhases.phaseForm.startDateLabel")}</Label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                max={endDate}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("projectPhases.phaseForm.endDateLabel")}</Label>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                min={startDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">{t("projectPhases.phaseForm.budgetLabel")}</Label>
              <Input
                id="budget"
                type="number"
                value={budgetAllocated}
                onChange={(e) => setBudgetAllocated(e.target.value)}
                placeholder={t("inputPlaceholders.amount")}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">{t("projectPhases.phaseForm.progressLabel")}</Label>
              <Input
                id="progress"
                type="number"
                value={progressPercentage}
                onChange={(e) => setProgressPercentage(e.target.value)}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("projectPhases.phaseForm.statusLabel")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t("projectPhases.phaseForm.statusPending")}</SelectItem>
                <SelectItem value="in_progress">{t("projectPhases.phaseForm.statusInProgress")}</SelectItem>
                <SelectItem value="completed">{t("projectPhases.phaseForm.statusCompleted")}</SelectItem>
                <SelectItem value="on_hold">{t("projectPhases.phaseForm.statusOnHold")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("projectPhases.phaseForm.cancelButton")}
            </Button>
            <Button onClick={handleSave} disabled={!phaseName}>
              {phaseId ? t("projectPhases.phaseForm.saveChangesButton") : t("projectPhases.phaseForm.createPhaseButton")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
