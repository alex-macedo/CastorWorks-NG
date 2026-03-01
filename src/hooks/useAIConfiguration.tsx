/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * useAIConfiguration Hook
 *
 * Manages AI configuration settings for users and projects:
 * - Fetch current configuration
 * - Update configuration
 * - Toggle features
 * - Cache management
 * - Auto-refresh settings
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AIConfiguration {
  id?: string;
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

export const useAIConfiguration = (projectId?: string) => {
  const [config, setConfig] = useState<AIConfiguration>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch configuration on mount
  useEffect(() => {
    if (user) {
      fetchConfiguration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projectId]);

  const fetchConfiguration = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query based on scope
      let query = supabase
        .from('ai_configurations')
        .select('*')
        .eq('user_id', user.id);

      if (projectId) {
        // Try to get project-specific config first
        query = query.eq('project_id', projectId).eq('scope', 'project');
      } else {
        // Get user-level config
        query = query.eq('scope', 'user').is('project_id', null);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Parse JSONB fields
        setConfig({
          id: data.id,
          scope: data.scope,
          enabledFeatures: data.enabled_features || defaultConfig.enabledFeatures,
          preferences: data.preferences || defaultConfig.preferences,
          cacheDurationHours: data.cache_duration_hours || defaultConfig.cacheDurationHours,
          autoRefresh: data.auto_refresh ?? defaultConfig.autoRefresh,
        });
      } else {
        // No config found, use defaults
        setConfig({
          ...defaultConfig,
          scope: projectId ? 'project' : 'user',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch configuration';
      setError(errorMessage);
      console.error('Error fetching AI configuration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async (newConfig: AIConfiguration) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save configuration',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const configData = {
        user_id: user.id,
        project_id: projectId || null,
        scope: newConfig.scope,
        enabled_features: newConfig.enabledFeatures,
        preferences: newConfig.preferences,
        cache_duration_hours: newConfig.cacheDurationHours,
        auto_refresh: newConfig.autoRefresh,
      };

      let result;

      if (config.id) {
        // Update existing
        result = await supabase
          .from('ai_configurations')
          .update(configData)
          .eq('id', config.id)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('ai_configurations')
          .insert(configData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setConfig({
        ...newConfig,
        id: result.data.id,
      });

      toast({
        title: 'Configuration Saved',
        description: 'AI configuration updated successfully',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    }
  };

  const toggleFeature = async (featureName: string, enabled: boolean) => {
    const updatedConfig = {
      ...config,
      enabledFeatures: {
        ...config.enabledFeatures,
        [featureName]: enabled,
      },
    };

    const success = await saveConfiguration(updatedConfig);
    if (!success) {
      // Revert on failure
      fetchConfiguration();
    }
  };

  const updatePreference = async (key: string, value: any) => {
    const updatedConfig = {
      ...config,
      preferences: {
        ...config.preferences,
        [key]: value,
      },
    };

    const success = await saveConfiguration(updatedConfig);
    if (!success) {
      // Revert on failure
      fetchConfiguration();
    }
  };

  const isFeatureEnabled = (featureName: string): boolean => {
    return config.enabledFeatures[featureName as keyof typeof config.enabledFeatures] ?? true;
  };

  const resetToDefaults = async () => {
    const success = await saveConfiguration({
      ...defaultConfig,
      scope: projectId ? 'project' : 'user',
    });

    if (success) {
      toast({
        title: 'Reset Complete',
        description: 'AI configuration reset to defaults',
      });
    }
  };

  return {
    config,
    isLoading,
    error,
    saveConfiguration,
    toggleFeature,
    updatePreference,
    isFeatureEnabled,
    resetToDefaults,
    refreshConfiguration: fetchConfiguration,
  };
};