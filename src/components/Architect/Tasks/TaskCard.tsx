import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User, Flag, MessageSquare, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Button } from '@/components/ui/button';

interface TaskCardProps {
  task: any;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onEdit: (task: any) => void;
}

export const TaskCard = ({ task, onDragStart, onEdit }: TaskCardProps) => {
  const { t } = useLocalization();
  const { formatDate } = useDateFormat();

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={() => {/* Clear drag state */}}
      className="cursor-move hover:shadow-lg transition-all duration-200 hover:scale-[1.01] border-border/50 bg-card"
      onClick={() => onEdit(task)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="font-semibold text-sm line-clamp-2 text-foreground">
          {task.title}
        </div>

        {task.description && (
          <div className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </div>
        )}

        {task.projects && (
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded">
            📁 {task.projects.name}
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
          {task.assignee && (
            <div className="flex items-center text-muted-foreground gap-1.5">
              <div className="p-1 rounded bg-primary/10">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="font-medium">{task.assignee.display_name || task.assignee.full_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              <span className="font-medium">{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {task.priority && (
            <Badge variant="secondary" className={`text-xs font-medium ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
              <Flag className="h-3 w-3 mr-1" />
              {t(`architect.tasks.priorities.${task.priority}`)}
            </Badge>
          )}
          {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
            <>
              {task.tags.slice(0, 2).map((tag: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs font-medium">
                  {tag}
                </Badge>
              ))}
            </>
          )}

          {task.checklist_items && Array.isArray(task.checklist_items) && task.checklist_items.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              <span className="font-medium">
                {task.checklist_items.filter((item: any) => item.completed).length}/{task.checklist_items.length}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
