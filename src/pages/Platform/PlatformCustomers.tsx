import { useState } from 'react'
import { Briefcase, Plus, Pencil, Trash2, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { TenantSheet } from '@/components/Platform/Customers/TenantSheet'
import { DeleteTenantDialog } from '@/components/Platform/Customers/DeleteTenantDialog'
import type { TenantRow } from '@/types/platform.types'

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

export default function PlatformCustomers() {
  const { t } = useLocalization()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTenant, setEditTenant] = useState<TenantRow | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null)

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['platform', 'customers'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('tenants')
        .select('id, name, slug, status, max_projects, max_users, trial_ends_at, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      return (data ?? []) as TenantRow[]
    },
  })

  const openCreate = () => { setEditTenant(undefined); setSheetOpen(true) }
  const openEdit = (row: TenantRow) => { setEditTenant(row); setSheetOpen(true) }

  return (
    <div className="p-6 space-y-4">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Briefcase className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformCustomers')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformCustomersSubtitle')}</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:customers.newCustomer')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && <p className="text-sm text-destructive">{String(error)}</p>}

      {!isLoading && !error && (
        <div className="rounded-lg border overflow-hidden">
          <Table className="[&_th]:py-1.5 [&_th]:px-2 [&_td]:py-1.5 [&_td]:px-2 text-sm">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[220px]">{t('common.name')}</TableHead>
                <TableHead>{t('platform:shared.statusLabel')}</TableHead>
                <TableHead className="text-right">{t('platform:customers.limits')}</TableHead>
                <TableHead>{t('platform:customers.trialEndsAt')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map(tenant => (
                <TableRow key={tenant.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="font-medium leading-tight">{tenant.name}</span>
                    <span className="block text-xs text-muted-foreground leading-tight">{tenant.slug}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={tenant.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs px-1.5 py-0"
                    >
                      {tenant.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {tenant.max_projects ?? '∞'}&nbsp;proj&nbsp;/&nbsp;{tenant.max_users ?? '∞'}&nbsp;users
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {fmt(tenant.trial_ends_at)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {fmt(tenant.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 items-center justify-end">
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title={t('common.manage')}>
                        <Link to={`/admin/tenants/${tenant.id}/modules`}>
                          <Settings2 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tenant)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(tenant)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {tenants?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TenantSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tenant={editTenant}
      />
      <DeleteTenantDialog
        tenant={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
