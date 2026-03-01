import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useArchitectStatuses } from '@/hooks/useArchitectStatuses';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Columns, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ColumnConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColumnConfiguration = ({ isOpen, onClose }: ColumnConfigurationProps) => {
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
          onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-2xl m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            {t('architect.opportunities.configureColumns', { defaultValue: 'Configure Columns' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {t('architect.opportunities.configureColumnsDescription', {
              defaultValue: 'Select which pipeline stages to display in the sales pipeline view. Only selected columns will be visible.'
            })}
          </p>

          <div className="space-y-3">
            {statuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={status.id}
                    checked={selectedColumns.includes(status.id)}
                    onCheckedChange={() => handleColumnToggle(status.id)}
                  />
                  <Label
                    htmlFor={status.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
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
                  </Label>
                </div>
                <Badge variant="outline">
                  {status.position}
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedColumns.length} of {statuses.length} columns selected
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
              >
                {t('common.reset')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={selectedColumns.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};