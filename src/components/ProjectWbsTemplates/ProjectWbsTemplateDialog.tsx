import { useEffect, useMemo, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { WbsTemplate, WbsTemplateItem } from '@/hooks/useWbsTemplates';

type DraftTemplate = Pick<WbsTemplate, 'id' | 'template_name' | 'description' | 'project_type' | 'is_default' | 'is_system'>;

type DraftItem = Pick<
  WbsTemplateItem,
  'id' | 'template_id' | 'parent_id' | 'item_type' | 'name' | 'description' | 'sort_order' | 'wbs_code' | 'code_path'
>;

const pad3 = (n: number) => String(n).padStart(3, '0');

function computeCodes(items: DraftItem[]): DraftItem[] {
  const byParent = new Map<string | null, DraftItem[]>();
  for (const it of items) {
    const key = it.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(it);
    byParent.set(key, list);
  }

  const out = new Map<string, DraftItem>();

  const walk = (parentId: string | null, parentWbs: string | null, parentPath: string | null) => {
    const children = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    // Re-normalize sibling sort_order to be 1..n to avoid uniqueness collisions
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
  // Preserve nodes that are orphaned (shouldn't happen, but keep them visible)
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
    const kids = childrenByParent.get(cur) ?? [];
    kids.forEach(k => stack.push(k));
  }
  return toDelete;
}

export function ProjectWbsTemplateDialog({
  open,
  onOpenChange,
  template,
  templateItems,
  isItemsLoading,
  mode,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WbsTemplate | null;
  templateItems: WbsTemplateItem[];
  isItemsLoading: boolean;
  mode: 'create' | 'view' | 'edit';
  onSave: (payload: { template: DraftTemplate; items: DraftItem[]; removedItemIds: string[] }) => Promise<void>;
}) {
  const { t } = useLocalization();
  const readOnly = mode === 'view' || !!template?.is_system;

  const [draftTemplate, setDraftTemplate] = useState<DraftTemplate>(() => ({
    id: template?.id ?? crypto.randomUUID(),
    template_name: template?.template_name ?? '',
    description: template?.description ?? null,
    project_type: template?.project_type ?? null,
    is_default: template?.is_default ?? false,
    is_system: template?.is_system ?? false,
  }));

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const initialIds = useMemo(() => new Set(templateItems.map(i => i.id)), [templateItems]);

  useEffect(() => {
    if (!open) return;
    setDraftTemplate({
      id: template?.id ?? crypto.randomUUID(),
      template_name: template?.template_name ?? '',
      description: template?.description ?? null,
      project_type: template?.project_type ?? null,
      is_default: template?.is_default ?? false,
      is_system: template?.is_system ?? false,
    });
    setRemovedIds(new Set());

    // Copy template items into editable drafts
    const base: DraftItem[] = (templateItems ?? []).map((i) => ({
      id: i.id,
      template_id: i.template_id,
      parent_id: i.parent_id,
      item_type: i.item_type,
      name: i.name,
      description: i.description,
      sort_order: i.sort_order,
      wbs_code: i.wbs_code,
      code_path: i.code_path,
    }));

    // For create mode, start with empty tree
    setDraftItems(mode === 'create' ? [] : base);
  }, [open, template, templateItems, mode]);

  const normalizedItems = useMemo(() => computeCodes(draftItems.slice()), [draftItems]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string | null, DraftItem[]>();
    for (const it of normalizedItems) {
      const key = it.parent_id ?? null;
      const list = m.get(key) ?? [];
      list.push(it);
      m.set(key, list);
    }
    for (const [k, list] of m.entries()) {
      m.set(k, list.slice().sort((a, b) => a.sort_order - b.sort_order));
    }
    return m;
  }, [normalizedItems]);

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
      },
    ]);
  };

  const deleteItem = (id: string) => {
    const toDelete = collectDescendants(draftItems, id);
    setDraftItems((prev) => prev.filter((i) => !toDelete.has(i.id)));
    setRemovedIds((prev) => {
      const next = new Set(prev);
      for (const did of toDelete) {
        if (initialIds.has(did)) next.add(did);
      }
      return next;
    });
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const current = normalizedItems.find((i) => i.id === id);
    if (!current) return;
    const siblings = childrenByParent.get(current.parent_id ?? null) ?? [];
    const idx = siblings.findIndex((s) => s.id === id);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const a = siblings[idx];
    const b = siblings[targetIdx];

    // swap sort_order in draftItems source
    setDraftItems((prev) =>
      prev.map((it) => {
        if (it.id === a.id) return { ...it, sort_order: b.sort_order };
        if (it.id === b.id) return { ...it, sort_order: a.sort_order };
        return it;
      })
    );
  };

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setDraftItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const renderNode = (node: DraftItem, depth: number) => {
    const kids = childrenByParent.get(node.id) ?? [];
    return (
      <div key={node.id} className={depth === 0 ? 'space-y-2' : 'space-y-2 pl-4 border-l border-muted'}>
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {node.wbs_code || '—'}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">{node.code_path || ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => moveItem(node.id, 'up')}
                disabled={readOnly}
                aria-label={t('projectWbsTemplates.items.moveUp')}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => moveItem(node.id, 'down')}
                disabled={readOnly}
                aria-label={t('projectWbsTemplates.items.moveDown')}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => addChild(node.id)}
                disabled={readOnly}
                aria-label={t('projectWbsTemplates.items.addChild')}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => deleteItem(node.id)}
                disabled={readOnly}
                aria-label={t('projectWbsTemplates.items.delete')}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('projectWbsTemplates.items.name')}</Label>
              <Input
                value={node.name}
                onChange={(e) => updateItem(node.id, { name: e.target.value })}
                disabled={readOnly}
                placeholder={t('projectWbsTemplates.items.namePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('projectWbsTemplates.items.type')}</Label>
              <Select
                value={node.item_type}
                onValueChange={(v) => updateItem(node.id, { item_type: v as any })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phase">{t('projectWbsTemplates.itemType.phase')}</SelectItem>
                  <SelectItem value="deliverable">{t('projectWbsTemplates.itemType.deliverable')}</SelectItem>
                  <SelectItem value="work_package">{t('projectWbsTemplates.itemType.work_package')}</SelectItem>
                  <SelectItem value="control_account">{t('projectWbsTemplates.itemType.control_account')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('projectWbsTemplates.items.description')}</Label>
            <Textarea
              value={node.description ?? ''}
              onChange={(e) => updateItem(node.id, { description: e.target.value })}
              disabled={readOnly}
              placeholder={t('projectWbsTemplates.items.descriptionPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        {kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  const roots = childrenByParent.get(null) ?? [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const computed = computeCodes(draftItems.slice()).map((i) => ({
        ...i,
        template_id: draftTemplate.id,
      }));

      await onSave({
        template: draftTemplate,
        items: computed,
        removedItemIds: Array.from(removedIds),
      });

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('projectWbsTemplates.dialog.createTitle')
              : readOnly
                ? t('projectWbsTemplates.dialog.viewTitle')
                : t('projectWbsTemplates.dialog.editTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('projectWbsTemplates.fields.name')}</Label>
              <Input
                value={draftTemplate.template_name}
                onChange={(e) => setDraftTemplate((p) => ({ ...p, template_name: e.target.value }))}
                disabled={readOnly}
                placeholder={t('projectWbsTemplates.fields.namePlaceholder')}
              />
            </div>

            <div className="space-y-1">
              <Label>{t('projectWbsTemplates.fields.projectType')}</Label>
              <Select
                value={draftTemplate.project_type ?? ''}
                onValueChange={(v) => setDraftTemplate((p) => ({ ...p, project_type: v || null }))}
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
              onChange={(e) => setDraftTemplate((p) => ({ ...p, description: e.target.value }))}
              disabled={readOnly}
              placeholder={t('projectWbsTemplates.fields.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            {draftTemplate.is_system ? <Badge variant="outline">{t('projectWbsTemplates.system')}</Badge> : null}
            {draftTemplate.is_default ? <Badge variant="secondary">{t('projectWbsTemplates.default')}</Badge> : null}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{t('projectWbsTemplates.items.title')}</div>
              <div className="text-sm text-muted-foreground">{t('projectWbsTemplates.items.subtitle')}</div>
            </div>
            <Button type="button" variant="outline" onClick={addRoot} disabled={readOnly}>
              <Plus className="mr-2 h-4 w-4" />
              {t('projectWbsTemplates.items.addRoot')}
            </Button>
          </div>

          {isItemsLoading ? (
            <div className="space-y-2">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-5/6 bg-muted animate-pulse rounded" />
            </div>
          ) : roots.length > 0 ? (
            <div className="space-y-3">
              {roots.map((r) => renderNode(r, 0))}
            </div>
          ) : (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              {t('projectWbsTemplates.items.empty')}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSave} disabled={readOnly || isSaving}>
              {isSaving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


