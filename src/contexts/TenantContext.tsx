import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface TenantInfo {
  id: string
  name: string
  slug: string
}

interface TenantContextType {
  tenantId: string | null
  tenants: TenantInfo[]
  loading: boolean
  setTenantId: (id: string | null) => void
  refreshTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export function useTenantId(): string | null {
  return useTenant().tenantId
}

/** Returns the Supabase client. Caller must be under TenantProvider; when tenantId is set, set_tenant_context has been called. */
export function useTenantClient(): ReturnType<typeof supabase> {
  useTenant()
  return supabase
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tenantId, setTenantIdState] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const rpcCallInFlight = useRef(false)
  const hasAutoSetSingle = useRef(false)

  const refreshTenants = useCallback(async () => {
    if (!user?.id) {
      setTenants([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id, tenants(id, name, slug)')
        .eq('user_id', user.id)

      if (error) {
        console.error('[TenantContext] Failed to fetch tenants:', error)
        setTenants([])
        return
      }

      const list: TenantInfo[] = (data ?? [])
        .map((row: { tenant_id: string; tenants: { id: string; name: string; slug: string } | null }) => {
          const t = row?.tenants
          if (!t?.id) return null
          return { id: t.id, name: t.name, slug: t.slug }
        })
        .filter(Boolean) as TenantInfo[]

      setTenants(list)

      if (list.length === 1 && !hasAutoSetSingle.current) {
        hasAutoSetSingle.current = true
        setTenantIdState(list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setTenants([])
      setTenantIdState(null)
      hasAutoSetSingle.current = false
      setLoading(false)
      return
    }
    refreshTenants()
  }, [user?.id, refreshTenants])

  useEffect(() => {
    if (!tenantId || rpcCallInFlight.current) return

    rpcCallInFlight.current = true
    supabase
      .rpc('set_tenant_context', { tenant_id: tenantId })
      .then(({ error }) => {
        if (error) console.error('[TenantContext] set_tenant_context failed:', error)
      })
      .finally(() => {
        rpcCallInFlight.current = false
      })
  }, [tenantId])

  const setTenantId = useCallback((id: string | null) => {
    setTenantIdState(id)
  }, [])

  const value: TenantContextType = {
    tenantId,
    tenants,
    loading,
    setTenantId,
    refreshTenants,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}
