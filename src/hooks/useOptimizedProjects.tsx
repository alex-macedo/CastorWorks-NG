import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createQueryOptions, PAGINATION_CONFIG } from "@/utils/queryCacheStrategies";
import { trackQueryPerformance } from "@/utils/performanceMonitoring";
import { useState } from "react";
import { isProjectScheduleStatus, useCentralScheduleStatus } from "@/types/projectScheduleStatus";

/**
 * Optimized version of useProjects with:
 * - Server-side pagination with limits
 * - Optimized cache strategy
 * - Performance tracking
 */
export function useOptimizedProjects(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  includePhases?: boolean;
}) {
  const {
    limit = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    offset = 0,
    status,
    includePhases = false,
  } = options || {};

  const query = useQuery({
    queryKey: ['projects', { limit, offset, status, includePhases }],
    queryFn: async () => {
      const startTime = performance.now();
      let queryBuilder = supabase
        .from('projects')
        .select(
          includePhases
            ? `*, project_phases(progress_percentage, budget_spent)`
            : '*',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        if (useCentralScheduleStatus && isProjectScheduleStatus(status)) {
          queryBuilder = queryBuilder.eq('schedule_status', status);
        } else {
          queryBuilder = queryBuilder.eq('status', status);
        }
      }

      const { data, error, count } = await queryBuilder;

      // Track query performance
      const duration = performance.now() - startTime;
      trackQueryPerformance('projects', duration);

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        hasMore: count ? offset + limit < count : false,
      };
    },
    ...createQueryOptions('projects'),
  });

  return query;
}

/**
 * Hook for paginated projects with automatic page management
 */
export function usePaginatedProjects(pageSize: number = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);

  const offset = page * pageSize;

  const query = useOptimizedProjects({
    limit: pageSize,
    offset,
  });

  const totalPages = query.data?.count
    ? Math.ceil(query.data.count / pageSize)
    : 0;

  const nextPage = () => {
    if (query.data?.hasMore) {
      setPage(p => p + 1);
    }
  };

  const previousPage = () => {
    if (page > 0) {
      setPage(p => p - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setPage(pageNumber);
    }
  };

  return {
    ...query,
    page,
    totalPages,
    nextPage,
    previousPage,
    goToPage,
    hasNextPage: query.data?.hasMore || false,
    hasPreviousPage: page > 0,
  };
}
