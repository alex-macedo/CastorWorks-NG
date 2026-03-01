import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/useUsers";
import { useAssignRole } from "@/hooks/useAssignRole";
import { useRemoveRole } from "@/hooks/useRemoveRole";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { Database } from "@/integrations/supabase/types";
import { ROLE_LABEL_KEYS } from "@/constants/rolePermissions";
import type { AppRole } from "@/hooks/useUserRoles";

type AppRoleBase = Database["public"]["Enums"]["app_role"];
// Temporary extended type until backend types include all roles
type AppRoleExtended = AppRoleBase | "site_supervisor" | "admin_office" | "client" | "architect" | "global_admin";

const availableRoles: AppRoleExtended[] = ["admin", "project_manager", "site_supervisor", "admin_office", "client", "viewer", "architect", "global_admin"];

interface RoleManagementDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function RoleManagementDialog({
  userId,
  open,
  onClose,
}: RoleManagementDialogProps) {
  const { t } = useLocalization();
  const { data: users } = useUsers();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const [selectedRoles, setSelectedRoles] = useState<Set<AppRoleExtended>>(new Set());

  const user = users?.find((u) => u.id === userId);

  useEffect(() => {
    if (user) {
      setSelectedRoles(new Set((user.roles as AppRoleExtended[]) || []));
    }
  }, [user]);

  const handleToggleRole = (role: AppRoleExtended) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(role)) {
      newRoles.delete(role);
    } else {
      newRoles.add(role);
    }
    setSelectedRoles(newRoles);
  };

  const handleSave = async () => {
    if (!user) return;

    const currentRoles = new Set((user.roles as AppRoleExtended[]) || []);
    const rolesToAdd = Array.from(selectedRoles).filter((r) => !currentRoles.has(r));
    const rolesToRemove = Array.from(currentRoles).filter((r) => !selectedRoles.has(r));

    try {
      for (const role of rolesToAdd) {
        await assignRole.mutateAsync({ userId, role: role as AppRoleBase });
      }
      for (const role of rolesToRemove) {
        await removeRole.mutateAsync({ userId, role: role as AppRoleBase });
      }
      onClose();
    } catch (error) {
      console.error("Failed to update roles:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {t("settings:manageRoles")} - {user?.display_name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {availableRoles.map((role) => (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={role}
                checked={selectedRoles.has(role)}
                onCheckedChange={() => handleToggleRole(role)}
              />
              <Label htmlFor={role} className="cursor-pointer">
                {t(ROLE_LABEL_KEYS[role as AppRole] || role)}
                {role === "global_admin" && (
                  <span className="ml-1 text-muted-foreground text-xs font-normal">
                    ({t("settings:globalAdminSupportOnly")})
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>
            {t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
