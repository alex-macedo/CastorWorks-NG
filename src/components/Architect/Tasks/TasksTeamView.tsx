import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { AddTeamMemberSheet } from './AddTeamMemberSheet';
import { TeamMemberCard } from './TeamMemberCard';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueryClient } from '@tanstack/react-query';

interface TasksTeamViewProps {
  tasks: any[];
  onTaskEdit: (task: any) => void;
  projectId?: string;
}

interface TaskStats {
  todo: number;
  inProgress: number;
  completed: number;
}

export const TasksTeamView = ({ tasks, onTaskEdit, projectId }: TasksTeamViewProps) => {
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { teamMembers, deleteTeamMember } = useProjectTeamMembers(projectId);

  // Calculate task statistics per team member
  const teamMemberStats = useMemo(() => {
    const stats: Record<string, TaskStats> = {
      unassigned: { todo: 0, inProgress: 0, completed: 0 },
    };

    // Initialize stats for each team member
    if (teamMembers) {
      teamMembers.forEach((member) => {
        stats[member.id] = { todo: 0, inProgress: 0, completed: 0 };
      });
    }

    // Count tasks by assignee and status
    tasks.forEach((task) => {
      const status = task.status || 'todo';
      const statusKey = status === 'in_progress' ? 'inProgress' : status;

      if (task.team_member_id && stats[task.team_member_id]) {
        stats[task.team_member_id][statusKey as keyof TaskStats]++;
      } else if (task.assignee_id && stats[task.assignee_id]) {
        // Handle assignee_id if needed
        stats[task.assignee_id][statusKey as keyof TaskStats]++;
      } else {
        if (stats.unassigned) {
          stats.unassigned[statusKey as keyof TaskStats]++;
        }
      }
    });

    return stats;
  }, [tasks, teamMembers]);

  const handleRemoveTeamMember = async (memberId: string) => {
    if (confirm(t('architect.tasks.confirmRemoveTeamMember'))) {
      await deleteTeamMember.mutateAsync(memberId);
    }
  };

  const handleSheetSuccess = () => {
    setSheetOpen(false);
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Users className="h-16 w-16 text-muted-foreground opacity-50" />
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">{t('architect.tasks.viewModes.team')}</h3>
          <p className="text-muted-foreground">{t("architect.selectProjectViewTeam")}</p>
        </div>
      </div>
    );
  }

  const hasTeamMembers = teamMembers && teamMembers.length > 0;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('architect.tasks.viewModes.team')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('architect.tasks.taskCount', { count: tasks.length })} • {t('architect.tasks.teamMemberCount', { count: teamMembers?.length || 0 })}
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('architect.tasks.addTeamMember')}
        </Button>
      </div>

      <ScrollArea className="flex-1 w-full">
        {!hasTeamMembers ? (
          <div className="flex items-center justify-center h-96 space-y-4">
            <div className="text-center space-y-2">
              <Users className="h-12 w-12 text-muted-foreground opacity-50 mx-auto" />
              <h3 className="text-lg font-semibold">{t('architect.tasks.teamMembers')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('architect.tasks.noTeamMembersYet')}
              </p>
              <Button onClick={() => setSheetOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('architect.tasks.addTeamMember')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 pb-4 pr-4">
            {/* Unassigned tasks column */}
            <TeamMemberCard
              member={null}
              taskStats={teamMemberStats.unassigned}
              isUnassigned={true}
            />

            {/* Team member columns */}
            {teamMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                taskStats={teamMemberStats[member.id]}
                projectId={projectId}
                onRemove={() => handleRemoveTeamMember(member.id)}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['team_members', projectId] });
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <AddTeamMemberSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={projectId}
        onSuccess={handleSheetSuccess}
      />
    </div>
  );
};
