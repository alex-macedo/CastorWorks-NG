import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRoadmapKanbanColumns, type RoadmapKanbanColumn } from '@/hooks/useRoadmapKanbanColumns';
import { cn } from '@/lib/utils';
import { Columns, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
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
import { toast } from 'sonner';

interface RoadmapKanbanColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoadmapKanbanColumnsDialog({ open, onOpenChange }: RoadmapKanbanColumnsDialogProps) {
  const { t } = useLocalization();
  const { columns, addColumn, removeColumn, reorderColumns, setColumnHidden, isPending } = useRoadmapKanbanColumns();
  const [newColumnName, setNewColumnName] = useState('');
  const [columnToRemove, setColumnToRemove] = useState<RoadmapKanbanColumn | null>(null);

  const handleAddColumn = () => {
    const name = newColumnName.trim();
    if (!name) return;
    addColumn(name);
    setNewColumnName('');
  };

  const handleRemoveColumn = (column: RoadmapKanbanColumn) => {
    setColumnToRemove(column);
  };

  const confirmRemoveColumn = () => {
    if (!columnToRemove) return;
    removeColumn(columnToRemove.id, 'backlog');
    setColumnToRemove(null);
    onOpenChange(false);
    toast.success(t('roadmap.columnRemoved'));
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= columns.length) return;
    const reordered = [...columns];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, removed);
    reorderColumns(reordered.map((c, i) => ({ ...c, sort_order: i })));
  };

  const columnDisplayName = (c: RoadmapKanbanColumn) =>
    c.labelKey ? t(c.labelKey) : (c.label || c.id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Columns className="h-5 w-5" />
              {t('roadmap.configureColumns')}
            </DialogTitle>
            <DialogDescription>
              {t('roadmap.configureColumnsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-column">{t('roadmap.addColumn')}</Label>
              <div className="flex gap-2">
                <Input
                  id="new-column"
                  placeholder={t('roadmap.newColumnPlaceholder')}
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddColumn}
                  disabled={!newColumnName.trim() || isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('roadmap.columnOrder')}</Label>
              <ul className="space-y-1 rounded-md border p-2 max-h-[280px] overflow-y-auto">
                {columns.map((column, index) => (
                  <li
                    key={column.id}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
                  >
                    <div className="flex flex-col gap-0 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumn(index, -1)}
                        disabled={index === 0 || isPending}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveColumn(index, 1)}
                        disabled={index === columns.length - 1 || isPending}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className={cn('flex-1 text-sm font-medium truncate', column.hidden && 'text-muted-foreground')}>
                      {columnDisplayName(column)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setColumnHidden(column.id, !column.hidden)}
                      disabled={isPending}
                      title={column.hidden ? t('roadmap.showColumn') : t('roadmap.hideColumn')}
                    >
                      {column.hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {column.labelKey ? (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {t('roadmap.defaultColumn')}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveColumn(column)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!columnToRemove} onOpenChange={(o) => !o && setColumnToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roadmap.removeColumnTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('roadmap.removeColumnDescription', {
                column: columnToRemove ? columnDisplayName(columnToRemove) : '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveColumn} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('roadmap.removeColumn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
