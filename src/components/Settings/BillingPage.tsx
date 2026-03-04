import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBillingHistory } from '@/hooks/useBillingHistory'
import { useTenantId } from '@/contexts/TenantContext'
import { supabase } from '@/integrations/supabase/client'
import { Loader2, Download, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { BillingHistoryItem } from '@/hooks/useBillingHistory'

export function BillingPage() {
  const { t } = useTranslation('settings')
  const tenantId = useTenantId()
  const { items, isLoading, error } = useBillingHistory()

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    if (!tenantId) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invoice-pdf`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ tenant_id: tenantId, invoice_id: invoiceId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? res.statusText)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";]+)"?/)
      const filename = match?.[1] ?? `invoice-${(invoiceNumber || invoiceId).replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast.success(t('billing.downloadInvoice'))
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to download invoice'
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">{t('billing.title', 'Billing history')}</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  const list = items ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('billing.title')}</CardTitle>
          <CardDescription>
            {list.length === 0 ? t('billing.emptyState') : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>{t('billing.emptyState')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left font-medium">Date</th>
                      <th className="h-10 px-4 text-left font-medium">Number</th>
                      <th className="h-10 px-4 text-right font-medium">Amount</th>
                      <th className="h-10 px-4 text-left font-medium">Status</th>
                      <th className="h-10 px-4 text-right font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((item: BillingHistoryItem) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          {item.date ? new Date(item.date * 1000).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.number ?? item.id}</td>
                        <td className="px-4 py-3 text-right">
                          {((item.amount_paid ?? item.amount_due ?? 0) / 100).toFixed(2)} {(item.currency ?? 'usd').toUpperCase()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>
                            {item.status}
                          </Badge>
                          {item.attempt_count != null && item.attempt_count > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">({item.attempt_count} attempts)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(item.status === 'paid' || item.status === 'open') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadInvoice(item.id, item.number)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {t('billing.downloadInvoice')}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
