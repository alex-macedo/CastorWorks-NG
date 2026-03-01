import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getDateFnsLocale } from "@/utils/dateLocaleUtils";

interface ActivityCalendarHeaderProps {
  viewType: "weekly" | "monthly" | "yearly";
  modeType: "single" | "multi";
  currentDate: Date;
  onViewTypeChange: (view: "weekly" | "monthly" | "yearly") => void;
  onModeTypeChange: (mode: "single" | "multi") => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function ActivityCalendarHeader({
  viewType,
  modeType,
  currentDate,
  onViewTypeChange,
  onModeTypeChange,
  onPrevious,
  onNext,
  onToday,
}: ActivityCalendarHeaderProps) {
  const { t, language } = useLocalization();
  const locale = getDateFnsLocale(language);

  const getDateLabel = () => {
    if (viewType === "weekly") {
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${format(currentDate, "MMM d", { locale })} - ${format(weekEnd, "MMM d, yyyy", { locale })}`;
    } else if (viewType === "monthly") {
      return format(currentDate, "MMMM yyyy", { locale });
    } else {
      return format(currentDate, "yyyy", { locale });
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("schedule:calendar.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("schedule:calendar.description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {/* View Type Selector */}
          <div className="flex items-center gap-3">
            <Label className="font-semibold">{t("schedule:calendar.view")}</Label>
            <RadioGroup value={viewType} onValueChange={(v) => onViewTypeChange(v as any)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="weekly" id="view-weekly" />
                <Label htmlFor="view-weekly" className="cursor-pointer">
                  {t("schedule:calendar.weekly")}
                </Label>
                <RadioGroupItem value="monthly" id="view-monthly" />
                <Label htmlFor="view-monthly" className="cursor-pointer">
                  {t("schedule:calendar.monthly")}
                </Label>
                <RadioGroupItem value="yearly" id="view-yearly" />
                <Label htmlFor="view-yearly" className="cursor-pointer">
                  {t("schedule:calendar.yearly")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mode Type Selector */}
          <div className="flex items-center gap-3">
            <Label className="font-semibold">{t("schedule:calendar.mode")}</Label>
            <RadioGroup value={modeType} onValueChange={(v) => onModeTypeChange(v as any)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="single" id="mode-single" />
                <Label htmlFor="mode-single" className="cursor-pointer">
                  {t("schedule:calendar.singleProject")}
                </Label>
                <RadioGroupItem value="multi" id="mode-multi" />
                <Label htmlFor="mode-multi" className="cursor-pointer">
                  {t("schedule:calendar.allProjects")}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            {t("schedule:calendar.today")}
          </Button>
          <Button variant="outline" size="sm" onClick={onNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-lg font-semibold">{getDateLabel()}</div>
      </div>
    </div>
  );
}
