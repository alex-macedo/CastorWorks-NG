import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateFolder, type FolderType } from "@/hooks/useCreateFolder";
import { Folder, Users, User, Info } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface CreateFolderDialogProps {
  projectId: string;
  parentFolderId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function CreateFolderDialog({
  projectId,
  parentFolderId,
  open,
  onClose,
}: CreateFolderDialogProps) {
  const { t } = useLocalization();
  const [folderName, setFolderName] = useState("");
  const [folderType, setFolderType] = useState<FolderType>("shared");
  const [description, setDescription] = useState("");
  const [clientAccessible, setClientAccessible] = useState(false);
  const createFolder = useCreateFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      await createFolder.mutateAsync({
        projectId,
        folderName: folderName.trim(),
        parentFolderId,
        folderType,
        description: description.trim() || undefined,
        clientAccessible: folderType === 'client' ? clientAccessible : false,
      });

      setFolderName("");
      setDescription("");
      setFolderType("shared");
      setClientAccessible(false);
      onClose();
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      // This catch prevents uncaught promise rejection
    }
  };

  const handleClose = () => {
    setFolderName("");
    setDescription("");
    setFolderType("shared");
    setClientAccessible(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(val) => val === false && handleClose()}>
      <SheetContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("documents.folders.createFolder")}</SheetTitle>
            <SheetDescription>
              {t("documents.folders.createFolderDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">{t("documents.folders.folderName")}</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t("documents.folders.folderNamePlaceholder")}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-type">{t("documents.folders.folderType")}</Label>
              <Select value={folderType} onValueChange={(value) => setFolderType(value as FolderType)}>
                <SelectTrigger id="folder-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{t("documents.folders.types.personal")}</div>
                        <div className="text-xs text-muted-foreground">{t("documents.folders.typeDescriptions.personal")}</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="shared">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{t("documents.folders.types.shared")}</div>
                        <div className="text-xs text-muted-foreground">{t("documents.folders.typeDescriptions.shared")}</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{t("documents.folders.types.client")}</div>
                        <div className="text-xs text-muted-foreground">{t("documents.folders.typeDescriptions.client")}</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {folderType === 'client' && (
              <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
                <Checkbox
                  id="client-accessible"
                  checked={clientAccessible}
                  onCheckedChange={(checked) => setClientAccessible(checked === true)}
                />
                <Label htmlFor="client-accessible" className="flex-1 cursor-pointer">
                  <div className="font-medium">{t("documents.folders.clientAccessible")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("documents.folders.clientAccessibleDescription")}
                  </div>
                </Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="folder-description">{t("documents.folders.description")}</Label>
              <Textarea
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("documents.folders.descriptionPlaceholder")}
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <strong>{t("documents.folders.tip")}</strong> {t("documents.folders.tipText")}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("documents.folders.cancel")}
            </Button>
            <Button type="submit" disabled={!folderName.trim() || createFolder.isPending}>
              {createFolder.isPending ? t("documents.folders.creating") : t("documents.folders.create")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
