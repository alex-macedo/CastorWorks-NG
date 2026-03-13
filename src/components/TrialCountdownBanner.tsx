import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTenantTrial } from '@/hooks/useTenantTrial'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import SubscriptionCheckoutFlow from '@/components/SubscriptionCheckoutFlow'

export function TrialCountdownBanner() {
  const { isOnTrial, daysRemaining, isLoading } = useTenantTrial()
  const { t } = useTranslation('trial')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  if (isLoading || !isOnTrial || daysRemaining === null) return null

  const message =
    daysRemaining === 1
      ? t('daysLeft_one')
      : t('daysLeft', { count: daysRemaining })

  return (
    <>
      <Alert variant="default" className="mb-4 border-primary/50 bg-primary/5 flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          <AlertDescription>{message}</AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => setCheckoutOpen(true)}
        >
          {t('upgradeNow')}
        </Button>
      </Alert>
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="sr-only">{t('upgradeNow')}</DialogTitle>
          </DialogHeader>
          <SubscriptionCheckoutFlow onClose={() => setCheckoutOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
