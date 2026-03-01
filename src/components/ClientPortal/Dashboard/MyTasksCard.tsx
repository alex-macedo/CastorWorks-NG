import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Plus, Loader2, ListChecks } from "lucide-react";
import { AddTaskDialog } from '@/components/ClientPortal/Dialogs/AddTaskDialog';
import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { useClientTasks } from "@/hooks/clientPortal/useClientTasks";
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { cn } from "@/lib/utils";

interface MyTasksCardProps {
  clientId?: string | null;
}

export function MyTasksCard({ clientId }: MyTasksCardProps) {
  const navigate = useNavigate();
  const { projectId } = useClientPortalAuth();
  const { tasks, isLoading } = useClientTasks();
  const { formatShortDate } = useDateFormat();
  const { t } = useLocalization();

  // Filter for pending tasks and take top 3
  const pendingTasks = tasks
    ?.filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  const handleAddTask = () => {
    setShowAddTask(true);
  };

  const [showAddTask, setShowAddTask] = useState(false);
  const { teamMembers } = useProjectTeam();

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.myTasks.title")}
        </CardTitle>
        <Button
          onClick={handleAddTask}
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white rounded-full shadow-sm h-8 px-3"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("clientPortal.dashboard.myTasks.addNew")}
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingTasks && pendingTasks.length > 0 ? (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ({t("clientPortal.dashboard.myTasks.due", { date: formatShortDate(task.due_date) })})
                    </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("clientPortal.dashboard.myTasks.noPending")}</p>
        )}
      </CardContent>
      <AddTaskDialog
        open={showAddTask}
        onOpenChange={setShowAddTask}
        teamMembers={teamMembers}
        onTaskCreated={(task) => {
          console.log('Task created from MyTasksCard', task);
          setShowAddTask(false);
        }}
      />
    </Card>
  );
}
