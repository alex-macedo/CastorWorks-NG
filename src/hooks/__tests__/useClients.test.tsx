import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useClients } from '../useClients'

const {
  toastSpy,
  useTenantMock,
  mockSingle,
  mockSelect,
  mockInsert,
  mockOrder,
  mockFrom,
} = vi.hoisted(() => {
  const toastSpy = vi.fn()
  const useTenantMock = vi.fn()
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockOrder = vi.fn()
  const mockFrom = vi.fn((table: string) => {
    if (table === 'clients') {
      return {
        select: vi.fn(() => ({
          order: mockOrder,
        })),
        insert: mockInsert,
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    toastSpy,
    useTenantMock,
    mockSingle,
    mockSelect,
    mockInsert,
    mockOrder,
    mockFrom,
  }
})

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastSpy,
  }),
}))

vi.mock('@/contexts/TenantContext', () => ({
  useTenant: () => useTenantMock(),
}))

describe('useClients', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    vi.clearAllMocks()
    mockOrder.mockResolvedValue({ data: [], error: null })
    mockSingle.mockResolvedValue({ data: { id: 'client-1' }, error: null })
    useTenantMock.mockReturnValue({ tenantId: 'tenant-123' })
  })

  it('adds the active tenant_id when creating a client', async () => {
    const { result } = renderHook(() => useClients(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.createClient.mutateAsync({
        name: 'Acme Client',
        status: 'Active',
      })
    })

    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Acme Client',
      status: 'Active',
      tenant_id: 'tenant-123',
    })
  })

  it('rejects createClient when there is no active tenant', async () => {
    useTenantMock.mockReturnValue({ tenantId: null })

    const { result } = renderHook(() => useClients(), { wrapper })

    await expect(
      result.current.createClient.mutateAsync({
        name: 'Acme Client',
        status: 'Active',
      })
    ).rejects.toThrow('No active tenant selected')

    expect(mockInsert).not.toHaveBeenCalled()
  })
})
