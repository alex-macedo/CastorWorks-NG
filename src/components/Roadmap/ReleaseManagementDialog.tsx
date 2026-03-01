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
import { Package } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCreateSprint } from '@/hooks/useSprints';
import { useReleases } from '@/hooks/useRoadmapReleases';

interface ReleaseManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId?: string;
  currentVersion?: string;
}

export function ReleaseManagementDialog({ 
  open, 
  onOpenChange, 
  itemId,
  currentVersion 
}: ReleaseManagementDialogProps) {
  const { t } = useLocalization();
  const createSprint = useCreateSprint();
  const [formData, setFormData] = useState({
    version: currentVersion || '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.version.trim() || !formData.title.trim() || !formData.startDate || !formData.endDate) return;

    try {
      await createSprint.mutateAsync({
        sprint_identifier: formData.version,
        title: formData.title,
        description: formData.description || undefined,
        start_date: formData.startDate,
        end_date: formData.endDate,
      });

      // Reset form
      setFormData({
        version: '',
        title: '',
        description: '',
        startDate: '',
        endDate: '',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating sprint:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <DialogTitle>
              {currentVersion ? t('roadmap.editRelease') : t('roadmap.createRelease')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {itemId 
              ? t('roadmap.assignReleaseDescription') 
              : t('roadmap.createReleaseDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version">
                {t('roadmap.version')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                placeholder={t("additionalPlaceholders.releaseVersion")}
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                {t('roadmap.releaseTitle')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t('roadmap.releaseTitlePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('roadmap.releaseDescription')}</Label>
              <Textarea
                id="description"
                placeholder={t('roadmap.releaseDescriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('roadmap.startDate')}</Label>
                <DateInput
                  value={formData.startDate}
                  onChange={(value) => setFormData({ ...formData, startDate: value })}
                  max={formData.endDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t('roadmap.endDate')}</Label>
                <DateInput
                  value={formData.endDate}
                  onChange={(value) => setFormData({ ...formData, endDate: value })}
                  min={formData.startDate}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.version.trim() || !formData.title.trim() || !formData.startDate || !formData.endDate || createSprint.isPending}>
              {createSprint.isPending ? 'Creating...' : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
