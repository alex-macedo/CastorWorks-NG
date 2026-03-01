import { ChevronRight, FolderOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useLocalization } from "@/contexts/LocalizationContext";
interface FolderItem {
  id: string;
  folder_name: string;
}

interface FolderBreadcrumbProps {
  currentPath: FolderItem[];
  onNavigate: (folderId: string | null) => void;
}

export function FolderBreadcrumb({ currentPath, onNavigate }: FolderBreadcrumbProps) {
  const { t } = useLocalization();

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground min-w-0" aria-label="Folder location">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 font-normal text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4 shrink-0" />
        <span className="truncate">{t("ui.root")}</span>
      </Button>
      {currentPath.map((folder) => (
        <div key={folder.id} className="flex items-center gap-1 min-w-0 shrink-0">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 font-normal text-muted-foreground hover:text-foreground min-w-0 max-w-[180px] sm:max-w-[240px]"
            onClick={() => onNavigate(folder.id)}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">{folder.folder_name}</span>
          </Button>
        </div>
      ))}
    </nav>
  );
}
