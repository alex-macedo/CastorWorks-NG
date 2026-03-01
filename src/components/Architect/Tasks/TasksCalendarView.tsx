import { useState, useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '@/contexts/LocalizationContext';
import { Calendar as CalendarIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TasksCalendarViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
}

export const TasksCalendarView = ({ tasks, onTaskEdit }: TasksCalendarViewProps) => {
  const { t, language } = useLocalization();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  // Mark dates with tasks
  const modifiers = useMemo(() => {
    return {
      hasTasks: (date: Date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        return !!tasksByDate[dateKey];
      },
    };
  }, [tasksByDate]);

  const modifiersClassNames = {
    hasTasks: 'bg-primary/20 text-primary font-semibold',
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

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Calendar */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm lg:col-span-3 rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-xl bg-primary text-white shadow-md">
                <CalendarIcon className="h-5 w-5" />
              </div>
              {t('architect.tasks.viewModes.calendar')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              locale={getLocale()}
              className="rounded-2xl border-none shadow-xl bg-white dark:bg-muted p-4 scale-110 origin-center"
            />
          </CardContent>
        </Card>

        {/* Tasks for selected date */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm lg:col-span-2 rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-xl font-bold tracking-tight">
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d, yyyy', { locale: getLocale() })
                : t('architect.tasks.selectDate')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 flex-1 overflow-y-auto">
            {selectedDateTasks.length > 0 ? (
              <div className="space-y-4">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onTaskEdit(task)}
                    className="p-5 rounded-2xl border-none bg-white dark:bg-muted shadow-sm cursor-pointer hover:shadow-md hover:bg-primary/5 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                      {task.task_status ? (
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-widest border-none text-white')}
                          style={{ backgroundColor: task.task_status.color || '#ccc' }}
                        >
                          {t(`taskManagement:status.${task.task_status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, task.task_status.name)}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 px-2 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-widest border-none', getTaskStatusColor(task.status))}
                        >
                          {t(`architect.tasks.statuses.${task.status}`)}
                        </Badge>
                      )}
                    </div>
                    {task.priority && (
                      <div className="mt-4 flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border-none">
                          {t(`architect.tasks.priorities.${task.priority}`)}
                        </Badge>
                        <div className="p-1.5 rounded-full bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                           <ArrowUpRight className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 space-y-4 flex flex-col items-center justify-center">
                <div className="p-4 rounded-full bg-muted/30">
                  <CalendarIcon className="h-10 w-10 text-muted-foreground/20" />
                </div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-[200px]">
                  {selectedDate
                    ? t('architect.tasks.noTasksForDate')
                    : t('architect.tasks.selectDateToViewTasks')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

