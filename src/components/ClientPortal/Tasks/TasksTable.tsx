import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { useClientTasks } from '@/hooks/clientPortal/useClientTasks';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Loader2, Search, Pencil, Trash2, GripVertical, Plus } from 'lucide-react';
import { AddTaskDialog } from '@/components/ClientPortal/Dialogs/AddTaskDialog';
import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { useProjectTaskStatuses } from '@/hooks/useProjectTaskStatuses';
import { supabase } from '@/integrations/supabase/client';
import type { TaskStatus, TaskPriority } from '@/types/clientPortal';
import { useProject } from "@/hooks/useProjects";

type SortOption = 'due_date' | 'priority' | 'status' | 'name';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

export function TasksTable() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { id, projectId } = useParams<{ id?: string, projectId?: string }>();
  const effectiveProjectId = id || projectId;
  
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_date');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);

  const { formatLongDate } = useDateFormat();

  // Fetch project data using the shared hook
  const { project, isLoading: isProjectLoading } = useProject(effectiveProjectId);

  const { statuses: projectStatuses } = useProjectTaskStatuses(effectiveProjectId || "");
  const { tasks, isLoading } = useClientTasks({});

  const handleAddNewTask = () => {
    setShowAddTaskDialog(true);
  };

  const handleTaskCreated = (taskData: any) => {
    // TODO: Refresh tasks list after creation
    console.log('Task created:', taskData);
    setShowAddTaskDialog(false);
  };

  const { teamMembers } = useProjectTeam();

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(
    new Set(tasks.filter(t => t.assignee).map(t => t.assignee!.name))
  );

  // Filter tasks
  let filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = assigneeFilter === 'all' || task.assignee?.name === assigneeFilter;
    const matchesStatus = statusFilter === 'all' || task.status_id === statusFilter || task.status === statusFilter;
    
    let matchesDueDate = true;
    if (dueDateFilter !== 'all' && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (dueDateFilter === 'overdue') {
        matchesDueDate = dueDate < today;
      } else if (dueDateFilter === 'this_week') {
        matchesDueDate = dueDate >= today && dueDate <= weekFromNow;
      } else if (dueDateFilter === 'next_week') {
        const nextWeekStart = new Date(weekFromNow.getTime() + 1);
        const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        matchesDueDate = dueDate >= nextWeekStart && dueDate <= nextWeekEnd;
      }
    }
    
    return matchesSearch && matchesAssignee && matchesDueDate && matchesStatus;
  });

  // Sort tasks
  filteredTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'priority': {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = (a.priority as string) === 'high' ? 0 : (a.priority as string) === 'medium' ? 1 : 2;
        const bPriority = (b.priority as string) === 'high' ? 0 : (b.priority as string) === 'medium' ? 1 : 2;
        return aPriority - bPriority;
      }
      case 'status':
        return (a.task_status?.name || a.status).localeCompare(b.task_status?.name || b.status);
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const getStatusBadgeStyle = (task: any) => {
    if (task.task_status) {
      const colorMap: Record<string, string> = {
        'gray': 'bg-gray-100 text-gray-800 border-gray-200',
        'blue': 'bg-blue-100 text-blue-800 border-blue-200',
        'green': 'bg-green-100 text-green-800 border-green-200',
        'red': 'bg-red-100 text-red-800 border-red-200',
        'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'purple': 'bg-blue-100 text-blue-800 border-blue-200',
      };
      return colorMap[task.task_status.color] || 'bg-outline text-outline border-outline';
    }

    switch (task.status) {
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'in-progress': return 'bg-secondary text-secondary-foreground';
      case 'blocked': return 'bg-destructive text-destructive-foreground';
      default: return 'variant-outline';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-500 font-medium';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return '';
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleAllTasks = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  if (isLoading || isProjectLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-4">
      {/* Header with Title */}
      <ClientPortalPageHeader
        title={t("clientPortal.tasks.title", { defaultValue: "My Tasks" })}
        subtitle={t("clientPortal.tasks.subtitle")}
        actions={
          <Button
            variant="glass-style-white"
            onClick={handleAddNewTask}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("clientPortal.tasks.addNewTask")}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("clientPortal.tasks.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t("clientPortal.tasks.filters.status")}</span>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as any)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clientPortal.tasks.filters.all")}</SelectItem>
              {projectStatuses?.map(status => (
                <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
              )) || (
                <>
                  <SelectItem value="pending">{t("clientPortal.tasks.filters.toDo")}</SelectItem>
                  <SelectItem value="in-progress">{t("clientPortal.tasks.filters.inProgress")}</SelectItem>
                  <SelectItem value="completed">{t("clientPortal.tasks.filters.completed")}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>

          <span className="text-sm font-medium ml-2">{t("clientPortal.tasks.filters.assignee")}</span>
          <Select
            value={assigneeFilter}
            onValueChange={setAssigneeFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clientPortal.tasks.filters.all")}</SelectItem>
              {uniqueAssignees.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm font-medium ml-2">{t("clientPortal.tasks.filters.dueDate")}</span>
          <Select
            value={dueDateFilter}
            onValueChange={setDueDateFilter}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("clientPortal.tasks.filters.all")}</SelectItem>
              <SelectItem value="overdue">{t("clientPortal.tasks.filters.overdue")}</SelectItem>
              <SelectItem value="this_week">{t("clientPortal.tasks.filters.thisWeek")}</SelectItem>
              <SelectItem value="next_week">{t("clientPortal.tasks.filters.nextWeek")}</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-sm font-medium ml-2">{t("clientPortal.tasks.filters.sortBy")}</span>
          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">{t("clientPortal.tasks.filters.dueDateSort")}</SelectItem>
              <SelectItem value="priority">{t("clientPortal.tasks.filters.priority")}</SelectItem>
              <SelectItem value="status">{t("clientPortal.tasks.filters.statusSort")}</SelectItem>
              <SelectItem value="name">{t("clientPortal.tasks.filters.name")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={toggleAllTasks}
                />
              </TableHead>
              <TableHead>{t("clientPortal.tasks.tableHeaders.taskName")}</TableHead>
              <TableHead>{t("clientPortal.tasks.tableHeaders.status")}</TableHead>
              <TableHead>{t("clientPortal.tasks.tableHeaders.assignee")}</TableHead>
              <TableHead>{t("clientPortal.tasks.tableHeaders.dueDate")}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TableRow key={task.id} className="group">
                  <TableCell>
                    <Checkbox 
                       checked={selectedTasks.has(task.id)}
                       onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      {task.name}
                      {task.description && (
                         <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                           {task.description}
                         </p>
                       )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeStyle(task)}>
                      {task.task_status?.name || (
                        task.status === 'in-progress' ? t("clientPortal.tasks.filters.inProgress") :
                        task.status === 'pending' ? t("clientPortal.tasks.filters.toDo") :
                        task.status === 'completed' ? t("clientPortal.tasks.filters.completed") :
                        task.status.charAt(0).toUpperCase() + task.status.slice(1)
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <AvatarResolved
                          src={task.assignee.avatar_url}
                          alt={task.assignee.name}
                          className="h-6 w-6"
                          fallback={task.assignee.name.charAt(0)}
                          fallbackClassName="text-[10px]"
                        />
                        <span className="text-sm">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.due_date ? formatLongDate(task.due_date) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <GripVertical className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t("clientPortal.tasks.noTasks")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        onTaskCreated={handleTaskCreated}
        teamMembers={teamMembers}
      />
    </div>
  );
}
