/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from "react";
import {
  Folder,
  File,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  Share2,
  Filter,
  User,
  Lock,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteDocument } from "@/hooks/useDeleteDocument";
import { DocumentPreviewDialog } from "./DocumentPreviewDialog";
import { DocumentShareDialog } from "./DocumentShareDialog";
import { FolderClientAccessDialog } from "./FolderClientAccessDialog";
import { format } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";
import {
  getAllCategories,
  DOCUMENT_CATEGORY_COLORS,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
} from "@/constants/documentCategories";
import { CardContent } from "@/components/ui/card";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  file_size: number;
  storage_path: string;
  created_at: string;
  description: string | null;
  tags: string[] | null;
}

interface FolderItem {
  id: string;
  folder_name: string;
  created_at: string;
  folder_type?: "personal" | "shared" | "client";
  description?: string | null;
  client_accessible?: boolean;
  document_count?: number;
}

interface DocumentListProps {
  folders: FolderItem[];
  documents: Document[];
  onFolderClick: (folderId: string) => void;
  projectId: string;
  folderView: "list" | "cards";
  cardsPerRow: string;
  onUploadClick?: () => void;
  onCreateFolderClick?: () => void;
}

const folderNameTranslationMap: Record<string, string> = {
  General: "documents.folderNames.general",
  Presentations: "documents.folderNames.presentations",
  "Meeting Reports": "documents.folderNames.meetingReports",
  "Property Documents": "documents.folderNames.propertyDocuments",
  References: "documents.folderNames.references",
  Survey: "documents.folderNames.survey",
  "Preliminary Design": "documents.folderNames.preliminaryDesign",
  Construction: "documents.folderNames.construction",
  "Post-construction": "documents.folderNames.postConstruction",
  "Client Documents": "documents.folderNames.clientDocuments",
  Internal: "documents.folderNames.internal",
};

export function DocumentList({
  folders,
  documents,
  onFolderClick,
  projectId,
  folderView,
  cardsPerRow,
  onUploadClick,
  onCreateFolderClick,
}: DocumentListProps) {
  const { t } = useLocalization();
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const [clientAccessFolderId, setClientAccessFolderId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const deleteDocument = useDeleteDocument();

  // Filter documents by category
  const filteredDocuments =
    categoryFilter === "all" ? documents : documents.filter((doc) => doc.tags?.includes(categoryFilter));

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage.from("project-documents").download(doc.storage_path);

    if (error) {
      console.error("Download error:", error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const canPreview = (doc: Document) => {
    const previewableTypes = ["image", "application/pdf"];
    return doc.file_type === "image" || doc.mime_type === "application/pdf";
  };

  const getFolderIcon = (folder: FolderItem) => {
    switch (folder.folder_type) {
      case "personal":
        return <User className="h-5 w-5 text-blue-600" />;
      case "client":
        return <Lock className="h-5 w-5 text-green-600" />;
      default:
        return <Folder className="h-5 w-5 text-primary" />;
    }
  };

  const getFolderTypeLabel = (folder: FolderItem) => {
    switch (folder.folder_type) {
      case "personal":
        return t("documents.documentList.personalFolder");
      case "client":
        return folder.client_accessible
          ? `${t("documents.documentList.clientFolder")} (${t("documents.documentList.sharedFolder")})`
          : t("documents.documentList.clientFolder");
      default:
        return t("documents.documentList.sharedFolder");
    }
  };

  const cardsPerRowNumber = Number(cardsPerRow) || 4;
  const getCategoryLabel = (category: DocumentCategory) => {
    const translationKey = DOCUMENT_CATEGORY_LABELS[category];
    if (!translationKey) return category;
    const translated = t(translationKey);
    return translated && translated !== translationKey ? translated : category;
  };
  const getTranslatedFolderName = (name?: string | null) => {
    if (!name) return "";
    if (name.startsWith("documents.")) {
      const translatedFromKey = t(name);
      if (translatedFromKey && translatedFromKey !== name) {
        return translatedFromKey;
      }
    }
    const translationKey = folderNameTranslationMap[name];
    if (translationKey) {
      const translated = t(translationKey);
      if (translated && translated !== translationKey) {
        return translated;
      }
    }
    return name;
  };

  const isEmpty = folders.length === 0 && filteredDocuments.length === 0;

  return (
    <CardContent className="p-0">
      {/* Category filter only when there are documents */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/60">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("documents.filters.allCategories")}</SelectItem>
              {getAllCategories().map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content area */}
      <div className="p-6">
      <div
        className={folderView === "cards" ? "grid gap-4" : "space-y-2"}
        style={
          folderView === "cards"
            ? {
                gridTemplateColumns: `repeat(${cardsPerRowNumber}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {/* Folders */}
        {folders.map((folder) => {
          const folderIcon = getFolderIcon(folder);
          const folderTypeLabel = getFolderTypeLabel(folder);

          if (folderView === "cards") {
            return (
              <div
                key={folder.id}
                className="rounded-lg border bg-card p-4 hover:bg-primary/10 cursor-pointer transition"
                onClick={() => onFolderClick(folder.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {folderIcon}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{getTranslatedFolderName(folder.folder_name)}</p>
                      <Badge variant="outline" className="text-xs mt-1 inline-flex">
                        {folderTypeLabel}
                      </Badge>
                    </div>
                  </div>
                  {folder.folder_type === "client" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientAccessFolderId(folder.id);
                      }}
                      title={t("documents.folders.manageClientAccess")}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {folder.description && (
                  <p className="text-sm text-muted-foreground mt-2">{folder.description}</p>
                )}
                <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                  <span>Created {format(new Date(folder.created_at), "MMM d, yyyy")}</span>
                  <Badge variant="secondary" className="text-xs">
                    {folder.document_count || 0} {(folder.document_count || 0) === 1 ? 'file' : 'files'}
                  </Badge>
                </div>
              </div>
            );
          }

          return (
            <div
              key={folder.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4 hover:bg-primary/10 cursor-pointer"
              onClick={() => onFolderClick(folder.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {folderIcon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{getTranslatedFolderName(folder.folder_name)}</p>
                    <Badge variant="outline" className="text-xs">
                      {folderTypeLabel}
                    </Badge>
                  </div>
                  {folder.description && <p className="text-sm text-muted-foreground truncate">{folder.description}</p>}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Created {format(new Date(folder.created_at), "MMM d, yyyy")}</span>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {folder.document_count || 0} {(folder.document_count || 0) === 1 ? 'file' : 'files'}
                    </Badge>
                  </div>
                </div>
                {folder.folder_type === "client" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClientAccessFolderId(folder.id);
                    }}
                    title={t("documents.folders.manageClientAccess")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Documents */}
        {filteredDocuments.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{doc.file_name}</p>
                  {doc.tags &&
                    doc.tags.length > 0 &&
                    doc.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className={`text-xs ${DOCUMENT_CATEGORY_COLORS[tag as DocumentCategory] || ""}`}
                      >
                        {getCategoryLabel(tag as DocumentCategory)}
                      </Badge>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                </div>
                {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canPreview(doc) && (
                  <DropdownMenuItem onClick={() => setPreviewDoc(doc)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDoc(doc)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteDocument.mutate(doc.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {isEmpty && (
          <div
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-16 px-6 text-center w-full min-w-0 ${
              folderView === "cards" ? "col-span-full" : ""
            }`}
          >
            <div className="rounded-full bg-muted/60 p-5 mb-5">
              <File className="h-14 w-14 text-muted-foreground mx-auto" strokeWidth={1.25} />
            </div>
            {categoryFilter === "all" ? (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("documents.emptyState.noFiles")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {t("documents.emptyState.uploadPrompt")}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("documents.emptyState.noFilesInCategory")}
                </h3>
                <p className="text-sm text-muted-foreground mx-auto">
                  {t("documents.emptyState.tryDifferentFilter")}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      </div>

      {previewDoc && (
        <DocumentPreviewDialog document={previewDoc} open={!!previewDoc} onClose={() => setPreviewDoc(null)} />
      )}

      {shareDoc && (
        <DocumentShareDialog
          open={!!shareDoc}
          onOpenChange={(open) => !open && setShareDoc(null)}
          documentId={shareDoc.id}
          documentName={shareDoc.file_name}
          projectId={projectId}
        />
      )}

      {clientAccessFolderId && (
        <FolderClientAccessDialog
          folderId={clientAccessFolderId}
          projectId={projectId}
          open={!!clientAccessFolderId}
          onClose={() => setClientAccessFolderId(null)}
        />
      )}
    </CardContent>
  );
}
