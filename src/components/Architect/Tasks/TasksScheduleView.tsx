import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  differenceInDays,
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '@/contexts/LocalizationContext';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TasksScheduleViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
}

export const TasksScheduleView = ({ tasks, onTaskEdit }: TasksScheduleViewProps) => {
  const { t, language } = useLocalization();

  // Get locale for date formatting
  const getLocale = (): Locale => {
    const localeMap: Record<Language, Locale> = {
      'en-US': enUS,
      'pt-BR': ptBR,
      'es-ES': es,
      'fr-FR': fr,
    };
    return localeMap[language] || enUS;
  };

  // Filter tasks with due dates
  const tasksWithDates = useMemo(
    () => tasks.filter((task) => task.due_date),
    [tasks]
  );

  // Calculate timeline
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const today = new Date();
      return {
        timelineStart: startOfMonth(today),
        timelineEnd: endOfMonth(addDays(today, 30)),
        totalDays: 30,
      };
    }

    const dates = tasksWithDates
      .map((task) => parseISO(task.due_date))
      .filter(Boolean) as Date[];

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    return {
      timelineStart: startOfMonth(minDate),
      timelineEnd: endOfMonth(maxDate),
      totalDays: differenceInDays(endOfMonth(maxDate), startOfMonth(minDate)),
    };
  }, [tasksWithDates]);

  const monthsInTimeline = useMemo(() => {
    return eachMonthOfInterval({
      start: timelineStart,
      end: timelineEnd,
    });
  }, [timelineStart, timelineEnd]);

  const getTaskPosition = (task: any) => {
    if (!task.due_date) return null;
    const taskDate = parseISO(task.due_date);
    const startOffset = differenceInDays(taskDate, timelineStart);
    return {
      left: `${(startOffset / totalDays) * 100}%`,
    };
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'in_progress':
        return 'bg-primary';
      case 'todo':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const today = new Date();
  const todayPosition =
    today >= timelineStart && today <= timelineEnd
      ? `${(differenceInDays(today, timelineStart) / totalDays) * 100}%`
      : null;

  if (tasksWithDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('architect.tasks.viewModes.schedule')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            {t('architect.tasks.noTasksWithDates')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('architect.tasks.viewModes.schedule')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Timeline header */}
          <div className="min-w-[800px] mb-4">
            <div className="flex border-b pb-2">
              <div className="w-64 flex-shrink-0 font-medium">
                {t('architect.tasks.taskTitle')}
              </div>
              <div className="flex-1 flex">
                {monthsInTimeline.map((month, idx) => (
                  <div
                    key={idx}
                    className="flex-1 text-center text-sm font-medium text-muted-foreground"
                  >
                    {format(month, 'MMM yyyy', { locale: getLocale() })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt rows */}
          <div className="min-w-[800px] relative">
            {/* Today marker */}
            {todayPosition && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                style={{ left: `calc(256px + ${todayPosition})` }}
              >
                <div className="absolute -top-6 -left-8 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                  {t('architect.tasks.today')}
                </div>
              </div>
            )}

            {tasksWithDates.map((task) => {
              const position = getTaskPosition(task);
              const color = getTaskStatusColor(task.status);

              return (
                <div
                  key={task.id}
                  className="flex items-center py-2 border-b group hover:bg-muted/50"
                >
                  <div className="w-64 flex-shrink-0 pr-4">
                    <p
                      className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                      onClick={() => onTaskEdit(task)}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.task_status ? (
                        <Badge
                          variant="outline"
                          className={cn('text-xs text-white')}
                          style={{ backgroundColor: task.task_status.color || '#ccc' }}
                        >
                          {t(`taskManagement:status.${task.task_status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, task.task_status.name)}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', color)}
                        >
                          {t(`architect.tasks.statuses.${task.status}`)}
                        </Badge>
                      )}
                      {task.priority && (
                        <Badge variant="secondary" className="text-xs">
                          {t(`architect.tasks.priorities.${task.priority}`)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 relative h-8">
                    {position && (
                      <div
                        className={cn(
                          'absolute h-6 rounded cursor-pointer transition-all hover:opacity-80 group-hover:shadow-md flex items-center justify-center text-xs text-white font-medium px-2',
                          color
                        )}
                        style={{
                          left: position.left,
                          width: '4px',
                        }}
                        onClick={() => onTaskEdit(task)}
                        title={`${task.title} - ${format(parseISO(task.due_date), 'MMM dd, yyyy', { locale: getLocale() })}`}
                      />
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
};
