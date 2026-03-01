import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTasksStore } from "@/stores/taskManagement";
import { TASK_STATUSES, Task, TaskStatus } from "@/types/taskManagement";
import { TaskColumn } from "./TaskColumn";
import { TaskCard } from "./TaskCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskBoardProps {
  phaseId: string;
}

export function TaskBoard({ phaseId }: TaskBoardProps) {
  const { tasksByStatus, updateTaskStatus } = useTasksStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = Object.values(tasksByStatus)
      .flat()
      .find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Find the task to get its current status
    const task = Object.values(tasksByStatus)
      .flat()
      .find((t) => t.id === taskId);

    if (!task || task.status === newStatus) return;

    // Optimistically update the UI
    updateTaskStatus(taskId, newStatus);

    try {
      // Update in database
      const { error } = await supabase
        .from("office_tasks")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task status:", error);
      // Revert on error
      updateTaskStatus(taskId, task.status);
      toast.error("Failed to update task status");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-3 px-3 pt-4 pb-2 min-w-max overflow-hidden">
        {TASK_STATUSES.map((status) => (
          <TaskColumn
            key={status.id}
            status={status}
            tasks={tasksByStatus[status.id] || []}
            phaseId={phaseId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-80">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
