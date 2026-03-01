import { format } from "date-fns";
import { MoreHorizontal, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AvatarResolved } from "@/components/ui/AvatarResolved";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Project, ProjectWithClipping } from "@/types/projectsTimeline";
import { cn } from "@/lib/utils";
import { useProjectsStore } from "@/stores/projectsTimeline";

interface ProjectCardProps {
  project: Project | ProjectWithClipping;
  clippedBefore?: boolean;
  clippedAfter?: boolean;
  actualStartDate?: Date;
}

const priorityColors = {
  high: {
    bg: "bg-[#feeeea] dark:bg-orange-950",
    border: "border border-[rgba(224,76,36,0.06)] dark:border-orange-900/20",
    text: "text-[#f65428] dark:text-orange-400",
    dot: "#f65428",
  },
  medium: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    border: "border border-yellow-200/10 dark:border-yellow-900/20",
    text: "text-yellow-700 dark:text-yellow-400",
    dot: "#ffb74a",
  },
  low: {
    bg: "bg-green-50 dark:bg-green-950",
    border: "border border-green-200/10 dark:border-green-900/20",
    text: "text-green-700 dark:text-green-400",
    dot: "#4caf50",
  },
};

const stripeColors = {
  blue: {
    bg: "#96e0ff",
    stripe: "#1abcfe",
  },
  orange: {
    bg: "#ffdeac",
    stripe: "#ffb74a",
  },
  yellow: {
    bg: "#ffdeac",
    stripe: "#ffb74a",
  },
  purple: {
    bg: "#e1bee7",
    stripe: "#ab47bc",
  },
  red: {
    bg: "#ef9a9a",
    stripe: "#ef5350",
  },
  green: {
    bg: "#a5d6a7",
    stripe: "#66bb6a",
  },
  pink: {
    bg: "#f48fb1",
    stripe: "#ec407a",
  },
  indigo: {
    bg: "#9fa8da",
    stripe: "#5c6bc0",
  },
  cyan: {
    bg: "#80deea",
    stripe: "#26c6da",
  },
};

export function ProjectCard({ project, clippedBefore, clippedAfter, actualStartDate }: ProjectCardProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { showAvatars, showPriority } = useProjectsStore();
  const startDate = new Date(project.startDate);
  const endDate = new Date(project.endDate);
  const priorityColor = priorityColors[project.priority];
  const stripeColor =
    stripeColors[project.color as keyof typeof stripeColors] ||
    stripeColors.blue;

  const handleProjectClick = () => {
    navigate(`/projects?project=${project.id}`);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Show project menu with options (Edit, Delete, etc.)
  };

  return (
    <div
      className="overflow-hidden relative rounded-lg bg-muted/30 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.1),0px_2px_6px_0px_rgba(0,0,0,0.08)] h-[108px] cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={handleProjectClick}
      title={clippedBefore ? `Started ${format(actualStartDate || project.startDate, "MMM dd")}` : t("ui.clickToViewProjectDetails")}
    >
      {/* Clipping indicators */}
      {clippedBefore && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-r from-foreground/40 to-transparent z-10" title={`Started before: ${format(actualStartDate || project.startDate, "MMM dd")}`} />
      )}
      {clippedAfter && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-l from-foreground/40 to-transparent z-10" title={`Ends after this week`} />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-[10px] overflow-hidden rounded-b-lg">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: stripeColor.bg,
            backgroundImage: `repeating-linear-gradient(294.886deg, ${stripeColor.stripe} 0px, ${stripeColor.stripe} 2.108px, transparent 2.108px, transparent 4.216px)`,
            backgroundSize: "8.917px 18.955px",
          }}
        />
      </div>

      <div className="absolute left-3 top-3 right-3 flex flex-col gap-2.5 h-full pb-[14px]">
        <div className="flex flex-col gap-1.5 min-h-[42px]">
          <div className="flex items-center gap-2 h-5">
            <h3 className="flex-1 text-sm font-medium text-foreground truncate min-w-0 leading-[18px] whitespace-nowrap">
              {project.title}
            </h3>
            <ExternalLink className="size-4 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            <Button
              variant="ghost"
              size="icon"
              className="size-5 h-5 w-5 shrink-0 p-0 opacity-60 hover:opacity-100"
              onClick={handleMenuClick}
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </Button>
          </div>
           <div className="flex items-center gap-1 text-xs text-muted-foreground leading-[16px]">
             {clippedBefore && <ChevronLeft className="size-3" />}
             <p>{format(startDate, "EEE dd")} - {format(endDate, "EEE dd")}</p>
             {clippedAfter && <ChevronRight className="size-3" />}
           </div>
           {project.progress !== undefined && (
             <div className="flex items-center gap-2">
               <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                 <div
                   className="h-full bg-primary transition-all duration-300"
                   style={{ width: `${project.progress}%` }}
                 />
               </div>
               <span className="text-xs text-muted-foreground min-w-[2.5rem]">{project.progress}%</span>
             </div>
           )}
          {clippedBefore && (
            <p className="text-xs text-foreground/60 leading-[14px] flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-foreground/40" />
              Started {format(actualStartDate || project.startDate, "MMM dd")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between h-[22px]">
          {showPriority && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-1 pr-2 py-0.5 relative",
                priorityColor.bg,
                priorityColor.border
              )}
              style={{
                boxShadow:
                  "inset 0px 4px 4px 0px rgba(255,255,255,0.25), inset 0px -1px 0px 0px rgba(224,76,36,0.15)",
              }}
            >
              <div
                className="size-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: priorityColor.dot }}
              >
                <div className="size-2 rounded-full bg-white/80" />
              </div>
              <span
                className={cn(
                  "text-sm font-medium capitalize leading-[18px]",
                  priorityColor.text
                )}
              >
                {project.priority}
              </span>
            </div>
          )}

          {showAvatars && (
            <div className="flex items-center -space-x-1.5 pr-1.5">
              {project.assignedUsers.slice(0, 3).map((userId) => (
                <AvatarResolved
                  key={userId}
                  src={null}
                  alt={userId}
                  fallback={userId[0]?.toUpperCase() || 'U'}
                  className="size-5 border-2 border-background relative"
                  fallbackClassName="text-[8px] font-medium"
                />
              ))}
              {project.assignedUsers.length > 3 && (
                <div className="size-5 rounded-full bg-muted border-2 border-background flex items-center justify-center relative">
                  <span className="text-[8px] font-medium text-foreground leading-[10px]">
                    +{project.assignedUsers.length - 3}
                  </span>
                </div>
              )}
            </div>
          )}

          {!showPriority && !showAvatars && <div />}
        </div>
      </div>
    </div>
  );
}
