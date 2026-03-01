import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useUploadDocument } from "@/hooks/useUploadDocument";
import { useLocalization } from "@/contexts/LocalizationContext";
import { getAllCategories, DOCUMENT_CATEGORY_LABELS, type DocumentCategory } from "@/constants/documentCategories";
import { useProjectFolders } from "@/hooks/useProjectFolders";

interface FileUploadDialogProps {
  projectId: string;
  folderId?: string | null;
  open: boolean;
  onClose: () => void;
}

export function FileUploadDialog({
  projectId,
  folderId,
  open,
  onClose,
}: FileUploadDialogProps) {
  const { t } = useLocalization();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId ?? null);
  const uploadDocument = useUploadDocument();
  
  // Use undefined for parentFolderId to fetch ALL folders for the project
  // This allows the dialog to correctly identify the current folder even if it's nested
  const { data: allFolders = [] } = useProjectFolders(projectId, undefined);

  useEffect(() => {
    if (open) {
      setSelectedFolderId(folderId ?? null);
    }
  }, [folderId, open]);

  const folderOptions = useMemo(() => {
    const sorted = [...allFolders].sort((a, b) => a.folder_name.localeCompare(b.folder_name, undefined, { sensitivity: "base" }));
    if (!sorted.some((folder) => folder.id === selectedFolderId) && selectedFolderId) {
      const current = allFolders.find((folder) => folder.id === selectedFolderId);
      if (current) {
        return [current, ...sorted];
      }
    }
    return sorted;
  }, [allFolders, selectedFolderId]);

  const getCategoryLabel = (cat: DocumentCategory) => {
    const translationKey = DOCUMENT_CATEGORY_LABELS[cat];
    if (!translationKey) return cat;
    const translated = t(translationKey);
    return translated && translated !== translationKey ? translated : cat;
  };

  const getFolderLabel = (name?: string | null) => {
    if (!name) return "";
    if (name.startsWith("documents.")) {
      const translated = t(name);
      if (translated && translated !== name) {
        return translated;
      }
    }
    return name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    await uploadDocument.mutateAsync({
      projectId,
      file,
      folderId: selectedFolderId,
      description: description.trim() || undefined,
      tags: category ? [category] : undefined,
    });

    setFile(null);
    setDescription("");
    setCategory("");
    setSelectedFolderId(folderId);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => val === false && onClose()}>
      <SheetContent>
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t('documents.uploadDialog.title')}</SheetTitle>
            <SheetDescription>{t('documents.uploadDialog.description')}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file-upload">{t('documents.uploadDialog.fileLabel')}</Label>
              <div className="mt-2">
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('documents.uploadDialog.selectedFile', { 
                    fileName: file.name, 
                    fileSize: (file.size / 1024 / 1024).toFixed(2) 
                  })}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="folder-select">{t('documents.uploadDialog.folderLabel')}</Label>
              <Select
                value={selectedFolderId ?? "root"}
                onValueChange={(value) => setSelectedFolderId(value === "root" ? null : value)}
              >
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder={t('documents.uploadDialog.folderPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">{t('documents.uploadDialog.folderRootOption')}</SelectItem>
                  {folderOptions.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {getFolderLabel(folder.folder_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">{t('documents.uploadDialog.categoryLabel')}</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as DocumentCategory)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('documents.uploadDialog.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {getAllCategories().map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">{t('documents.uploadDialog.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('documents.uploadDialog.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('documents.uploadDialog.cancel')}
            </Button>
            <Button type="submit" disabled={!file || uploadDocument.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {uploadDocument.isPending ? t('documents.uploadDialog.uploading') : t('documents.uploadDialog.upload')}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
