import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { formatDateSystem } from "@/utils/dateSystemFormatters";

interface AutoScheduleParams {
  startDate: Date;
  area?: number;
  baseline?: number;
  saveScenario?: boolean;
  scenarioName?: string;
}

interface AutoScheduleButtonProps {
  projectStartDate?: string | null;
  projectArea?: number | null;
  onAutoSchedule: (params: AutoScheduleParams) => void;
  disabled?: boolean;
}

export function AutoScheduleButton({
  projectStartDate,
  projectArea,
  onAutoSchedule,
  disabled,
}: AutoScheduleButtonProps) {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    projectStartDate || formatDateSystem(new Date())
  );
  const [baselineArea, setBaselineArea] = useState(100);
  const [currentArea, setCurrentArea] = useState(projectArea || 100);
  const [saveScenario, setSaveScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const scalingFactor = currentArea / baselineArea;

  const handleConfirm = () => {
    onAutoSchedule({
      startDate: new Date(startDate),
      area: currentArea,
      baseline: baselineArea,
      saveScenario,
      scenarioName: scenarioName || `Scenario ${formatDateSystem(new Date())}`,
    });
    setOpen(false);
    setSaveScenario(false);
    setScenarioName("");
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={disabled}
        variant="outline"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {t("schedule:actions.autoSchedule")}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle>{t("schedule:actions.autoSchedule")}</SheetTitle>
            <SheetDescription>
              {t("schedule:messages.confirmAutoSchedule")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-start-date">
                {t("schedule:dialog.startDate")}
              </Label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="baseline-area">
                {t("schedule:dialog.baselineArea")}
              </Label>
                <Input
                  id="baseline-area"
                  type="number"
                  min={1}
                  value={baselineArea}
                  onChange={(e) => setBaselineArea(Number(e.target.value) || 100)}
                />
              </div>
              <div className="space-y-2">
              <Label htmlFor="current-area">
                {t("schedule:dialog.projectArea")}
              </Label>
                <Input
                  id="current-area"
                  type="number"
                  min={1}
                  value={currentArea}
                  onChange={(e) => setCurrentArea(Number(e.target.value) || 100)}
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {t("schedule:dialog.scalingInfo")}: <strong>{scalingFactor.toFixed(2)}x</strong>
              <br />
              {t("schedule:dialog.scalingDescription")}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="save-scenario"
                checked={saveScenario}
                onCheckedChange={(checked) => setSaveScenario(checked as boolean)}
              />
              <Label htmlFor="save-scenario" className="cursor-pointer">
                {t("schedule:dialog.saveScenario")}
              </Label>
            </div>

            {saveScenario && (
              <div className="space-y-2">
                <Label htmlFor="scenario-name">
                  {t("schedule:dialog.scenarioName")}
                </Label>
                <Input
                  id="scenario-name"
                  type="text"
                  placeholder={t("schedule:dialog.scenarioNamePlaceholder")}
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                />
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("schedule:dialog.cancel")}
            </Button>
            <Button onClick={handleConfirm}>
              {t("schedule:actions.autoSchedule")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
