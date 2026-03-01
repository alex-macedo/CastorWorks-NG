import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FolderPlus, Upload, FolderTree, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProjectFolders } from "@/hooks/useProjectFolders";
import { useProjectDocuments } from "@/hooks/useProjectDocuments";
import { useMultipleUpload } from "@/hooks/useMultipleUpload";
import { useAutoCreateFolders } from "@/hooks/useAutoCreateFolders";
import { FolderBreadcrumb } from "@/components/Documents/FolderBreadcrumb";
import { CreateFolderDialog } from "@/components/Documents/CreateFolderDialog";
import { FileUploadDialog } from "@/components/Documents/FileUploadDialog";
import { DocumentList } from "@/components/Documents/DocumentList";
import { ApplyFolderTemplateDialog } from "@/components/Documents/ApplyFolderTemplateDialog";
import { DragDropZone } from "@/components/Documents/DragDropZone";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";

const CARDS_PER_ROW_OPTIONS = ["2", "4", "6", "8", "10"];

interface FolderPathItem {
  id: string;
  folder_name: string;
}

interface DocumentsPageProps {
  // Context-specific props
  projectId?: string;
  portalId?: string;
  isPortal?: boolean;

  // Header/navigation props
  backLink?: string;
  backText?: string;
  headerComponent?: React.ReactNode;

  // Feature flags
  showProjectHeader?: boolean;
  showAutoCreateFolders?: boolean;
  showApplyTemplates?: boolean;
}

export function DocumentsPage({
  projectId,
  portalId,
  isPortal = false,
  backLink,
  backText,
  headerComponent,
  showProjectHeader = true,
  showAutoCreateFolders = true,
  showApplyTemplates = true,
}: DocumentsPageProps) {
  const { t } = useLocalization();
  const { id } = useParams();

  // Use the appropriate ID based on context
  const currentId = projectId || portalId || id;
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [hasCheckedAutoCreate, setHasCheckedAutoCreate] = useState(false);
  const [isCreatingFolders, setIsCreatingFolders] = useState(false);
  const [folderView, setFolderView] = useState<"list" | "cards">("cards");
  const [cardsPerRow, setCardsPerRow] = useState("4");

  const multipleUpload = useMultipleUpload();
  const autoCreateFolders = useAutoCreateFolders();

  // Data hooks - these work with project IDs, so we need to handle portal case
  const { data: folders = [], isLoading: foldersLoading } = useProjectFolders(currentId, currentFolderId);
  const { data: documents = [], isLoading: documentsLoading } = useProjectDocuments(currentId, currentFolderId);

  // Auto-create folders when page loads if no folders exist at ROOT LEVEL only
  // Only check when viewing root (currentFolderId === null) and both folders and documents are empty
  useEffect(() => {
    if (
      showAutoCreateFolders &&
      currentId &&
      currentFolderId === null && // Only check at root level
      !foldersLoading &&
      !documentsLoading &&
      !hasCheckedAutoCreate &&
      folders.length === 0 &&
      documents.length === 0 // Also check that documents are empty
    ) {
      setHasCheckedAutoCreate(true);

      setIsCreatingFolders(true);
      // Call the function directly since it's not a React Query mutation
      autoCreateFolders.createFoldersFromTemplate().finally(() => {
        setIsCreatingFolders(false);
      });
    }
  }, [
    currentId,
    currentFolderId, // Add dependency
    foldersLoading,
    documentsLoading, // Add dependency
    folders.length,
    documents.length, // Add dependency
    hasCheckedAutoCreate,
    autoCreateFolders,
    showAutoCreateFolders,
  ]);

  // Basic SEO
  useEffect(() => {
    const displayName = currentId || `Project ${currentId}`;
    document.title = `Documents - ${displayName}`;
    const meta = document.querySelector('meta[name="description"]');
    const description = `Browse and manage documents for ${displayName}. Upload, preview, and organize files.`;
    if (meta) {
      meta.setAttribute("content", description);
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = description;
      document.head.appendChild(m);
    }
  }, [currentId]);

  const handleFolderClick = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setCurrentFolderId(folderId);
      setFolderPath([...folderPath, { id: folder.id, folder_name: folder.folder_name }]);
    }
  };

  const handleNavigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setFolderPath([]);
    } else {
      const index = folderPath.findIndex((f) => f.id === folderId);
      if (index !== -1) {
        setFolderPath(folderPath.slice(0, index + 1));
      }
    }
  };

  const handleFilesDropped = async (files: File[]) => {
    if (!currentId) return;
    await multipleUpload.mutateAsync({
      projectId: currentId,
      files,
      folderId: currentFolderId,
    });
  };

  const isLoading = foldersLoading || documentsLoading;
  const hasActiveUploads = Object.keys(multipleUpload.uploadProgress).length > 0;

  return (
    <DragDropZone onFilesSelected={handleFilesDropped} maxFiles={10} maxSizeMB={20}>
      <div className="space-y-6">
        <header className="space-y-5">
          {/* Page header (e.g. ProjectHeader) first */}
          {headerComponent}

          {/* Single row: breadcrumb + view options + primary actions */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="py-3 px-4">
              <div className="flex flex-wrap items-center gap-4 min-h-9">
                <FolderBreadcrumb currentPath={folderPath} onNavigate={handleNavigateToFolder} />
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {t("documents.documentList.folderView")}
                  </span>
                  <ToggleGroup
                    type="single"
                    value={folderView}
                    onValueChange={(value) => value && setFolderView(value as "list" | "cards")}
                    aria-label={t("documents.documentList.folderView")}
                    variant="outline"
                    size="sm"
                    className="h-9"
                  >
                    <ToggleGroupItem value="list" className="gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm" aria-label={t("documents.documentList.listView")}>
                      <List className="h-4 w-4" />
                      <span>{t("documents.documentList.listView")}</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="cards" className="gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm" aria-label={t("documents.documentList.cardView")}>
                      <LayoutGrid className="h-4 w-4" />
                      <span>{t("documents.documentList.cardView")}</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                  {folderView === "cards" && (
                    <>
                      <span className="text-sm text-muted-foreground hidden sm:inline">
                        {t("documents.documentList.cardsPerRow")}
                      </span>
                      <Select value={cardsPerRow} onValueChange={setCardsPerRow}>
                        <SelectTrigger className="w-[72px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CARDS_PER_ROW_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  {backLink && (
                    <Link to={backLink}>
                      <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {backText || t("documents.folders.backToProject")}
                      </Button>
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="default">
                        <FolderPlus className="h-4 w-4 mr-2" />
                        {t("documents.folders.newFolder")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                        <FolderPlus className="h-4 w-4 mr-2" />
                        {t("documents.folders.createCustomFolder")}
                      </DropdownMenuItem>
                      {showApplyTemplates && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setApplyTemplateOpen(true)}>
                            <FolderTree className="h-4 w-4 mr-2" />
                            {t("documents.folders.applyStandardStructure")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setUploadFileOpen(true)} size="default">
                    <Upload className="h-4 w-4 mr-2" />
                    {t("documents.folders.uploadFile")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </header>

        {/* Upload Progress */}
        {hasActiveUploads && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="font-medium text-sm">{t("documents.folders.uploadingFiles")}</h3>
            <div className="space-y-2">
              {Object.entries(multipleUpload.uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{fileName}</span>
                    <span className="text-muted-foreground ml-2">
                      {progress.status === "success" && "✓"}
                      {progress.status === "error" && "✗"}
                      {progress.status === "uploading" && `${progress.progress}%`}
                      {progress.status === "pending" && "Pending..."}
                    </span>
                  </div>
                  {progress.status === "uploading" && <Progress value={progress.progress} className="h-1" />}
                  {progress.error && <p className="text-xs text-destructive">{progress.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <main>
          <Card className="border-border/60 shadow-sm overflow-hidden">
            {isLoading || isCreatingFolders ? (
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            ) : (
              <DocumentList
                folders={folders}
                documents={documents as any}
                onFolderClick={handleFolderClick}
                projectId={currentId || ""}
                folderView={folderView}
                cardsPerRow={cardsPerRow}
                onUploadClick={() => setUploadFileOpen(true)}
                onCreateFolderClick={() => setCreateFolderOpen(true)}
              />
            )}
          </Card>
        </main>

        {currentId && (
          <>
            <CreateFolderDialog
              projectId={currentId}
              parentFolderId={currentFolderId}
              open={createFolderOpen}
              onClose={() => setCreateFolderOpen(false)}
            />
            <FileUploadDialog
              projectId={currentId}
              folderId={currentFolderId}
              open={uploadFileOpen}
              onClose={() => setUploadFileOpen(false)}
            />
            {showApplyTemplates && (
              <ApplyFolderTemplateDialog
                projectId={currentId}
                open={applyTemplateOpen}
                onClose={() => setApplyTemplateOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </DragDropZone>
  );
}