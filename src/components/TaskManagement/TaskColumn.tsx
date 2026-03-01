import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Status, Task, TaskStatus } from "@/types/taskManagement";
import { TaskCard } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";
import { Plus, MoreHorizontal, Circle, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

interface TaskColumnProps {
  status: Status;
  tasks: Task[];
  phaseId: string;
}

const iconMap: Record<string, any> = {
  circle: Circle,
  clock: Clock,
  "check-circle": CheckCircle,
  "alert-circle": AlertCircle,
};

const statusTranslationKeys: Record<TaskStatus, string> = {
  not_started: "notStarted",
  in_progress: "inProgress",
  completed: "completed",
  blocked: "blocked",
};

const shouldFallbackLabel = (translation: string, translationKey: string) =>
  translation === `taskManagement.status.${translationKey}`;

const translateStatusLabel = (
  defaultLabel: string,
  statusId: TaskStatus,
  t: (key: string) => string
) => {
  const translationKey = statusTranslationKeys[statusId];
  if (!translationKey) return defaultLabel;

  const translatedValue = t(`taskManagement.status.${translationKey}`);
  return shouldFallbackLabel(translatedValue, translationKey)
    ? defaultLabel
    : translatedValue;
};

export function TaskColumn({ status, tasks, phaseId }: TaskColumnProps) {
  const { t } = useLocalization();
  const StatusIcon = iconMap[status.icon] || Circle;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  const addTaskTranslation = t("taskManagement.addTask");
  const addTaskLabel =
    addTaskTranslation === "taskManagement.addTask"
      ? "Add task"
      : addTaskTranslation;

  const handleAddTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="shrink-0 w-[240px] lg:w-[280px] flex flex-col h-full flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            "rounded-lg border border-border p-3 bg-muted/70 dark:bg-muted/50 flex flex-col max-h-full transition-colors",
            isOver && "bg-primary/10/50 border-accent"
          )}
        >
          <div className="flex items-center justify-between mb-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="size-4 flex items-center justify-center">
                <StatusIcon className="size-4" />
              </div>
              <span className="text-sm font-medium">
                {translateStatusLabel(status.label, status.id, t)}
              </span>
              <span className="text-xs text-muted-foreground">({tasks.length})</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleAddTask}
              >
                <Plus className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto h-full">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEditTask} />
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs h-auto py-1 px-0 self-start hover:bg-background"
              onClick={handleAddTask}
            >
              <Plus className="size-4" />
              <span>{addTaskLabel}</span>
            </Button>
          </div>
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        defaultStatus={status.id}
        phaseId={phaseId}
      />
    </>
  );
}
