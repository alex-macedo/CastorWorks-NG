import { useMemo } from "react";
import { differenceInDays } from "date-fns";
// import type { Database } from "@/integrations/supabase/types";
import { getActivityStatus } from "@/utils/timelineCalculators";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";

// Temporary type definition until Database types are generated
type ProjectActivity = {
  id: string;
  sequence: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  completion_date: string | null;
  completion_percentage: number | null;
  days_for_activity: number | null;
};

interface ActivityBarProps {
  activity: ProjectActivity;
  timelineStart: Date;
  totalDays: number;
  onActivityClick?: (activity: ProjectActivity) => void;
}

export function ActivityBar({
  activity,
  timelineStart,
  totalDays,
  onActivityClick,
}: ActivityBarProps) {
  const { dateFormat } = useLocalization();
  const { position, color, width } = useMemo(() => {
    if (!activity.start_date || !activity.end_date) {
      return { position: null, color: "", width: "" };
    }

    const start = new Date(activity.start_date);
    const end = new Date(activity.end_date);

    const startOffset = differenceInDays(start, timelineStart);
    const duration = differenceInDays(end, start);

    const status = getActivityStatus({
      sequence: activity.sequence,
      name: activity.name,
      start_date: activity.start_date,
      end_date: activity.end_date,
      completion_date: activity.completion_date,
      completion_percentage: activity.completion_percentage,
      days_for_activity: activity.days_for_activity,
    });

    let bgColor = "bg-blue-400";
    switch (status) {
      case "completed":
        bgColor = "bg-green-500";
        break;
      case "in_progress":
        bgColor = "bg-orange-400";
        break;
      case "delayed":
        bgColor = "bg-red-500";
        break;
      case "not_started":
        bgColor = "bg-blue-400";
        break;
    }

    const safeStartOffset = Math.max(0, startOffset);
    const safeDuration = Math.max(1, duration);

    return {
      position: {
        left: `${(safeStartOffset / totalDays) * 100}%`,
        width: `${(safeDuration / totalDays) * 100}%`,
      },
      color: bgColor,
      width: `${(safeDuration / totalDays) * 100}%`,
    };
  }, [activity, timelineStart, totalDays]);

  if (!position) return null;

  return (
    <div
      className={`${color} absolute h-7 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer hover:opacity-80 transition-opacity overflow-hidden whitespace-nowrap truncate`}
      style={position}
      onClick={() => onActivityClick?.(activity)}
      title={`${activity.name} - ${activity.start_date ? formatDate(new Date(activity.start_date), dateFormat) : ""} to ${
        activity.end_date ? formatDate(new Date(activity.end_date), dateFormat) : ""
      }`}
    >
      {activity.name}
    </div>
  );
}
