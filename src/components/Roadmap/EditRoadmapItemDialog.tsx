import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateRoadmapItem, useRoadmapItems } from '@/hooks/useRoadmapItems';
import { useSprints } from '@/hooks/useSprints';
import { useRoadmapKanbanColumns } from '@/hooks/useRoadmapKanbanColumns';
import { DependencySelector } from './DependencySelector';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Calendar } from 'lucide-react';

interface EditRoadmapItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    category: string;
    priority?: string | null;
    dependencies?: any;
    sprint_id?: string | null;
  } | null;
}

export function EditRoadmapItemDialog({ open, onOpenChange, item }: EditRoadmapItemDialogProps) {
  const { t } = useLocalization();
  const updateItem = useUpdateRoadmapItem();
  const { roadmapItems } = useRoadmapItems();
  const { data: sprints = [] } = useSprints();
  const { columns: kanbanColumns } = useRoadmapKanbanColumns();

  const [dependencies, setDependencies] = useState<string[]>([]);
  type FormState = {
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'feature' | 'bug_fix' | 'integration' | 'refinement';
    sprint_id: string | null;
  };

  const [formData, setFormData] = useState<FormState>({
    title: '',
    description: '',
    status: 'next_up',
    priority: 'medium',
    category: 'feature',
    sprint_id: null,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description || '',
        status: item.status as FormState['status'],
        priority: (item.priority || 'medium') as FormState['priority'],
        category: item.category as FormState['category'],
        sprint_id: item.sprint_id ?? null,
      });

      // Parse dependencies
      let deps: string[] = [];
      if (item.dependencies) {
        if (typeof item.dependencies === 'string') {
          try {
            deps = JSON.parse(item.dependencies);
          } catch {
            deps = [];
          }
        } else if (Array.isArray(item.dependencies)) {
          deps = item.dependencies;
        }
      }
      setDependencies(deps);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !item) return;

    // Check dependencies if moving to done
    if (formData.status === 'done' && dependencies.length > 0) {
      const incompleteDeps = roadmapItems?.filter(
        i => dependencies.includes(i.id) && i.status !== 'done'
      );
      
      if (incompleteDeps && incompleteDeps.length > 0) {
        const depTitles = incompleteDeps.map(d => d.title).join(', ');
        alert(`Cannot mark as done. The following dependencies are incomplete:\n\n${depTitles}`);
        return;
      }
    }

    try {
      await updateItem.mutateAsync({
        id: item.id,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        category: formData.category,
        priority: formData.priority,
        sprint_id: formData.sprint_id,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
      });

      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('roadmap.editItem')}</DialogTitle>
          <DialogDescription>
            {t('roadmap.editItemDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('roadmap.titleField')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('roadmap.titlePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('roadmap.descriptionField')}</Label>
              <Textarea
                id="description"
                placeholder={t('roadmap.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">
                  {t('roadmap.status.label')} <span className="text-destructive">*</span>
                </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kanbanColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.labelKey ? t(col.labelKey) : (col.label || col.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">
                  {t('roadmap.priority.label')} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as typeof formData.priority })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('roadmap.priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('roadmap.priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('roadmap.priority.high')}</SelectItem>
                    <SelectItem value="urgent">{t('roadmap.priority.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                {t('roadmap.category.label')} <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as typeof formData.category })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">{t('roadmap.category.feature')}</SelectItem>
                  <SelectItem value="bug_fix">{t('roadmap.category.bugFix')}</SelectItem>
                  <SelectItem value="integration">{t('roadmap.category.integration')}</SelectItem>
                  <SelectItem value="refinement">{t('roadmap.category.refinement')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sprint">{t('roadmap.sprintLabel')}</Label>
              <Select
                value={formData.sprint_id ?? 'none'}
                onValueChange={(value) => setFormData({ ...formData, sprint_id: value === 'none' ? null : value })}
              >
                <SelectTrigger id="sprint">
                  <SelectValue placeholder={t('roadmap.noSprint')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('roadmap.noSprint')}</SelectItem>
                  {sprints
                    .sort((a, b) => {
                      if (a.status === 'open' && b.status !== 'open') return -1
                      if (a.status !== 'open' && b.status === 'open') return 1
                      return (b.year - a.year) || (b.week_number - a.week_number)
                    })
                    .map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Sprint {sprint.sprint_identifier}
                          {sprint.status === 'open' && (
                            <span className="text-xs text-muted-foreground">({t('roadmap.activeSprint')})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dependencies</Label>
              <DependencySelector
                selectedDependencies={dependencies}
                onDependenciesChange={setDependencies}
                availableItems={roadmapItems?.filter(i => i.id !== item.id) || []}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || updateItem.isPending}>
              {updateItem.isPending ? t('common.submitting') : t('roadmap.updateItem')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
