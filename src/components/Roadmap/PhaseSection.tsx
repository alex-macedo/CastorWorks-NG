import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TaskCard } from "./TaskCard";
import { Calendar } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { formatDate } from "@/utils/reportFormatters";

interface PhaseSectionProps {
  phase: any;
  tasks: any[];
  onCompleteTask?: (id: string) => void;
  onEditTask?: (task: any) => void;
  canEdit?: boolean;
}

const statusColors = {
  planning: "bg-gray-500",
  active: "bg-blue-500",
  completed: "bg-green-500",
};

export function PhaseSection({ phase, tasks, onCompleteTask, onEditTask, canEdit }: PhaseSectionProps) {
  const { dateFormat } = useLocalization();
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                Phase {phase.phase_number}: {phase.phase_name}
              </CardTitle>
              <CardDescription className="mt-2">{phase.description}</CardDescription>
            </div>
            <Badge className={statusColors[phase.status as keyof typeof statusColors]}>
              {phase.status}
            </Badge>
          </div>
          
            {(phase.start_date || phase.end_date) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Calendar className="h-4 w-4" />
                {phase.start_date && <span>Start: {formatDate(phase.start_date, dateFormat)}</span>}
                {phase.start_date && phase.end_date && <span>-</span>}
                {phase.end_date && <span>End: {formatDate(phase.end_date, dateFormat)}</span>}
              </div>
            )}

          <div className="mt-4">
            <ProgressBar 
              value={completionPercentage}
              label={`${completedTasks} of ${totalTasks} tasks completed`}
              showPercentage
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onCompleteTask}
            onEdit={onEditTask}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  );
}
