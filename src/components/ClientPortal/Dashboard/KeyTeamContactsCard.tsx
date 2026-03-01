import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjectTeam } from "@/hooks/clientPortal/useProjectTeam";
import { Loader2, Users } from "lucide-react";
import { getProjectTeamRoleLabel } from "@/utils/projectTeamRole";
import { AvatarResolved } from "@/components/ui/AvatarResolved";
import { cn } from "@/lib/utils";

export function KeyTeamContactsCard() {
  const { teamMembers, isLoading } = useProjectTeam();
  const { t } = useLocalization();

  // Take first 3 team members
  const displayTeam = teamMembers?.slice(0, 3) || [];

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.keyTeamContacts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex justify-between items-start pt-2">
            {displayTeam.map((member) => (
              <div key={member.id} className="flex flex-col items-center text-center space-y-1">
                <AvatarResolved
                  src={member.avatar_url}
                  alt={member.name || 'User'}
                  className="h-12 w-12"
                  fallback={(member.name || 'User').substring(0, 2).toUpperCase()}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium leading-none">{(member.name || 'User').split(' ')[0]}</p>
                  <p className="text-xs text-muted-foreground">{getProjectTeamRoleLabel(member.role)}</p>
                </div>
              </div>
            ))}
            {displayTeam.length === 0 && (
              <p className="text-sm text-muted-foreground w-full text-center">{t("clientPortal.dashboard.keyTeamContacts.noMembers")}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
