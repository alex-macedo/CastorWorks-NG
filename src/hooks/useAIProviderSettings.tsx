import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types matching the database schema
export interface AIProviderConfig {
  id: string;
  provider_name: 'anthropic' | 'openai' | 'ollama' | 'openrouter';
  is_enabled: boolean;
  api_endpoint: string;
  api_key_encrypted: string | null;
  default_model: string;
  max_tokens: number;
  temperature: number;
  config_json: Record<string, any>;
  priority_order: number;
  created_at: string;
  updated_at: string;
}

export interface AIProviderUpdate {
  id: string;
  is_enabled?: boolean;
  api_endpoint?: string;
  api_key_encrypted?: string | null;
  default_model?: string;
  max_tokens?: number;
  temperature?: number;
  priority_order?: number;
  config_json?: Record<string, any>;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency?: number;
}

/**
 * Hook for managing AI provider configurations
 * Provides queries and mutations for CRUD operations on ai_provider_configs
 */
export const useAIProviderSettings = () => {
  const queryClient = useQueryClient();

  // Query: Fetch all AI provider configs
  const {
    data: providers,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ai-provider-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('Error fetching AI provider configs:', error);
        throw error;
      }

      return data as AIProviderConfig[];
    },
  });

  // Query: Fetch app settings for AI configuration
  const { data: appSettings } = useQuery({
    queryKey: ['app-settings-ai'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('ai_default_provider, ai_fallback_chain, ai_cache_ttl_hours')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching app settings:', error);
        throw error;
      }

      return data;
    },
  });

  // Mutation: Update AI provider configuration
  const updateProvider = useMutation({
    mutationFn: async (updates: AIProviderUpdate) => {
      const { id, ...updateData } = updates;

      // Filter out undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating AI provider:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
      toast.success(`Provider ${data.provider_name} updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update provider: ${error.message}`);
    },
  });

  // Mutation: Update app-level AI settings
  const updateAppAISettings = useMutation({
    mutationFn: async (updates: {
      ai_default_provider?: string;
      ai_fallback_chain?: string[];
      ai_cache_ttl_hours?: number;
    }) => {
      // Get the current settings ID
      const { data: current } = await supabase
        .from('app_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!current?.id) {
        throw new Error('App settings not found');
      }

      const { data, error } = await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating app AI settings:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-ai'] });
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('AI settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update AI settings: ${error.message}`);
    },
  });

  // Mutation: Bulk update provider priorities
  const reorderProviders = useMutation({
    mutationFn: async (newOrder: { id: string; priority_order: number }[]) => {
      const promises = newOrder.map(item => 
        supabase
          .from('ai_provider_configs')
          .update({ priority_order: item.priority_order })
          .eq('id', item.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error).map(r => r.error);

      if (errors.length > 0) {
        console.error('Errors reordering providers:', errors);
        throw new Error('Failed to update some provider priorities');
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-provider-configs'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder providers: ${error.message}`);
    },
  });

  // Test connection to a specific provider
  const testConnection = async (providerName: string): Promise<TestConnectionResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('test-ai-provider', {
        body: { providerName },
      });

      // If the Edge Function returned an error (4xx/5xx)
      if (error) {
        console.error('Edge Function returned error:', error);
        
        // Try to parse the error message if it's a JSON string
        let errorMessage = error.message || 'Connection test failed';
        
        if (errorMessage.includes('Edge Function returned a non-2xx status code')) {
          errorMessage = 'The connection test failed due to a server error. This usually happens if the API key is invalid or the provider is unreachable.';
        }

        return {
          success: false,
          message: errorMessage,
        };
      }

      // If the function logic reported a failure (but returned 200 OK)
      if (data && data.success === false) {
        return data as TestConnectionResult;
      }

      return data as TestConnectionResult;
    } catch (error) {
      console.error('Test connection exception:', error);
      return {
        success: false,
        message: 'Unable to reach the server. Please check your internet connection and try again.',
      };
    }
  };

  // Helper: Get enabled providers
  const enabledProviders = providers?.filter(p => p.is_enabled) || [];

  // Helper: Get provider by name
  const getProviderByName = (name: string) => {
    return providers?.find(p => p.provider_name === name);
  };

  // Helper: Get default provider
  const defaultProvider = appSettings?.ai_default_provider || 'anthropic';

  // Helper: Get fallback chain
  const fallbackChain = appSettings?.ai_fallback_chain || ['anthropic', 'openai'];

  // Helper: Get cache TTL
  const cacheTTL = appSettings?.ai_cache_ttl_hours || 6;

  return {
    // Data
    providers,
    enabledProviders,
    defaultProvider,
    fallbackChain,
    cacheTTL,

    // State
    isLoading,
    error,

    // Actions
    updateProvider,
    updateAppAISettings,
    reorderProviders,
    testConnection,
    refetch,

    // Helpers
    getProviderByName,
  };
};
