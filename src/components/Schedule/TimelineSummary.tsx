import { Calendar, TrendingUp, CalendarCheck, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useSystemPreferences } from "@/hooks/useSystemPreferences";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TimelineSummaryProps {
  totalDuration: number;
  completionPercentage: number;
  expectedEndDate: string;
  startDate?: string;
  endDate?: string;
  daysRemaining: number;
  scheduleHealth: "on_track" | "at_risk" | "delayed";
}

export function TimelineSummary({
  totalDuration,
  completionPercentage,
  expectedEndDate,
  startDate,
  endDate,
  daysRemaining,
  scheduleHealth,
}: TimelineSummaryProps) {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();
  const { data: systemPreferences } = useSystemPreferences();
  const timezone = systemPreferences?.system_time_zone || 'America/New_York';

  const getHealthBadge = () => {
    let label = t("schedule:summary.onSchedule");
    let className = "bg-success hover:bg-success";

    if (scheduleHealth === "on_track") {
      label = t("schedule:summary.onSchedule");
      className = "bg-success hover:bg-success";
    } else if (scheduleHealth === "at_risk") {
      label = t("schedule:summary.atRisk");
      className = "bg-warning hover:bg-warning";
    } else {
      label = t("schedule:summary.behindSchedule");
      className = "bg-destructive hover:bg-destructive";
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={className}>{label}</Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t('common:scheduleStatus.timezoneTooltip', { timezone })}
          </TooltipContent>
        </Tooltip>
        <Badge variant="outline" className="text-[10px] font-medium">
          {t('common:scheduleStatus.timezoneChip', { timezone })}
        </Badge>
      </div>
    );
  };

  const getProgressColor = () => {
    if (completionPercentage >= 80) return "bg-success";
    if (completionPercentage >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.startDate")}</p>
              <p className="text-sm font-bold">
                {startDate ? formatDate(startDate) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.endDate")}</p>
              <p className="text-sm font-bold">
                {endDate ? formatDate(endDate) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.estimatedDuration")}</p>
              <p className="text-xl font-bold">{totalDuration}</p>
              <p className="text-[10px] text-muted-foreground">{t("schedule:summary.workingDays")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <CalendarCheck className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.expectedEndDate")}</p>
              <p className="text-sm font-bold">
                {formatDate(expectedEndDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.completionPercentage")}</p>
              <p className="text-xl font-bold">{completionPercentage}%</p>
              <Progress value={completionPercentage} className="mt-1 h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10">
              <Clock className="h-5 w-5 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{t("schedule:summary.daysRemaining")}</p>
              <p className="text-xl font-bold">{daysRemaining}</p>
              <div className="mt-1">{getHealthBadge()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
