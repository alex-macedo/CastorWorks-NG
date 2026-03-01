import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'

interface TenantGuardProps {
  children: ReactNode
}

/**
 * Redirects to onboarding when user has no tenants, to tenant-picker when
 * multiple tenants and none selected; otherwise renders children.
 */
export function TenantGuard({ children }: TenantGuardProps) {
  const { tenantId, tenants, loading } = useTenant()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (tenants.length === 0) {
    return <Navigate to="/onboarding" replace />
  }

  if (tenants.length > 1 && !tenantId) {
    return <Navigate to="/tenant-picker" replace />
  }

  return <>{children}</>
}
