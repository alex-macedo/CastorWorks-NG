import { useState } from 'react';
import { useProjectTaskStatuses } from '@/hooks/useProjectTaskStatuses';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Pencil, Trash2, Star, RefreshCw, Loader2 } from 'lucide-react';
import type { ProjectTaskStatus } from '@/types/taskManagement';
import { StatusConfigDialog } from './StatusConfigDialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
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

interface TaskStatusManagerProps {
  projectId: string;
}

interface SortableStatusCardProps {
  status: ProjectTaskStatus;
  onEdit: (status: ProjectTaskStatus) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onToggleVisibility: (id: string, isVisible: boolean) => void;
}

function SortableStatusCard({
  status,
  onEdit,
  onDelete,
  onSetDefault,
  onToggleVisibility,
}: SortableStatusCardProps) {
  const { t } = useLocalization();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const isVisible = status.is_visible ?? true;
  const visibilityId = `status-visible-${status.id}`;

  return (
    <div ref={setNodeRef} style={style} className="mb-3 group">
      <Card className={cn(
        "transition-all border-muted hover:border-primary/50",
        isDragging && "shadow-lg border-primary"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors"
            >
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Color Indicator */}
            <div 
              className="w-4 h-4 rounded-full shadow-sm shrink-0" 
              style={{ backgroundColor: status.color }}
            />

            {/* Status Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-base">
                  {t(`taskManagement:status.${status.slug.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`, status.name)}
                </span>
                <div className="flex gap-1">
                  {status.is_system && (
                    <Badge variant="secondary" className="h-5 text-[10px] px-1.5 uppercase font-bold tracking-tight bg-muted text-muted-foreground">
                      {t('taskManagement:statusConfig.badges.system')}
                    </Badge>
                  )}
                  {status.is_default && (
                    <Badge variant="default" className="h-5 text-[10px] px-1.5 uppercase font-bold tracking-tight bg-blue-600 hover:bg-blue-700">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {t('taskManagement:statusConfig.badges.default')}
                    </Badge>
                  )}
                  {status.is_completed && (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5 uppercase font-bold tracking-tight border-green-500/50 text-green-600 bg-green-500/5">
                      {t('taskManagement:statusConfig.badges.completed')}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate opacity-60">
                {status.slug}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full border border-muted/50">
              <Label htmlFor={visibilityId} className="text-[10px] uppercase font-bold text-muted-foreground hidden sm:inline">
                {t('taskManagement:statusConfig.visibilityLabel')}
              </Label>
              <Switch
                id={visibilityId}
                checked={isVisible}
                onCheckedChange={(checked) => onToggleVisibility(status.id, checked)}
                className="scale-75 origin-right"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
              {!status.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-blue-600 transition-colors"
                  onClick={() => onSetDefault(status.id)}
                  title={t('taskManagement:statusConfig.setAsDefault')}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => onEdit(status)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {!status.is_system && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 transition-colors"
                  onClick={() => onDelete(status.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TaskStatusManager({ projectId }: TaskStatusManagerProps) {
  const { t } = useLocalization();
  const {
    statuses,
    isLoading,
    createStatus,
    updateStatus,
    deleteStatus,
    reorderStatuses,
    setDefaultStatus,
    syncWithGlobalStatuses,
    isSyncing,
  } = useProjectTaskStatuses(projectId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectTaskStatus | null>(null);
  const [deletingStatusId, setDeletingStatusId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !statuses) return;

    if (active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(statuses, oldIndex, newIndex);
      const statusIds = reordered.map((s) => s.id);

      try {
        await reorderStatuses(statusIds);
      } catch (error) {
        console.error('Error reordering statuses:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingStatusId) return;

    try {
      await deleteStatus(deletingStatusId);
      setDeletingStatusId(null);
    } catch (error) {
      console.error('Error deleting status:', error);
    }
  };

  const handleSetDefault = async (statusId: string) => {
    try {
      await setDefaultStatus(statusId);
    } catch (error) {
      console.error('Error setting default status:', error);
    }
  };

  const handleToggleVisibility = async (statusId: string, isVisible: boolean) => {
    try {
      await updateStatus({ id: statusId, is_visible: isVisible });
    } catch (error) {
      console.error('Error updating status visibility:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight">{t('taskManagement:statusConfig.title')}</CardTitle>
              <CardDescription className="text-sm">
                {t('taskManagement:statusConfig.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 px-4 font-medium"
                onClick={() => syncWithGlobalStatuses()} 
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('taskManagement:statusConfig.syncWithGlobal') || "Sync Status"}
              </Button>
              <Button size="sm" className="h-9 px-4 font-medium shadow-sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('taskManagement:statusConfig.addStatus')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!statuses || statuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/20 opacity-60">
              <div className="p-4 rounded-full bg-muted mb-4">
                <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground italic">
                {t('taskManagement:statusConfig.noStatuses')}
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={statuses.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {statuses.map((status) => (
                    <SortableStatusCard
                      key={status.id}
                      status={status}
                      onEdit={setEditingStatus}
                      onDelete={setDeletingStatusId}
                      onSetDefault={handleSetDefault}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <StatusConfigDialog
        open={isAddDialogOpen || !!editingStatus}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingStatus(null);
          }
        }}
        projectId={projectId}
        status={editingStatus}
        onSave={async (data) => {
          if (editingStatus) {
            await updateStatus({ id: editingStatus.id, ...data });
          } else {
            await createStatus({
              ...data,
              project_id: projectId,
              sort_order: statuses?.length || 0,
              is_system: false,
              is_visible: true,
            });
          }
          setIsAddDialogOpen(false);
          setEditingStatus(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingStatusId} onOpenChange={() => setDeletingStatusId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('taskManagement:statusConfig.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('taskManagement:statusConfig.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
