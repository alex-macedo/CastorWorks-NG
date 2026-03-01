import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import { Slider } from "@/components/ui/slider";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Database } from "@/integrations/supabase/types";
import { calculateEndDate } from "@/utils/timelineCalculators";
import { formatDateSystem } from "@/utils/dateSystemFormatters";

type ProjectActivity = Database["public"]["Tables"]["project_activities"]["Row"];

interface EditActivityDialogProps {
  activity: ProjectActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<ProjectActivity>) => void;
  onDelete: () => void;
}

export function EditActivityDialog({
  activity,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EditActivityDialogProps) {
  const { t } = useLocalization();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [overrideEndDate, setOverrideEndDate] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [completionDate, setCompletionDate] = useState("");

  useEffect(() => {
    if (activity) {
      setName(activity.name);
       
      setStartDate(activity.start_date || "");
       
      setDuration(activity.days_for_activity);
       
      setEndDate(activity.end_date || "");
       
      setCompletionPercentage(activity.completion_percentage);
       
      setCompletionDate(activity.completion_date || "");
       
      setOverrideEndDate(false);
    }
  }, [activity]);

   useEffect(() => {
     if (startDate && duration > 0 && !overrideEndDate) {
       const calculated = calculateEndDate(new Date(startDate), duration, true);
       // Use system locale formatting instead of hardcoded YYYY-MM-DD
       setEndDate(formatDateSystem(calculated));
     }
   }, [startDate, duration, overrideEndDate]);

  const handleSave = () => {
    onSave({
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      days_for_activity: duration,
      completion_percentage: completionPercentage,
       completion_date: completionPercentage === 100 ? (completionDate || formatDateSystem(new Date())) : null,
    });
    onOpenChange(false);
  };

  const handleMarkComplete = () => {
    const today = formatDateSystem(new Date());
    setCompletionPercentage(100);
    setCompletionDate(today);
  };

  if (!activity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("schedule:dialog.editTitle")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="activity-name">{t("schedule:dialog.activityName")}</Label>
            <Input
              id="activity-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{t("schedule:dialog.startDate")}</Label>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                max={overrideEndDate ? endDate : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{t("schedule:dialog.duration")}</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="365"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="end-date">{t("schedule:dialog.endDate")}</Label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideEndDate}
                  onChange={(e) => setOverrideEndDate(e.target.checked)}
                  className="rounded"
                />
                {t("schedule:dialog.overrideEndDate")}
              </label>
            </div>
            <DateInput
              value={endDate}
              onChange={setEndDate}
              disabled={!overrideEndDate}
              min={startDate}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("schedule:dialog.completionPercentage")}: {completionPercentage}%</Label>
            <Slider
              value={[completionPercentage]}
              onValueChange={(value) => setCompletionPercentage(value[0])}
              min={0}
              max={100}
              step={5}
              className="py-4"
            />
          </div>

          {completionPercentage === 100 && (
            <div className="space-y-2">
              <Label htmlFor="completion-date">{t("schedule:dialog.completionDate")}</Label>
              <DateInput
                value={completionDate}
                onChange={setCompletionDate}
              />
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          <Button variant="destructive" onClick={onDelete}>
            {t("schedule:dialog.delete")}
          </Button>
          <div className="flex-1" />
          {completionPercentage < 100 && (
            <Button variant="outline" onClick={handleMarkComplete}>
              {t("schedule:dialog.markComplete")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("schedule:dialog.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("schedule:dialog.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
