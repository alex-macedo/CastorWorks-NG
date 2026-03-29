import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BoostPackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string | null
}

interface BoostPack {
  id: 'boost_200' | 'boost_500' | 'boost_2000'
  credits: number
  price: string
}

const BOOST_PACKS: BoostPack[] = [
  { id: 'boost_200', credits: 200, price: 'R$29' },
  { id: 'boost_500', credits: 500, price: 'R$59' },
  { id: 'boost_2000', credits: 2000, price: 'R$199' },
]

export function BoostPackModal({ open, onOpenChange, tenantId }: BoostPackModalProps) {
  const { t } = useTranslation('settings')
  const [loadingPack, setLoadingPack] = useState<string | null>(null)

  const handleCheckout = async (pack: BoostPack) => {
    if (!tenantId) {
      toast.error(t('aiUsage.pack.missingTenant', { defaultValue: 'Tenant not found.' }))
      return
    }

    try {
      setLoadingPack(pack.id)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-action-pack-session`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          pack_id: pack.id,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? res.statusText)
      }

      const payload = (await res.json()) as { url?: string }
      if (!payload.url) {
        throw new Error('Checkout URL not returned')
      }

      window.location.href = payload.url
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('aiUsage.pack.checkoutFailed', { defaultValue: 'Failed to start checkout.' })
      toast.error(message)
    } finally {
      setLoadingPack(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('aiUsage.pack.title', { defaultValue: 'Get More Actions' })}</DialogTitle>
          <DialogDescription>
            {t('aiUsage.pack.description', {
              defaultValue: 'Buy one-time AI action packs. Credits stack and do not expire.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          {BOOST_PACKS.map((pack) => (
            <div key={pack.id} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                {t('aiUsage.pack.actions', {
                  defaultValue: '{{count}} actions',
                  count: pack.credits,
                })}
              </p>
              <p className="mt-1 text-2xl font-semibold">{pack.price}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => handleCheckout(pack)}
                disabled={loadingPack !== null}
              >
                {loadingPack === pack.id
                  ? t('aiUsage.pack.redirecting', { defaultValue: 'Redirecting...' })
                  : t('aiUsage.pack.buyNow', { defaultValue: 'Buy now' })}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
