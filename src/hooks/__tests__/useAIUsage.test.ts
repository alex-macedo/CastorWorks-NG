/**
 * Wave 0 test scaffold for useAIUsage hook
 * Requirements: AI-01, AI-02, AI-03
 *
 * These tests are intentionally RED — source file src/hooks/useAIUsage.ts
 * does not exist yet and will be created in Plan 03.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock TenantContext
vi.mock('@/contexts/TenantContext', () => ({
  useTenantId: vi.fn(() => 'tenant-uuid-1'),
}))

// This import will fail (RED) until Plan 03 creates the hook
import { useAIUsage } from '@/hooks/useAIUsage'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// AI-01: ai_usage_log row structure and feature breakdown
// ---------------------------------------------------------------------------
describe('AI-01: ai_usage_log data structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries ai_usage_log rows that include tenant_id, feature, and actions_consumed columns', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [
            { tenant_id: 'tenant-uuid-1', feature: 'ai-chat', actions_consumed: 1 },
            { tenant_id: 'tenant-uuid-1', feature: 'ai-chat', actions_consumed: 1 },
            { tenant_id: 'tenant-uuid-1', feature: 'summarize-meeting', actions_consumed: 5 },
          ],
          error: null,
        }),
      }),
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Verify the hook queried ai_usage_log
    expect(supabase.from).toHaveBeenCalledWith('ai_usage_log')
    // Verify select includes required columns
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id')
    )
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('feature')
    )
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('actions_consumed')
    )
  })

  it('returns feature breakdown aggregation with top-5 counts from log data', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    const mockLogRows = [
      { tenant_id: 'tenant-uuid-1', feature: 'ai-chat', actions_consumed: 1 },
      { tenant_id: 'tenant-uuid-1', feature: 'ai-chat', actions_consumed: 1 },
      { tenant_id: 'tenant-uuid-1', feature: 'ai-chat', actions_consumed: 1 },
      { tenant_id: 'tenant-uuid-1', feature: 'summarize-meeting', actions_consumed: 5 },
      { tenant_id: 'tenant-uuid-1', feature: 'summarize-meeting', actions_consumed: 5 },
      { tenant_id: 'tenant-uuid-1', feature: 'analyze-site-photos', actions_consumed: 2 },
      { tenant_id: 'tenant-uuid-1', feature: 'financial-cashflow-forecast', actions_consumed: 10 },
      { tenant_id: 'tenant-uuid-1', feature: 'generate-proposal-content', actions_consumed: 10 },
      { tenant_id: 'tenant-uuid-1', feature: 'ai-suggest-reply', actions_consumed: 1 },
    ]
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: mockLogRows, error: null }),
        }),
      }),
    })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Should return top-5 features by actions consumed
    expect(result.current.featureBreakdown).toBeDefined()
    expect(Array.isArray(result.current.featureBreakdown)).toBe(true)
    expect(result.current.featureBreakdown.length).toBeLessThanOrEqual(5)
    // ai-chat consumed 3 actions total
    const chatEntry = result.current.featureBreakdown.find(
      (f: { feature: string; total: number }) => f.feature === 'ai-chat'
    )
    expect(chatEntry?.total).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// AI-02: Effective budget computation
// ---------------------------------------------------------------------------
describe('AI-02: effectiveBudget computation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes effectiveBudget as ai_monthly_credits + ai_credits_purchased', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    // Mock tenant data with tier budget 500 and purchased 200
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ai_credits_purchased: 200, subscription_tier_id: 'architect_office_ai' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'subscription_tiers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ai_monthly_credits: 500 },
                error: null,
              }),
            }),
          }),
        }
      }
      // ai_usage_log
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // effectiveBudget = 500 (tier) + 200 (purchased) = 700
    expect(result.current.effectiveBudget).toBe(700)
  })

  it('shows unlimited (effectiveBudget = null) for enterprise tier (ai_monthly_credits = null)', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    ;(supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'tenants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ai_credits_purchased: 0, subscription_tier_id: 'enterprise' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'subscription_tiers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ai_monthly_credits: null },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Enterprise = unlimited; effectiveBudget should be null or Infinity
    expect(
      result.current.effectiveBudget === null ||
      result.current.effectiveBudget === Infinity
    ).toBe(true)
    expect(result.current.isEnterprise).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AI-03: consumeAIActions degradation flag
// ---------------------------------------------------------------------------
describe('AI-03: consumeAIActions degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('result has degraded = false when remaining credits > 0', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    ;(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { allowed: true, degraded: false, remaining: 50 },
      error: null,
    })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    // consumeAIActions is exposed from the hook for use in components
    const response = await result.current.consumeAIActions({
      feature: 'ai-chat',
      actions: 1,
      modelUsed: 'claude-sonnet',
    })

    expect(response.degraded).toBe(false)
    expect(response.allowed).toBe(true)
    expect(response.remaining).toBeGreaterThan(0)
  })

  it('result has degraded = true when remaining credits <= 0', async () => {
    const { supabase } = await import('@/integrations/supabase/client')
    ;(supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { allowed: true, degraded: true, remaining: 0 },
      error: null,
    })

    const { result } = renderHook(() => useAIUsage(), { wrapper: createWrapper() })

    const response = await result.current.consumeAIActions({
      feature: 'ai-chat',
      actions: 1,
      modelUsed: 'claude-sonnet',
    })

    expect(response.degraded).toBe(true)
    expect(response.allowed).toBe(true)
    expect(response.remaining).toBe(0)
  })
})
