import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useClientDefinitions,
  useDefinitionStatusCounts,
  useOverdueDefinitions,
} from '../useClientDefinitions'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/integrations/supabase/client'

const mockSupabase = supabase as unknown as { from: ReturnType<typeof vi.fn> }

function createMockBuilder<T>(data: T[], error: Error | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
}

function createMockBuilderWithoutOrder<T>(data: T[], error: Error | null = null) {
  const result = { data, error }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  }
}

describe('useClientDefinitions', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  describe('useClientDefinitions', () => {
    it('fetches definitions for a project and maps rows correctly', async () => {
      const today = new Date().toISOString().split('T')[0]
      const mockRows = [
        {
          id: 'cd1',
          project_id: 'p1',
          milestone_id: null,
          definition_item: 'Floor tile selection',
          description: 'Client to choose tiles',
          required_by_date: today,
          status: 'pending',
          assigned_client_contact: 'John Smith',
          impact_score: 50,
          completion_date: null,
          notes: null,
          follow_up_history: [],
          created_by: 'u1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]
      const builder = createMockBuilder(mockRows)
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(() => useClientDefinitions('p1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0]).toMatchObject({
        id: 'cd1',
        projectId: 'p1',
        definitionItem: 'Floor tile selection',
        status: 'pending',
        impactScore: 50,
      })
    })

    it('returns empty array when projectId is undefined', async () => {
      const { result } = renderHook(() => useClientDefinitions(undefined), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useDefinitionStatusCounts', () => {
    it('computes status and date-based overdue counts', async () => {
      const pastDate = '2025-01-01'
      const futureDate = '2027-01-01'
      const mockRows = [
        { status: 'pending', required_by_date: pastDate },
        { status: 'in_progress', required_by_date: pastDate },
        { status: 'overdue', required_by_date: pastDate },
        { status: 'completed', required_by_date: pastDate },
        { status: 'blocking', required_by_date: futureDate },
      ]
      const builder = createMockBuilderWithoutOrder(mockRows)
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(
        () => useDefinitionStatusCounts('p1'),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toMatchObject({
        total: 5,
        pending: 2,
        overdue: 3,
        completed: 1,
        blocking: 1,
      })
    })

    it('does not fetch when projectId is undefined', () => {
      const { result } = renderHook(
        () => useDefinitionStatusCounts(undefined),
        { wrapper }
      )

      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useOverdueDefinitions', () => {
    it('fetches overdue definitions across accessible projects', async () => {
      const mockRows = [
        {
          id: 'cd1',
          project_id: 'p1',
          milestone_id: null,
          definition_item: 'Overdue item',
          description: null,
          required_by_date: '2025-01-01',
          status: 'pending',
          assigned_client_contact: null,
          impact_score: 80,
          completion_date: null,
          notes: null,
          follow_up_history: [],
          created_by: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]
      const builder = createMockBuilder(mockRows)
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(() => useOverdueDefinitions(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0]).toMatchObject({
        id: 'cd1',
        definitionItem: 'Overdue item',
        impactScore: 80,
      })
    })
  })
})
