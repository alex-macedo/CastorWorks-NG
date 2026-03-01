import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Flag, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TasksListViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
}

export const TasksListView = ({ tasks, onTaskEdit }: TasksListViewProps) => {
  const { t } = useLocalization();
  const { formatShortDate } = useDateFormat();

  const statusColors = {
    todo: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">{t('architect.tasks.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/20 rounded-2xl border border-border/50">
        <div className="col-span-4">{t('architect.tasks.taskTitle')}</div>
        <div className="col-span-2">{t('architect.tasks.project')}</div>
        <div className="col-span-2">{t('architect.tasks.assignee')}</div>
        <div className="col-span-1">{t('architect.tasks.priority')}</div>
        <div className="col-span-1">{t('architect.tasks.status')}</div>
        <div className="col-span-1">{t('architect.tasks.dueDate')}</div>
        <div className="col-span-1"></div>
      </div>

      {/* Task Rows */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

          return (
            <div
              key={task.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 bg-card/50 backdrop-blur-sm border-none shadow-sm hover:shadow-md hover:bg-muted/30 transition-all duration-300 rounded-2xl items-center group"
            >
              <div className="col-span-4">
                <div className="font-bold text-base truncate group-hover:text-primary transition-colors">{task.title}</div>
                {task.description && (
                  <div className="text-xs text-muted-foreground truncate font-medium">{task.description}</div>
                )}
              </div>
              <div className="col-span-2">
                <div className="text-xs font-black uppercase tracking-tighter text-primary truncate">
                  {task.projects?.name || '-'}
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                       {task.assignee.full_name?.charAt(0) || task.assignee.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate font-medium">{task.assignee.full_name || task.assignee.email}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
              <div className="col-span-1">
                {task.priority && (
                  <Badge variant="secondary" className={cn("text-[10px] font-black uppercase tracking-widest border-none px-2", priorityColors[task.priority as keyof typeof priorityColors])}>
                    {t(`architect.tasks.priorities.${task.priority}`)}
                  </Badge>
                )}
              </div>
              <div className="col-span-1">
                {task.task_status ? (
                  <Badge 
                    variant="secondary" 
                    className={cn("text-[10px] font-black uppercase tracking-widest border-none px-2 text-white")}
                    style={{ backgroundColor: task.task_status.color || '#ccc' }}
                  >
                    {t(`taskManagement:status.${task.task_status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, task.task_status.name)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className={cn("text-[10px] font-black uppercase tracking-widest border-none px-2", statusColors[task.status as keyof typeof statusColors])}>
                    {t(`architect.tasks.statuses.${task.status}`)}
                  </Badge>
                )}
              </div>
              <div className="col-span-1">
                {task.due_date && (
                  <div className={cn("flex items-center gap-2 text-xs font-bold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatShortDate(task.due_date)}</span>
                  </div>
                )}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onTaskEdit(task)}
                  className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-all duration-300"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
