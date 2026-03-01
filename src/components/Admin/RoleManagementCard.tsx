import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserWithRoles, AppRole } from "@/hooks/useRoleManagement";
import { Shield, UserX, Plus } from "lucide-react";
import { useState } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
interface RoleManagementCardProps {
  user: UserWithRoles;
  onAssignRole: (userId: string, role: AppRole) => void;
  onRemoveRole: (userId: string, role: AppRole) => void;
}

const AVAILABLE_ROLES: AppRole[] = ["admin", "project_manager", "viewer", "site_supervisor", "admin_office", "client", "accountant", "architect", "global_admin"];

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-500",
  project_manager: "bg-blue-500",
  viewer: "bg-gray-500",
  site_supervisor: "bg-green-500",
  admin_office: "bg-blue-500",
  client: "bg-orange-500",
  accountant: "bg-yellow-500",
  architect: "bg-purple-500",
  global_admin: "bg-amber-600",
};

const getRoleLabel = (role: AppRole, t: any): string => {
  const roleMap: Record<AppRole, string> = {
    admin: t("roles.admin") || t("settings:roleAdmin"),
    project_manager: t("roles.projectManager") || t("settings:roleProjectManager"),
    viewer: t("roles.viewer") || t("settings:roleViewer"),
    site_supervisor: t("roles.siteSupervisor") || t("settings:roleSiteSupervisor"),
    admin_office: t("roles.adminOffice") || t("settings:roleAdminOffice"),
    client: t("roles.client") || t("settings:roleClient"),
    accountant: t("roles.accountant") || t("settings:roleAccountant"),
    architect: t("roles.architect") || t("settings:roleArchitect"),
    global_admin: t("settings:roleGlobalAdmin") || "Global Admin",
  };
  return roleMap[role] || role;
};

export const RoleManagementCard = ({ user, onAssignRole, onRemoveRole }: RoleManagementCardProps) => {
  const { t } = useLocalization();
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");

  const availableRolesToAdd = AVAILABLE_ROLES.filter(
    role => !user.roles.includes(role)
  );

  const handleAssignRole = () => {
    if (selectedRole) {
      onAssignRole(user.id, selectedRole);
      setSelectedRole("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{user.email}</CardTitle>
              <CardDescription className="text-xs">
                User ID: {user.id.slice(0, 8)}...
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">{t("roles_management.currentRoles")}</p>
          <div className="flex flex-wrap gap-2">
            {user.roles.length === 0 ? (
              <Badge variant="outline" className="text-muted-foreground">
                {t("roles_management.noRolesAssigned")}
              </Badge>
            ) : (
              user.roles.map(role => (
                <Badge
                  key={role}
                  className={`${ROLE_COLORS[role]} text-white`}
                >
                  {getRoleLabel(role, t)}
                    <button
                    type="button"
                    onClick={() => onRemoveRole(user.id, role)}
                    className="ml-2 hover:bg-white/20 rounded-full p-0.5"
                    aria-label={t("common.remove") || "Remove role"}
                    title={t("common.remove") || "Remove role"}
                  >
                    <UserX className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {availableRolesToAdd.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t("roles_management.selectRoleToAdd")} />
              </SelectTrigger>
              <SelectContent>
                {availableRolesToAdd.map(role => (
                  <SelectItem key={role} value={role}>
                    {role === "global_admin"
                      ? `${getRoleLabel(role, t)} (${t("settings:globalAdminSupportOnly")})`
                      : getRoleLabel(role, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
