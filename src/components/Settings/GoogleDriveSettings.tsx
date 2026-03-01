import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/useProjects";
import { CloudUpload, FolderSync, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useLocalization } from "@/contexts/LocalizationContext";
export function GoogleDriveSettings() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(false);
  const { projects = [] } = useProjects();
  const { toast } = useToast();
  const { t } = useLocalization();

  const handleConnect = async () => {
    // In production, this would initiate OAuth flow
    toast({
      title: t("settings:googleDrive.toast.oauthTitle"),
      description: t("settings:googleDrive.toast.oauthDescription"),
    });
  };

  const handleCreateFolder = async () => {
    if (!selectedProjectId) {
      toast({
        title: t("settings:googleDrive.toast.selectProjectTitle"),
        description: t("settings:googleDrive.toast.selectProjectForFolder"),
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-google-drive', {
        body: {
          action: 'create-project-folder',
          projectId: selectedProjectId,
        }
      });

      if (error) throw error;

      toast({
        title: t("settings:googleDrive.toast.folderCreatedTitle"),
        description: t("settings:googleDrive.toast.folderCreatedDescription", {
          name: data.folderName,
        }),
      });
    } catch (error: any) {
      toast({
        title: t("settings:googleDrive.toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncDocuments = async () => {
    if (!selectedProjectId) {
      toast({
        title: t("settings:googleDrive.toast.selectProjectTitle"),
        description: t("settings:googleDrive.toast.selectProjectForSync"),
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-google-drive', {
        body: {
          action: 'sync-documents',
          projectId: selectedProjectId,
          folderId: 'folder-id-placeholder', // Would come from project metadata
        }
      });

      if (error) throw error;

      toast({
        title: t("settings:googleDrive.toast.documentsSyncedTitle"),
        description: t("settings:googleDrive.toast.documentsSyncedDescription", {
          count: data.count,
        }),
      });
    } catch (error: any) {
      toast({
        title: t("settings:googleDrive.toast.syncFailedTitle"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" />
          {t("settings:googleDrive.title")}
        </CardTitle>
        <CardDescription>
          {t("settings:googleDrive.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("settings:googleDrive.connectionStatusLabel")}</p>
            <p className="text-xs text-muted-foreground">
              {connected
                ? t("settings:googleDrive.connectedStatus")
                : t("settings:googleDrive.disconnectedStatus")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("settings:googleDrive.connectedBadge")}
              </Badge>
            ) : (
              <Button onClick={handleConnect}>
                {t("settings:googleDrive.connectButton")}
              </Button>
            )}
          </div>
        </div>

        {/* Project Selection */}
        <div className="space-y-2">
          <Label>{t("settings:googleDrive.selectProjectLabel")}</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder={t("additionalPlaceholders.selectProject")} />
            </SelectTrigger>
            <SelectContent>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto Sync Setting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("settings:googleDrive.autoSyncLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("settings:googleDrive.autoSyncDescription")}
            </p>
          </div>
          <Switch
            checked={autoSync}
            onCheckedChange={setAutoSync}
            disabled={!connected}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={handleCreateFolder}
            disabled={!connected || !selectedProjectId || syncing}
            className="w-full"
            variant="outline"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FolderSync className="h-4 w-4 mr-2" />
            )}
            {t("settings:googleDrive.createFolderButton")}
          </Button>

          <Button
            onClick={handleSyncDocuments}
            disabled={!connected || !selectedProjectId || syncing}
            className="w-full"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4 mr-2" />
            )}
            {t("settings:googleDrive.syncDocumentsButton")}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-semibold">{t("settings:googleDrive.folderStructureTitle")}</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>{t("settings:googleDrive.folderStructure.documents")}</li>
            <li>{t("settings:googleDrive.folderStructure.photos")}</li>
            <li>{t("settings:googleDrive.folderStructure.reports")}</li>
            <li>{t("settings:googleDrive.folderStructure.materials")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
