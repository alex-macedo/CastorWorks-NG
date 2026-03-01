/**
 * Unit tests for useWhatsAppIntegrationSettings hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useWhatsAppIntegrationSettings } from '../useWhatsAppIntegrationSettings'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useWhatsAppIntegrationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches WhatsApp integration settings', async () => {
    const mockData = {
      id: 'uuid-1',
      integration_type: 'whatsapp',
      is_enabled: true,
      configuration: { ai_auto_responder_enabled: true },
    }
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null })
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    })

    const { result } = renderHook(() => useWhatsAppIntegrationSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.settings).toEqual(mockData)
    expect(mockFrom).toHaveBeenCalledWith('integration_settings')
  })

  it('returns null when whatsapp integration does not exist', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })
    mockFrom.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    })

    const { result } = renderHook(() => useWhatsAppIntegrationSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.settings).toBeNull()
  })
})
