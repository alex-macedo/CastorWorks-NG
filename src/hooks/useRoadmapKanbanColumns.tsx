import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAppSettings } from '@/hooks/useAppSettings';

const STORAGE_KEY = 'roadmap_kanban_columns_fallback';
const STORAGE_KEY_ORDER = 'roadmap_kanban_columns_order';

export interface RoadmapKanbanColumn {
  id: string;
  labelKey?: string;
  label?: string;
  /** Tailwind color key (e.g. 'blue-500'). Optional override for column dot color. */
  color?: string;
  sort_order: number;
  hidden?: boolean;
}

const DEFAULT_COLUMNS: RoadmapKanbanColumn[] = [
  { id: 'backlog', labelKey: 'roadmap.status.backlog', sort_order: 0 },
  { id: 'next_up', labelKey: 'roadmap.status.nextUp', sort_order: 1 },
  { id: 'in_progress', labelKey: 'roadmap.status.inProgress', sort_order: 2 },
  { id: 'blocked', labelKey: 'roadmap.status.blocked', sort_order: 3 },
  { id: 'done', labelKey: 'roadmap.status.done', sort_order: 4 },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

function parseColumn(o: unknown): RoadmapKanbanColumn | null {
  const obj = o as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id : '';
  const sort_order = typeof obj.sort_order === 'number' ? obj.sort_order : 0;
  if (!id) return null;
  return {
    id,
    labelKey: typeof obj.labelKey === 'string' ? obj.labelKey : undefined,
    label: typeof obj.label === 'string' ? obj.label : undefined,
    color: typeof obj.color === 'string' ? obj.color : undefined,
    sort_order,
    hidden: obj.hidden === true,
  };
}

function getFallbackFromStorage(): RoadmapKanbanColumn[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const raw = JSON.parse(s) as unknown;
    if (!Array.isArray(raw)) return [];
    const parsed = raw.map(parseColumn).filter((c): c is RoadmapKanbanColumn => c !== null);
    parsed.sort((a, b) => a.sort_order - b.sort_order);
    return parsed;
  } catch {
    return [];
  }
}

function getOrderFromStorage(): RoadmapKanbanColumn[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY_ORDER);
    if (!s) return [];
    const raw = JSON.parse(s) as unknown;
    if (!Array.isArray(raw)) return [];
    const parsed = raw.map(parseColumn).filter((c): c is RoadmapKanbanColumn => c !== null);
    parsed.sort((a, b) => a.sort_order - b.sort_order);
    return parsed;
  } catch {
    return [];
  }
}

function setOrderInStorage(columns: RoadmapKanbanColumn[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columns));
  } catch {
    // ignore
  }
}

export function useRoadmapKanbanColumns() {
  const { settings, updateSettings } = useAppSettings();
  const { toast } = useToast();
  const [fallbackColumns, setFallbackColumns] = useState<RoadmapKanbanColumn[]>(() => getFallbackFromStorage());

  const columns = useMemo(() => {
    const raw = settings?.roadmap_kanban_columns;
    let base: RoadmapKanbanColumn[];
    if (Array.isArray(raw) && raw.length > 0) {
      const parsed = raw.map((c: unknown) => parseColumn(c)).filter((c): c is RoadmapKanbanColumn => c !== null);
      parsed.sort((a, b) => a.sort_order - b.sort_order);
      base = parsed.length > 0 ? parsed : [...DEFAULT_COLUMNS];
    } else {
      const storedOrder = getOrderFromStorage();
      base = storedOrder.length > 0 ? storedOrder : [...DEFAULT_COLUMNS];
    }
    if (fallbackColumns.length === 0) return base;
    const ids = new Set(base.map((c) => c.id));
    const merged = [...base];
    for (const c of fallbackColumns) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        merged.push(c);
      }
    }
    merged.sort((a, b) => a.sort_order - b.sort_order);
    return merged;
  }, [settings?.roadmap_kanban_columns, fallbackColumns]);

  const persistFallback = useCallback((next: RoadmapKanbanColumn[]) => {
    const customOnly = next.filter((c) => !c.labelKey);
    setFallbackColumns(customOnly);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
  }, []);

  const addColumn = useCallback(
    (label: string) => {
      const id = slugify(label) || `column_${Date.now()}`;
      const newColumn: RoadmapKanbanColumn = {
        id,
        label,
        sort_order: columns.length,
        hidden: false,
      };
      const next = [...columns, newColumn];
      updateSettings.mutate(
        { roadmap_kanban_columns: next },
        {
          onError: () => {
            persistFallback(next);
            toast({
              title: 'Column added',
              description: 'Saved locally. This column is linked to issue status — you can move issues into it from the board or set it when editing an issue.',
              variant: 'default',
            });
          },
        }
      );
    },
    [columns, updateSettings, persistFallback, toast]
  );

  const queryClient = useQueryClient();

  const removeColumn = useCallback(
    (columnId: string, moveItemsToStatus: string) => {
      const next = columns.filter((c) => c.id !== columnId);
      if (next.length === 0) return;
      const customOnly = next.filter((c) => !c.labelKey);
      supabase
        .from('roadmap_items')
        .update({ status: moveItemsToStatus })
        .eq('status', columnId)
        .then(() => {
          updateSettings.mutate(
            { roadmap_kanban_columns: next },
            {
              onError: () => persistFallback(next),
            }
          );
          setFallbackColumns(customOnly);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
          queryClient.invalidateQueries({ queryKey: ['roadmap_items'] });
        });
    },
    [columns, updateSettings, queryClient, persistFallback]
  );

  const reorderColumns = useCallback(
    (reordered: RoadmapKanbanColumn[]) => {
      const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i }));
      setOrderInStorage(withOrder);
      updateSettings.mutate(
        { roadmap_kanban_columns: withOrder },
        {
          onError: () => {
            persistFallback(withOrder);
            toast({
              title: 'Order saved locally',
              description: 'Column order updated. To save for the whole team, an admin needs to run the roadmap Kanban migration on the database.',
              variant: 'default',
            });
          },
        }
      );
    },
    [updateSettings, persistFallback, toast]
  );

  const updateColumnLabel = useCallback(
    (columnId: string, label: string) => {
      const next = columns.map((c) =>
        c.id === columnId ? { ...c, label } : c
      );
      updateSettings.mutate(
        { roadmap_kanban_columns: next },
        { onError: () => persistFallback(next) }
      );
    },
    [columns, updateSettings, persistFallback]
  );

  const updateColumnColor = useCallback(
    (columnId: string, color: string) => {
      const next = columns.map((c) =>
        c.id === columnId ? { ...c, color: color.trim() || undefined } : c
      );
      updateSettings.mutate(
        { roadmap_kanban_columns: next },
        { onError: () => persistFallback(next) }
      );
    },
    [columns, updateSettings, persistFallback]
  );

  const updateColumnLabelAndColor = useCallback(
    (columnId: string, label: string, color: string) => {
      const next = columns.map((c) =>
        c.id === columnId
          ? { ...c, label, color: color.trim() || undefined }
          : c
      );
      updateSettings.mutate(
        { roadmap_kanban_columns: next },
        { onError: () => persistFallback(next) }
      );
    },
    [columns, updateSettings, persistFallback]
  );

  const setColumnHidden = useCallback(
    (columnId: string, hidden: boolean) => {
      const next = columns.map((c) =>
        c.id === columnId ? { ...c, hidden } : c
      );
      setOrderInStorage(next);
      updateSettings.mutate(
        { roadmap_kanban_columns: next },
        {
          onError: () => {
            persistFallback(next);
            toast({
              title: hidden ? 'Column hidden' : 'Column shown',
              description: 'Visibility saved locally. To save for the whole team, an admin needs to run the roadmap Kanban migration on the database.',
              variant: 'default',
            });
          },
        }
      );
    },
    [columns, updateSettings, persistFallback, toast]
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns]
  );

  return {
    columns,
    visibleColumns,
    addColumn,
    removeColumn,
    reorderColumns,
    updateColumnLabel,
    updateColumnColor,
    updateColumnLabelAndColor,
    setColumnHidden,
    isPending: updateSettings.isPending,
  };
}
