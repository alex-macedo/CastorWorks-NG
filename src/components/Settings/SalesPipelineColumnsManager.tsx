import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useArchitectStatuses } from '@/hooks/useArchitectStatuses';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Loader2, Settings } from 'lucide-react';
import { RequireAdministrativeRoles } from '@/components/RoleGuard';

export function SalesPipelineColumnsManager() {
  const { t } = useLocalization();
  const { statuses, isLoading: statusesLoading } = useArchitectStatuses();
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings();
  
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get current visible columns from app settings
  const currentColumns = appSettings?.sales_pipeline_columns || null;
  
  const handleColumnToggle = async (statusId: string, isVisible: boolean) => {
    setIsUpdating(true);
    
    try {
      const allStatusIds = statuses?.map(s => s.id) || [];
      let newColumns: string[] | null;
      
      if (isVisible) {
        // Add column to visible list
        const current = currentColumns || allStatusIds;
        newColumns = [...current, statusId];
      } else {
        // Remove column from visible list
        const current = currentColumns || allStatusIds;
        newColumns = current.filter(id => id !== statusId);
      }
      
      // If all columns are selected, set to null (show all)
      const finalColumns = newColumns && newColumns.length === allStatusIds.length ? null : newColumns;
      
      await updateAppSettings.mutateAsync({
        sales_pipeline_columns: finalColumns
      });
    } catch (error) {
      console.error('Failed to update sales pipeline columns:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSelectAll = async () => {
    setIsUpdating(true);
    
    try {
      await updateAppSettings.mutateAsync({
        sales_pipeline_columns: null // Show all columns
      });
    } catch (error) {
      console.error('Failed to reset sales pipeline columns:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  if (statusesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  const allStatusIds = statuses?.map(s => s.id) || [];
  const visibleColumns = currentColumns || allStatusIds;
  const allVisible = visibleColumns.length === allStatusIds.length;
  
  return (
    <RequireAdministrativeRoles>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>{t('settings.salesPipelineColumns.title')}</CardTitle>
            </div>
            {!allVisible && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                disabled={isUpdating}
              >
                {t('settings.salesPipelineColumns.selectAll')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('settings.salesPipelineColumns.description')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {statuses?.map((status) => {
              const isVisible = visibleColumns.includes(status.id);
              return (
                <div 
                  key={status.id} 
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`pipeline-column-${status.id}`}
                    checked={isVisible}
                    onCheckedChange={(checked) => 
                      handleColumnToggle(status.id, checked as boolean)
                    }
                    disabled={isUpdating}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <Label 
                      htmlFor={`pipeline-column-${status.id}`}
                      className="text-sm font-medium cursor-pointer truncate"
                    >
                      {t(`architect.opportunities.stages.${status.name}`) !== `architect.opportunities.stages.${status.name}`
                        ? t(`architect.opportunities.stages.${status.name}`)
                        : status.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>
              {t('settings.salesPipelineColumns.visibleCount', {
                visible: visibleColumns.length,
                total: allStatusIds.length
              })}
            </span>
            {isUpdating && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{t('settings.salesPipelineColumns.updating')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </RequireAdministrativeRoles>
  );
}
