import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, AlertCircle, Circle } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";

interface TaskCardProps {
  task: any;
  onComplete?: (id: string) => void;
  onEdit?: (task: any) => void;
  canEdit?: boolean;
}

const statusConfig = {
  not_started: { icon: Circle, label: "Not Started", color: "bg-gray-500" },
  in_progress: { icon: Clock, label: "In Progress", color: "bg-blue-500" },
  completed: { icon: CheckCircle2, label: "Completed", color: "bg-green-500" },
  blocked: { icon: AlertCircle, label: "Blocked", color: "bg-red-500" },
};

const priorityConfig = {
  low: { label: "Low", variant: "outline" as const },
  medium: { label: "Medium", variant: "secondary" as const },
  high: { label: "High", variant: "default" as const },
  critical: { label: "Critical", variant: "destructive" as const },
};

export function TaskCard({ task, onComplete, onEdit, canEdit }: TaskCardProps) {
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.not_started;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${status.color.replace('bg-', 'text-')}`} />
              {task.title}
            </CardTitle>
            <CardDescription className="mt-1">{task.category}</CardDescription>
          </div>
          <Badge variant={priority.variant}>{priority.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{task.description}</p>
        
        <ProgressBar 
          value={task.completion_percentage} 
          showPercentage 
          size="sm"
        />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {status.label}
          </span>
          
          <div className="flex gap-2">
            {canEdit && task.status !== 'completed' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit?.(task)}
              >
                Edit
              </Button>
            )}
            {canEdit && task.status !== 'completed' && (
              <Button 
                size="sm"
                onClick={() => onComplete?.(task.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
