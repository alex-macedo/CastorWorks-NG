/**
 * Query-Specific Cache Strategies for Sprint 6 Optimization
 *
 * Provides optimized caching configurations for different data types based on:
 * - Data freshness requirements
 * - Update frequency
 * - Data size and importance
 */

export interface CacheStrategy {
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
  refetchInterval?: number | false;
  retry: number;
}

/**
 * Cache strategies for different data types
 */
export const CACHE_STRATEGIES = {
  /**
   * Real-time data - frequently updated, short cache
   * Examples: notifications, alerts, live status
   */
  REALTIME: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  } as CacheStrategy,

  /**
   * Dynamic data - updated occasionally, medium cache
   * Examples: project status, financial entries, purchase requests
   */
  DYNAMIC: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  } as CacheStrategy,

  /**
   * Semi-static data - rarely updated, long cache
   * Examples: user profile, project details, client info
   */
  SEMI_STATIC: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  } as CacheStrategy,

  /**
   * Static data - almost never updated, very long cache
   * Examples: config values, translations, seed data
   */
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  } as CacheStrategy,

  /**
   * Infinite cache - never becomes stale
   * Examples: historical data, archived records
   */
  INFINITE: {
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 0,
  } as CacheStrategy,
} as const;

/**
 * Query-specific cache configurations
 * Maps query keys to appropriate cache strategies
 */
export const QUERY_CACHE_CONFIG = {
  // User and authentication
  'current-user-profile': CACHE_STRATEGIES.SEMI_STATIC,
  'user-preferences': CACHE_STRATEGIES.SEMI_STATIC,

  // Configuration and static data
  'config-values': CACHE_STRATEGIES.STATIC,
  'translations': CACHE_STRATEGIES.STATIC,
  'seed-data-status': CACHE_STRATEGIES.SEMI_STATIC,

  // Projects - dynamic but not real-time
  'projects': CACHE_STRATEGIES.DYNAMIC,
  'project-details': CACHE_STRATEGIES.DYNAMIC,
  'project-phases': CACHE_STRATEGIES.DYNAMIC,

  // Financial - important but not real-time
  'financial-entries': CACHE_STRATEGIES.DYNAMIC,
  'financial-analytics': CACHE_STRATEGIES.DYNAMIC,

  // Procurement - moderate update frequency
  'purchase-requests': CACHE_STRATEGIES.DYNAMIC,
  'quotes': CACHE_STRATEGIES.DYNAMIC,
  'suppliers': CACHE_STRATEGIES.SEMI_STATIC,

  // Notifications and alerts - real-time
  'notifications': CACHE_STRATEGIES.REALTIME,
  'critical-alerts': CACHE_STRATEGIES.REALTIME,
  'expired-quotes': CACHE_STRATEGIES.DYNAMIC,

  // Schedule and tasks - moderate updates
  'schedule': CACHE_STRATEGIES.DYNAMIC,
  'tasks': CACHE_STRATEGIES.DYNAMIC,

  // Reports and analytics - can be cached longer
  'reports': CACHE_STRATEGIES.SEMI_STATIC,
  'dashboard-analytics': CACHE_STRATEGIES.DYNAMIC,

  // Service health - real-time monitoring
  'service-health': CACHE_STRATEGIES.REALTIME,

  // Weather - updates every 10 minutes
  'weather': {
    ...CACHE_STRATEGIES.DYNAMIC,
    staleTime: 10 * 60 * 1000,
  } as CacheStrategy,
} as const;

/**
 * Get cache strategy for a query key
 */
export function getCacheStrategy(queryKey: string | readonly any[]): CacheStrategy {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;

  // Check if we have a specific strategy for this query
  if (key in QUERY_CACHE_CONFIG) {
    return QUERY_CACHE_CONFIG[key as keyof typeof QUERY_CACHE_CONFIG];
  }

  // Default to dynamic strategy
  return CACHE_STRATEGIES.DYNAMIC;
}

/**
 * Helper to create query options with the appropriate cache strategy
 */
export function createQueryOptions<TData = unknown>(
  queryKey: string | readonly any[],
  overrides?: Partial<CacheStrategy>
) {
  const strategy = getCacheStrategy(queryKey);

  return {
    ...strategy,
    ...overrides,
  };
}

/**
 * Pagination configuration
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  LARGE_DATASET_THRESHOLD: 100, // Use virtualization above this
} as const;

/**
 * Helper to determine if dataset should use virtualization
 */
export function shouldUseVirtualization(itemCount: number): boolean {
  return itemCount > PAGINATION_CONFIG.LARGE_DATASET_THRESHOLD;
}
