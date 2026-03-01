import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ListTodo } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";

type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];
type ProjectActivity = Database['public']['Tables']['project_activities']['Row'];

interface PhaseTimelineProps {
  phases: ProjectPhase[];
  activities?: ProjectActivity[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function PhaseTimeline({ phases, activities, isExpanded, onToggleExpand }: PhaseTimelineProps) {
  const { t } = useLocalization();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in_progress': return 'bg-primary';
      case 'on_hold': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': t('projectPhases.statusLabels.completed'),
      'in_progress': t('projectPhases.statusLabels.inProgress'),
      'on_hold': t('projectPhases.statusLabels.onHold'),
      'pending': t('projectPhases.statusLabels.pending'),
    };
    return statusMap[status] || status;
  };

  const getWorkloadClass = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count < 5) return "bg-success/20 text-success-foreground border-success/30";
    if (count <= 10) return "bg-warning/20 text-warning-foreground border-warning/30";
    return "bg-destructive/20 text-destructive-foreground border-destructive/30";
  };

  const formatDateSafe = (value?: string | null) => {
    if (!value) return "-";
    try {
      return formatDate(value);
    } catch {
      return "-";
    }
  };

  const columns = [
    t("projectPhases.columns.activity"),
    t("projectPhases.columns.start"),
    t("projectPhases.columns.end"),
    t("projectPhases.columns.duration"),
    t("projectPhases.columns.progress"),
  ];

  const durationInDays = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "-";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const ms = endDate.getTime() - startDate.getTime();
    if (Number.isNaN(ms)) return "-";
    const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
    return `${days}d`;
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const gridTemplate = "grid-cols-[minmax(260px,2fr),minmax(150px,1fr),minmax(150px,1fr),minmax(110px,0.85fr),minmax(200px,1fr)]";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{t("projectPhases.timelineTitle")}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpand}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div className={`grid ${gridTemplate} gap-3 px-3 pb-2 text-xs font-semibold text-muted-foreground border-b`}>
              {columns.map((col) => (
                <span key={col} className="truncate">{col}</span>
              ))}
            </div>
            {phases.map((phase) => {
              const phaseActivities = activities?.filter(a => a.phase_id === phase.id) || [];
              const isPhaseExpanded = expandedPhases.has(phase.id);

              return (
                <div key={phase.id} className="space-y-2">
                  <div className={`grid ${gridTemplate} gap-3 items-center px-3 py-2 rounded-lg bg-muted/30`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => togglePhase(phase.id)}
                        disabled={phaseActivities.length === 0}
                      >
                        {isPhaseExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="font-medium truncate">{phase.phase_name}</span>
                        <Badge variant="outline" className={getStatusColor(phase.status || 'pending')}>
                          {getStatusLabel(phase.status || 'pending')}
                        </Badge>
                        {activities && (
                          <Badge 
                            variant="outline" 
                            className={`gap-1 ${getWorkloadClass(phaseActivities.length)}`}
                          >
                            <ListTodo className="h-3 w-3" />
                            {phaseActivities.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatDateSafe(phase.start_date)}</div>
                    <div className="text-sm text-muted-foreground">{formatDateSafe(phase.end_date)}</div>
                    <div className="text-sm text-muted-foreground">{durationInDays(phase.start_date, phase.end_date)}</div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>{phase.progress_percentage ?? 0}%</span>
                      <Progress value={phase.progress_percentage || 0} className="h-2 w-full" />
                    </div>
                  </div>

                  {activities && isPhaseExpanded && phaseActivities.length > 0 && (
                    <div className="space-y-1">
                      {phaseActivities
                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                        .map(activity => (
                          <div
                            key={activity.id}
                            className={`grid ${gridTemplate} gap-3 items-center px-3 py-1.5 rounded-md hover:bg-muted/40`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pl-10">
                              <span className="text-muted-foreground text-xs shrink-0">#{activity.sequence}</span>
                              <span className="truncate">{activity.name}</span>
                              {activity.is_critical && (
                                <Badge variant="destructive" className="text-[10px]">{t('projectPhases.critical')}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{formatDateSafe(activity.start_date)}</div>
                            <div className="text-sm text-muted-foreground">{formatDateSafe(activity.end_date)}</div>
                            <div className="text-sm text-muted-foreground">
                              {durationInDays(activity.start_date, activity.end_date)}
                            </div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              <span>{activity.completion_percentage ?? 0}%</span>
                              <Progress value={activity.completion_percentage || 0} className="h-2 w-full" />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
