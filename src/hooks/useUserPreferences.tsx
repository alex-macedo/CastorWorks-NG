import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ThemePreference = "light" | "dark" | "system";

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

const isThemePreference = (value: string | null | undefined): value is ThemePreference => {
  return value === "light" || value === "dark" || value === "system";
};

const getInitialThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = localStorage.getItem("theme");
  if (isThemePreference(storedTheme)) {
    return storedTheme;
  }

  return "system";
};

// PHASE 4: localStorage cache keys
const CACHE_KEY = 'user-preferences-cache';
const CACHE_TIMESTAMP_KEY = 'user-preferences-cache-timestamp';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

const getCachedPreferences = (): UserPreferences | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_MAX_AGE) {
      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (e) {
    console.error('Failed to read cached preferences:', e);
    return null;
  }
};

const setCachedPreferences = (preferences: UserPreferences) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(preferences));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.error('Failed to cache preferences:', e);
  }
};

export const useUserPreferences = () => {
  // console.log('[useUserPreferences] Hook initialized');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      // console.log('[Query] Fetching user preferences');
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no preferences exist, migrate from localStorage
      if (!data) {
        const localSettings = localStorage.getItem('localization-settings');
        const themePreference = getInitialThemePreference();
        let initialPrefs: any = { user_id: user.id, theme: themePreference };

        if (localSettings) {
          try {
            const parsed = JSON.parse(localSettings);
            initialPrefs = {
              user_id: user.id,
              language: parsed.language || 'en-US',
              currency: parsed.currency || 'USD',
              theme: isThemePreference(parsed.theme) ? parsed.theme : themePreference,
            };
            if (parsed.dateFormat) {
              initialPrefs.date_format = parsed.dateFormat;
            }
          } catch (e) {
            console.error('Failed to parse localStorage settings:', e);
          }
        } else {
          // No localStorage, use English defaults
          initialPrefs = {
            user_id: user.id,
            language: 'en-US',
            currency: 'USD',
            theme: themePreference,
          };
        }
        
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert(initialPrefs)
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // Cache the new preferences
        setCachedPreferences(newPrefs);
        return newPrefs;
      }
      
      // Cache the fetched preferences
      setCachedPreferences(data);
      return data;
    },
    // PHASE 4: Optimized cache settings for user preferences
    staleTime: 10 * 60 * 1000, // 10 minutes - rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Use cached data as initial data for instant display
    initialData: () => getCachedPreferences() || undefined,
    initialDataUpdatedAt: () => {
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp) : 0;
    },
    // Track query success/failure
    onSuccess: (data) => {
      // console.log('[Query.onSuccess] Preferences loaded:', data);
      const cachedData = queryClient.getQueryData(['user-preferences']);
      // console.log('[Query.onSuccess] Verifying cache - current value:', cachedData);
    },
    onError: (error: Error) => {
      console.error('[Query.onError] Failed to load preferences:', error.message);
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: UserPreferencesUpdate) => {
      // console.log('[Mutation] Starting with updates:', updates);
      if (!preferences?.id) throw new Error('Preferences not loaded');
      
      // Get current user to filter by user_id (required for RLS policy)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // console.log('[Mutation] Updating preferences for user:', user.id);
      // Perform the update without expecting data back (RLS may block SELECT after UPDATE)
      const { error } = await supabase
        .from('user_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', preferences.id)
        .eq('user_id', user.id);
      
      if (error) {
        // console.error('[Mutation] Error updating:', error);
        throw error;
      }
      
      // console.log('[Mutation] Supabase update successful, creating optimistic data');
      // Optimistically create the updated preferences object
      const updatedPreferences = {
        ...preferences,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      // Also update localStorage for backward compatibility
      const localSettings = localStorage.getItem('localization-settings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          const updated = { ...parsed };

          if (updates.language) updated.language = updates.language;
          if (updates.currency) updated.currency = updates.currency;
          if (updates.date_format) updated.dateFormat = updates.date_format;

          localStorage.setItem('localization-settings', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to update localStorage:', e);
        }
      }

      if (updates.theme && typeof window !== 'undefined') {
        localStorage.setItem('theme', updates.theme);
      }

      // Update cache immediately with merged data
      setCachedPreferences(updatedPreferences);
      return updatedPreferences;
    },
    onSuccess: (data) => {
      // console.log('[Mutation.onSuccess] Received data:', data);
      // console.log('[Mutation.onSuccess] Setting cache with key: ["user-preferences"]');
      queryClient.setQueryData(['user-preferences'], data);
      // console.log('[Mutation.onSuccess] Cache updated successfully');
      
      // Log the cache state to verify it was updated
      const cachedData = queryClient.getQueryData(['user-preferences']);
      // console.log('[Mutation.onSuccess] Verifying cache - current value:', cachedData);
      
      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      });
    },
    onError: (error: Error) => {
      // console.error('[Mutation.onError] Error occurred:', error.message);
      // Don't show toast for "Preferences not loaded" - this is expected when user isn't authenticated yet
      if (error.message === 'Preferences not loaded') {
        // console.log('[Mutation.onError] Suppressing toast - preferences not loaded');
        return;
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // console.log('[useUserPreferences] Returning - preferences:', preferences, 'isLoading:', isLoading);
  return useMemo(() => ({
    preferences,
    isLoading,
    updatePreferences,
  }), [preferences, isLoading, updatePreferences]);
};
