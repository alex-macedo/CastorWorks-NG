import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if the application is in maintenance mode
 * Checks both database settings and environment variable
 */
export const isMaintenanceMode = async (): Promise<boolean> => {
  // Check environment variable first for backward compatibility
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return true;
  }

  // Check database settings
  try {
    const { data, error } = await supabase
      .from("maintenance_settings")
      .select("enabled")
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;
    return data.enabled;
  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    return false;
  }
};

/**
 * Gets maintenance mode configuration from database
 */
export const getMaintenanceConfig = async () => {
  try {
    const { data, error } = await supabase
      .from("maintenance_settings")
      .select("*")
      .limit(1)
      .single();

    if (error || !data) {
      return {
        enabled: false,
        estimatedTime: import.meta.env.VITE_MAINTENANCE_ESTIMATED_TIME || "a few hours",
        contactEmail: import.meta.env.VITE_MAINTENANCE_CONTACT_EMAIL || "support@engproapp.com",
      };
    }

    return {
      enabled: data.enabled,
      estimatedTime: data.estimated_time || "a few hours",
      contactEmail: data.contact_email || "support@engproapp.com",
    };
  } catch (error) {
    console.error("Error getting maintenance config:", error);
    return {
      enabled: false,
      estimatedTime: "a few hours",
      contactEmail: "support@engproapp.com",
    };
  }
};
