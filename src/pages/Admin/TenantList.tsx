import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'

interface TenantRow {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export default function TenantList() {
  const { t } = useLocalization()

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('tenants')
        .select('id, name, slug, status, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      return (data ?? []) as TenantRow[]
    },
  })

  if (isLoading) {
    return <div className="p-6">{t('common:loading')}</div>
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        {error instanceof Error ? error.message : String(error)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center gap-4">
          <Building2 className="h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t('common:adminTenants.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('navigation:adminTenantsSubtitle')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle>{t('common:adminTenants.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common:adminTenants.name')}</TableHead>
                <TableHead>{t('common:adminTenants.slug')}</TableHead>
                <TableHead>{t('common:adminTenants.status')}</TableHead>
                <TableHead className="w-[100px]">{t('common:adminTenants.modules')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tenants ?? []).map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>{tenant.status}</TableCell>
                  <TableCell>
                    <Button variant="link" size="sm" asChild>
                      <Link to={`/admin/tenants/${tenant.id}/modules`}>{t('common:adminTenants.modules')}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(tenants ?? []).length === 0 && (
            <p className="text-muted-foreground py-4">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
