import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ListChecks, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useClientTasks } from "@/hooks/clientPortal/useClientTasks";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/reportFormatters";

export const ClientTasksTab = ({ projectId, projectName }: { projectId?: string, projectName?: string }) => {
  const { t, dateFormat } = useLocalization();
  const { tasks, isLoading } = useClientTasks();
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            {t('clientPortal.tasks.title', { defaultValue: 'Your Tasks' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between p-4 border rounded-lg bg-card/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="font-semibold">{task.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">{task.description}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground ml-6">
                        {t('common.dueDate', { defaultValue: 'Due' })}: {formatDate(task.due_date, dateFormat)}
                      </p>
                    )}
                  </div>
                  <Badge variant={task.status === 'completed' ? 'success' : 'outline'}>
                    {t(`clientPortal.tasks.status.${task.status}`, { defaultValue: task.status })}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('clientPortal.tasks.noTasks', { defaultValue: 'No tasks assigned to you or visible at this time.' })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
