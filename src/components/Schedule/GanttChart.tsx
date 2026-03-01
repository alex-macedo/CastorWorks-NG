import { useMemo } from "react";
import { differenceInDays, format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getActivityStatus } from "@/utils/timelineCalculators";
import { Database } from "@/integrations/supabase/types";

type ProjectActivity = Database["public"]["Tables"]["project_activities"]["Row"];

interface GanttChartProps {
  activities: ProjectActivity[];
  onActivityClick?: (activity: ProjectActivity) => void;
}

export function GanttChart({ activities, onActivityClick }: GanttChartProps) {
  const { t } = useLocalization();

  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (activities.length === 0) {
      const today = new Date();
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 30),
        totalDays: 30,
      };
    }

    const dates = activities
      .filter(a => a.start_date && a.end_date)
      .flatMap(a => [new Date(a.start_date!), new Date(a.end_date!)]);

    if (dates.length === 0) {
      const today = new Date();
      return {
        timelineStart: today,
        timelineEnd: addDays(today, 30),
        totalDays: 30,
      };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      timelineStart: startOfMonth(minDate),
      timelineEnd: endOfMonth(maxDate),
      totalDays: differenceInDays(endOfMonth(maxDate), startOfMonth(minDate)),
    };
  }, [activities]);

  const today = new Date();
  const todayPosition = ((differenceInDays(today, timelineStart) / totalDays) * 100);

  const getActivityPosition = (activity: ProjectActivity) => {
    if (!activity.start_date || !activity.end_date) return null;

    const start = new Date(activity.start_date);
    const end = new Date(activity.end_date);

    const startOffset = differenceInDays(start, timelineStart);
    const duration = differenceInDays(end, start);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getActivityColor = (activity: ProjectActivity) => {
    const status = getActivityStatus({
      sequence: activity.sequence,
      name: activity.name,
      start_date: activity.start_date,
      end_date: activity.end_date,
      completion_date: activity.completion_date,
      completion_percentage: activity.completion_percentage,
      days_for_activity: activity.days_for_activity,
    });

    switch (status) {
      case "completed":
        return "bg-success";
      case "delayed":
        return "bg-destructive";
      case "in_progress":
        return "bg-primary";
      case "not_started":
        return "bg-muted";
    }
  };

  const monthsInTimeline = useMemo(() => {
    const months: Date[] = [];
    let current = startOfMonth(timelineStart);
    const end = endOfMonth(timelineEnd);

    while (current <= end) {
      months.push(new Date(current));
      current = addDays(current, 1);
      current = startOfMonth(addDays(endOfMonth(current), 1));
    }

    return months;
  }, [timelineStart, timelineEnd]);

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("schedule:gantt.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            {t("schedule:activities.noActivities")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("schedule:gantt.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Timeline header */}
          <div className="min-w-[800px] mb-4">
            <div className="flex border-b pb-2">
              <div className="w-48 flex-shrink-0"></div>
              <div className="flex-1 flex">
                {monthsInTimeline.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-center text-sm font-medium text-muted-foreground"
                  >
                    {format(month, "MMM yyyy")}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt rows */}
          <div className="min-w-[800px] relative">
            {/* Today marker */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                style={{ left: `calc(192px + ${todayPosition}%)` }}
              >
                <div className="absolute -top-6 -left-8 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                  {t("schedule:gantt.today")}
                </div>
              </div>
            )}

            {activities.map((activity) => {
              const position = getActivityPosition(activity);
              const color = getActivityColor(activity);

              return (
                <div key={activity.id} className="flex items-center py-2 border-b group hover:bg-muted/50">
                  <div className="w-48 flex-shrink-0 pr-4">
                    <p className="text-sm font-medium truncate">{activity.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.days_for_activity} {t("schedule:gantt.days")}
                    </p>
                  </div>
                  <div className="flex-1 relative h-8">
                    {position && (
                      <div
                        className={`absolute h-6 ${color} rounded cursor-pointer transition-all hover:opacity-80 group-hover:shadow-md`}
                        style={{
                          left: position.left,
                          width: position.width,
                        }}
                        onClick={() => onActivityClick?.(activity)}
                        title={`${activity.name}\n${activity.start_date} - ${activity.end_date}\n${activity.completion_percentage}% complete`}
                      >
                        <div className="h-full flex items-center justify-center text-xs text-white font-medium px-2">
                          {activity.completion_percentage}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
