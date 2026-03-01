import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { ProjectTeamMember } from '@/types/contacts';
import { EditTeamMemberSheet } from './EditTeamMemberSheet';
import { useLocalization } from "@/contexts/LocalizationContext";
interface TaskStats {
  todo: number;
  inProgress: number;
  completed: number;
}

interface TeamMemberCardProps {
  member: ProjectTeamMember | null;
  taskStats?: TaskStats;
  isUnassigned?: boolean;
  onRemove?: () => void;
  projectId?: string;
  onUpdate?: () => void;
}

export const TeamMemberCard = ({
  member,
  taskStats = { todo: 0, inProgress: 0, completed: 0 },
  isUnassigned = false,
  onRemove,
  projectId,
  onUpdate,
}: TeamMemberCardProps) => {
  const { t } = useLocalization();
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const totalTasks = taskStats.todo + taskStats.inProgress + taskStats.completed;

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isUnassigned) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{t("common.ui.unassigned")}</span>
            <Badge variant="secondary">{totalTasks}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <div className="space-y-1">
            <div>{t("architect.tasks.statuses.todo")}: {taskStats.todo}</div>
            <div>{t("architect.tasks.statuses.in_progress")}: {taskStats.inProgress}</div>
            <div>{t("architect.tasks.statuses.completed")}: {taskStats.completed}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <Card className="min-w-80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <AvatarResolved
              src={member.avatar_url}
              alt={member.user_name}
              fallback={getInitials(member.user_name)}
              className="h-10 w-10"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{member.user_name}</h3>
              <p className="text-xs text-muted-foreground truncate">{member.role}</p>
              {member.title && (
                <p className="text-xs text-muted-foreground truncate">{member.title}</p>
              )}
            </div>
          </div>
          {(onRemove || projectId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {projectId && (
                  <DropdownMenuItem onClick={() => setEditSheetOpen(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t("architect.common.actions.edit")}
                  </DropdownMenuItem>
                )}
                {onRemove && (
                  <DropdownMenuItem onClick={onRemove} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("architect.common.actions.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="text-xs text-muted-foreground">{t("architect.assignedTasks")}</div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>{t("architect.tasks.statuses.todo")}</span>
              <Badge variant="outline">{taskStats.todo}</Badge>
            </div>
            <div className="flex justify-between">
              <span>{t("architect.tasks.statuses.in_progress")}</span>
              <Badge variant="default">{taskStats.inProgress}</Badge>
            </div>
            <div className="flex justify-between">
              <span>{t("architect.tasks.statuses.completed")}</span>
              <Badge variant="secondary">{taskStats.completed}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
      {projectId && (
        <EditTeamMemberSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          projectId={projectId}
          member={member}
          onSuccess={() => {
            setEditSheetOpen(false);
            onUpdate?.();
          }}
        />
      )}
    </Card>
  );
};
