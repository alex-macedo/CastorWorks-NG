import { useEffect, useState } from "react";
import { useActivityCalendarStore } from "@/stores/activityCalendar";
import { useActivityCalendar } from "@/hooks/useActivityCalendar";
import { Database } from "@/integrations/supabase/types";
import { ActivityCalendarHeader } from "./ActivityCalendarHeader";
import { ProjectSelector } from "./ProjectSelector";
import { WeeklyCalendar } from "./WeeklyCalendar";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { YearlyCalendar } from "./YearlyCalendar";
import { Loader2 } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

type ProjectActivity = any; // Workaround for type error in tool

interface ActivityCalendarProps {
  onActivityClick?: (activity: ProjectActivity) => void;
  projectId?: string;
  hideProjectSelector?: boolean;
  forceModeType?: "single" | "multi";
  customActivities?: any[];
}

export function ActivityCalendar({
  onActivityClick,
  projectId,
  hideProjectSelector,
  forceModeType,
  customActivities,
}: ActivityCalendarProps) {
  const { t } = useLocalization();

  const {
    viewType,
    modeType,
    currentDate,
    selectedProjectId,
    setViewType,
    setModeType,
    setSelectedProject,
    goToNextPeriod,
    goToPreviousPeriod,
    goToToday,
  } = useActivityCalendarStore();

  const effectiveModeType = forceModeType ?? modeType;
  const effectiveProjectId = projectId ?? selectedProjectId;

  useEffect(() => {
    if (forceModeType) setModeType(forceModeType);
  }, [forceModeType, setModeType]);

  useEffect(() => {
    if (projectId) setSelectedProject(projectId);
  }, [projectId, setSelectedProject]);

  const { data, isLoading, error } = useActivityCalendar(
    effectiveProjectId,
    effectiveModeType
  );

  const activities = customActivities || data?.activities || [];

  return (
    <div className="w-full space-y-6">
      <ActivityCalendarHeader
        viewType={viewType}
        modeType={effectiveModeType}
        currentDate={currentDate}
        onViewTypeChange={setViewType}
        onModeTypeChange={setModeType}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onToday={goToToday}
      />

      {!hideProjectSelector && (
        <ProjectSelector
          selectedProjectId={effectiveProjectId}
          onProjectChange={setSelectedProject}
          modeType={effectiveModeType}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">{t("schedule:calendar.loadingCalendar") || "Loading calendar..."}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {t("schedule:calendar.error") || "Error loading calendar. Please try again."}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {viewType === "weekly" && (
            <WeeklyCalendar
              currentDate={currentDate}
              activities={activities}
              onActivityClick={onActivityClick}
            />
          )}

          {viewType === "monthly" && (
            <MonthlyCalendar
              currentDate={currentDate}
              activities={activities}
              onActivityClick={onActivityClick}
            />
          )}

          {viewType === "yearly" && (
            <YearlyCalendar
              currentDate={currentDate}
              activities={activities}
              onActivityClick={onActivityClick}
            />
          )}
        </>
      )}
    </div>
  );
}
