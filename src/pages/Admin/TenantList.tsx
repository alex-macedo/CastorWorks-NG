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
    <div className="p-6">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tenants ?? []).map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>{tenant.status}</TableCell>
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
