import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Loader2 } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { 
  useMilestonePredecessors, 
  useCreateMilestoneDependency, 
  useUpdateMilestoneDependency, 
  useDeleteMilestoneDependency 
} from "@/hooks/useMilestoneDependencies";
import type { MilestoneData, MilestoneDependencyType } from "@/types/timeline";
import { toast } from "sonner";

interface MilestoneDependencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: MilestoneData | null;
  allMilestones: MilestoneData[];
  projectId: string;
}

/**
 * Dialog for managing milestone dependencies (FS, SS, FF, SF relationships).
 * Allows users to set predecessors and lag times for a specific milestone.
 */
export function MilestoneDependencyDialog({
  open,
  onOpenChange,
  milestone,
  allMilestones,
  projectId,
}: MilestoneDependencyDialogProps) {
  const { t } = useLocalization();
  
  const { data: currentDependencies, isLoading } = useMilestonePredecessors(milestone?.id);
  const createMutation = useCreateMilestoneDependency();
  const updateMutation = useUpdateMilestoneDependency();
  const deleteMutation = useDeleteMilestoneDependency();

  const availableMilestones = allMilestones.filter(
    m => m.id !== milestone?.id
  );

  const dependencyTypes = [
    { value: 'FS', label: t('timeline.dependencies.types.FS'), description: t('timeline.dependencies.types.FS_desc') },
    { value: 'SS', label: t('timeline.dependencies.types.SS'), description: t('timeline.dependencies.types.SS_desc') },
    { value: 'FF', label: t('timeline.dependencies.types.FF'), description: t('timeline.dependencies.types.FF_desc') },
    { value: 'SF', label: t('timeline.dependencies.types.SF'), description: t('timeline.dependencies.types.SF_desc') },
  ];

  const handleAddDependency = async () => {
    if (!milestone || availableMilestones.length === 0) return;
    
    // Find a milestone that isn't already a predecessor
    const existingPredecessorIds = currentDependencies?.map(d => d.predecessorId) || [];
    const firstAvailable = availableMilestones.find(m => !existingPredecessorIds.includes(m.id));
    
    if (!firstAvailable) {
      toast.error(t('timeline.dependencies.noPredecessorsPossible'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        projectId,
        successorId: milestone.id,
        predecessorId: firstAvailable.id,
        dependencyType: 'FS',
        lagDays: 0,
      });
    } catch (error) {
      // Error is handled by the hook's toast
    }
  };

  const handleUpdateType = async (id: string, type: MilestoneDependencyType) => {
    try {
      await updateMutation.mutateAsync({ id, dependencyType: type });
    } catch (error) {
      console.error('Failed to update dependency type:', error);
    }
  };

  const handleUpdateLag = async (id: string, lag: number) => {
    try {
      await updateMutation.mutateAsync({ id, lagDays: lag });
    } catch (error) {
      console.error('Failed to update dependency lag:', error);
    }
  };

  const handleRemove = async (id: string) => {
    if (!milestone) return;
    try {
      await deleteMutation.mutateAsync({ id, projectId, successorId: milestone.id });
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle>{t('timeline.dependencies.title')}</DialogTitle>
          <DialogDescription>
            {t('timeline.dependencies.manageSubtitle', { name: milestone?.name })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground animate-pulse">
                {t('timeline.loadingProjects')}
              </p>
            </div>
          ) : !currentDependencies || currentDependencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground italic bg-muted/20 rounded-lg border border-dashed">
              {t('timeline.dependencies.noneSet')}
            </div>
          ) : (
            <div className="space-y-4">
              {currentDependencies.map((dep) => {
                const predecessor = allMilestones.find(m => m.id === dep.predecessorId);
                
                return (
                  <div key={dep.id} className="group flex items-start gap-4 p-4 border rounded-xl bg-card dark:border-slate-700/70 dark:bg-slate-800/40 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div className="flex-1 space-y-4">
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-2 block">
                          {t('timeline.dependencies.predecessor')}
                        </Label>
                        <div className="p-3 border rounded-lg bg-muted/40 dark:bg-slate-900/60 text-sm font-semibold text-foreground/90">
                          {predecessor?.name || 'Unknown Milestone'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                            {t('timeline.dependencies.type')}
                          </Label>
                          <Select
                            value={dep.dependencyType}
                            onValueChange={(value) => handleUpdateType(dep.id, value as MilestoneDependencyType)}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="dark:bg-slate-900/80 border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 border-slate-700">
                              {dependencyTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value} className="focus:bg-primary/10">
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground/70 mt-2 leading-relaxed italic">
                            {dependencyTypes.find(t => t.value === dep.dependencyType)?.description}
                          </p>
                        </div>

                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                            {t('timeline.dependencies.lag')}
                          </Label>
                          <Select
                            value={dep.lagDays.toString()}
                            onValueChange={(value) => handleUpdateLag(dep.id, parseInt(value))}
                            disabled={updateMutation.isPending}
                          >
                            <SelectTrigger className="dark:bg-slate-900/80 border-slate-200 dark:border-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 border-slate-700">
                              <SelectItem value="-10">-10 days</SelectItem>
                              <SelectItem value="-5">-5 days</SelectItem>
                              <SelectItem value="-3">-3 days</SelectItem>
                              <SelectItem value="-1">-1 day</SelectItem>
                              <SelectItem value="0" className="font-bold">0 days</SelectItem>
                              <SelectItem value="1">+1 day</SelectItem>
                              <SelectItem value="2">+2 days</SelectItem>
                              <SelectItem value="3">+3 days</SelectItem>
                              <SelectItem value="5">+5 days</SelectItem>
                              <SelectItem value="10">+10 days</SelectItem>
                              <SelectItem value="15">+15 days</SelectItem>
                              <SelectItem value="20">+20 days</SelectItem>
                              <SelectItem value="30">+30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(dep.id)}
                      disabled={deleteMutation.isPending}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 mt-6 md:mt-0 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all py-8 gap-3 group"
            onClick={handleAddDependency}
            disabled={createMutation.isPending || availableMilestones.length === 0}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Plus className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            )}
            <span className="font-semibold text-primary/80 group-hover:text-primary transition-colors">
              {t('timeline.dependencies.addPredecessor')}
            </span>
          </Button>

          {availableMilestones.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center mt-3 animate-pulse">
              {t('timeline.dependencies.noPredecessorsPossible')}
            </p>
          )}
        </div>

        <DialogFooter className="mt-8 border-t dark:border-slate-800 pt-6">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="dark:hover:bg-slate-800 dark:border-slate-700 w-full sm:w-auto"
          >
            {t('common.close') || 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
