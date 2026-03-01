import { useState } from "react";
import { useRoadmapPhases } from "@/hooks/useRoadmapPhases";
import { useRoadmapTasks } from "@/hooks/useRoadmapTasks";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useRoadmapItems } from "@/hooks/useRoadmapItems";
import { useLocalization } from "@/contexts/LocalizationContext";
import { PhaseSection } from "@/components/Roadmap/PhaseSection";
import { RoadmapStats } from "@/components/Roadmap/RoadmapStats";
import { ImplementationSummary } from "@/components/Roadmap/ImplementationSummary";
import { TaskManagementTab } from "@/components/Roadmap/TaskManagementTab";
import { RoadmapGanttChart } from "@/components/Roadmap/RoadmapGanttChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function ReleasesReport() {
  const { t } = useLocalization();
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | undefined>();

  const { data: phases, isLoading: phasesLoading } = useRoadmapPhases();
  const { tasks, isLoading: tasksLoading, completeTask } = useRoadmapTasks(selectedPhaseId);
  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);
  const { roadmapItems, isLoading: itemsLoading } = useRoadmapItems({ status: 'done' });

  const canEdit = roles?.includes('admin') || roles?.includes('project_manager');

  const handleCompleteTask = (taskId: string) => {
    completeTask.mutate(taskId);
  };

  if (phasesLoading || tasksLoading || itemsLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const allTasks = tasks || [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('releasesReport.releasesReport')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              Track implementation progress and completed releases
            </p>
          </div>
        </div>
      </SidebarHeaderShell>

      <ImplementationSummary />

      <RoadmapStats tasks={allTasks} />

      <Tabs defaultValue="all" variant="pill" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setSelectedPhaseId(undefined)}>
            All Phases
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline View
          </TabsTrigger>
          <TabsTrigger value="manage">
            Manage Tasks
          </TabsTrigger>
          {phases?.map((phase) => (
            <TabsTrigger 
              key={phase.id} 
              value={phase.id}
              onClick={() => setSelectedPhaseId(phase.id)}
            >
              Phase {phase.phase_number}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-8">
          {phases?.map((phase) => {
            const phaseTasks = allTasks.filter(t => t.phase_id === phase.id);
            return (
              <PhaseSection
                key={phase.id}
                phase={phase}
                tasks={phaseTasks}
                onCompleteTask={handleCompleteTask}
                canEdit={canEdit}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="timeline">
          <RoadmapGanttChart items={roadmapItems || []} />
        </TabsContent>

        <TabsContent value="manage">
          <TaskManagementTab />
        </TabsContent>

        {phases?.map((phase) => (
          <TabsContent key={phase.id} value={phase.id}>
            <PhaseSection
              phase={phase}
              tasks={allTasks.filter(t => t.phase_id === phase.id)}
              onCompleteTask={handleCompleteTask}
              canEdit={canEdit}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
