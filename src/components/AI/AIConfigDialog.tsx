/**
 * AIConfigDialog - AI Configuration Settings Dialog
 *
 * Allows users to configure AI features and preferences:
 * - Toggle AI features on/off
 * - Set confidence thresholds
 * - Configure notification preferences
 * - Set cache duration
 * - Enable/disable auto-refresh
 * - Saves to ai_configurations table
 */

import React, { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIConfiguration {
  scope: 'global' | 'project' | 'user';
  enabledFeatures: {
    budget_insights?: boolean;
    budget_risk_assessment?: boolean;
    cost_prediction?: boolean;
    schedule_optimization?: boolean;
    delay_prediction?: boolean;
    material_analysis?: boolean;
    procurement_recommendations?: boolean;
    quality_inspection?: boolean;
    safety_scanning?: boolean;
    financial_anomaly_detection?: boolean;
  };
  preferences: {
    notification_frequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'disabled';
    confidence_threshold?: number;
    auto_apply_low_risk?: boolean;
    show_similar_projects?: boolean;
    language?: string;
  };
  cacheDurationHours?: number;
  autoRefresh?: boolean;
}

export interface AIConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope?: 'global' | 'project' | 'user';
  projectId?: string;
  currentConfig?: AIConfiguration;
  onSave: (config: AIConfiguration) => void;
  className?: string;
}

const defaultConfig: AIConfiguration = {
  scope: 'user',
  enabledFeatures: {
    budget_insights: true,
    budget_risk_assessment: true,
    cost_prediction: true,
    schedule_optimization: true,
    delay_prediction: true,
    material_analysis: true,
    procurement_recommendations: true,
    quality_inspection: true,
    safety_scanning: true,
    financial_anomaly_detection: true,
  },
  preferences: {
    notification_frequency: 'daily',
    confidence_threshold: 70,
    auto_apply_low_risk: false,
    show_similar_projects: true,
    language: 'en',
  },
  cacheDurationHours: 6,
  autoRefresh: true,
};

const featureKeys = [
  'budget_insights',
  'budget_risk_assessment',
  'cost_prediction',
  'schedule_optimization',
  'delay_prediction',
  'material_analysis',
  'procurement_recommendations',
  'quality_inspection',
  'safety_scanning',
  'financial_anomaly_detection',
];

export const AIConfigDialog: React.FC<AIConfigDialogProps> = ({
  open,
  onOpenChange,
  scope = 'user',
  projectId,
  currentConfig,
  onSave,
  className,
}) => {
  const [config, setConfig] = useState<AIConfiguration>(() =>
    currentConfig || { ...defaultConfig, scope }
  );
  const [hasChanges, setHasChanges] = useState(false);
  const { t } = useLocalization();

  // Reset config when dialog opens or currentConfig changes
  useEffect(() => {
    if (open && currentConfig) {
      setConfig(currentConfig);
       
      setHasChanges(false);
    } else if (open && !currentConfig) {
       
      setConfig({ ...defaultConfig, scope });
       
      setHasChanges(false);
    }
  }, [open, currentConfig, scope]);

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      enabledFeatures: {
        ...prev.enabledFeatures,
        [feature]: enabled,
      },
    }));
    setHasChanges(true);
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleCacheDurationChange = (value: number[]) => {
    setConfig((prev) => ({
      ...prev,
      cacheDurationHours: value[0],
    }));
    setHasChanges(true);
  };

  const handleAutoRefreshToggle = (enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      autoRefresh: enabled,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(config);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleReset = () => {
    setConfig({ ...defaultConfig, scope });
    setHasChanges(true);
  };

  const enabledCount = Object.values(config.enabledFeatures).filter(Boolean).length;
  const totalFeatures = Object.keys(config.enabledFeatures).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto', className)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.aiConfigDialog.title')}
            <Badge variant="secondary">{scope}</Badge>
          </SheetTitle>
          <SheetDescription>
            {scope === 'project'
              ? t('settings.aiConfigDialog.descriptionProject')
              : t('settings.aiConfigDialog.descriptionUser')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Feature Toggles */}
          <div>
              <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{t('settings.aiConfigDialog.featuresTitle')}</h3>
              <Badge variant="outline">
                {enabledCount} of {totalFeatures} enabled
              </Badge>
            </div>
            <div className="space-y-3">
              {featureKeys.map((key) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                      {t(`settings.aiConfigDialog.features.${key}.label`)}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t(`settings.aiConfigDialog.features.${key}.description`)}</p>
                  </div>
                  <Switch
                    id={key}
                    checked={config.enabledFeatures[key as keyof typeof config.enabledFeatures] ?? true}
                    onCheckedChange={(checked) => handleFeatureToggle(key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('settings.aiConfigDialog.preferencesTitle')}</h3>

            {/* Confidence Threshold */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('settings.aiConfigDialog.confidenceThresholdLabel')}</Label>
                <span className="text-sm font-medium">
                  {config.preferences.confidence_threshold}%
                </span>
              </div>
              <Slider
                value={[config.preferences.confidence_threshold || 70]}
                onValueChange={(value) => handlePreferenceChange('confidence_threshold', value[0])}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.aiConfigDialog.confidenceThresholdHelp')}
              </p>
            </div>

            {/* Notification Frequency */}
            <div className="space-y-2">
              <Label className="text-sm">{t('settings.aiConfigDialog.notificationFrequencyLabel')}</Label>
              <Select
                value={config.preferences.notification_frequency || 'daily'}
                onValueChange={(value) => handlePreferenceChange('notification_frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">{t('settings.aiConfigDialog.notificationOptions.realtime')}</SelectItem>
                  <SelectItem value="hourly">{t('settings.aiConfigDialog.notificationOptions.hourly')}</SelectItem>
                  <SelectItem value="daily">{t('settings.aiConfigDialog.notificationOptions.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('settings.aiConfigDialog.notificationOptions.weekly')}</SelectItem>
                  <SelectItem value="disabled">{t('settings.aiConfigDialog.notificationOptions.disabled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto-apply low risk */}
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-apply" className="text-sm font-medium cursor-pointer">
                  {t('settings.aiConfigDialog.autoApplyLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.aiConfigDialog.autoApplyHelp')}
                </p>
              </div>
              <Switch
                id="auto-apply"
                checked={config.preferences.auto_apply_low_risk || false}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('auto_apply_low_risk', checked)
                }
              />
            </div>

            {/* Show similar projects */}
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="similar-projects" className="text-sm font-medium cursor-pointer">
                  {t('settings.aiConfigDialog.showSimilarLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.aiConfigDialog.showSimilarHelp')}
                </p>
              </div>
              <Switch
                id="similar-projects"
                checked={config.preferences.show_similar_projects ?? true}
                onCheckedChange={(checked) =>
                  handlePreferenceChange('show_similar_projects', checked)
                }
              />
            </div>
          </div>

          <Separator />

          {/* Cache Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t('settings.aiConfigDialog.cacheSettingsTitle')}</h3>

            {/* Cache Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('settings.aiConfigDialog.cacheDurationLabel')}</Label>
                <span className="text-sm font-medium">
                  {config.cacheDurationHours} hours
                </span>
              </div>
              <Slider
                value={[config.cacheDurationHours || 6]}
                onValueChange={handleCacheDurationChange}
                min={1}
                max={168}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.aiConfigDialog.cacheDurationHelp')}
              </p>
            </div>

            {/* Auto-refresh */}
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor="auto-refresh" className="text-sm font-medium cursor-pointer">
                  {t('settings.aiConfigDialog.autoRefreshLabel')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('settings.aiConfigDialog.autoRefreshHelp')}
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={config.autoRefresh ?? true}
                onCheckedChange={handleAutoRefreshToggle}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('settings.aiConfigDialog.resetButton')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
            <Save className="h-4 w-4" />
            {t('settings.aiConfigDialog.saveButton')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
