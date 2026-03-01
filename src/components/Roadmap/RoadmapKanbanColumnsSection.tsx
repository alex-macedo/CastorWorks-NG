import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useRoadmapKanbanColumns, type RoadmapKanbanColumn } from '@/hooks/useRoadmapKanbanColumns';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  getColumnBgClass,
  getDefaultColumnColorKey,
  ROADMAP_COLOR_BG_CLASS,
  ROADMAP_COLOR_KEYS,
} from '@/utils/roadmapColumnColors';
import { Plus, Trash2, Star, Pencil, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const COLOR_OPTIONS = ROADMAP_COLOR_KEYS

function columnDisplayName(c: RoadmapKanbanColumn, t: (key: string) => string) {
  return (c.label && c.label.trim()) ? c.label : (c.labelKey ? t(c.labelKey) : c.id)
}

const isDefaultColumn = (c: RoadmapKanbanColumn) => Boolean(c.labelKey)
const isDoneColumn = (c: RoadmapKanbanColumn) => c.id === 'done'

interface SortableColumnRowProps {
  column: RoadmapKanbanColumn
  index: number
  isFirst: boolean
  editingColumnId: string | null
  editingLabel: string
  editingColor: string
  isPending: boolean
  onStartEdit: (column: RoadmapKanbanColumn) => void
  onSaveEdit: (columnId: string) => void
  onCancelEdit: () => void
  onSetEditingLabel: (label: string) => void
  onSetEditingColor: (color: string) => void
  onSetColumnHidden: (columnId: string, hidden: boolean) => void
  onRemoveColumn: (column: RoadmapKanbanColumn) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

function SortableColumnRow({
  column,
  isFirst,
  editingColumnId,
  editingLabel,
  editingColor,
  isPending,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onSetEditingLabel,
  onSetEditingColor,
  onSetColumnHidden,
  onRemoveColumn,
  t,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isEditing = editingColumnId === column.id
  const isAnyEditing = editingColumnId !== null

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-2.5',
        'bg-muted/30 hover:bg-muted/50',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/20'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded shrink-0',
          isAnyEditing && 'opacity-30 pointer-events-none'
        )}
        title={t('common.drag')}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Color dot */}
      <div
        className={cn(
          'h-4 w-4 shrink-0 rounded-full',
          isEditing
            ? (ROADMAP_COLOR_BG_CLASS[editingColor] ?? 'bg-slate-400')
            : getColumnBgClass(column)
        )}
        aria-hidden
      />

      {/* Label / edit controls */}
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-2" data-edit-actions>
            <Input
              value={editingLabel}
              onChange={(e) => onSetEditingLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit(column.id)
                if (e.key === 'Escape') onCancelEdit()
              }}
              className="h-8 max-w-[200px] font-medium"
              autoFocus
              aria-label={t('common.edit')}
            />
            <div className="flex items-center gap-1" role="group" aria-label={t('roadmap.columnColor')}>
              {COLOR_OPTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-colors',
                    ROADMAP_COLOR_BG_CLASS[key] ?? 'bg-slate-400',
                    editingColor === key
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:ring-2 hover:ring-muted-foreground/30'
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSetEditingColor(key)}
                  title={key}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs shrink-0"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSaveEdit(column.id)
              }}
            >
              {t('common.apply')}
            </Button>
          </div>
        ) : (
          <span className={cn('font-medium truncate', column.hidden && 'text-muted-foreground')}>
            {columnDisplayName(column, t)}
          </span>
        )}
        {isDefaultColumn(column) && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {t('projectDetail:displaySettingsTab.systemTag')}
          </span>
        )}
        {isDefaultColumn(column) && isFirst && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
            <Star className="h-3 w-3" />
            {t('projectDetail:displaySettingsTab.defaultTag')}
          </span>
        )}
        {isDoneColumn(column) && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
            {t('projectDetail:displaySettingsTab.completedTag')}
          </span>
        )}
      </div>

      <span className="text-xs text-muted-foreground shrink-0 font-mono" title={column.id}>
        {column.id}
      </span>

      {/* Visible toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-medium uppercase text-muted-foreground mr-1">
          {t('projectDetail:displaySettingsTab.visibleLabel')}
        </span>
        <Switch
          checked={!column.hidden}
          onCheckedChange={(checked) => onSetColumnHidden(column.id, !checked)}
          disabled={isPending}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {isFirst && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary" disabled>
            <Star className="h-4 w-4 fill-current" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={isPending || isAnyEditing}
          title={t('common.edit')}
          onClick={() => onStartEdit(column)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {!isDefaultColumn(column) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemoveColumn(column)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  )
}

export function RoadmapKanbanColumnsSection() {
  const { t } = useLocalization()
  const queryClient = useQueryClient()
  const {
    columns,
    addColumn,
    removeColumn,
    setColumnHidden,
    updateColumnLabelAndColor,
    reorderColumns,
    isPending,
  } = useRoadmapKanbanColumns()

  const [newColumnName, setNewColumnName] = useState('')
  const [columnToRemove, setColumnToRemove] = useState<RoadmapKanbanColumn | null>(null)
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editingColor, setEditingColor] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = columns.findIndex((c) => c.id === active.id)
    const newIndex = columns.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    reorderColumns(arrayMove(columns, oldIndex, newIndex))
  }

  const handleAddColumn = () => {
    const name = newColumnName.trim()
    if (!name) return
    addColumn(name)
    setNewColumnName('')
  }

  const handleSyncStatus = () => {
    queryClient.invalidateQueries({ queryKey: ['app-settings'] })
    toast.success(t('projectDetail:displaySettingsTab.saved'))
  }

  const handleRemoveColumn = (column: RoadmapKanbanColumn) => {
    setColumnToRemove(column)
  }

  const confirmRemoveColumn = () => {
    if (!columnToRemove) return
    removeColumn(columnToRemove.id, 'backlog')
    setColumnToRemove(null)
    toast.success(t('roadmap.columnRemoved'))
  }

  const startEdit = (column: RoadmapKanbanColumn) => {
    setEditingColumnId(column.id)
    setEditingLabel(columnDisplayName(column, t))
    setEditingColor(column.color ?? getDefaultColumnColorKey(column.id))
  }

  const saveEdit = (columnId: string) => {
    updateColumnLabelAndColor(columnId, editingLabel.trim(), editingColor.trim() || '')
    setEditingColumnId(null)
    setEditingLabel('')
    setEditingColor('')
  }

  const cancelEdit = () => {
    setEditingColumnId(null)
    setEditingLabel('')
    setEditingColor('')
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {t('projectDetail:displaySettingsTab.taskStatusConfigTitle')}
          </CardTitle>
          <CardDescription>
            {t('projectDetail:displaySettingsTab.taskStatusConfigDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncStatus}
              disabled={isPending}
            >
              {t('projectDetail:displaySettingsTab.syncStatus')}
            </Button>
            <div className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder={t('roadmap.newColumnPlaceholder')}
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddColumn}
                disabled={!newColumnName.trim() || isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('projectDetail:displaySettingsTab.addStatus')}
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1 rounded-md border p-2 max-h-[320px] overflow-y-auto">
                {columns.map((column, index) => (
                  <SortableColumnRow
                    key={column.id}
                    column={column}
                    index={index}
                    isFirst={index === 0}
                    editingColumnId={editingColumnId}
                    editingLabel={editingLabel}
                    editingColor={editingColor}
                    isPending={isPending}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onSetEditingLabel={setEditingLabel}
                    onSetEditingColor={setEditingColor}
                    onSetColumnHidden={setColumnHidden}
                    onRemoveColumn={handleRemoveColumn}
                    t={t}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <AlertDialog open={!!columnToRemove} onOpenChange={(o) => !o && setColumnToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roadmap.removeColumnTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('roadmap.removeColumnDescription', {
                column: columnToRemove ? columnDisplayName(columnToRemove, t) : '',
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
  )
}
