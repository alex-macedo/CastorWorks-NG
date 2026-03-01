import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocalization } from "@/contexts/LocalizationContext";
import { ProjectForm } from "@/components/Projects/ProjectForm";
import type { ProjectFormData } from "@/schemas/project";

interface NewProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProjectFormData) => void;
  isLoading: boolean;
}

export const NewProjectSheet = ({ open, onOpenChange, onSubmit, isLoading }: NewProjectSheetProps) => {
  const { t } = useLocalization();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[83.2rem] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-3 pb-2">
          <SheetTitle>{t("projects:createNewProject")}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("projects:createProjectDescription")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 px-6 overflow-auto">
          <ProjectForm onSubmit={onSubmit} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
};
