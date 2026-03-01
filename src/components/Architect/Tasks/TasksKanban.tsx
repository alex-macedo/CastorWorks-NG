/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useProjects, useProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Plus, ListCheck, RefreshCw, Search, CheckCircle2, Building2, LayoutDashboard, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Input } from '@/components/ui/input';
import { TabNavigation, ViewMode } from './TabNavigation';
import { TaskFormDialog } from './TaskFormDialog';
import { ChecklistFormDialog } from './ChecklistFormDialog';
import { TasksBoardView, type ColumnDensity } from './TasksBoardView';
import { TasksListView } from './TasksListView';
import { TasksCalendarView } from './TasksCalendarView';
import { TasksTeamView } from './TasksTeamView';
import { TasksScheduleView } from './TasksScheduleView';
import { TasksFormsView } from './TasksFormsView';
import { TasksDailyLogsView } from './TasksDailyLogsView';
import { MoodboardView } from '../Moodboard/MoodboardView';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArchitectTaskSettingsPanel } from '@/components/Architect/Tasks/ArchitectTaskSettingsPanel';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { toast } from 'sonner';

interface TasksKanbanProps {
  projectId?: string;
  densityOverride?: ColumnDensity;
  onDisplaySettingsClick?: () => void;
}

const mapWidthToDensity = (width?: number | null): ColumnDensity => {
  if (!width) return 'default';
  if (width <= 260) return 'superCompact';
  if (width < 360) return 'compact';
  if (width > 440) return 'relaxed';
  return 'default';
};

export const TasksKanban = ({ projectId, densityOverride, onDisplaySettingsClick }: TasksKanbanProps) => {
  const { t: translate } = useLocalization();
  const { tasks, isLoading, error, updateTaskStatus } = useArchitectTasks(projectId);
  const { data: roles } = useUserRoles();
  const { projects } = useProjects();
  const { project } = useProject(projectId); // Fetch project to get task_column_width
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isTaskSettingsOpen, setIsTaskSettingsOpen] = useState(false);
  const [columnDensity, setColumnDensity] = useState<ColumnDensity>(
    densityOverride ?? mapWidthToDensity((project as any)?.task_column_width ?? null),
  );
  const [isChecklistFormOpen, setIsChecklistFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('todo');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'status' | 'phases'>('status');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const priorityFromUrl = searchParams.get('priority') || undefined;

  const effectiveProjectId = projectId || (filterProject !== 'all' ? filterProject : undefined);

  // Filter tasks
  const filteredTasks = tasks?.filter(task => {
    if (filterProject !== 'all' && task.project_id !== filterProject) {
      return false;
    }
    if (priorityFromUrl && task.priority !== priorityFromUrl) {
      return false;
    }
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }) || [];

  const handleNewTask = (statusId: string = 'todo') => {
    setSelectedStatus(statusId);
    setSelectedTask(null);
    setIsTaskFormOpen(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setIsTaskFormOpen(true);
  };

  const handleTaskStatusUpdate = async (taskId: string, statusId: string) => {
    try {
      // Use status_id for new system
      await updateTaskStatus.mutateAsync({ id: taskId, status_id: statusId });
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const renderView = () => {
    const viewProps = {
      tasks: filteredTasks,
      onTaskEdit: handleEditTask,
      projectId: projectId || (filterProject !== 'all' ? filterProject : undefined),
    };

    switch (activeView) {
      case 'board':
        return (
          <TasksBoardView
            {...viewProps}
            onTaskCreate={handleNewTask}
            onTaskStatusUpdate={handleTaskStatusUpdate}
            projectId={effectiveProjectId}
            density={densityOverride ?? columnDensity}
          />
        );
      case 'list':
        return <TasksListView {...viewProps} />;
      case 'calendar':
        return <TasksCalendarView {...viewProps} />;
      case 'team':
        return <TasksTeamView {...viewProps} projectId={projectId || (filterProject !== 'all' ? filterProject : undefined)} />;
      case 'schedule':
        return <TasksScheduleView {...viewProps} />;
      case 'forms':
        return <TasksFormsView {...viewProps} projectId={projectId} />;
      case 'moodboard': {
        // Use projectId prop if available, otherwise use filterProject if not 'all'
        const selectedProject = projectId || (filterProject !== 'all' ? filterProject : null);

        if (!selectedProject) {
          return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-muted-foreground">{translate('architect.moodboard.noProject')}</p>
            </div>
          );
        }
        return <MoodboardView projectId={selectedProject} />;
      }
      case 'dailyLogs':
        return <TasksDailyLogsView {...viewProps} />;
      default:
        return <TasksBoardView {...viewProps} onTaskCreate={handleNewTask} onTaskStatusUpdate={handleTaskStatusUpdate} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{translate('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    const isMigrationError = error instanceof Error && (error as any).isMigrationError;

    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-6">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium text-lg">{translate('common.errorTitle')}</p>
          <p className="text-sm text-muted-foreground max-w-md">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
        {isMigrationError && (
          <div className="bg-muted p-4 rounded-lg max-w-2xl space-y-2">
            <p className="font-semibold text-sm">{translate("admin.migrationRequired")}</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>{translate("admin.migrationSteps.step1")}</li>
              <li>
                {translate("admin.migrationSteps.step2")}
                <code className="bg-background px-1 rounded ml-1">supabase/migrations/20251120000000_consolidated_architect_module.sql</code>
                <code className="bg-background px-1 rounded ml-1">supabase/migrations/20251213000000_add_team_member_id_to_architect_tasks.sql</code>
              </li>
              <li>{translate("admin.migrationSteps.step3")}</li>
            </ol>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={projectId ? "space-y-4 animate-in fade-in duration-500" : "space-y-8 animate-in fade-in duration-500"}>
      {/* Premium Header - Architect variant */}
      {!projectId && (
        <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {translate('architect.tasks.title')}
              </h1>
              <p className="text-white/90 font-medium text-base max-w-2xl">
                {translate('architect.tasks.description')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <Button 
                onClick={() => handleNewTask()} 
                className="bg-white text-emerald-700 hover:bg-white/95 border-0 shadow-lg h-10 px-6 rounded-full font-bold whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                {translate('architect.tasks.new')}
              </Button>
            </div>
          </div>
        </SidebarHeaderShell>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          {/* Filter Mode Toggle */}
          <Select value={filterMode} onValueChange={(value) => setFilterMode(value as 'status' | 'phases')}>
            <SelectTrigger className="w-full md:w-[200px] bg-card border-none shadow-sm h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">{translate('architect.tasks.filterByTaskStatus')}</SelectItem>
              <SelectItem value="phases">{translate('architect.tasks.filterByPhases')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={translate('architect.tasks.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-none shadow-sm h-11"
            />
          </div>

          {/* Project Filter */}
          {!projectId && (
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-full md:w-[220px] bg-card border-none shadow-sm h-11">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={translate('projects.allProjects')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{translate('projects.allProjects')}</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Display Settings Button - Always visible on both pages */}
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-4 inline-flex items-center gap-2 bg-card border-none shadow-sm"
            onClick={() => {
              if (projectId && onDisplaySettingsClick) {
                onDisplaySettingsClick();
              } else if (!effectiveProjectId) {
                toast.info(translate('projectDetail.selectProjectFirst'));
                return;
              } else {
                setIsTaskSettingsOpen(true);
              }
            }}
          >
            <LayoutDashboard className="h-4 w-4" />
            {translate('projectDetail.displaySettings')}
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 bg-card border-none shadow-sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card/50 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-border/50">
        <TabNavigation activeView={activeView} onViewChange={setActiveView} />
      </div>

      {/* Content Area */}
      <div className="mt-2">
        {renderView()}
      </div>

      {/* Dialogs */}
      <TaskFormDialog
        open={isTaskFormOpen}
        onOpenChange={setIsTaskFormOpen}
        task={selectedTask}
        initialStatus={selectedStatus}
        projectId={projectId || (filterProject !== 'all' ? filterProject : undefined)}
      />

      <ChecklistFormDialog
        open={isChecklistFormOpen}
        onOpenChange={setIsChecklistFormOpen}
        projectId={projectId}
      />

      {effectiveProjectId && !projectId && (
        <ArchitectTaskSettingsPanel
          projectId={effectiveProjectId}
          currentDensity={columnDensity}
          open={isTaskSettingsOpen}
          onOpenChange={setIsTaskSettingsOpen}
          onDensityChange={(density) => setColumnDensity(density)}
        />
      )}
    </div>
  );
};
