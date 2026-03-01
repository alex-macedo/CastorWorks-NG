/* eslint-disable react-hooks/preserve-manual-memoization */
import { useState, useRef, useEffect, useCallback } from "react";
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ChevronRight, ChevronDown, ZoomIn, ZoomOut, Maximize2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Milestone } from "@/hooks/useMilestones";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";

interface GanttActivity {
  id: string;
  name: string;
  sequence: number;
  start_date?: string | null;
  end_date?: string | null;
  days_for_activity: number;
  phase_id?: string | null;
  dependencies?: Array<{
    activityId: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
    lag: number;
  }>;
  is_critical?: boolean;
  completion_percentage?: number;
}

interface GanttPhase {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  status: string;
  is_critical?: boolean;
}

interface GanttChartProps {
  phases: GanttPhase[];
  activities: GanttActivity[];
  milestones?: Milestone[];
  onUpdateActivity: (id: string, updates: any) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
}

type ZoomLevel = 'day' | 'week' | 'month';

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const NAME_COLUMN_WIDTH = 420;

export function GanttChart({ phases, activities, milestones = [], onUpdateActivity, onMilestoneClick }: GanttChartProps) {

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [draggingActivity, setDraggingActivity] = useState<{ id: string; startX: number; originalStart: Date } | null>(null);
  const [resizingActivity, setResizingActivity] = useState<{
    id: string;
    edge: 'start' | 'end';
    startX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate date range
  const allDates = [
    ...phases.map(p => [new Date(p.start_date), new Date(p.end_date)]).flat(),
    ...activities.map(a => a.start_date && a.end_date ? [new Date(a.start_date), new Date(a.end_date)] : []).flat(),
    ...milestones.map(m => new Date(m.due_date))
  ].filter(Boolean) as Date[];

  const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date();
  const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : addDays(new Date(), 30);

  // Add padding
  const chartStart = addDays(startOfMonth(minDate), -7);
  const chartEnd = addDays(endOfMonth(maxDate), 7);
  const totalDays = differenceInDays(chartEnd, chartStart);

  // Calculate column width based on zoom level
  const getColumnWidth = () => {
    switch (zoomLevel) {
      case 'day': return 40;
      case 'week': return 100;
      case 'month': return 90; // Fits "MMM yyyy" more tightly
      default: return 90;
    }
  };

  const columnWidth = getColumnWidth();
  const timelineWidth = totalDays * (columnWidth / (zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 30));

  // Generate timeline headers
  const getTimelineHeaders = () => {
    switch (zoomLevel) {
      case 'day':
        return eachDayOfInterval({ start: chartStart, end: chartEnd });
      case 'week':
        return eachWeekOfInterval({ start: chartStart, end: chartEnd }, { weekStartsOn: 1 });
      case 'month':
        return eachMonthOfInterval({ start: chartStart, end: chartEnd });
      default:
        return [];
    }
  };

  const headers = getTimelineHeaders();

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const getBarPosition = useCallback((startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysFromStart = differenceInDays(start, chartStart);
    const duration = differenceInDays(end, start);

    const x = (daysFromStart / totalDays) * timelineWidth;
    const width = Math.max((duration / totalDays) * timelineWidth, 4);

    return { x, width };
  }, [chartStart, totalDays, timelineWidth]);

  const handleBarMouseDown = useCallback((e: React.MouseEvent, activity: GanttActivity) => {
    if (!activity.start_date) return;
    
    e.preventDefault();
    setDraggingActivity({
      id: activity.id,
      startX: e.clientX,
      originalStart: new Date(activity.start_date),
    });
  }, []);

  const handleResizeMouseDown = useCallback((
    e: React.MouseEvent,
    activity: GanttActivity,
    edge: 'start' | 'end'
  ) => {
    if (!activity.start_date || !activity.end_date) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering the bar drag
    setResizingActivity({
      id: activity.id,
      edge,
      startX: e.clientX,
      originalStart: new Date(activity.start_date),
      originalEnd: new Date(activity.end_date),
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle resize
      if (resizingActivity) {
        const deltaX = e.clientX - resizingActivity.startX;
        const daysDelta = Math.round((deltaX / timelineWidth) * totalDays);
        
        const activity = activities.find(a => a.id === resizingActivity.id);
        if (!activity) return;
        
        let newStart = resizingActivity.originalStart;
        let newEnd = resizingActivity.originalEnd;
        
        if (resizingActivity.edge === 'start') {
          newStart = addDays(resizingActivity.originalStart, daysDelta);
          // Enforce minimum 1 day duration
          if (differenceInDays(newEnd, newStart) < 1) {
            newStart = addDays(newEnd, -1);
          }
        } else {
          newEnd = addDays(resizingActivity.originalEnd, daysDelta);
          // Enforce minimum 1 day duration
          if (differenceInDays(newEnd, newStart) < 1) {
            newEnd = addDays(newStart, 1);
          }
        }
        
        // Visual feedback
        const bar = document.querySelector(`[data-activity-id="${activity.id}"]`);
        if (bar) {
          const pos = getBarPosition(
            newStart.toISOString().split('T')[0],
            newEnd.toISOString().split('T')[0]
          );
          bar.setAttribute('x', pos.x.toString());
          bar.setAttribute('width', pos.width.toString());
        }
        
        return;
      }

      // Handle drag
      if (!draggingActivity) return;

      const deltaX = e.clientX - draggingActivity.startX;
      const daysDelta = Math.round((deltaX / timelineWidth) * totalDays);

      if (daysDelta !== 0) {
        const activity = activities.find(a => a.id === draggingActivity.id);
        if (!activity || !activity.start_date) return;

        const newStart = addDays(draggingActivity.originalStart, daysDelta);
        const newEnd = addDays(newStart, activity.days_for_activity);

        // Visual feedback only - actual update on mouse up
        const bar = document.querySelector(`[data-activity-id="${activity.id}"]`);
        if (bar) {
          const pos = getBarPosition(
            newStart.toISOString().split('T')[0],
            newEnd.toISOString().split('T')[0]
          );
          bar.setAttribute('x', pos.x.toString());
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Handle resize end
      if (resizingActivity) {
        const deltaX = e.clientX - resizingActivity.startX;
        const daysDelta = Math.round((deltaX / timelineWidth) * totalDays);
        
        if (daysDelta !== 0) {
          const activity = activities.find(a => a.id === resizingActivity.id);
          if (activity) {
            let newStart = resizingActivity.originalStart;
            let newEnd = resizingActivity.originalEnd;
            
            if (resizingActivity.edge === 'start') {
              newStart = addDays(resizingActivity.originalStart, daysDelta);
              if (differenceInDays(newEnd, newStart) < 1) {
                newStart = addDays(newEnd, -1);
              }
            } else {
              newEnd = addDays(resizingActivity.originalEnd, daysDelta);
              if (differenceInDays(newEnd, newStart) < 1) {
                newEnd = addDays(newStart, 1);
              }
            }
            
            const duration = differenceInDays(newEnd, newStart);
            
            onUpdateActivity(activity.id, {
              start_date: newStart.toISOString().split('T')[0],
              end_date: newEnd.toISOString().split('T')[0],
              days_for_activity: duration,
            });
          }
        }
        
        setResizingActivity(null);
        return;
      }

      // Handle drag end
      if (!draggingActivity) return;

      const deltaX = e.clientX - draggingActivity.startX;
      const daysDelta = Math.round((deltaX / timelineWidth) * totalDays);

      if (daysDelta !== 0) {
        const activity = activities.find(a => a.id === draggingActivity.id);
        if (activity && activity.start_date) {
          const newStart = addDays(draggingActivity.originalStart, daysDelta);
          const newEnd = addDays(newStart, activity.days_for_activity);

          onUpdateActivity(activity.id, {
            start_date: newStart.toISOString().split('T')[0],
            end_date: newEnd.toISOString().split('T')[0],
          });
        }
      }

      setDraggingActivity(null);
    };

    if (draggingActivity || resizingActivity) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingActivity, resizingActivity, activities, timelineWidth, totalDays, getBarPosition, onUpdateActivity]);

  const drawDependencyArrow = (fromActivity: GanttActivity, toActivity: GanttActivity, depType: string) => {
    if (!fromActivity.start_date || !fromActivity.end_date || !toActivity.start_date || !toActivity.end_date) {
      return null;
    }

    const fromIndex = activities.findIndex(a => a.id === fromActivity.id);
    const toIndex = activities.findIndex(a => a.id === toActivity.id);

    // Calculate phase offset
    let fromY = HEADER_HEIGHT;
    let toY = HEADER_HEIGHT;

    phases.forEach((phase, phaseIdx) => {
      const phaseActivities = activities.filter(a => a.phase_id === phase.id);
      
      const fromInPhase = phaseActivities.find(a => a.id === fromActivity.id);
      const toInPhase = phaseActivities.find(a => a.id === toActivity.id);

      if (fromInPhase) {
        fromY += ROW_HEIGHT; // Phase row
        fromY += phaseActivities.findIndex(a => a.id === fromActivity.id) * ROW_HEIGHT;
      }

      if (toInPhase) {
        toY += ROW_HEIGHT; // Phase row
        toY += phaseActivities.findIndex(a => a.id === toActivity.id) * ROW_HEIGHT;
      }

      if (!fromInPhase && !toInPhase && expandedPhases.has(phase.id)) {
        if (phaseIdx < phases.findIndex(p => activities.filter(a => a.phase_id === p.id).some(a => a.id === fromActivity.id))) {
          fromY += ROW_HEIGHT + phaseActivities.length * ROW_HEIGHT;
        }
        if (phaseIdx < phases.findIndex(p => activities.filter(a => a.phase_id === p.id).some(a => a.id === toActivity.id))) {
          toY += ROW_HEIGHT + phaseActivities.length * ROW_HEIGHT;
        }
      } else if (!fromInPhase && !toInPhase) {
        if (phaseIdx < phases.findIndex(p => activities.filter(a => a.phase_id === p.id).some(a => a.id === fromActivity.id))) {
          fromY += ROW_HEIGHT;
        }
        if (phaseIdx < phases.findIndex(p => activities.filter(a => a.phase_id === p.id).some(a => a.id === toActivity.id))) {
          toY += ROW_HEIGHT;
        }
      }
    });

    const fromPos = getBarPosition(fromActivity.start_date, fromActivity.end_date);
    const toPos = getBarPosition(toActivity.start_date, toActivity.end_date);

    let startX = fromPos.x + fromPos.width;
    const startY = fromY + ROW_HEIGHT / 2;
    let endX = toPos.x;
    const endY = toY + ROW_HEIGHT / 2;

    if (depType === 'SS') {
      startX = fromPos.x;
      endX = toPos.x;
    } else if (depType === 'FF') {
      startX = fromPos.x + fromPos.width;
      endX = toPos.x + toPos.width;
    }

    const midX = (startX + endX) / 2;

    const isCritical = fromActivity.is_critical && toActivity.is_critical;
    const color = isCritical ? '#ef4444' : '#94a3b8';

    return (
      <g key={`${fromActivity.id}-${toActivity.id}`}>
        <path
          d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
          stroke={color}
          strokeWidth="2"
          fill="none"
          markerEnd={`url(#arrowhead-${isCritical ? 'critical' : 'normal'})`}
        />
      </g>
    );
  };

  return (
    <Card className="overflow-hidden w-full max-w-[70vw] mx-auto">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h3 className="font-semibold">Gantt Chart Timeline</h3>
        <div className="flex items-center gap-2">
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as ZoomLevel)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpandedPhases(new Set(phases.map(p => p.id)))}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={chartRef}
        className="w-full"
      >
        <div className="flex w-full">
          {/* Left column - Activity names */}
          <div className="sticky left-0 z-20 bg-background border-r" style={{ width: NAME_COLUMN_WIDTH }}>
            <div className="font-medium p-3 border-b bg-muted/50" style={{ height: HEADER_HEIGHT }}>
              Activity
            </div>
            {phases.map((phase) => {
              const isExpanded = expandedPhases.has(phase.id);
              const phaseActivities = activities.filter(a => a.phase_id === phase.id);

              return (
                <div key={phase.id}>
                  <div
                    className="flex items-center gap-2 p-3 border-b bg-muted/20 font-medium cursor-pointer hover:bg-muted/30"
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => togglePhase(phase.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="truncate">{phase.phase_name}</span>
                  </div>
                  {isExpanded && phaseActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-2 p-3 pl-8 border-b text-sm hover:bg-muted/10"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <span className="text-muted-foreground text-xs">#{activity.sequence}</span>
                      <span className="truncate flex-1">{activity.name}</span>
                      {activity.is_critical && (
                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Right column - Timeline */}
          <div className="relative" style={{ width: timelineWidth }}>
            {/* Timeline header */}
            <div className="sticky top-0 z-10 bg-background border-b" style={{ height: HEADER_HEIGHT }}>
              <div className="flex h-full">
                {headers.map((date, idx) => (
                  <div
                    key={idx}
                    className="border-r flex items-center justify-center text-xs font-medium"
                    style={{ width: columnWidth, minWidth: columnWidth }}
                  >
                    {zoomLevel === 'day' && format(date, 'EEE d')}
                    {zoomLevel === 'week' && `Week ${format(date, 'w')}`}
                    {zoomLevel === 'month' && format(date, 'MMM yyyy')}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline grid and bars */}
            <div className="relative">
              {/* Grid lines */}
              <svg className="absolute inset-0 pointer-events-none" style={{ width: timelineWidth, height: phases.length * ROW_HEIGHT + activities.length * ROW_HEIGHT }}>
                <defs>
                  <pattern id="grid" width={columnWidth} height={ROW_HEIGHT} patternUnits="userSpaceOnUse">
                    <path d={`M ${columnWidth} 0 L 0 0 0 ${ROW_HEIGHT}`} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Today line */}
                {(() => {
                  const todayPos = getBarPosition(
                    new Date().toISOString().split('T')[0],
                    new Date().toISOString().split('T')[0]
                  );
                  return (
                    <line
                      x1={todayPos.x}
                      y1={0}
                      x2={todayPos.x}
                      y2="100%"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      opacity="0.3"
                      strokeDasharray="4"
                    />
                  );
                })()}

                {/* Milestone markers */}
                {milestones.map((milestone, idx) => {
                  const pos = getBarPosition(milestone.due_date, milestone.due_date);
                  const isAchieved = milestone.status === 'achieved';
                  const isOverdue = milestone.status === 'pending' && new Date(milestone.due_date) < new Date();
                  
                  return (
                    <TooltipProvider key={milestone.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <g
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => onMilestoneClick?.(milestone)}
                          >
                            <line
                              x1={pos.x}
                              y1={0}
                              x2={pos.x}
                              y2="100%"
                              stroke={isAchieved ? '#22c55e' : isOverdue ? '#ef4444' : '#f59e0b'}
                              strokeWidth="3"
                              strokeDasharray="6,4"
                              opacity="0.6"
                            />
                            <polygon
                              points={`${pos.x},0 ${pos.x-8},16 ${pos.x+8},16`}
                              fill={isAchieved ? '#22c55e' : isOverdue ? '#ef4444' : '#f59e0b'}
                            />
                            <circle
                              cx={pos.x}
                              cy={8}
                              r={4}
                              fill="white"
                            />
                          </g>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">{milestone.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(milestone.due_date)}
                            </p>
                            {milestone.description && (
                              <p className="text-xs mt-1">{milestone.description}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </svg>

              {/* Activity bars */}
              {phases.map((phase, phaseIdx) => {
                const isExpanded = expandedPhases.has(phase.id);
                const phaseActivities = activities.filter(a => a.phase_id === phase.id);
                const yOffset = phaseIdx * ROW_HEIGHT + phaseActivities.slice(0, phaseIdx).length * ROW_HEIGHT;

                return (
                  <div key={phase.id}>
                    {/* Phase bar */}
                    <svg className="absolute pointer-events-none" style={{ top: yOffset, width: timelineWidth, height: ROW_HEIGHT }}>
                      {phase.start_date && phase.end_date && (() => {
                        const pos = getBarPosition(phase.start_date, phase.end_date);
                        return (
                          <rect
                            x={pos.x}
                            y={8}
                            width={pos.width}
                            height={ROW_HEIGHT - 16}
                            fill={phase.is_critical ? '#fee2e2' : 'hsl(var(--muted))'}
                            stroke={phase.is_critical ? '#ef4444' : 'hsl(var(--border))'}
                            strokeWidth="2"
                            rx="4"
                            opacity="0.6"
                          />
                        );
                      })()}
                    </svg>

                    {/* Activity bars */}
                    {isExpanded && phaseActivities.map((activity, actIdx) => {
                      const actYOffset = yOffset + ROW_HEIGHT + actIdx * ROW_HEIGHT;

                      return activity.start_date && activity.end_date ? (
                        <svg
                          key={activity.id}
                          className="absolute"
                          style={{ top: actYOffset, width: timelineWidth, height: ROW_HEIGHT }}
                        >
                          {(() => {
                            const pos = getBarPosition(activity.start_date, activity.end_date);
                            const progress = activity.completion_percentage || 0;

                            return (
                              <g>
                                {/* Main bar */}
                                <rect
                                  data-activity-id={activity.id}
                                  x={pos.x}
                                  y={10}
                                  width={pos.width}
                                  height={ROW_HEIGHT - 20}
                                  fill={activity.is_critical ? '#fecaca' : '#3b82f6'}
                                  stroke={activity.is_critical ? '#ef4444' : '#2563eb'}
                                  strokeWidth="2"
                                  rx="4"
                                  className="cursor-move hover:opacity-80 transition-opacity"
                                  onMouseDown={(e) => handleBarMouseDown(e as any, activity)}
                                />

                                {/* Left resize handle */}
                                <rect
                                  x={pos.x}
                                  y={10}
                                  width={8}
                                  height={ROW_HEIGHT - 20}
                                  fill="transparent"
                                  className="cursor-col-resize hover:fill-primary/20"
                                  onMouseDown={(e) => handleResizeMouseDown(e as any, activity, 'start')}
                                />

                                {/* Right resize handle */}
                                <rect
                                  x={pos.x + pos.width - 8}
                                  y={10}
                                  width={8}
                                  height={ROW_HEIGHT - 20}
                                  fill="transparent"
                                  className="cursor-col-resize hover:fill-primary/20"
                                  onMouseDown={(e) => handleResizeMouseDown(e as any, activity, 'end')}
                                />

                                {/* Progress fill */}
                                {progress > 0 && (
                                  <rect
                                    x={pos.x}
                                    y={10}
                                    width={(pos.width * progress) / 100}
                                    height={ROW_HEIGHT - 20}
                                    fill={activity.is_critical ? '#ef4444' : '#1d4ed8'}
                                    rx="4"
                                    opacity="0.6"
                                    className="pointer-events-none"
                                  />
                                )}
                              </g>
                            );
                          })()}
                        </svg>
                      ) : null;
                    })}
                  </div>
                );
              })}

              {/* Dependency arrows */}
              <svg
                ref={svgRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: timelineWidth, height: phases.length * ROW_HEIGHT + activities.length * ROW_HEIGHT }}
              >
                <defs>
                  <marker
                    id="arrowhead-normal"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
                  </marker>
                  <marker
                    id="arrowhead-critical"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>
                {activities.flatMap((activity) =>
                  (activity.dependencies || []).map((dep) => {
                    const predecessor = activities.find(a => a.id === dep.activityId);
                    return predecessor ? drawDependencyArrow(predecessor, activity, dep.type) : null;
                  })
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
