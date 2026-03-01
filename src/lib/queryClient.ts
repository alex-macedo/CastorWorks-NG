import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Cache duration constants (in milliseconds)
 */
export const CACHE_DURATIONS = {
  STATIC: 24 * 60 * 60 * 1000, // 24 hours - rarely changing data (config, settings)
  USER: 60 * 60 * 1000, // 1 hour - user profile data
  PROJECTS: 5 * 60 * 1000, // 5 minutes - project data (moderately changing)
  FINANCIALS: 1 * 60 * 1000, // 1 minute - financial data (frequently changing)
  REAL_TIME: 0, // Immediate - no cache for real-time data
} as const;

/**
 * Stale time constants (in milliseconds)
 * Time before cached data is considered "stale" and re-fetched
 */
export const STALE_TIMES = {
  STATIC: CACHE_DURATIONS.STATIC,
  USER: 30 * 60 * 1000, // 30 minutes
  PROJECTS: 2 * 60 * 1000, // 2 minutes
  FINANCIALS: 30 * 1000, // 30 seconds
  REAL_TIME: 0, // Always stale
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Default options for all queries
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Cache management
    gcTime: CACHE_DURATIONS.PROJECTS, // Default cache duration
    staleTime: STALE_TIMES.PROJECTS, // Default stale time

    // Retry strategy
    retry: RETRY_CONFIG.maxRetries,
    retryDelay: RETRY_CONFIG.delay,

    // Refetch behavior
    refetchOnWindowFocus: 'stale', // Only refetch if data is stale
    refetchOnReconnect: 'stale',
    refetchOnMount: 'stale',

    // Request behavior
    throwOnError: false, // Handle errors without throwing
  },
  mutations: {
    // Retry on mutation failure
    retry: 1,
    retryDelay: 1000,
    throwOnError: false,
  },
};

/**
 * Create and configure the QueryClient instance
 */
export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions,
  });
};

/**
 * Get cache configuration for a specific data type
 *
 * @example
 * const cacheConfig = getCacheConfig('PROJECTS');
 * const { data } = useQuery({
 *   queryKey: ['projects'],
 *   queryFn: () => fetchProjects(),
 *   ...cacheConfig,
 * });
 */
export function getCacheConfig(
  type: 'STATIC' | 'USER' | 'PROJECTS' | 'FINANCIALS' | 'REAL_TIME'
) {
  const config = {
    STATIC: {
      gcTime: CACHE_DURATIONS.STATIC,
      staleTime: STALE_TIMES.STATIC,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    USER: {
      gcTime: CACHE_DURATIONS.USER,
      staleTime: STALE_TIMES.USER,
      refetchOnWindowFocus: 'stale',
      refetchOnReconnect: true,
    },
    PROJECTS: {
      gcTime: CACHE_DURATIONS.PROJECTS,
      staleTime: STALE_TIMES.PROJECTS,
      refetchOnWindowFocus: 'stale',
      refetchOnReconnect: true,
    },
    FINANCIALS: {
      gcTime: CACHE_DURATIONS.FINANCIALS,
      staleTime: STALE_TIMES.FINANCIALS,
      refetchOnWindowFocus: 'stale',
      refetchOnReconnect: true,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
    REAL_TIME: {
      gcTime: 0,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  };

  return config[type];
}

/**
 * Invalidate cache for a specific query type
 *
 * @example
 * invalidateCacheByType(queryClient, 'PROJECTS');
 */
export function invalidateCacheByType(
  queryClient: QueryClient,
  type: 'STATIC' | 'USER' | 'PROJECTS' | 'FINANCIALS' | 'REAL_TIME'
) {
  // This would be called with specific query keys
  // Actual implementation depends on your query key structure
  return queryClient.invalidateQueries({
    predicate: (query) => {
      // You can customize this based on your query key structure
      return true;
    },
  });
}
