import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvatarResolved } from "@/components/ui/AvatarResolved";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Shield, Edit } from "lucide-react";
import { useRoleManagement } from "@/hooks/useRoleManagement";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUserProfile } from "@/hooks/useUserProfile";
import { RoleManagementDialog } from "./RoleManagementDialog";
import { EditProfileDialog } from "./EditProfileDialog";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ROLE_LABEL_KEYS } from "@/constants/rolePermissions";
import type { AppRole } from "@/hooks/useUserRoles";

const roleColors: Record<string, string> = {
  admin: "bg-destructive text-destructive-foreground",
  project_manager: "bg-primary text-primary-foreground",
  site_supervisor: "bg-blue-600 text-white",
  admin_office: "bg-blue-600 text-white",
  client: "bg-cyan-600 text-white",
  viewer: "bg-muted text-muted-foreground",
};

export function UserManagementPanel() {
  const { t } = useLocalization();
  const { users, isLoading } = useRoleManagement();
  const { data: currentUserRolesData } = useUserRoles();
  const currentUserRoles = currentUserRolesData?.map(r => r.role);
  const { data: currentUser } = useUserProfile();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const isAdmin = currentUserRoles?.includes("admin");

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("settings:userManagement")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users?.map((user) => (
              <Card key={user.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <AvatarResolved
                      src={user.avatar_url}
                      alt={user.display_name || user.email || 'User'}
                      fallback={(user.display_name || user.email || 'User').substring(0, 2).toUpperCase()}
                      className="h-10 w-10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.display_name || user.email || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">{t("settings:noRoles")}</Badge>
                      ) : (
                        user.roles.filter(Boolean).map((role) => (
                          <Badge
                            key={role}
                            className={roleColors[role] || ""}
                            variant="secondary"
                          >
                            {t(ROLE_LABEL_KEYS[role as AppRole] || role)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {(user.id === currentUser?.id || isAdmin) && (
                      <Button
                        size="sm"
                        className={isAdmin && user.id !== currentUser?.id ? "flex-1" : "flex-1"}
                        onClick={() => setEditingUserId(user.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("settings:editProfile")}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="sm"
                        className={user.id === currentUser?.id || (isAdmin && user.id !== currentUser?.id) ? "flex-1" : "w-full"}
                        onClick={() => setSelectedUser(user.id)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {t("settings:manageRoles")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {users?.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {t("settings:noUsers")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedUser && (
        <RoleManagementDialog
          userId={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {editingUserId && (
        <EditProfileDialog
          userId={editingUserId}
          open={!!editingUserId}
          onClose={() => setEditingUserId(null)}
        />
      )}
    </>
  );
}
