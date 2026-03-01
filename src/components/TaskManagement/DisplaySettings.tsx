import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ColumnDensity } from '@/components/Architect/Tasks/TasksBoardView';

interface DisplaySettingsProps {
  projectId?: string;
  currentDensity?: ColumnDensity;
  onUpdate?: () => void;
  disablePersistence?: boolean;
  onDensityChange?: (density: ColumnDensity) => void;
  hideHeader?: boolean;
  /** When set, persist density to sessionStorage under this key instead of projects table (e.g. roadmap). */
  storageKey?: string;
}

export function DisplaySettings({
  projectId,
  currentDensity = 'default',
  onUpdate,
  disablePersistence,
  onDensityChange,
  hideHeader = false,
  storageKey,
}: DisplaySettingsProps) {
  const { t } = useLocalization();
  const [density, setDensity] = useState<ColumnDensity>(currentDensity);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDensity(currentDensity);
  }, [currentDensity]);

  const isValidUUID = (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      onDensityChange?.(density);

      if (storageKey) {
        try {
          sessionStorage.setItem(storageKey, density);
        } catch {
          // ignore
        }
        toast.success(t('projectDetail.displaySettingsTab.saved'));
        onUpdate?.();
        setIsSaving(false);
        return;
      }

      if (disablePersistence || !projectId || !isValidUUID(projectId)) {
        toast.success(t('projectDetail.displaySettingsTab.saved'));
        onUpdate?.();
        setIsSaving(false);
        return;
      }

      const densityToWidth: Record<ColumnDensity, number> = {
        superCompact: 240,
        compact: 280,
        default: 360,
        relaxed: 440,
      };

      const columnWidth = densityToWidth[density];

      const { error } = await supabase
        .from('projects')
        .update({ task_column_width: columnWidth })
        .eq('id', projectId);

      if (error) throw error;

      toast.success(t('projectDetail.displaySettingsTab.saved'));
      onUpdate?.();
    } catch (error) {
      console.error('Error updating column width:', error);
      toast.error(t('projectDetail.displaySettingsTab.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setDensity('default');
  };

  return (
    <Card>
      {!hideHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" />
            {t('projectDetail.displaySettingsTab.title')}
          </CardTitle>
          <CardDescription>
            {t('projectDetail.displaySettingsTab.description')}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={hideHeader ? "space-y-6" : "space-y-6"}>
        {/* Density Setting */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            {t('projectDetail.displaySettingsTab.columnWidth')}
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              type="button"
              variant={density === 'superCompact' ? 'default' : 'outline'}
              size="sm"
              className="flex flex-col items-start h-auto py-2 px-3 min-w-0 text-left overflow-hidden"
              onClick={() => setDensity('superCompact')}
            >
              <span className="text-xs font-semibold w-full shrink-0">
                {t('projectDetail.displaySettingsTab.superCompact')}
              </span>
              <span className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere] w-full">
                {t('projectDetail.displaySettingsTab.superCompactDescription')}
              </span>
            </Button>
            <Button
              type="button"
              variant={density === 'compact' ? 'default' : 'outline'}
              size="sm"
              className="flex flex-col items-start h-auto py-2 px-3 min-w-0 text-left overflow-hidden"
              onClick={() => setDensity('compact')}
            >
              <span className="text-xs font-semibold w-full shrink-0">
                {t('projectDetail.displaySettingsTab.narrow')}
              </span>
              <span className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere] w-full">
                {t('projectDetail.displaySettingsTab.narrowDescription')}
              </span>
            </Button>
            <Button
              type="button"
              variant={density === 'default' ? 'default' : 'outline'}
              size="sm"
              className="flex flex-col items-start h-auto py-2 px-3 min-w-0 text-left overflow-hidden"
              onClick={() => setDensity('default')}
            >
              <span className="text-xs font-semibold w-full shrink-0">
                {t('projectDetail.displaySettingsTab.default')}
              </span>
              <span className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere] w-full">
                {t('projectDetail.displaySettingsTab.defaultDescription')}
              </span>
            </Button>
            <Button
              type="button"
              variant={density === 'relaxed' ? 'default' : 'outline'}
              size="sm"
              className="flex flex-col items-start h-auto py-2 px-3 min-w-0 text-left overflow-hidden"
              onClick={() => setDensity('relaxed')}
            >
              <span className="text-xs font-semibold w-full shrink-0">
                {t('projectDetail.displaySettingsTab.wide')}
              </span>
              <span className="text-[11px] text-muted-foreground break-words [overflow-wrap:anywhere] w-full">
                {t('projectDetail.displaySettingsTab.wideDescription')}
              </span>
            </Button>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-3">
              {t('projectDetail.displaySettingsTab.preview')}
            </p>
            <div 
              className="bg-background border rounded-lg p-4 mx-auto transition-all duration-200 max-w-full"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-primary/20" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
                <div className="h-6 w-10 bg-muted rounded-full" />
              </div>
              <div
                className={cn(
                  'grid gap-2',
                  density === 'superCompact' && '[grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]',
                  density === 'compact' && '[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]',
                  density === 'default' && '[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]',
                  density === 'relaxed' && '[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]'
                )}
              >
                <div className="h-20 bg-card border rounded-md" />
                <div className="h-20 bg-card border rounded-md" />
                <div className="h-20 bg-card border rounded-md hidden sm:block" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || density === currentDensity}
            className="flex-1"
          >
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={density === 'default'}
          >
            {t('common.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
