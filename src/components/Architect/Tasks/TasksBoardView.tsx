import { useState, useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectTaskStatuses } from '@/hooks/useProjectTaskStatuses';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Circle, Clock, CheckCircle, AlertCircle, XCircle, PlayCircle, PauseCircle, Flag } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import type { ProjectTaskStatus } from '@/types/taskManagement';

// Icon mapping for dynamic statuses
const ICON_MAP = {
  'circle': Circle,
  'clock': Clock,
  'check-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'x-circle': XCircle,
  'play-circle': PlayCircle,
  'pause-circle': PauseCircle,
  'flag': Flag,
};

export type ColumnDensity = 'superCompact' | 'compact' | 'default' | 'relaxed';

const COLUMN_DENSITY_PRESETS: Record<ColumnDensity, { minWidth: number }> = {
  superCompact: { minWidth: 220 },
  compact: { minWidth: 260 },
  default: { minWidth: 320 },
  relaxed: { minWidth: 380 },
};

interface TasksBoardViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
  onTaskCreate: (statusId: string) => void;
  onTaskStatusUpdate: (taskId: string, statusId: string) => void;
  projectId?: string;
  density?: ColumnDensity;
}

export const TasksBoardView = ({ 
  tasks, 
  onTaskEdit, 
  onTaskCreate, 
  onTaskStatusUpdate,
  projectId,
  density = 'default',
}: TasksBoardViewProps) => {
  const { t } = useLocalization();
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columnMinWidth = COLUMN_DENSITY_PRESETS[density]?.minWidth ?? COLUMN_DENSITY_PRESETS.default.minWidth;

  // Get project ID from tasks if not provided
  const inferredProjectId = projectId || tasks[0]?.project_id;

  // Fetch dynamic statuses for the project (only if we have a valid project ID)
  const { statuses, isLoading: isLoadingStatuses } = useProjectTaskStatuses(inferredProjectId || '');
  const visibleStatuses = useMemo(
    () => (statuses || []).filter((status) => status.is_visible !== false),
    [statuses]
  );

  // Group tasks by status_id (prefer status_id over legacy status)
  const tasksByStatus = useMemo(() => {
    if (!visibleStatuses.length) return {};

    const grouped: Record<string, any[]> = {};
    
    // Initialize groups for all statuses
    visibleStatuses.forEach(status => {
      grouped[status.id] = [];
    });

    // Group tasks
    tasks.forEach(task => {
      const statusId = task.status_id || task.task_status?.id;
      if (statusId && grouped[statusId]) {
        grouped[statusId].push(task);
      } else if (task.status) {
        // Fallback: try to find status by slug for legacy tasks
        const matchingStatus = visibleStatuses.find(s => s.slug === task.status);
        if (matchingStatus) {
          grouped[matchingStatus.id].push(task);
        }
      }
    });

    return grouped;
  }, [tasks, visibleStatuses]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    try {
      await onTaskStatusUpdate(draggedTask, targetStatusId);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const handleNewTaskLocal = (statusId: string) => {
    // If statusId is a UUID, it's likely a dynamic status_id
    // If it's a slug (legacy), it's just 'status'
    onTaskCreate(statusId);
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'text-gray-500',
      blue: 'text-blue-500',
      green: 'text-green-500',
      red: 'text-red-500',
      yellow: 'text-yellow-500',
      purple: 'text-blue-500',
      pink: 'text-blue-500',
      indigo: 'text-indigo-500',
      orange: 'text-orange-500',
      teal: 'text-teal-500',
      cyan: 'text-cyan-500',
    };
    return colorMap[color] || 'text-gray-500';
  };

  if (!inferredProjectId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {t('architect.tasks.selectProject')}
        </p>
      </div>
    );
  }

  if (isLoadingStatuses) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {t('taskManagement.statusConfig.noStatuses')}
        </p>
      </div>
    );
  }

  if (visibleStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {t('taskManagement.statusConfig.allStatusesHidden')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 px-4 min-w-full">
        {visibleStatuses.map((status: ProjectTaskStatus) => {
          const Icon = ICON_MAP[status.icon as keyof typeof ICON_MAP] || Circle;
          const columnTasks = tasksByStatus[status.id] || [];
          const count = columnTasks.length;

          return (
            <div
              key={status.id}
              className="min-h-[600px] flex-1"
              style={{ minWidth: columnMinWidth }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              <div className="bg-muted/50 rounded-lg p-4 h-full">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", getColorClass(status.color))} />
                    <h2 className="font-semibold text-base">
                      {t(`taskManagement:status.${status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, status.name)}
                    </h2>
                  </div>
                  <span className="text-sm text-muted-foreground bg-background px-2.5 py-1 rounded-full font-medium">
                    {count}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <div
                      className="text-center text-sm text-muted-foreground py-12 min-h-[120px] border-2 border-dashed border-muted rounded-lg flex items-center justify-center"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, status.id)}
                    >
                      <div className="space-y-2">
                        <Icon className={cn("h-8 w-8 mx-auto opacity-20", getColorClass(status.color))} />
                        <p>{t('architect.tasks.noTasks')}</p>
                      </div>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        data-task-id={task.id}
                      >
                        <TaskCard
                          task={task}
                          onDragStart={(e, id) => handleDragStart(e, id)}
                          onEdit={onTaskEdit}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewTaskLocal(status.id)}
                  className="w-full mt-4 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common.add')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
