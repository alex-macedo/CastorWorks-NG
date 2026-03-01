import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useProjectTeamMembers } from "@/hooks/useProjectTeamMembers";
import { useDocumentPermissions, type PermissionLevel } from "@/hooks/useDocumentPermissions";
import { UserPlus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalization } from "@/contexts/LocalizationContext";

interface DocumentShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  projectId: string;
}

export function DocumentShareDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  projectId,
}: DocumentShareDialogProps) {
  const { t } = useLocalization();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedPermission, setSelectedPermission] = useState<PermissionLevel>("view");

  const { teamMembers = [], isLoading: loadingTeam } = useProjectTeamMembers(projectId);
  const { permissions, isLoading: loadingPermissions, grantPermission, updatePermission, revokePermission } = useDocumentPermissions(documentId);

  const availableMembers = teamMembers.filter(
    (member) => !permissions.some((p) => p.user_id === member.user_id)
  );

  const handleGrantPermission = () => {
    if (!selectedUserId) return;
    grantPermission({ userId: selectedUserId, permissionLevel: selectedPermission });
    setSelectedUserId("");
    setSelectedPermission("view");
  };

  return (
    <Sheet open={open} onOpenChange={(val) => onOpenChange(val)}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('documents.shareDialog.title')}</SheetTitle>
          <SheetDescription>
            {t('documents.shareDialog.description', { documentName })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Add New Permission */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t('documents.shareDialog.addTeamMember')}</h4>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('documents.shareDialog.selectTeamMemberPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {loadingTeam ? (
                    <div className="p-2">{t('documents.shareDialog.loadingTeamMembers')}</div>
                  ) : availableMembers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t('documents.shareDialog.allMembersHaveAccess')}
                    </div>
                  ) : (
                    availableMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_name || member.email || "Unknown"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select value={selectedPermission} onValueChange={(value) => setSelectedPermission(value as PermissionLevel)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">{t('documents.shareDialog.permissionLevels.view')}</SelectItem>
                  <SelectItem value="edit">{t('documents.shareDialog.permissionLevels.edit')}</SelectItem>
                  <SelectItem value="admin">{t('documents.shareDialog.permissionLevels.admin')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="icon"
                onClick={handleGrantPermission}
                disabled={!selectedUserId}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current Permissions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t('documents.shareDialog.currentPermissions')}</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loadingPermissions ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('documents.shareDialog.noPermissions')}</p>
              ) : (
                permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {permission.user_profiles?.display_name || "Unknown User"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={permission.permission_level}
                        onValueChange={(value) =>
                          updatePermission({
                            permissionId: permission.id,
                            permissionLevel: value as PermissionLevel,
                          })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">{t('documents.shareDialog.permissionLevels.view')}</SelectItem>
                          <SelectItem value="edit">{t('documents.shareDialog.permissionLevels.edit')}</SelectItem>
                          <SelectItem value="admin">{t('documents.shareDialog.permissionLevels.admin')}</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => revokePermission(permission.id)}
                        title={t('documents.shareDialog.remove')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
