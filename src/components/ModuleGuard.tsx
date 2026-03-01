import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useLicensedModules } from '@/hooks/useLicensedModules'

interface ModuleGuardProps {
  module: string
  fallback: ReactNode
  children: ReactNode
}

export function ModuleGuard({ module, fallback, children }: ModuleGuardProps) {
  const { hasModule, isLoading } = useLicensedModules()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasModule(module)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
