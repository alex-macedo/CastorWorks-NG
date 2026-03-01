import { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectStatuses } from '@/hooks/useArchitectStatuses';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Columns, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface PipelineColumnManagerProps {
  onUpdate?: () => void;
}

export const PipelineColumnManager = ({ onUpdate }: PipelineColumnManagerProps) => {
  const { t } = useLocalization();
  const { statuses } = useArchitectStatuses();
  const { settings: appSettings, updateSettings } = useAppSettings();

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const configuredColumns = appSettings?.sales_pipeline_columns;
    const allStatusIds = statuses.map((s) => s.id);

    // If there is no configuration or it's an empty array, default to all columns visible
    if (!Array.isArray(configuredColumns) || configuredColumns.length === 0) {
      return allStatusIds;
    }

    // Otherwise, respect the saved configuration (filter out any stale ids)
    return configuredColumns.filter((id) => allStatusIds.includes(id));
  });

  // Update selectedColumns when statuses or appSettings change
  useEffect(() => {
    const configuredColumns = appSettings?.sales_pipeline_columns;
    const allStatusIds = statuses.map((s) => s.id);

    if (!Array.isArray(configuredColumns) || configuredColumns.length === 0) {
      setSelectedColumns(allStatusIds);
    } else {
      setSelectedColumns(configuredColumns.filter((id) => allStatusIds.includes(id)));
    }
  }, [statuses, appSettings?.sales_pipeline_columns]);

  const handleColumnToggle = (statusId: string) => {
    setSelectedColumns(prev =>
      prev.includes(statusId)
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    );
  };

  const handleSave = () => {
    const columnsToSave = selectedColumns.length === statuses.length ? null : selectedColumns;

    updateSettings.mutate(
      { sales_pipeline_columns: columnsToSave },
      {
        onSuccess: () => {
          toast.success(t('architect.opportunities.columnsUpdated'));
          onUpdate?.();
        },
        onError: (error) => {
          toast.error(`${t('common.errorTitle')}: ${error.message}`);
        }
      }
    );
  };

  const handleReset = () => {
    setSelectedColumns(statuses.map(s => s.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-right">
          <Columns className="h-5 w-5" />
          {t('architect.opportunities.configureColumns', { defaultValue: 'Configure Columns' })}
        </CardTitle>
        <CardDescription className="text-right">
          {t('architect.opportunities.configureColumnsDescription', {
            defaultValue: 'Select which pipeline stages to display in the sales pipeline view. Only selected columns will be visible.'
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {statuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-row-reverse">
                <Checkbox
                  id={status.id}
                  checked={selectedColumns.includes(status.id)}
                  onCheckedChange={() => handleColumnToggle(status.id)}
                />
                <Label
                  htmlFor={status.id}
                  className="flex items-center gap-3 cursor-pointer text-right"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <div className="flex items-center gap-2 flex-row-reverse">
                    <span className="font-medium">
                      {t(`architect.opportunities.stages.${status.name}`) !== `architect.opportunities.stages.${status.name}`
                        ? t(`architect.opportunities.stages.${status.name}`)
                        : status.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    {status.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        {t('common.default')}
                      </Badge>
                    )}
                  </div>
                </Label>
              </div>
              <Badge variant="outline">
                {status.position}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground text-right">
            {selectedColumns.length} / {statuses.length} {t('architect.opportunities.columnsSelected', { defaultValue: 'columns selected' })}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('common.reset')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={selectedColumns.length === 0}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
