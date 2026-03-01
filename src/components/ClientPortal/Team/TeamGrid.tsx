import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { TeamMemberCard } from './TeamMemberCard';
import { Loader2 } from 'lucide-react';

export function TeamGrid() {
  const { teamMembers, isLoading } = useProjectTeam();

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        No team members visible for this project.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {teamMembers.map((member) => (
        <TeamMemberCard key={member.id} member={member} />
      ))}
    </div>
  );
}
