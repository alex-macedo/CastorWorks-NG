import { useLocalization } from '@/contexts/LocalizationContext';
import { useTimer } from '@/hooks/useTimeTracking';
import { useProjects } from '@/hooks/useProjects';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Play, Trash2 } from 'lucide-react';

/**
 * Dialog that appears when an orphaned time entry is detected
 * (e.g., after browser crash or unexpected closure).
 * Allows user to resume the timer or discard the entry.
 */
export function TimeTrackerResumeDialog() {
  const { t } = useLocalization();
  const { pendingResumeEntry, confirmResumeEntry, discardResumeEntry } = useTimer();
  const { projects } = useProjects();

  if (!pendingResumeEntry) return null;

  // Find project name for display
  const project = projects?.find(p => p.id === pendingResumeEntry.project_id);
  const projectName = project?.name || t('architect.timeTracking.noProject');
  
  // Format the accumulated time
  const accumulatedSeconds = pendingResumeEntry.accumulated_seconds || 0;
  const hours = Math.floor(accumulatedSeconds / 3600);
  const minutes = Math.floor((accumulatedSeconds % 3600) / 60);
  const formattedTime = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes}m`;

  return (
    <AlertDialog open={!!pendingResumeEntry}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('architect.timeTracking.resumeDialog.title') || 'Resume Time Tracking?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {t('architect.timeTracking.resumeDialog.description') || 
                'We found an in-progress time entry that wasn\'t completed. This may happen after a browser crash or unexpected closure.'}
            </p>
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('architect.timeTracking.project')}:
                </span>
                <span className="font-medium">{projectName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('architect.timeTracking.elapsed')}:
                </span>
                <span className="font-medium font-mono">{formattedTime}</span>
              </div>
              {pendingResumeEntry.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('architect.timeTracking.description')}:
                  </span>
                  <span className="font-medium truncate max-w-[150px]">
                    {pendingResumeEntry.description}
                  </span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={discardResumeEntry}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {t('architect.timeTracking.resumeDialog.discard') || 'Discard'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmResumeEntry}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {t('architect.timeTracking.resumeDialog.resume') || 'Resume'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
