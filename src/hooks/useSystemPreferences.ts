/**
 * System Preferences Hook
 *
 * Fetches system-wide preferences from app_settings table.
 * These are global settings that apply to all users.
 *
 * @example
 * ```typescript
 * const { system_date_format, isLoading } = useSystemPreferences();
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemPreferences {
  system_language: string;
  system_currency: string;
  system_date_format: string;
  system_time_zone: string;
  system_weather_location: string;
  system_temperature_unit: string;
  system_number_format: string;
}

export const useSystemPreferences = () => {
  return useQuery({
    queryKey: ['system-preferences'],
    queryFn: async (): Promise<SystemPreferences> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select(`
          system_language,
          system_currency,
          system_date_format,
          system_time_zone,
          system_weather_location,
          system_temperature_unit,
          system_number_format
        `)
        .single();

      if (error) {
        console.error('Error fetching system preferences:', error);
        // Return defaults if fetch fails
        return {
          system_language: 'en-US',
          system_currency: 'USD',
          system_date_format: 'MM/DD/YYYY',
          system_time_zone: 'America/New_York',
          system_weather_location: 'New York, USA',
          system_temperature_unit: 'F',
          system_number_format: 'compact',
        };
      }

      // Ensure we have defaults for any missing values
      return {
        system_language: data.system_language || 'en-US',
        system_currency: data.system_currency || 'USD',
        system_date_format: data.system_date_format || 'MM/DD/YYYY',
        system_time_zone: data.system_time_zone || 'America/New_York',
        system_weather_location: data.system_weather_location || 'New York, USA',
        system_temperature_unit: data.system_temperature_unit || 'F',
        system_number_format: data.system_number_format || 'compact',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};