import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface TenantInfo {
  id: string
  name: string
  slug: string
  subscription_tier_id: string | null
}

interface OverrideRow {
  module_id: string
}

interface LicenseModule {
  id: string
  name: string
}

export default function TenantModules() {
  const { id: tenantId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLocalization()
  const queryClient = useQueryClient()
  const [selectedModule, setSelectedModule] = useState<string>('')

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery({
    queryKey: ['admin', 'tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, subscription_tier_id')
        .eq('id', tenantId!)
        .single()
      if (error) throw error
      return data as TenantInfo
    },
    enabled: !!tenantId,
  })

  const { data: overrides = [], isLoading: overridesLoading } = useQuery({
    queryKey: ['admin', 'tenant-modules', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_licensed_modules')
        .select('module_id')
        .eq('tenant_id', tenantId!)
        .eq('source', 'override')
      if (error) throw error
      return (data ?? []) as OverrideRow[]
    },
    enabled: !!tenantId,
  })

  const { data: modules = [] } = useQuery({
    queryKey: ['admin', 'license-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_modules')
        .select('id, name')
        .order('id')
      if (error) throw error
      return (data ?? []) as LicenseModule[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('tenant_licensed_modules')
        .insert({
          tenant_id: tenantId!,
          module_id: moduleId,
          source: 'override',
        })
      if (error) throw error
    },
    onSuccess: (_, moduleId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-modules', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['tenant-licensed-modules', tenantId] })
      setSelectedModule('')
      toast.success(t('common:adminTenantModules.added'))
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : String(err))
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('tenant_licensed_modules')
        .delete()
        .eq('tenant_id', tenantId!)
        .eq('module_id', moduleId)
        .eq('source', 'override')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-modules', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['tenant-licensed-modules', tenantId] })
      toast.success(t('common:adminTenantModules.removed'))
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : String(err))
    },
  })

  const overrideIds = overrides.map((r) => r.module_id)
  const availableModules = modules.filter((m) => !overrideIds.includes(m.id))

  if (!tenantId) {
    return (
      <div className="p-6">
        <p className="text-destructive">{t('common:adminTenantModules.invalidTenant')}</p>
      </div>
    )
  }

  if (tenantLoading || tenantError) {
    return (
      <div className="p-6">
        {tenantLoading && <p>{t('common:loading')}</p>}
        {tenantError && (
          <p className="text-destructive">
            {tenantError instanceof Error ? tenantError.message : String(tenantError)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')} aria-label={t('common:back')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{t('common:adminTenantModules.title')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{tenant?.name ?? ''}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('common:adminTenantModules.subtitle')} {tenant?.slug}
            {tenant?.subscription_tier_id && ` · ${tenant.subscription_tier_id}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t('common:adminTenantModules.addModulePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableModules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedModule || addMutation.isPending}
              onClick={() => selectedModule && addMutation.mutate(selectedModule)}
            >
              {t('common:adminTenantModules.addModule')}
            </Button>
          </div>
          {overridesLoading ? (
            <p className="text-muted-foreground">{t('common:loading')}</p>
          ) : (
            <ul className="space-y-2 list-none pl-0">
              {overrideIds.length === 0 ? (
                <li className="text-muted-foreground text-sm">{t('common:adminTenantModules.noOverrides')}</li>
              ) : (
                overrideIds.map((moduleId) => {
                  const mod = modules.find((m) => m.id === moduleId)
                  return (
                    <li
                      key={moduleId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{mod?.name ?? moduleId}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(moduleId)}
                      >
                        {t('common:adminTenantModules.remove')}
                      </Button>
                    </li>
                  )
                })
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
