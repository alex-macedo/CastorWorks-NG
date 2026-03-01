import { supabase } from '@/integrations/supabase/client';

const CACHE_WARMING_KEY = 'cache-warming-completed';
const CACHE_WARMING_INTERVAL = 1000 * 60 * 60 * 24; // 24 hours

// Critical namespaces to preload
const CRITICAL_NAMESPACES = ['common', 'navigation'] as const;

/**
 * Warms up the service worker cache with critical data
 * This ensures instant loads on subsequent visits
 */
export const warmCache = async (): Promise<void> => {
  // Check if we've warmed the cache recently
  const lastWarmingTime = localStorage.getItem(CACHE_WARMING_KEY);
  if (lastWarmingTime) {
    const elapsed = Date.now() - parseInt(lastWarmingTime, 10);
    if (elapsed < CACHE_WARMING_INTERVAL) {
      console.log('[Cache Warming] Skipping - cache warmed recently');
      return;
    }
  }

  console.log('[Cache Warming] Starting cache warming...');
  const startTime = performance.now();

  try {
    // Warm critical translations
    await warmTranslations();
    
    // Warm config data
    await warmConfigData();
    
    // Mark warming as complete
    localStorage.setItem(CACHE_WARMING_KEY, Date.now().toString());
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`[Cache Warming] Completed in ${duration}ms`);
  } catch (error) {
    console.error('[Cache Warming] Failed:', error);
  }
};

/**
 * Preload critical translations into cache
 */
const warmTranslations = async (): Promise<void> => {
  // Warm the cache by making simple fetch requests
  // The service worker will cache these responses
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const promises = CRITICAL_NAMESPACES.map(async (namespace) => {
    try {
      const url = `${baseUrl}/rest/v1/translations?namespace=eq.${namespace}&select=key,value,language&limit=100`;
      await fetch(url, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        }
      });
    } catch (error) {
      console.warn(`[Cache Warming] Failed to warm ${namespace}:`, error);
    }
  });

  await Promise.all(promises);
  console.log('[Cache Warming] Translations cached');
};

/**
 * Preload config data into cache
 */
const warmConfigData = async (): Promise<void> => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  try {
    const tables = ['config_categories', 'config_values', 'config_translations'];
    const promises = tables.map(table => {
      const url = `${baseUrl}/rest/v1/${table}?select=*`;
      return fetch(url, {
        headers: {
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`
        }
      });
    });
    
    await Promise.all(promises);
    console.log('[Cache Warming] Config data cached');
  } catch (error) {
    console.warn('[Cache Warming] Failed to warm config data:', error);
  }
};

/**
 * Clear the cache warming timestamp to force re-warming
 */
export const clearCacheWarming = (): void => {
  localStorage.removeItem(CACHE_WARMING_KEY);
  console.log('[Cache Warming] Cache warming timestamp cleared');
};
