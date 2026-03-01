/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, RefreshCw, CheckCircle2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TaskCard } from './TaskCard';
import { TaskFormDialog } from './TaskFormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

const STATUS_COLUMNS = [
  { id: 'todo', label: 'architect.tasks.statuses.todo', icon: ListTodo, color: 'blue' },
  { id: 'in_progress', label: 'architect.tasks.statuses.in_progress', icon: RefreshCw, color: 'yellow' },
  { id: 'completed', label: 'architect.tasks.statuses.completed', icon: CheckCircle2, color: 'green' },
] as const;

const STATUSES = ['todo', 'in_progress', 'completed'] as const;

interface TasksKanbanProps {
  projectId?: string;
}

export const TasksKanban = ({ projectId }: TasksKanbanProps) => {
  const { t } = useLocalization();
  const { tasks, isLoading, error, updateTaskStatus } = useArchitectTasks(projectId);
  const { projects } = useProjects();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('todo');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = tasks?.filter(task => {
    if (filterProject !== 'all' && task.project_id !== filterProject) {
      return false;
    }
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  // Group tasks by status
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = filteredTasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragStart = (e: React.DragEvent, taskId: string, status: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId, sourceStatus: status }));
  };

  const handleDragOver = (e: React.DragEvent, status: string, overTaskId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Add visual feedback
    if (overTaskId) {
      const element = document.querySelector(`[data-task-id="${overTaskId}"]`);
      element?.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent, overTaskId?: string) => {
    if (overTaskId) {
      const element = document.querySelector(`[data-task-id="${overTaskId}"]`);
      element?.classList.remove('drag-over');
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string, targetTaskId?: string) => {
    e.preventDefault();

    // Remove visual feedback
    if (targetTaskId) {
      const element = document.querySelector(`[data-task-id="${targetTaskId}"]`);
      element?.classList.remove('drag-over');
    }

    if (!draggedTask) return;

    try {
      await updateTaskStatus.mutateAsync({
        id: draggedTask,
        status: targetStatus
      });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const handleNewTask = (status: string) => {
    setSelectedStatus(status);
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    const isMigrationError = error instanceof Error && (error as any).isMigrationError;
    
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-6">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium text-lg">{t('common.errorTitle')}</p>
          <p className="text-sm text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
        {isMigrationError && (
          <div className="bg-muted p-4 rounded-lg max-w-2xl space-y-2">
            <p className="font-semibold text-sm">{t("admin:migrationRequired")}</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>{t('architect.tasks.migrationSteps.openSqlEditor')}</li>
              <li>
                {t('architect.tasks.migrationSteps.runMigration')} <code className="bg-background px-1 rounded">supabase/migrations/20251120000000_consolidated_architect_module.sql</code>
              </li>
              <li>{t('architect.tasks.migrationSteps.refreshAfter')}</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t('architect.tasks.title')}</h1>
          <Button onClick={() => handleNewTask('todo')} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('architect.tasks.new')}
          </Button>
        </div>
        <p className="text-muted-foreground">{t('architect.tasks.description')}</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('architect.tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={t('architect.tasks.allTasks')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('architect.tasks.allTasks')}</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="flex gap-4">
          {STATUS_COLUMNS.map((column) => {
            const Icon = column.icon;
            const tasks = tasksByStatus[column.id] || [];
            const count = tasks.length;

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-[320px]"
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                <div className="bg-muted/50 rounded-lg p-4 h-full min-h-[600px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-foreground" />
                      <h2 className="font-semibold text-base">{t(column.label)}</h2>
                    </div>
                    <span className="text-sm text-muted-foreground bg-background px-2.5 py-1 rounded-full font-medium">
                      {count}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        {t('common.loading')}
                      </div>
                    ) : tasks.length === 0 ? (
                      <div
                        className="text-center text-sm text-muted-foreground py-12 min-h-[120px] border-2 border-dashed border-muted rounded-lg flex items-center justify-center"
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        <div className="space-y-2">
                          <Icon className="h-8 w-8 mx-auto opacity-20" />
                          <p>{t('architect.tasks.noTasks')}</p>
                        </div>
                      </div>
                    ) : (
                      tasks.map((task) => (
                        <div
                          key={task.id}
                          data-task-id={task.id}
                          onDragOver={(e) => handleDragOver(e, column.id, task.id)}
                          onDragLeave={(e) => handleDragLeave(e, task.id)}
                          onDrop={(e) => handleDrop(e, column.id, task.id)}
                        >
                          <TaskCard
                            task={task}
                            onDragStart={(e, id) => handleDragStart(e, id, column.id)}
                            onEdit={handleEditTask}
                          />
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Task Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNewTask(column.id)}
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

      <TaskFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        task={selectedTask}
        initialStatus={selectedStatus}
        projectId={projectId}
      />
    </div>
  );
};
