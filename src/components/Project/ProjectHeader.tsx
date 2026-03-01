import { Building2, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getScheduleStatusTranslationKey, getStatusBadgeVariant } from "@/utils/badgeVariants";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { cn } from "@/lib/utils";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";

interface ProjectHeaderProps {
  project?: {
    name: string;
    status?: string;
    schedule_status?: string | null;
    client_name?: string;
    start_date?: string;
    end_date?: string;
    progress?: number;
  };
  isLoading?: boolean;
  showStatus?: boolean;
  showClient?: boolean;
  showDates?: boolean;
  showProgress?: boolean;
  withGradient?: boolean;
}

export function ProjectHeader({
  project,
  isLoading = false,
  showStatus = true,
  showClient = true,
  showDates = true,
  showProgress = true,
  withGradient = true,
}: ProjectHeaderProps) {
  const { t, dateFormat } = useLocalization();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-4 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-32" />
      </div>
    );
  }

  if (!project) {
    return null;
  }
  const scheduleStatus = getProjectScheduleStatus(project)
  const hasDateInfo = showDates && (project.start_date || project.end_date);
  const hasProgress = showProgress && typeof project.progress === 'number';

  return (
    <SidebarHeaderShell withGradient={withGradient} variant="auto">
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Building2 className={cn("h-5 w-5", withGradient ? "text-white/80" : "text-muted-foreground")} />
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {showStatus && (
            <Badge variant={getStatusBadgeVariant(scheduleStatus)}>
              {t(getScheduleStatusTranslationKey(scheduleStatus))}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-8">
          {showClient && project.client_name && (
            <p className={cn("text-sm", withGradient ? "text-white/80" : "text-muted-foreground")}>
              Client: {project.client_name}
            </p>
          )}
          
          {hasDateInfo && (
            <div className={cn("flex items-center gap-2 text-sm", withGradient ? "text-white/80" : "text-muted-foreground")}>
              <Calendar className="h-4 w-4" />
              <span>
                {project.start_date && <>Start: {formatDate(project.start_date, dateFormat)}</>}
                {project.start_date && project.end_date && <span className="mx-2">•</span>}
                {project.end_date && <>End: {formatDate(project.end_date, dateFormat)}</>}
              </span>
            </div>
          )}

          {hasProgress && (
            <div className="flex items-center gap-3">
              <div className={cn("flex items-center gap-2 text-sm min-w-[120px]", withGradient ? "text-white/80" : "text-muted-foreground")}>
                <TrendingUp className="h-4 w-4" />
                <span>Progress: {project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2 max-w-xs" />
            </div>
          )}
        </div>
      </div>
    </SidebarHeaderShell>
  );
}
