import { useMemo } from "react";
import {
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachDayOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  isSameMonth,
} from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getDateFnsLocale } from "@/utils/dateLocaleUtils";

type ProjectActivity = any; // Workaround for type error in tool

interface YearlyCalendarProps {
  currentDate: Date;
  activities: any[];
  onActivityClick?: (activity: any) => void;
}

export function YearlyCalendar({
  currentDate,
  activities,
  onActivityClick,
}: YearlyCalendarProps) {
  const { t, language } = useLocalization();
  const locale = getDateFnsLocale(language);

  const { yearStart, months, activitiesByMonth } = useMemo(() => {
    const start = startOfYear(currentDate);
    const end = endOfYear(currentDate);
    const monthList = eachMonthOfInterval({ start, end });

    // Count activities per month
    const byMonth: { [key: string]: any[] } = {};

    monthList.forEach((month) => {
      const monthKey = format(month, "yyyy-MM");
      byMonth[monthKey] = [];
    });

    activities.forEach((activity) => {
      if (!activity.start_date || !activity.end_date) return;

      const actStart = startOfDay(new Date(activity.start_date));
      const actEnd = startOfDay(new Date(activity.end_date));

      monthList.forEach((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        if (
          !(actEnd < monthStart) &&
          !(actStart > monthEnd)
        ) {
          const monthKey = format(month, "yyyy-MM");
          byMonth[monthKey].push(activity);
        }
      });
    });

    return {
      yearStart: start,
      months: monthList,
      activitiesByMonth: byMonth,
    };
  }, [currentDate, activities]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{format(yearStart, "yyyy", { locale })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {months.map((month) => {
            const monthKey = format(month, "yyyy-MM");
            const monthActivities = activitiesByMonth[monthKey] || [];
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

            // Simple heatmap - color intensity based on activity count
            const getActivityIntensity = (day: Date) => {
              const dayKey = format(day, "yyyy-MM-dd");
              let count = 0;

              monthActivities.forEach((activity) => {
                if (!activity.start_date || !activity.end_date) return;
                const actStart = startOfDay(new Date(activity.start_date));
                const actEnd = startOfDay(new Date(activity.end_date));
                const dayDate = startOfDay(day);

                if (dayDate >= actStart && dayDate <= actEnd) {
                  count++;
                }
              });

              return count;
            };

            const getIntensityColor = (count: number) => {
              if (count === 0) return "bg-muted/50";
              if (count === 1) return "bg-blue-200 dark:bg-blue-900/40";
              if (count === 2) return "bg-blue-400 dark:bg-blue-700/60";
              return "bg-blue-600 dark:bg-blue-500/80";
            };

            return (
              <div key={monthKey} className="border border-border rounded-lg p-3 bg-card">
                <div className="font-semibold text-sm mb-3 text-foreground">
                  {format(month, "MMM", { locale })}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                    <div key={index} className="text-center text-[10px] font-medium text-muted-foreground">
                      {t(`schedule.calendar.daysShort.${index}`) || ["S", "M", "T", "W", "T", "F", "S"][index]}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 mt-1">
                  {Array(days[0].getDay())
                    .fill(null)
                    .map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                  {days.map((day) => {
                    const count = getActivityIntensity(day);
                    return (
                      <div
                        key={format(day, "yyyy-MM-dd")}
                        className={`w-6 h-6 rounded text-[10px] flex items-center justify-center cursor-pointer transition-all ${getIntensityColor(
                          count
                        )} ${count > 0 ? "text-white hover:opacity-80" : "text-muted-foreground/50"}`}
                         title={t("schedule:calendar.activitiesTooltip", { date: format(day, "MMM d", { locale }), count }) || `${format(day, "MMM d", { locale })}: ${count} activities`}
                      >
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
                 <div className="mt-3 text-[10px] text-muted-foreground">
                   <div className="font-medium">{monthActivities.length} {t("schedule:calendar.activityCount") || "activities"}</div>
                  {monthActivities.slice(0, 2).map((activity) => (
                    <div
                      key={activity.id}
                      className="truncate text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      onClick={() => onActivityClick?.(activity)}
                    >
                      {activity.name}
                    </div>
                  ))}
                   {monthActivities.length > 2 && (
                     <div className="text-muted-foreground/70">
                       {t("schedule:calendar.moreActivities", { count: monthActivities.length - 2 }) || `+${monthActivities.length - 2} more`}
                     </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
