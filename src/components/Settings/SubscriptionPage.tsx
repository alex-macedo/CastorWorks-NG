import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useTenantId } from '@/contexts/TenantContext'
import { useSubscription } from '@/hooks/useSubscription'
import { useTenantTrial } from '@/hooks/useTenantTrial'
import { supabase } from '@/integrations/supabase/client'
import SubscriptionCheckoutFlow from '@/components/SubscriptionCheckoutFlow'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Loader2 } from 'lucide-react'

export function SubscriptionPage() {
  const { t } = useTranslation('subscription')
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const tenantId = useTenantId()
  const { subscription, isActive, isCancelling, currentTier, isLoading } = useSubscription()
  const { isOnTrial, daysRemaining } = useTenantTrial()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    if (success === '1') {
      toast({
        title: t('paymentSuccess'),
        variant: 'default',
      })
      setSearchParams((p) => {
        p.delete('success')
        p.delete('session_id')
        return p
      }, { replace: true })
    }
    if (canceled === '1') {
      toast({
        title: t('paymentCanceled'),
        variant: 'default',
      })
      setSearchParams((p) => {
        p.delete('canceled')
        return p
      }, { replace: true })
    }
  }, [searchParams, setSearchParams, toast, t])

  const handleManageBilling = async () => {
    if (!tenantId) return
    setPortalLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
        body: { tenant_id: tenantId },
      })
      if (error) throw error
      const url = (data as { url?: string })?.url
      if (url) {
        window.location.href = url
        return
      }
      throw new Error(t('tierPicker.noPortalUrl'))
    } catch (e) {
      const message = e instanceof Error ? e.message : t('tierPicker.portalOpenFailed')
      toast({
        title: t('tierPicker.checkoutError'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setPortalLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">{t('loadingSubscription')}</span>
        </CardContent>
      </Card>
    )
  }

  const isSandbox = !currentTier || currentTier === 'sandbox'
  const showTrialCta = isOnTrial && daysRemaining !== null
  const showSandboxCta = isSandbox && !isOnTrial

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('pageTitle')}</CardTitle>
          <CardDescription>
            {t('currentPlan')} · {t('billingPeriod')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{subscription.tier_id}</span>
                {isCancelling && (
                  <Badge variant="secondary">{t('status.canceled')}</Badge>
                )}
                {!isCancelling && isActive && (
                  <Badge variant="default">{t('status.active')}</Badge>
                )}
                {subscription.status === 'past_due' && (
                  <Badge variant="destructive">{t('status.past_due')}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('billingPeriod')}: {subscription.billing_period === 'annual' ? t('annual') : t('monthly')}
              </p>
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {t('nextRenewal', 'Next Renewal')}:{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setCheckoutOpen(true)}>
                  {t('changePlan', 'Change Plan')}
                </Button>
                <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {t('manageBilling', 'Manage Billing')}
                </Button>
              </div>
            </>
          ) : showTrialCta ? (
            <>
              <p className="text-sm">
                {daysRemaining === 1
                  ? t('trialDaysLeft', { count: 1 })
                  : t('trialDaysLeft_other', { count: daysRemaining })}
              </p>
              <Button onClick={() => setCheckoutOpen(true)}>
                {t('upgradeToPaid', 'Upgrade to Paid Plan')}
              </Button>
            </>
          ) : showSandboxCta ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('noActiveSubscription', 'No active subscription')}
              </p>
              <Button onClick={() => setCheckoutOpen(true)}>
                {t('subscribeNow', 'Subscribe Now')}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('noActiveSubscription', 'No active subscription')}
              </p>
              <Button onClick={() => setCheckoutOpen(true)}>
                {t('changePlan', 'Change Plan')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-3xl">
          <SubscriptionCheckoutFlow onClose={() => setCheckoutOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
