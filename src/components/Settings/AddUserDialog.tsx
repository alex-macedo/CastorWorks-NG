import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCreateUser } from "@/hooks/useCreateUser";
import { useLocalization } from "@/contexts/LocalizationContext";
import type { Database } from "@/integrations/supabase/types";
import { ROLE_LABEL_KEYS } from "@/constants/rolePermissions";
import type { AppRole } from "@/hooks/useUserRoles";

type AppRoleBase = Database["public"]["Enums"]["app_role"];
type AppRoleExtended = AppRoleBase | "site_supervisor" | "admin_office" | "client" | "architect" | "global_admin" | "super_admin" | "platform_owner" | "platform_support" | "platform_sales";

const availableRoles: AppRoleExtended[] = ["admin", "project_manager", "site_supervisor", "admin_office", "client", "viewer", "architect", "global_admin", "super_admin", "platform_owner", "platform_support", "platform_sales"];

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddUserDialog({ open, onClose }: AddUserDialogProps) {
  const { t } = useLocalization();
  const createUser = useCreateUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<AppRoleExtended>>(new Set());
  const [sendInvite, setSendInvite] = useState(true);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setSelectedRoles(new Set());
    setSendInvite(true);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleToggleRole = (role: AppRoleExtended) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(role)) {
      newRoles.delete(role);
    } else {
      newRoles.add(role);
    }
    setSelectedRoles(newRoles);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }

    try {
      await createUser.mutateAsync({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
        roles: Array.from(selectedRoles) as AppRoleBase[],
        sendInvite,
      });
      handleClose();
    } catch (error) {
      console.error("Failed to create user:", error);
    }
  };

  const isLoading = createUser.isPending;
  const isValid = email.trim() && password.trim() && password.length >= 8;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("settings:addUserDialog.title")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("settings:addUserDialog.email")} *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("settings:addUserDialog.emailPlaceholder")}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t("settings:addUserDialog.displayName")}</Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("settings:addUserDialog.displayNamePlaceholder")}
              disabled={isLoading}
            />
          </div>

          {!sendInvite && (
            <div className="space-y-2">
              <Label htmlFor="password">{t("settings:addUserDialog.password")} *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("settings:addUserDialog.passwordPlaceholder")}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings:addUserDialog.passwordHint")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("settings:addUserDialog.selectRoles")}</Label>
            <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
              {availableRoles.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={selectedRoles.has(role)}
                    onCheckedChange={() => handleToggleRole(role)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`role-${role}`} className="cursor-pointer text-sm">
                    {t(ROLE_LABEL_KEYS[role as AppRole] || role)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked === true)}
              disabled={isLoading}
            />
            <Label htmlFor="sendInvite" className="cursor-pointer text-sm">
              {t("settings:addUserDialog.sendInvite")}
            </Label>
          </div>

          {sendInvite && (
            <div className="space-y-2">
              <Label htmlFor="tempPassword">{t("settings:addUserDialog.tempPassword")} *</Label>
              <Input
                id="tempPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("settings:addUserDialog.tempPasswordPlaceholder")}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                {t("settings:addUserDialog.tempPasswordHint")}
              </p>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? t("settings:addUserDialog.creating") : t("settings:addUserDialog.create")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
