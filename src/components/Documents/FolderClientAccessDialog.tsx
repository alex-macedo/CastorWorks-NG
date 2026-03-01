/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { useEffect, useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
interface FolderClientAccessDialogProps {
  folderId: string;
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function FolderClientAccessDialog({ folderId, projectId, open, onClose }: FolderClientAccessDialogProps) {
  const { t } = useLocalization();
  const queryClient = useQueryClient();
  const [clientAccess, setClientAccess] = useState<
    Record<string, { can_view: boolean; can_upload: boolean; can_download: boolean }>
  >({});

  // Fetch project clients
  const { data: projectClients, isLoading: clientsLoading } = useQuery({
    queryKey: ["project-clients", projectId],
    queryFn: async () => {
      // Get clients associated with this project
      const { data: accessData, error: accessError } = await supabase
        .from("client_project_access")
        .select("client_id")
        .eq("project_id", projectId);

      if (accessError) throw accessError;

      if (!accessData || accessData.length === 0) {
        return [];
      }

      const clientIds = accessData.map((a) => a.client_id);
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, email")
        .in("id", clientIds);

      if (clientsError) throw clientsError;
      return (clients || []) as Client[];
    },
    enabled: open,
  });

  // Fetch current folder client access
  const { data: currentAccess, isLoading: accessLoading } = useQuery({
    queryKey: ["folder-client-access", folderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("folder_client_access").select("*").eq("folder_id", folderId);

      if (error) throw error;
      return (data || []) as FolderClientAccess[];
    },
    enabled: open,
  });

  // Initialize client access state
  useEffect(() => {
    if (projectClients && currentAccess) {
      const accessMap: Record<string, { can_view: boolean; can_upload: boolean; can_download: boolean }> = {};

      // Initialize all clients with default permissions
      projectClients.forEach((client) => {
        const existing = currentAccess.find((a) => a.client_id === client.id);
        accessMap[client.id] = {
          can_view: existing?.can_view ?? true,
          can_upload: existing?.can_upload ?? false,
          can_download: existing?.can_download ?? true,
        };
      });

      setClientAccess(accessMap);
    }
  }, [projectClients, currentAccess]);

  // Save access changes
  const saveAccess = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get current access records
      const { data: existingRecords } = await supabase
        .from("folder_client_access")
        .select("id, client_id")
        .eq("folder_id", folderId);

      const existingMap = new Map((existingRecords || []).map((r) => [r.client_id, r.id]));

      // Prepare upsert operations
      const operations = Object.entries(clientAccess).map(([clientId, permissions]) => {
        const existingId = existingMap.get(clientId);

        if (existingId) {
          // Update existing record
          return supabase
            .from("folder_client_access")
            .update({
              can_view: permissions.can_view,
              can_upload: permissions.can_upload,
              can_download: permissions.can_download,
              granted_by: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId);
        } else {
          // Insert new record
          return supabase.from("folder_client_access").insert({
            folder_id: folderId,
            client_id: clientId,
            can_view: permissions.can_view,
            can_upload: permissions.can_upload,
            can_download: permissions.can_download,
            granted_by: user.id,
          });
        }
      });

      // Execute all operations
      const results = await Promise.all(operations);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to save some access changes: ${errors[0].error?.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folder-client-access"] });
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
      toast.success(t("documents.folderClientAccessSaved") || "Client access permissions saved successfully");
      onClose();
    },
    onError: (error: Error) => {
      console.error("Failed to save client access:", error);
      toast.error(t("documents.folderClientAccessError") || `Failed to save client access: ${error.message}`);
    },
  });

  const handlePermissionChange = (
    clientId: string,
    permission: "can_view" | "can_upload" | "can_download",
    value: boolean,
  ) => {
    setClientAccess((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [permission]: value,
      },
    }));
  };

  const isLoading = clientsLoading || accessLoading;

  return (
    <Sheet open={open} onOpenChange={(val) => val === false && onClose()}>
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>{t("documents.folders.manageClientAccess") || "Manage Client Access"}</SheetTitle>
          <SheetDescription>
            {t("documents.folders.manageClientAccessDescription") ||
              "Control which clients can access this folder and their permissions."}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projectClients && projectClients.length > 0 ? (
            <div className="space-y-4">
              {projectClients.map((client) => {
                const access = clientAccess[client.id] || {
                  can_view: true,
                  can_upload: false,
                  can_download: true,
                };

                return (
                  <div key={client.id} className="rounded-lg border p-4 space-y-3 bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{client.name}</div>
                        {client.email && <div className="text-sm text-muted-foreground">{client.email}</div>}
                      </div>
                    </div>
                    <div className="space-y-2 pl-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${client.id}-view`}
                          checked={access.can_view}
                          onCheckedChange={(checked) => handlePermissionChange(client.id, "can_view", checked === true)}
                        />
                        <Label htmlFor={`${client.id}-view`} className="cursor-pointer flex-1">
                          {t("documents.folders.canView") || "Can View"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${client.id}-download`}
                          checked={access.can_download}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(client.id, "can_download", checked === true)
                          }
                          disabled={!access.can_view}
                        />
                        <Label htmlFor={`${client.id}-download`} className="cursor-pointer flex-1">
                          {t("documents.folders.canDownload") || "Can Download"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`${client.id}-upload`}
                          checked={access.can_upload}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(client.id, "can_upload", checked === true)
                          }
                          disabled={!access.can_view}
                        />
                        <Label htmlFor={`${client.id}-upload`} className="cursor-pointer flex-1">
                          {t("documents.folders.canUpload") || "Can Upload"}
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-start gap-2 rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>{t("documents.folders.tip") || "Note:"}</strong>{" "}
                  {t("documents.folders.clientAccessTip") ||
                    "Only clients associated with this project can be granted folder access. Download and upload permissions require view access."}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("documents.folders.noProjectClients") || "No clients are associated with this project."}
            </div>
          )}
        </div>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("documents.folders.cancel") || "Cancel"}
          </Button>
          <Button type="button" onClick={() => saveAccess.mutate()} disabled={isLoading || saveAccess.isPending}>
            {saveAccess.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("documents.folders.saving") || "Saving..."}
              </>
            ) : (
              t("documents.folders.save") || "Save Changes"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}