import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  format,
  startOfDay,
  differenceInDays,
} from "date-fns";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getDateFnsLocale } from "@/utils/dateLocaleUtils";

type ProjectActivity = any; // Workaround for type error in tool
type ActivitySegment = {
  activity: any;
  startIndex: number;
  endIndex: number;
  isStart: boolean;
  isEnd: boolean;
  lane: number;
};

interface MonthlyCalendarProps {
  currentDate: Date;
  activities: any[];
  onActivityClick?: (activity: any) => void;
}

export function MonthlyCalendar({
  currentDate,
  activities,
  onActivityClick,
}: MonthlyCalendarProps) {
  const { t, language } = useLocalization();
  const locale = getDateFnsLocale(language);

  const DAYS_SHORT = useMemo(() => [
    t("schedule:calendar.daysShort.0") || "Sun",
    t("schedule:calendar.daysShort.1") || "Mon",
    t("schedule:calendar.daysShort.2") || "Tue",
    t("schedule:calendar.daysShort.3") || "Wed",
    t("schedule:calendar.daysShort.4") || "Thu",
    t("schedule:calendar.daysShort.5") || "Fri",
    t("schedule:calendar.daysShort.6") || "Sat",
  ], [t]);

  const { monthStart, calendarWeeks, weekSegments } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // Pad with previous month's days
    const firstDay = days[0];
    const startDate = startOfDay(firstDay);
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
      days.unshift(new Date(startDate));
    }

    // Pad with next month's days to fill the grid
    const lastDay = days[days.length - 1];
    const endDate = startOfDay(lastDay);
    while (endDate.getDay() !== 6) {
      endDate.setDate(endDate.getDate() + 1);
      days.push(new Date(endDate));
    }

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    const segmentsByWeek = weeks.map((week) => {
      const weekStart = startOfDay(week[0]);
      const weekEnd = startOfDay(week[6]);
      const segments: Omit<ActivitySegment, "lane">[] = [];

      activities.forEach((activity) => {
        if (!activity.start_date || !activity.end_date) return;

        const actStart = startOfDay(new Date(activity.start_date));
        const actEnd = startOfDay(new Date(activity.end_date));

        if (actEnd < weekStart || actStart > weekEnd) return;

        const segmentStart = actStart > weekStart ? actStart : weekStart;
        const segmentEnd = actEnd < weekEnd ? actEnd : weekEnd;

        segments.push({
          activity,
          startIndex: differenceInDays(segmentStart, weekStart),
          endIndex: differenceInDays(segmentEnd, weekStart),
          isStart: actStart >= weekStart,
          isEnd: actEnd <= weekEnd,
        });
      });

      segments.sort((a, b) => {
        if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
        return (a.endIndex - a.startIndex) - (b.endIndex - b.startIndex);
      });

      const laneEnds: number[] = [];
      const placedSegments: ActivitySegment[] = segments.map((segment) => {
        let laneIndex = laneEnds.findIndex((endIndex) => segment.startIndex > endIndex);
        if (laneIndex === -1) {
          laneIndex = laneEnds.length;
          laneEnds.push(segment.endIndex);
        } else {
          laneEnds[laneIndex] = segment.endIndex;
        }
        return { ...segment, lane: laneIndex };
      });

      return {
        segments: placedSegments,
        lanesCount: laneEnds.length,
      };
    });

    return {
      monthStart: start,
      calendarWeeks: weeks,
      weekSegments: segmentsByWeek,
    };
  }, [currentDate, activities]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{format(monthStart, "MMMM yyyy", { locale })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
            {DAYS_SHORT.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="bg-muted text-center font-semibold text-sm py-2 text-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-3">
            {calendarWeeks.map((week, weekIndex) => {
              const { segments, lanesCount } = weekSegments[weekIndex] || {
                segments: [],
                lanesCount: 0,
              };
              const laneHeight = 24;
              const laneGap = 4;
              const headerOffset = 28;
              const baseMinHeight = 120;
              const weekMinHeight = Math.max(
                baseMinHeight,
                headerOffset +
                  lanesCount * laneHeight +
                  Math.max(0, lanesCount - 1) * laneGap +
                  16
              );

              return (
                <div
                  key={`week-${weekIndex}`}
                  className="relative rounded-lg overflow-hidden border border-border"
                >
                  <div className="grid grid-cols-7">
                    {week.map((day, dayIndex) => {
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      const isToday =
                        format(day, "yyyy-MM-dd") ===
                        format(new Date(), "yyyy-MM-dd");

                      return (
                        <div
                          key={format(day, "yyyy-MM-dd")}
                          className={`p-2 text-xs font-semibold border-l border-border ${
                            dayIndex === 0 ? "border-l-0" : ""
                          } ${
                            isCurrentMonth ? "text-foreground bg-card" : "text-muted-foreground bg-muted/20"
                          } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                          style={{ minHeight: weekMinHeight }}
                        >
                          {format(day, "d")}
                        </div>
                      );
                    })}
                  </div>

                  {segments.length > 0 && (
                    <div
                      className="absolute inset-0 z-10 grid grid-cols-7 pt-7 pb-2 pointer-events-none"
                      style={{
                        gridAutoRows: `${laneHeight}px`,
                        rowGap: `${laneGap}px`,
                      }}
                    >
                      {segments.map((segment) => (
                        <button
                          key={`${segment.activity.id}-${weekIndex}-${segment.startIndex}`}
                          type="button"
                          className={`pointer-events-auto flex items-center h-6 px-2 text-left text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-none hover:bg-blue-500/30 dark:hover:bg-blue-500/40 transition-colors ${
                            segment.isStart ? "rounded-l-md border-l-4 border-l-blue-500" : "border-l"
                          } ${segment.isEnd ? "rounded-r-md" : ""}`}
                          style={{
                            gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
                            gridRow: segment.lane + 1,
                          }}
                          onClick={() => onActivityClick?.(segment.activity)}
                          title={segment.activity.name}
                        >
                          <span className="truncate">{segment.activity.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
