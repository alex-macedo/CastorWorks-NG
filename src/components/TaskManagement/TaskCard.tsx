import { useDraggable } from "@dnd-kit/core";
import { Task } from "@/types/taskManagement";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
}

const priorityConfig = {
  low: { color: "text-blue-500", badge: "bg-blue-100 text-blue-700" },
  medium: { color: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700" },
  high: { color: "text-orange-500", badge: "bg-orange-100 text-orange-700" },
  critical: { color: "text-red-500", badge: "bg-red-100 text-red-700" },
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const priority = priorityConfig[task.priority];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    // Prevent edit when dragging
    if (isDragging) return;

    if (onEdit) {
      onEdit(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-background shrink-0 rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow touch-none",
        onEdit && "cursor-pointer",
        isDragging && "opacity-50"
      )}
      onClick={handleClick}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-sm font-medium leading-tight flex-1">
            {task.title}
          </h3>
          {task.priority !== "low" && (
            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", priority.badge)}>
              {task.priority}
            </Badge>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {task.category && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-medium">
              {task.category}
            </Badge>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-border border-dashed">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {task.estimated_hours && (
              <div className="flex items-center gap-1.5">
                <Clock className="size-3" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}

            {task.completion_percentage > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-8 h-8">
                  <CircularProgressbar
                    value={task.completion_percentage}
                    styles={buildStyles({
                      pathColor: isCompleted ? "#22c55e" : "#3b82f6",
                      textColor: "#64748b",
                      trailColor: "#e2e8f0",
                    })}
                  />
                </div>
                <span>{task.completion_percentage}%</span>
              </div>
            )}
          </div>

          {task.assigned_user_id && (
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">U</AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
}
