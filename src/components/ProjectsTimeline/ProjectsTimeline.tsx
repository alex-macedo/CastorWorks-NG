import { useMemo } from "react";
import { startOfWeek, startOfMonth, startOfYear, addDays, addMonths, addYears, eachDayOfInterval, isSameDay, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { Search, Triangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjectsStore } from "@/stores/projectsTimeline";
import { ProjectCard } from "./ProjectCard";
import { ProjectsFilter } from "./ProjectsFilter";
import { ProjectsCustomize } from "./ProjectsCustomize";
import { DateNavigation } from "./DateNavigation";
import { TimelineWeekHeader } from "./TimelineWeekHeader";
import { TimelineEmptyPattern } from "./TimelineEmptyPattern";
import { Project } from "@/types/projectsTimeline";

export function ProjectsTimeline() {
  const {
    searchQuery,
    setSearchQuery,
    filteredProjects,
    currentWeekStart,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    goToDate,
    zoomLevel,
    setZoomLevel,
  } = useProjectsStore();
  const { t } = useLocalization();

  const projects = filteredProjects();

  const currentWeek = useMemo(() => {
    if (zoomLevel === "project") {
      // For project view, find the earliest and latest dates across all projects
      if (projects.length === 0) {
        return eachDayOfInterval({
          start: currentWeekStart,
          end: addDays(currentWeekStart, 6),
        });
      }

      const allDates = projects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
      const earliestDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const latestDate = new Date(Math.max(...allDates.map(d => d.getTime())));

      // Create a timeline that spans from earliest to latest date
      const start = startOfWeek(earliestDate, { weekStartsOn: 1 });
      const end = addDays(startOfWeek(latestDate, { weekStartsOn: 1 }), 6);

      return eachDayOfInterval({ start, end });
    } else if (zoomLevel === "yearly") {
      const yearStart = startOfYear(currentWeekStart);
      const yearEnd = addYears(yearStart, 1);
      return eachMonthOfInterval({ start: yearStart, end: yearEnd });
    } else if (zoomLevel === "monthly") {
      const monthStart = startOfMonth(currentWeekStart);
      const monthEnd = addMonths(monthStart, 1);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } else {
      // weekly (default)
      const weekStart = startOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return eachDayOfInterval({
        start: weekStart,
        end: addDays(weekStart, 6),
      });
    }
  }, [currentWeekStart, zoomLevel, projects]);

  const today = new Date();
  const todayIndex = currentWeek.findIndex((day) => isSameDay(day, today));
  
  // Adjust dimensions based on zoom level
  const columnWidth = zoomLevel === "yearly" ? 80 : zoomLevel === "monthly" ? 25 : 162;
  const cardHeight = 108;
  const gapBetweenCards = 30;
  const horizontalPadding = 20;

  interface ProjectInfo {
    project: Project;
    startIndex: number;
    endIndex: number;
    spanDays: number;
    clippedBefore: boolean;
    clippedAfter: boolean;
    actualStartDate: Date;
    actualEndDate: Date;
  }

  interface ProjectRow {
    projects: ProjectInfo[];
  }

  const projectRows = useMemo(() => {
    const projectsWithPositions: ProjectInfo[] = [];
    const weekStart = currentWeek[0];
    const weekEnd = currentWeek[currentWeek.length - 1];

    projects.forEach((project) => {
      const startDate = new Date(project.startDate);
      const endDate = new Date(project.endDate);

      // Determine if project is clipped (outside current view)
      const clippedBefore = startDate < weekStart;
      const clippedAfter = endDate > weekEnd;

      // Calculate visible portion within the week (for positioning)
      const visibleStartDate = clippedBefore ? weekStart : startDate;
      const visibleEndDate = clippedAfter ? weekEnd : endDate;

      // Find indices for visible portion
      const startIndex = currentWeek.findIndex((day) =>
        isSameDay(day, visibleStartDate)
      );
      const endIndex = currentWeek.findIndex((day) =>
        isSameDay(day, visibleEndDate)
      );

      // Should always find valid indices for visible portion
      if (startIndex !== -1 && endIndex !== -1) {
        const spanDays = endIndex - startIndex + 1;

        projectsWithPositions.push({
          project,
          startIndex,
          endIndex,
          spanDays,
          clippedBefore,
          clippedAfter,
          actualStartDate: startDate,
          actualEndDate: endDate,
        });
      }
    });

    projectsWithPositions.sort((a, b) => {
      if (a.startIndex !== b.startIndex) {
        return a.startIndex - b.startIndex;
      }
      return a.endIndex - b.endIndex;
    });

    const hasHorizontalOverlap = (
      pos1: { startIndex: number; endIndex: number },
      pos2: { startIndex: number; endIndex: number }
    ): boolean => {
      return (
        pos1.startIndex <= pos2.endIndex && pos1.endIndex >= pos2.startIndex
      );
    };

    const rows: ProjectRow[] = [];

    projectsWithPositions.forEach((projectPos) => {
      let placed = false;

      for (const row of rows) {
        const hasOverlap = row.projects.some((existingProject) =>
          hasHorizontalOverlap(projectPos, existingProject)
        );

        if (!hasOverlap) {
          row.projects.push(projectPos);
          placed = true;
          break;
        }
      }

      if (!placed) {
        rows.push({ projects: [projectPos] });
      }
    });

    return rows;
  }, [projects, currentWeek]);

  // Calculate summary statistics
  const totalPhases = projects.length;
  const visiblePhases = projectRows.reduce((sum, row) => sum + row.projects.length, 0);
  const hiddenPhases = totalPhases - visiblePhases;

  const weekStartDate = currentWeek[0];
  const weekEndDate = currentWeek[currentWeek.length - 1];

  return (
    <div className="flex flex-col gap-4 overflow-hidden w-full py-4 px-4.5 h-full">
      <div className="bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("additionalPlaceholders.searchEllipsis")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Showing all {totalPhases} phases (date filtering disabled)
            </div>
            <ProjectsFilter />
            <ProjectsCustomize />
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0">
        <div className="w-full rounded-2xl overflow-hidden border border-border h-full flex flex-col">
          <div className="border-b bg-background px-4 py-4 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 shadow-none"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <div className="w-px h-6 bg-border" />
                 <div className="flex items-center gap-1">
                   <Button
                     variant={zoomLevel === "project" ? "default" : "outline"}
                     size="sm"
                     className="h-9 px-3 shadow-none"
                     onClick={() => setZoomLevel("project")}
                   >
                     Project
                   </Button>
                   <Button
                     variant={zoomLevel === "yearly" ? "default" : "outline"}
                     size="sm"
                     className="h-9 px-3 shadow-none"
                     onClick={() => setZoomLevel("yearly")}
                   >
                     Yearly
                   </Button>
                   <Button
                     variant={zoomLevel === "monthly" ? "default" : "outline"}
                     size="sm"
                     className="h-9 px-3 shadow-none"
                     onClick={() => setZoomLevel("monthly")}
                   >
                     Monthly
                   </Button>
                   <Button
                     variant={zoomLevel === "weekly" ? "default" : "outline"}
                     size="sm"
                     className="h-9 px-3 shadow-none"
                     onClick={() => setZoomLevel("weekly")}
                   >
                     Weekly
                   </Button>
                 </div>
              </div>
              <DateNavigation
                startDate={weekStartDate}
                endDate={weekEndDate}
                onPrevious={goToPreviousWeek}
                onNext={goToNextWeek}
                onDateSelect={goToDate}
              />
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-auto w-full relative">
            <TimelineWeekHeader weekDays={currentWeek} />

            <div className="relative py-6 w-max min-w-full">
              {projectRows.length === 0 && <TimelineEmptyPattern />}

              {todayIndex !== -1 && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: `${todayIndex * columnWidth + columnWidth / 2}px`,
                    top: 0,
                    bottom: 0,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0">
                    <Triangle
                      className="size-4 text-[#9971F0] rotate-180"
                      fill="#9971F0"
                    />
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-[8px] bottom-0 w-[3px]"
                    style={{ backgroundColor: "#9971F0" }}
                  />
                </div>
              )}

              <div
                className="grid w-full flex-1"
                style={{
                  gridTemplateColumns: `repeat(7, ${columnWidth}px)`,
                  gridAutoRows: `${cardHeight}px`,
                  gap: `${gapBetweenCards}px 0`,
                }}
              >
                {projectRows.map((row, rowIndex) =>
                  row.projects.map((projectInfo) => {
                    const startCol = projectInfo.startIndex + 1;
                    const endCol = projectInfo.endIndex + 2;

                    return (
                      <div
                        key={projectInfo.project.id}
                        className="relative"
                        style={{
                          gridColumn: `${startCol} / ${endCol}`,
                          gridRow: rowIndex + 1,
                          paddingLeft: `${horizontalPadding}px`,
                          paddingRight: `${horizontalPadding}px`,
                        }}
                      >
                        <ProjectCard
                          project={projectInfo.project}
                          clippedBefore={projectInfo.clippedBefore}
                          clippedAfter={projectInfo.clippedAfter}
                          actualStartDate={projectInfo.actualStartDate}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
