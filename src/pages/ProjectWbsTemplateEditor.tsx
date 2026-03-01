import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useWbsTemplates } from '@/hooks/useWbsTemplates';
import { useCostCodes } from '@/hooks/useCostCodes';
import { usePhaseTemplates } from '@/hooks/usePhaseTemplates';
import { useToast } from '@/hooks/use-toast';
import { exportRowsToCsv } from '@/utils/dataExport';
import { PageHeader } from '@/components/Layout/PageHeader';
import { TemplateImageUpload } from '@/components/Templates/TemplateImageUpload';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

import { DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Download, GripVertical, Plus, Save, Trash2, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WbsTemplate, WbsTemplateItem } from '@/hooks/useWbsTemplates';
import { cn } from '@/lib/utils';

type DraftTemplate = Pick<WbsTemplate, 'id' | 'template_name' | 'description' | 'project_type' | 'is_default' | 'is_system'> & { image_url?: string | null };
type DraftItem = Pick<
  WbsTemplateItem,
  'id' | 'template_id' | 'parent_id' | 'item_type' | 'name' | 'description' | 'standard_duration_days' | 'sort_order' | 'wbs_code' | 'code_path' | 'standard_cost_code'
>;

const pad3 = (n: number) => String(n).padStart(3, '0');

function computeDepth(items: DraftItem[]): Map<string, number> {
  const byId = new Map(items.map(i => [i.id, i]));
  const depth = new Map<string, number>();
  const visit = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const node = byId.get(id);
    if (!node || !node.parent_id) {
      depth.set(id, 0);
      return 0;
    }
    const d = visit(node.parent_id) + 1;
    depth.set(id, d);
    return d;
  };
  items.forEach(i => visit(i.id));
  return depth;
}

function computeCodes(items: DraftItem[]): DraftItem[] {
  const byParent = new Map<string | null, DraftItem[]>();
  for (const it of items) {
    const key = it.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push({ ...it });
    byParent.set(key, list);
  }

  const out = new Map<string, DraftItem>();
  const walk = (parentId: string | null, parentWbs: string | null, parentPath: string | null) => {
    const children = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    children.forEach((c, idx) => (c.sort_order = idx + 1));

    for (const c of children) {
      const wbs = parentWbs ? `${parentWbs}.${c.sort_order}` : `${c.sort_order}`;
      const path = parentPath ? `${parentPath}.${pad3(c.sort_order)}` : pad3(c.sort_order);
      const updated: DraftItem = { ...c, wbs_code: wbs, code_path: path };
      out.set(updated.id, updated);
      walk(updated.id, wbs, path);
    }
  };

  walk(null, null, null);
  for (const it of items) {
    if (!out.has(it.id)) out.set(it.id, it);
  }
  return Array.from(out.values());
}

function collectDescendants(items: DraftItem[], id: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const it of items) {
    if (!it.parent_id) continue;
    const list = childrenByParent.get(it.parent_id) ?? [];
    list.push(it.id);
    childrenByParent.set(it.parent_id, list);
  }
  const toDelete = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (toDelete.has(cur)) continue;
    toDelete.add(cur);
    (childrenByParent.get(cur) ?? []).forEach(k => stack.push(k));
  }
  return toDelete;
}

function SortableTemplateItemRow({
  row,
  depth,
  readOnly,
  t,
  updateItem,
  addChild,
  onDelete,
  costCodes,
  isExpanded,
  onToggleExpand,
  hasChildren,
}: {
  row: DraftItem;
  depth: number;
  readOnly: boolean;
  t: (key: string, options?: any) => string;
  updateItem: (id: string, patch: Partial<DraftItem>) => void;
  addChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  costCodes: Array<{ id: string; code: string; name: string }> | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasChildren: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const isPhaseRow = row.item_type === 'phase';

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeTriggerClass = cn(
    'w-full justify-between h-7 text-xs',
    row.item_type === 'phase' && 'bg-muted/60 text-foreground border-muted-foreground/20',
    row.item_type === 'deliverable' &&
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
    row.item_type === 'work_package' &&
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
    row.item_type === 'control_account' &&
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-800'
  );

  return (
    <TableRow
      ref={setNodeRef as any}
      style={style}
      className={cn(
        'border-b-0 h-7',
        isPhaseRow ? 'bg-muted/40 hover:bg-muted/50' : 'hover:bg-muted/50',
        isDragging && 'opacity-70'
      )}
    >
      <TableCell className="w-[44px] p-1">
        <div className="flex items-center">
          {hasChildren && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-5 w-5 p-0 mr-1"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn('h-5 w-5 p-0 cursor-grab active:cursor-grabbing', readOnly && 'cursor-not-allowed')}
            disabled={readOnly}
            aria-label={t('projectWbsTemplates.items.dragToReorder')}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>

      <TableCell className="tabular-nums text-muted-foreground w-[80px] p-1 text-xs">{row.wbs_code}</TableCell>

      <TableCell className="p-1">
        <div className="flex items-center gap-1" style={{ paddingLeft: depth * 12 }}>
          <Input
            value={row.name}
            onChange={(e) => updateItem(row.id, { name: e.target.value })}
            disabled={readOnly}
            placeholder={t('projectWbsTemplates.items.namePlaceholder')}
            className="h-6 text-xs py-0"
          />
        </div>
      </TableCell>

      <TableCell className="w-[200px] p-1">
        <Select
          value={row.item_type}
          onValueChange={(v) => updateItem(row.id, { item_type: v as any })}
          disabled={readOnly}
        >
          <SelectTrigger className={typeTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phase">{t('projectWbsTemplates.itemType.phase')}</SelectItem>
            <SelectItem value="deliverable">{t('projectWbsTemplates.itemType.deliverable')}</SelectItem>
            <SelectItem value="work_package">{t('projectWbsTemplates.itemType.work_package')}</SelectItem>
            <SelectItem value="control_account">{t('projectWbsTemplates.itemType.control_account')}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="w-[100px] p-1">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={row.standard_duration_days ?? ''}
          onChange={(e) =>
            updateItem(row.id, {
              standard_duration_days: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          disabled={readOnly}
          placeholder={t('projectWbsTemplates.items.durationPlaceholder')}
          className="text-right h-6 text-xs py-0"
        />
      </TableCell>

      <TableCell className="w-[220px] p-1">
        <Select
          value={row.standard_cost_code ?? '__none__'}
          onValueChange={(v) => updateItem(row.id, { standard_cost_code: v === '__none__' ? null : v })}
          disabled={readOnly}
        >
          <SelectTrigger className="h-6 text-xs py-0">
            <SelectValue placeholder={t('projectWbsTemplates.items.costCodePlaceholder') || 'Cost Code'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t('projectWbsTemplates.items.noCostCode') || 'None'}</SelectItem>
            {costCodes?.map(code => (
              <SelectItem key={code.id} value={code.code}>
                <span className="font-mono text-xs">{code.code}</span>
                <span className="text-xs text-muted-foreground ml-1">- {code.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      <TableCell className="text-right w-[140px] p-1">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => addChild(row.id)} disabled={readOnly} className="h-6 text-xs px-2">
            {t('projectWbsTemplates.items.addChild')}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onDelete(row.id)}
            disabled={readOnly}
            aria-label={t('projectWbsTemplates.items.delete')}
            className="h-6 w-6"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ProjectWbsTemplateEditor() {
  const { t } = useLocalization();
  const { toast } = useToast();
  useRouteTranslations();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const isCreate = id === 'new';

  // Fetch cost codes for current language
  const { data: costCodes } = useCostCodes(1);

  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);
  const canEditRole = roles?.includes('admin') || roles?.includes('project_manager');

  const {
    useTemplateById,
    useTemplateItems,
    createTemplate,
    updateTemplate,
    upsertTemplateItems,
    deleteTemplateItemsByIds,
  } = useWbsTemplates();

  const templateId = isCreate ? undefined : id;
  const templateQuery = useTemplateById(templateId);
  const itemsQuery = useTemplateItems(templateId);

  const template = templateQuery.data;
  const readOnly = !canEditRole || (!isCreate && mode !== 'edit');

  const [draftTemplate, setDraftTemplate] = useState<DraftTemplate>(() => ({
    id: crypto.randomUUID(),
    template_name: '',
    description: null,
    project_type: null,
    is_default: false,
    is_system: false,
    image_url: null,
  }));

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Template section expansion state (collapsed by default)
  const [isTemplateExpanded, setIsTemplateExpanded] = useState(false);
  
  // Items section row expansion state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Sync dialog state
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [selectedPhaseTemplateId, setSelectedPhaseTemplateId] = useState<string>('');
  const [syncValidationResults, setSyncValidationResults] = useState<Array<{phaseName: string; wbsItemName: string | null; matched: boolean}>>([]);
  const [isValidating, setIsValidating] = useState(false);

  const exportColumns = useMemo(
    () => [
      { key: 'wbs_code', label: t('projectWbsTemplates.grid.code') },
      { key: 'name', label: t('projectWbsTemplates.items.name') },
      { key: 'item_type', label: t('projectWbsTemplates.items.type') },
      { key: 'description', label: t('projectWbsTemplates.items.description') },
      { key: 'standard_duration_days', label: t('projectWbsTemplates.items.durationDays') },
      { key: 'standard_cost_code', label: t('projectWbsTemplates.items.costCode') },
    ],
    [t]
  );

  const initialIds = useMemo(() => new Set((itemsQuery.data ?? []).map(i => i.id)), [itemsQuery.data]);
  
  // Fetch phase templates for sync functionality
  const { templates: phaseTemplates } = usePhaseTemplates();

   useEffect(() => {
     if (isCreate) return;
     if (!template) return;
     setDraftTemplate({
       id: template.id,
       template_name: template.template_name,
       description: template.description,
       project_type: template.project_type,
       is_default: template.is_default,
       is_system: template.is_system,
       image_url: (template as any).image_url || null,
     });
   }, [template, isCreate]);

  useEffect(() => {
    if (isCreate) return;
    const base = (itemsQuery.data ?? []).map((i) => ({
      id: i.id,
      template_id: i.template_id,
      parent_id: i.parent_id,
      item_type: i.item_type,
      name: i.name,
      description: i.description,
      sort_order: i.sort_order,
      wbs_code: i.wbs_code,
      code_path: i.code_path,
      standard_cost_code: i.standard_cost_code,
      standard_duration_days: i.standard_duration_days,
    }));
    setDraftItems(base);
    setRemovedIds(new Set());
  }, [itemsQuery.data, isCreate]);

  const normalizedItems = useMemo(() => computeCodes(draftItems.slice()), [draftItems]);
  const depthById = useMemo(() => computeDepth(normalizedItems), [normalizedItems]);

  const orderedRows = useMemo(() => {
    return normalizedItems
      .slice()
      .sort((a, b) => (a.code_path || '').localeCompare(b.code_path || ''));
  }, [normalizedItems]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, DraftItem[]>();
    for (const it of normalizedItems) {
      const key = it.parent_id ?? null;
      const list = m.get(key) ?? [];
      list.push(it);
      m.set(key, list);
    }
    for (const [k, list] of m.entries()) m.set(k, list.slice().sort((a, b) => a.sort_order - b.sort_order));
    return m;
  }, [normalizedItems]);

  // Helper function to collect all descendant IDs for a given item
  const collectDescendantIds = useMemo(() => {
    const childrenByParentIds = new Map<string | null, string[]>();
    for (const it of normalizedItems) {
      if (!it.parent_id) continue;
      const list = childrenByParentIds.get(it.parent_id) ?? [];
      list.push(it.id);
      childrenByParentIds.set(it.parent_id, list);
    }
    
    return (parentId: string): Set<string> => {
      const descendants = new Set<string>();
      const stack = [parentId];
      while (stack.length) {
        const cur = stack.pop()!;
        const children = childrenByParentIds.get(cur) ?? [];
        children.forEach(childId => {
          if (!descendants.has(childId)) {
            descendants.add(childId);
            stack.push(childId);
          }
        });
      }
      return descendants;
    };
  }, [normalizedItems]);

  // Toggle single row expansion
  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        // Collapse: remove this row and all its descendants
        const descendants = collectDescendantIds(rowId);
        next.delete(rowId);
        descendants.forEach(id => next.delete(id));
      } else {
        // Expand: add this row and its immediate children
        next.add(rowId);
        const children = normalizedItems.filter(it => it.parent_id === rowId);
        children.forEach(child => next.add(child.id));
      }
      return next;
    });
  };

  // Expand all rows
  const expandAllRows = () => {
    const allIds = new Set(normalizedItems.map(it => it.id));
    setExpandedRows(allIds);
  };

  // Collapse all rows (show only root level)
  const collapseAllRows = () => {
    setExpandedRows(new Set());
  };

  // Check if all rows are expanded
  const areAllRowsExpanded = useMemo(() => {
    return normalizedItems.length > 0 && normalizedItems.every(it => expandedRows.has(it.id));
  }, [normalizedItems, expandedRows]);

  // Handle sync with phase template
  const handleOpenSyncDialog = () => {
    setSelectedPhaseTemplateId('');
    setSyncValidationResults([]);
    setIsSyncDialogOpen(true);
  };

  const handleValidateSync = () => {
    if (!selectedPhaseTemplateId) return;
    
    setIsValidating(true);
    
    const selectedTemplate = phaseTemplates?.find(t => t.id === selectedPhaseTemplateId);
    if (!selectedTemplate || !selectedTemplate.phases) {
      setIsValidating(false);
      return;
    }
    
    // Get all phase items from current WBS template
    const wbsPhaseItems = normalizedItems.filter(item => item.item_type === 'phase');
    
    // Validate each phase from the selected template
    const results = selectedTemplate.phases.map(phase => {
      const matchingWbsItem = wbsPhaseItems.find(wbsItem => 
        wbsItem.name.toLowerCase().trim() === phase.phaseName.toLowerCase().trim()
      );
      
      return {
        phaseName: phase.phaseName,
        wbsItemName: matchingWbsItem?.name || null,
        matched: !!matchingWbsItem,
      };
    });
    
    setSyncValidationResults(results);
    setIsValidating(false);
  };

  const handleApplySync = () => {
    if (!selectedPhaseTemplateId) return;
    
    const selectedTemplate = phaseTemplates?.find(t => t.id === selectedPhaseTemplateId);
    if (!selectedTemplate || !selectedTemplate.phases) return;
    
    // Get current phase items
    const wbsPhaseItems = normalizedItems.filter(item => item.item_type === 'phase');
    
    // Find phases that don't have a matching WBS item
    const unmatchedPhases = selectedTemplate.phases.filter(phase => {
      return !wbsPhaseItems.some(wbsItem => 
        wbsItem.name.toLowerCase().trim() === phase.phaseName.toLowerCase().trim()
      );
    });
    
    // Create new WBS items for unmatched phases
    const newItems: DraftItem[] = [];
    let nextOrder = (childrenByParent.get(null) ?? []).length + 1;
    
    if (unmatchedPhases.length > 0) {
      unmatchedPhases.forEach(phase => {
        const newId = crypto.randomUUID();
        newItems.push({
          id: newId,
          template_id: draftTemplate.id,
          parent_id: null,
          item_type: 'phase',
          name: phase.phaseName,
          description: null,
          sort_order: nextOrder++,
          wbs_code: '',
          code_path: '',
          standard_cost_code: null,
          standard_duration_days: phase.defaultDurationDays || null,
        } as DraftItem);
      });
    }
    
    // Synchronize duration days for existing WBS items that match phases
    const updatedItems = normalizedItems.map(item => {
      if (item.item_type !== 'phase') return item;
      
      const matchingPhase = selectedTemplate.phases?.find(phase => 
        phase.phaseName.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      
      if (matchingPhase && item.standard_duration_days !== matchingPhase.defaultDurationDays) {
        return {
          ...item,
          standard_duration_days: matchingPhase.defaultDurationDays || null,
        };
      }
      
      return item;
    });
    
    // Combine updated items with new items
    const combinedItems = [...updatedItems, ...newItems];
    
    // Force a re-computation of codes to ensure proper ordering
    const recomputedItems = computeCodes(combinedItems);
    setDraftItems(recomputedItems);
    
    // Show appropriate toast message
    const totalChanges = unmatchedPhases.length + (updatedItems.length - normalizedItems.length);
    
    if (unmatchedPhases.length > 0) {
      toast({
        title: t('common.success'),
        description: t('projectWbsTemplates.sync.phasesAdded', { count: unmatchedPhases.length }),
      });
    } else if (totalChanges > 0) {
      toast({
        title: t('common.success'),
        description: t('projectWbsTemplates.sync.durationsUpdated'),
      });
    } else {
      toast({
        title: t('common.info'),
        description: t('projectWbsTemplates.sync.allPhasesMatched'),
      });
    }
    
    setIsSyncDialogOpen(false);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const addRoot = () => {
    const newId = crypto.randomUUID();
    const nextOrder = (childrenByParent.get(null) ?? []).length + 1;
    setDraftItems((prev) => [
      ...prev,
      {
        id: newId,
        template_id: draftTemplate.id,
        parent_id: null,
        item_type: 'phase',
        name: '',
        description: null,
        sort_order: nextOrder,
        wbs_code: '',
        code_path: '',
        standard_cost_code: null,
      },
    ]);
  };

  const addChild = (parentId: string) => {
    const newId = crypto.randomUUID();
    const nextOrder = (childrenByParent.get(parentId) ?? []).length + 1;
    setDraftItems((prev) => [
      ...prev,
      {
        id: newId,
        template_id: draftTemplate.id,
        parent_id: parentId,
        item_type: 'work_package',
        name: '',
        description: null,
        sort_order: nextOrder,
        wbs_code: '',
        code_path: '',
        standard_cost_code: null,
      },
    ]);
  };

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setDraftItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const swapSibling = (id: string, direction: 'up' | 'down') => {
    const cur = normalizedItems.find(i => i.id === id);
    if (!cur) return;
    const siblings = childrenByParent.get(cur.parent_id ?? null) ?? [];
    const idx = siblings.findIndex(s => s.id === id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const a = siblings[idx];
    const b = siblings[targetIdx];
    setDraftItems(prev =>
      prev.map(it => {
        if (it.id === a.id) return { ...it, sort_order: b.sort_order };
        if (it.id === b.id) return { ...it, sort_order: a.sort_order };
        return it;
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const byId = new Map(normalizedItems.map((i) => [i.id, i]));
    const activeNode = byId.get(activeId);
    const overNode = byId.get(overId);
    if (!activeNode || !overNode) return;

    const parentKey = activeNode.parent_id ?? null;
    const overParentKey = overNode.parent_id ?? null;
    // Restrict drag & drop to reordering within the same parent (siblings only)
    if (parentKey !== overParentKey) return;

    const siblings = (childrenByParent.get(parentKey) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    const oldIndex = siblings.findIndex((s) => s.id === activeId);
    const newIndex = siblings.findIndex((s) => s.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(siblings, oldIndex, newIndex);
    const nextOrderById = new Map(reordered.map((s, idx) => [s.id, idx + 1]));

    setDraftItems((prev) =>
      prev.map((it) => {
        if ((it.parent_id ?? null) !== parentKey) return it;
        const next = nextOrderById.get(it.id);
        if (!next) return it;
        return { ...it, sort_order: next };
      })
    );
  };

  const deleteItem = (id: string) => {
    const toDelete = collectDescendants(draftItems, id);
    setDraftItems(prev => prev.filter(i => !toDelete.has(i.id)));
    setRemovedIds(prev => {
      const next = new Set(prev);
      for (const did of toDelete) {
        if (initialIds.has(did)) next.add(did);
      }
      return next;
    });
  };

  const sanitizeFileName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '');

  const handleExportCsv = () => {
    if (isCreate) return;
    const itemsToExport = computeCodes(draftItems).sort((a, b) => a.code_path.localeCompare(b.code_path));

    if (itemsToExport.length === 0) {
      toast({
        title: t('common.info'),
        description: t('projectWbsTemplates.export.empty'),
      });
      return;
    }

    setIsExporting(true);

    try {
      const rows = itemsToExport.map(item => ({
        wbs_code: item.wbs_code,
        name: item.name,
        item_type: t(`projectWbsTemplates.itemType.${item.item_type}`),
        description: item.description ?? '',
        standard_duration_days: item.standard_duration_days ?? '',
        standard_cost_code: item.standard_cost_code ?? '',
      }));

      const safeName = sanitizeFileName(draftTemplate.template_name) || draftTemplate.id;
      const baseFileName = t('projectWbsTemplates.export.fileName');
      exportRowsToCsv(rows, exportColumns, `${baseFileName}-${safeName}.csv`);

      toast({
        title: t('common.success'),
        description: t('projectWbsTemplates.export.success'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error?.message || t('projectWbsTemplates.export.error'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const computedItems = computeCodes(draftItems.slice()).map(i => ({ ...i, template_id: draftTemplate.id }));

       if (isCreate) {
         await createTemplate.mutateAsync({
           id: draftTemplate.id,
           template_name: draftTemplate.template_name,
           description: draftTemplate.description,
           project_type: draftTemplate.project_type,
           is_default: draftTemplate.is_default,
           is_system: false,
           image_url: draftTemplate.image_url,
         } as any);
       } else {
         await updateTemplate.mutateAsync({
           id: draftTemplate.id,
           updates: {
             template_name: draftTemplate.template_name,
             description: draftTemplate.description,
             project_type: draftTemplate.project_type,
             is_default: draftTemplate.is_default,
             image_url: draftTemplate.image_url,
           } as any,
         });
       }

      if (computedItems.length > 0) {
        await upsertTemplateItems.mutateAsync(computedItems as any);
      }

      const removed = Array.from(removedIds);
      if (removed.length > 0) {
        await deleteTemplateItemsByIds.mutateAsync({ templateId: draftTemplate.id, ids: removed });
      }

      navigate('/project-wbs-templates');
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = isCreate
    ? t('projectWbsTemplates.editor.createTitle')
    : readOnly
      ? t('projectWbsTemplates.editor.viewTitle')
      : t('projectWbsTemplates.editor.editTitle');

  return (
    <div className="flex-1 space-y-6">
      <PageHeader
        title={pageTitle}
        description={t('projectWbsTemplates.editor.subtitle')}
        actions={
          <>
            {!isCreate && (
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting || itemsQuery.isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? t('projectWbsTemplates.export.exporting') : t('projectWbsTemplates.export.button')}
              </Button>
            )}
            {!readOnly ? (
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('projectWbsTemplates.editor.templateSectionTitle')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTemplateExpanded(!isTemplateExpanded)}
            className="h-8 w-8 p-0"
          >
            {isTemplateExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isTemplateExpanded && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>{t('projectWbsTemplates.fields.name')}</Label>
                <Input
                  value={draftTemplate.template_name}
                  onChange={(e) => setDraftTemplate(p => ({ ...p, template_name: e.target.value }))}
                  disabled={readOnly}
                  placeholder={t('projectWbsTemplates.fields.namePlaceholder')}
                />
              </div>

              <div className="space-y-1">
                <Label>{t('projectWbsTemplates.fields.projectType')}</Label>
                <Select
                  value={draftTemplate.project_type ?? ''}
                  onValueChange={(v) => setDraftTemplate(p => ({ ...p, project_type: v || null }))}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('projectWbsTemplates.fields.projectTypePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">{t('projects:fallbackTypes.residential')}</SelectItem>
                    <SelectItem value="commercial">{t('projects:fallbackTypes.commercial')}</SelectItem>
                    <SelectItem value="renovation">{t('projects:fallbackTypes.renovation')}</SelectItem>
                    <SelectItem value="infrastructure">{t('projects:fallbackTypes.infrastructure')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

             <div className="space-y-1">
               <Label>{t('projectWbsTemplates.fields.description')}</Label>
               <Textarea
                 value={draftTemplate.description ?? ''}
                 onChange={(e) => setDraftTemplate(p => ({ ...p, description: e.target.value }))}
                 disabled={readOnly}
                 placeholder={t('projectWbsTemplates.fields.descriptionPlaceholder')}
                 rows={3}
               />
             </div>

             <TemplateImageUpload
               currentImageUrl={draftTemplate.image_url || null}
               onImageUrlChange={(url) => setDraftTemplate(p => ({ ...p, image_url: url }))}
             />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm">
                {draftTemplate.is_system ? <Badge variant="outline">{t('projectWbsTemplates.system')}</Badge> : null}
                {draftTemplate.is_default ? <Badge variant="secondary">{t('projectWbsTemplates.default') || 'Default'}</Badge> : null}
              </div>

              {!readOnly && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={draftTemplate.is_default}
                    onCheckedChange={(checked) => setDraftTemplate(p => ({ ...p, is_default: checked }))}
                  />
                  <Label htmlFor="is_default" className="text-sm font-medium leading-none cursor-pointer">
                    {t('projectWbsTemplates.fields.isDefault') || 'Set as Default Template'}
                  </Label>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{t('projectWbsTemplates.items.title')}</CardTitle>
            {normalizedItems.length > 0 && (
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={areAllRowsExpanded ? collapseAllRows : expandAllRows}
                  className="h-7 px-2 text-xs"
                >
                  {areAllRowsExpanded ? (
                    <>
                      <ChevronLeft className="mr-1 h-3 w-3" />
                      {t('projectWbsTemplates.items.collapseAll')}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="mr-1 h-3 w-3" />
                      {t('projectWbsTemplates.items.expandAll')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={handleOpenSyncDialog}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('projectWbsTemplates.sync.button')}
              </Button>
            )}
            {!readOnly ? (
              <Button variant="outline" onClick={addRoot}>
                <Plus className="mr-2 h-4 w-4" />
                {t('projectWbsTemplates.items.addRoot')}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-b-0 h-8">
                      <TableHead className="w-[44px] p-2" />
                      <TableHead className="w-[80px] p-2">{t('projectWbsTemplates.grid.code')}</TableHead>
                      <TableHead className="min-w-[280px] p-2">{t('projectWbsTemplates.items.name')}</TableHead>
                      <TableHead className="w-[200px] p-2">{t('projectWbsTemplates.items.type')}</TableHead>
                      <TableHead className="w-[100px] p-2 text-right">{t('projectWbsTemplates.items.durationDays')}</TableHead>
                      <TableHead className="w-[220px] p-2">{t('projectWbsTemplates.items.costCode') || 'Cost Code'}</TableHead>
                      <TableHead className="w-[140px] p-2 text-right">{t('projectWbsTemplates.grid.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          {t('projectWbsTemplates.items.empty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      orderedRows
                        .filter((row) => {
                          // Show row if it's at root level or if its parent is expanded
                          if (!row.parent_id) return true;
                          return expandedRows.has(row.parent_id);
                        })
                        .map((row) => {
                          const depth = depthById.get(row.id) ?? 0;
                          const hasChildren = normalizedItems.some((it) => it.parent_id === row.id);
                          return (
                            <SortableTemplateItemRow
                              key={row.id}
                              row={row}
                              depth={depth}
                              readOnly={readOnly}
                              t={t}
                              updateItem={updateItem}
                              addChild={addChild}
                              onDelete={(rid) => setDeleteRowId(rid)}
                              costCodes={costCodes}
                              isExpanded={expandedRows.has(row.id)}
                              onToggleExpand={() => toggleRowExpanded(row.id)}
                              hasChildren={hasChildren}
                            />
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteRowId}
        onOpenChange={(open) => !open && setDeleteRowId(null)}
        onConfirm={async () => {
          if (!deleteRowId) return;
          deleteItem(deleteRowId);
          setDeleteRowId(null);
        }}
        title={t('projectWbsTemplates.items.deleteConfirmTitle')}
        description={t('projectWbsTemplates.items.deleteConfirmDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
      />

      {/* Sync with Phases Template Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('projectWbsTemplates.sync.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('projectWbsTemplates.sync.dialogDescription')}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('projectWbsTemplates.sync.selectTemplate')}</Label>
              <Select
                value={selectedPhaseTemplateId}
                onValueChange={setSelectedPhaseTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('projectWbsTemplates.sync.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {phaseTemplates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPhaseTemplateId && (
              <div className="flex justify-end">
                <Button
                  onClick={handleValidateSync}
                  disabled={isValidating}
                  variant="outline"
                >
                  {isValidating ? t('projectWbsTemplates.sync.validating') : t('projectWbsTemplates.sync.validateButton')}
                </Button>
              </div>
            )}

            {syncValidationResults.length > 0 && (
              <div className="space-y-2">
                <Label>{t('projectWbsTemplates.sync.validationResults')}</Label>
                <ScrollArea className="h-[200px] rounded-md border p-2">
                  <div className="space-y-2">
                    {syncValidationResults.map((result, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded text-sm',
                          result.matched ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                        )}
                      >
                        {result.matched ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div className="flex-1">
                          <span className="font-medium">{result.phaseName}</span>
                          {result.matched ? (
                            <span className="text-muted-foreground ml-2">
                              {t('projectWbsTemplates.sync.matchedWith')}: {result.wbsItemName}
                            </span>
                          ) : (
                            <span className="text-red-600 ml-2">
                              {t('projectWbsTemplates.sync.notMatched')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="text-sm text-muted-foreground">
                  {syncValidationResults.filter(r => r.matched).length} {t('projectWbsTemplates.sync.of')} {syncValidationResults.length} {t('projectWbsTemplates.sync.phasesMatched')}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleApplySync}
              disabled={!selectedPhaseTemplateId || syncValidationResults.length === 0}
            >
              {t('projectWbsTemplates.sync.applyButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


