import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/hooks/useUserRoles";
import { Shield, Users, Eye, HardHat, Briefcase, Building, Calculator } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface RoleBadgeProps {
  role: UserRole;
  showIcon?: boolean;
}

const roleConfig: Record<UserRole, { labelKey: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Shield }> = {
  admin: { labelKey: "supervisor.roles.admin", variant: "destructive", icon: Shield },
  project_manager: { labelKey: "supervisor.roles.projectManager", variant: "default", icon: Briefcase },
  site_supervisor: { labelKey: "supervisor.roles.siteSupervisor", variant: "secondary", icon: HardHat },
  admin_office: { labelKey: "supervisor.roles.adminOffice", variant: "secondary", icon: Building },
  client: { labelKey: "supervisor.roles.client", variant: "outline", icon: Users },
  viewer: { labelKey: "supervisor.roles.viewer", variant: "outline", icon: Eye },
  accountant: { labelKey: "supervisor.roles.accountant", variant: "default", icon: Calculator },
};

export function RoleBadge({ role, showIcon = true }: RoleBadgeProps) {
  const { t } = useLocalization();
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {t(config.labelKey)}
    </Badge>
  );
}
