import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useDelays,
  useProjectDelays,
  useCreateDelay,
  useUpdateDelay,
  useDelayCountByMilestone,
} from '../useDelayDocumentation'

const mockFrom = vi.hoisted(() => vi.fn())
const mockAuthGetSession = vi.hoisted(() => vi.fn())

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
  },
}))

const mockSupabase = {
  from: mockFrom,
  auth: { getSession: mockAuthGetSession },
}

vi.mock('@/hooks/useRecalculateTimeline', () => ({
  useRecalculateTimeline: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: () => ({ t: (k: string) => k }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function createMockBuilder<T>(data: T[], error: Error | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
}

function createMockInsertBuilder<T>(data: T, error: Error | null = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

function createMockUpdateBuilder<T>(data: T, error: Error | null = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('useDelayDocumentation', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  describe('useDelays', () => {
    it('fetches delays for a milestone and maps rows correctly', async () => {
      const mockRows = [
        {
          id: 'd1',
          milestone_id: 'm1',
          project_id: 'p1',
          delay_days: 5,
          root_cause: 'material',
          responsible_party: 'subcontractor',
          impact_type: 'isolated',
          description: 'Test delay',
          corrective_actions: null,
          subcontractor_trade: 'Electrical',
          reported_by: 'u1',
          reported_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]
      const builder = createMockBuilder(mockRows)
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(() => useDelays('m1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0]).toMatchObject({
        id: 'd1',
        milestoneId: 'm1',
        projectId: 'p1',
        delayDays: 5,
        rootCause: 'material',
        responsibleParty: 'subcontractor',
        impactType: 'isolated',
        description: 'Test delay',
        subcontractorTrade: 'Electrical',
      })
    })

    it('returns empty when milestoneId is undefined (query disabled)', () => {
      const { result } = renderHook(() => useDelays(undefined), { wrapper })
      expect(result.current.isFetching).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('useProjectDelays', () => {
    it('fetches delays for a project', async () => {
      const mockRows: Record<string, unknown>[] = []
      const builder = createMockBuilder(mockRows)
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(() => useProjectDelays('p1'), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('milestone_delays')
    })
  })

  describe('useCreateDelay', () => {
    it('inserts delay and invalidates queries', async () => {
      vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      } as never)
      const insertedRow = {
        id: 'new-id',
        milestone_id: 'm1',
        project_id: 'p1',
        delay_days: 3,
        root_cause: 'weather',
        responsible_party: 'force_majeure',
        impact_type: 'critical_path',
        description: 'Heavy rain',
        corrective_actions: null,
        subcontractor_trade: null,
        reported_by: 'user-1',
        reported_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      const insertBuilder = createMockInsertBuilder(insertedRow)
      vi.mocked(mockSupabase.from).mockReturnValue(insertBuilder as never)

      const { result } = renderHook(() => useCreateDelay(), { wrapper })

      result.current.mutate({
        milestoneId: 'm1',
        projectId: 'p1',
        delayDays: 3,
        rootCause: 'weather',
        responsibleParty: 'force_majeure',
        impactType: 'critical_path',
        description: 'Heavy rain delayed excavation',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          milestone_id: 'm1',
          project_id: 'p1',
          delay_days: 3,
          root_cause: 'weather',
          responsible_party: 'force_majeure',
          impact_type: 'critical_path',
          description: 'Heavy rain delayed excavation',
        })
      )
    })
  })

  describe('useUpdateDelay', () => {
    it('updates delay and invalidates queries', async () => {
      const updatedRow = {
        id: 'delay-1',
        milestone_id: 'm1',
        project_id: 'p1',
        delay_days: 5,
        root_cause: 'material',
        responsible_party: 'subcontractor',
        impact_type: 'cascading',
        description: 'Updated description',
        corrective_actions: 'Expedited delivery',
        subcontractor_trade: 'Electrical',
        reported_by: 'user-1',
        reported_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }
      const updateBuilder = createMockUpdateBuilder(updatedRow)
      vi.mocked(mockSupabase.from).mockReturnValue(updateBuilder as never)

      const { result } = renderHook(() => useUpdateDelay(), { wrapper })

      result.current.mutate({
        delayId: 'delay-1',
        delayDays: 5,
        description: 'Updated description',
        correctiveActions: 'Expedited delivery',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          delay_days: 5,
          description: 'Updated description',
          corrective_actions: 'Expedited delivery',
        })
      )
      expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'delay-1')
    })
  })

  describe('useDelayCountByMilestone', () => {
    it('returns count map when milestoneIds provided', async () => {
      const mockRows = [
        { milestone_id: 'm1' },
        { milestone_id: 'm1' },
        { milestone_id: 'm2' },
      ]
      const builder = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
      }
      vi.mocked(mockSupabase.from).mockReturnValue(builder as never)

      const { result } = renderHook(
        () => useDelayCountByMilestone(['m1', 'm2']),
        { wrapper }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual({ m1: 2, m2: 1 })
    })

    it('is disabled when milestoneIds is empty', () => {
      const { result } = renderHook(() => useDelayCountByMilestone([]), {
        wrapper,
      })
      expect(result.current.isFetching).toBe(false)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
})
