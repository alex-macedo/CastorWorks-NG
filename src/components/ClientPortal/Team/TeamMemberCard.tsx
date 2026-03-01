import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone } from 'lucide-react';
import type { ProjectTeamMember } from '@/types/clientPortal';
import { getProjectTeamRoleLabel } from '@/utils/projectTeamRole';

interface TeamMemberCardProps {
  member: ProjectTeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const initials = (member.name || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <AvatarResolved
          src={member.avatar_url}
          alt={member.name}
          fallback={initials}
          className="h-32 w-32 mb-4 border-4 border-background shadow-sm"
          fallbackClassName="text-2xl bg-primary/10 text-primary"
        />

        <h3 className="text-lg font-semibold text-foreground mb-1">
          {member.name}
        </h3>
        
        <div className="mb-6 space-y-1">
          <p className="text-sm font-medium text-blue-600">
            {getProjectTeamRoleLabel(member.role)}
          </p>
          {member.title && (
            <p className="text-xs text-muted-foreground">
              {member.title}
            </p>
          )}
        </div>

        <div className="w-full space-y-2 mt-auto">
          {member.email && (
            <a 
              href={`mailto:${member.email}`}
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span className="truncate">{member.email}</span>
            </a>
          )}
          
          {member.phone && (
            <a 
              href={`tel:${member.phone}`}
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>{member.phone}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
