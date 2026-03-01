import { useMemo } from "react";
import {
  startOfWeek,
  addDays,
  format,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { ActivityBar } from "./ActivityBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getDateFnsLocale } from "@/utils/dateLocaleUtils";

type ProjectActivity = any; // Workaround for type error in tool

interface WeeklyCalendarProps {
  currentDate: Date;
  activities: any[];
  onActivityClick?: (activity: any) => void;
}

export function WeeklyCalendar({
  currentDate,
  activities,
  onActivityClick,
}: WeeklyCalendarProps) {
  const { t, language } = useLocalization();
  const locale = getDateFnsLocale(language);

  const DAYS_OF_WEEK = useMemo(() => [
    t("schedule:calendar.days.0") || "Sun",
    t("schedule:calendar.days.1") || "Mon",
    t("schedule:calendar.days.2") || "Tue",
    t("schedule:calendar.days.3") || "Wed",
    t("schedule:calendar.days.4") || "Thu",
    t("schedule:calendar.days.5") || "Fri",
    t("schedule:calendar.days.6") || "Sat",
   ], [t]);

  const { weekStart, weekEnd, weekDays } = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = addDays(start, 6);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return { weekStart: start, weekEnd: end, weekDays: days };
  }, [currentDate]);

  const activitiesByDay = useMemo(() => {
    const byDay: { [key: number]: any[] } = {};
    for (let i = 0; i < 7; i++) {
      byDay[i] = [];
    }

    activities.forEach((activity) => {
      if (!activity.start_date || !activity.end_date) return;

      const actStart = startOfDay(new Date(activity.start_date));
      const actEnd = startOfDay(new Date(activity.end_date));

      for (let i = 0; i < 7; i++) {
        const dayDate = startOfDay(weekDays[i]);
        if (dayDate >= actStart && dayDate <= actEnd) {
          byDay[i].push(activity);
        }
      }
    });

    return byDay;
  }, [activities, weekDays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {format(weekStart, "MMM d", { locale })} - {format(weekEnd, "MMM d, yyyy", { locale })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-lg p-3 min-w-[140px] bg-card">
                <div className="font-semibold text-sm mb-2 text-foreground">
                  {DAYS_OF_WEEK[dayIndex]}
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {format(day, "MMM d", { locale })}
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {activitiesByDay[dayIndex].map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 p-2 rounded text-xs cursor-pointer hover:bg-blue-500/30 transition-colors"
                      onClick={() => onActivityClick?.(activity)}
                      title={activity.name}
                    >
                      <div className="font-medium truncate text-blue-700 dark:text-blue-300">
                        {activity.name}
                      </div>
                      {activity.completion_percentage && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {activity.completion_percentage}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
