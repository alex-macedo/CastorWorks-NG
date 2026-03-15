import { Briefcase } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'

interface TenantRow {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export default function PlatformCustomers() {
  const { t } = useLocalization()

  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['platform', 'customers'],
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from('tenants')
        .select('id, name, slug, status, created_at')
        .order('created_at', { ascending: false })
      if (err) throw err
      return (data ?? []) as TenantRow[]
    },
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{t('navigation:platformCustomers')}</h1>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common:loading')}</p>}
      {error && <p className="text-sm text-destructive">{String(error)}</p>}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('navigation:platformCustomers')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common:name')}</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>{t('common:status')}</TableHead>
                  <TableHead>{t('common:createdAt')}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants?.map(tenant => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link to={`/admin/tenants/${tenant.id}/modules`}>{t('common:manage')}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('common:noResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
