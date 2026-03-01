import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocalization } from '@/contexts/LocalizationContext';
import { TaskStatusManager } from '@/components/TaskManagement/TaskStatusManager';
import { DisplaySettings } from '@/components/TaskManagement/DisplaySettings';

interface ArchitectTaskSettingsPanelProps {
  projectId: string;
  currentDensity?: ColumnDensity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDensityChange?: (density: ColumnDensity) => void;
}

export const ArchitectTaskSettingsPanel = ({
  projectId,
  currentDensity,
  open,
  onOpenChange,
  onDensityChange,
}: ArchitectTaskSettingsPanelProps) => {
  const { t } = useLocalization();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>
            {t('projectDetail.displaySettings')}
          </SheetTitle>
          <SheetDescription>
            {t('projectDetail.displaySettingsTab.description')}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6 pb-8">
            <TaskStatusManager projectId={projectId} />
            <DisplaySettings
              projectId={projectId}
              currentDensity={currentDensity}
              disablePersistence
              onDensityChange={onDensityChange}
              hideHeader
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

