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
import { DateInput } from '@/components/ui/DateInput';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Image, X } from 'lucide-react';
import { useCreateRoadmapItem, useRoadmapItems } from '@/hooks/useRoadmapItems';
import { useUploadAttachment } from '@/hooks/useRoadmapAttachments';
import { useRoadmapKanbanColumns } from '@/hooks/useRoadmapKanbanColumns';
import { DependencySelector } from './DependencySelector';
import { useLocalization } from '@/contexts/LocalizationContext';

interface NewRoadmapItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRoadmapItemDialog({ open, onOpenChange }: NewRoadmapItemDialogProps) {
  const { t } = useLocalization();
  const createItem = useCreateRoadmapItem();
  const uploadAttachment = useUploadAttachment();
  const { roadmapItems } = useRoadmapItems();
  const { columns: kanbanColumns } = useRoadmapKanbanColumns();

  const defaultStatus = kanbanColumns.length > 1 ? (kanbanColumns[1]?.id ?? 'next_up') : 'next_up';

  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'feature' as 'feature' | 'bug_fix' | 'integration' | 'refinement',
    dueDate: '',
    estimatedEffort: 'medium' as 'small' | 'medium' | 'large' | 'xlarge' | undefined,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    try {
      // Create the roadmap item first
      const newItem = await createItem.mutateAsync({
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        category: formData.category,
        dependencies: dependencies.length > 0 ? dependencies : undefined,
      });

      // Upload attachments if any
      if (attachedFiles.length > 0 && newItem?.id) {
        for (const file of attachedFiles) {
          try {
            await uploadAttachment.mutateAsync({
              roadmapItemId: newItem.id,
              file: file,
            });
          } catch (error) {
            console.error('Failed to upload attachment:', error);
          }
        }
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        status: defaultStatus,
        priority: 'medium',
        category: 'feature',
        dueDate: '',
        estimatedEffort: 'medium',
        notes: '',
      });
      setAttachedFiles([]);
      setDependencies([]);

      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') || 
        file.type === 'application/pdf' ||
        file.name.toLowerCase().includes('.doc')
      );
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('roadmap.newItem')}</DialogTitle>
          <DialogDescription>
            {t('roadmap.newItemDescription')}
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

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="estimatedEffort">{t('roadmap.estimatedEffort')}</Label>
                <Select
                  value={formData.estimatedEffort || 'medium'}
                  onValueChange={(value) => setFormData({ ...formData, estimatedEffort: value as typeof formData.estimatedEffort })}
                >
                  <SelectTrigger id="estimatedEffort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">{t('roadmap.effort.small')}</SelectItem>
                    <SelectItem value="medium">{t('roadmap.effort.medium')}</SelectItem>
                    <SelectItem value="large">{t('roadmap.effort.large')}</SelectItem>
                    <SelectItem value="xlarge">{t('roadmap.effort.xlarge')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">{t('roadmap.dueDate')}</Label>
              <DateInput
                value={formData.dueDate}
                onChange={(value) => setFormData({ ...formData, dueDate: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('roadmap.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('roadmap.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Dependencies */}
            <div className="space-y-2">
              <Label>Dependencies</Label>
              <DependencySelector
                selectedDependencies={dependencies}
                onDependenciesChange={setDependencies}
                availableItems={roadmapItems || []}
              />
            </div>

            {/* Screenshot Upload Section */}
            <div className="space-y-2">
              <Label>{t('roadmap.attachments')}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="screenshot-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  aria-label={t("ariaLabels.uploadScreenshotsDocuments")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('screenshot-upload')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {t('roadmap.uploadFiles')}
                </Button>
              </div>
              
              {/* Show attached files */}
              {attachedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t('roadmap.attachedFiles')}:</div>
                  <div className="grid gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                        <Image className="h-4 w-4" />
                        <span className="text-sm flex-1 truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || createItem.isPending}>
              {createItem.isPending ? t('common.submitting') : t('roadmap.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
