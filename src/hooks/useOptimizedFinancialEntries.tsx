import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createQueryOptions, PAGINATION_CONFIG } from "@/utils/queryCacheStrategies";
import { trackQueryPerformance } from "@/utils/performanceMonitoring";
import { useState } from "react";

/**
 * Optimized version of useFinancialEntries with:
 * - Server-side pagination
 * - Optimized cache strategy
 * - Performance tracking
 * - Filtered queries
 */
export function useOptimizedFinancialEntries(options?: {
  limit?: number;
  offset?: number;
  projectId?: string;
  entryType?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
}) {
  const {
    limit = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    offset = 0,
    projectId,
    entryType,
    startDate,
    endDate,
  } = options || {};

  const queryClient = useQueryClient();

  // Fetch entries with optimized query
  const query = useQuery({
    queryKey: ['financial-entries', { limit, offset, projectId, entryType, startDate, endDate }],
    queryFn: async () => {
      const startTime = performance.now();
      let queryBuilder = supabase
        .from('financial_entries')
        .select(`
          *,
          projects(name)
        `, { count: 'exact' })
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (projectId) {
        queryBuilder = queryBuilder.eq('project_id', projectId);
      }

      if (entryType) {
        queryBuilder = queryBuilder.eq('entry_type', entryType);
      }

      if (startDate) {
        queryBuilder = queryBuilder.gte('date', startDate);
      }

      if (endDate) {
        queryBuilder = queryBuilder.lte('date', endDate);
      }

      const { data, error, count } = await queryBuilder;

      // Track query performance
      const duration = performance.now() - startTime;
      trackQueryPerformance('financial-entries', duration);

      if (error) throw error;

      // Calculate running balance
      let balance = 0;
      const entriesWithBalance = (data || []).map(entry => {
        if (entry.entry_type === 'income') {
          balance += Number(entry.amount);
        } else {
          balance -= Number(entry.amount);
        }
        return {
          ...entry,
          balance,
        };
      });

      return {
        data: entriesWithBalance,
        count: count || 0,
        hasMore: count ? offset + limit < count : false,
      };
    },
    ...createQueryOptions('financial-entries'),
  });

  // Delete entry mutation
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries'] });
    },
  });

  return {
    ...query,
    deleteEntry,
  };
}

/**
 * Hook for paginated financial entries with automatic page management
 */
export function usePaginatedFinancialEntries(
  pageSize: number = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
  filters?: {
    projectId?: string;
    entryType?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
  }
) {
  const [page, setPage] = useState(0);

  const offset = page * pageSize;

  const query = useOptimizedFinancialEntries({
    limit: pageSize,
    offset,
    ...filters,
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
