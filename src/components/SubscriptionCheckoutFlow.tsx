import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { useTenantId } from '@/contexts/TenantContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SubscriptionTier {
  id: string
  name: string
  price_monthly_brl: number | null
  price_annual_brl: number | null
  display_order: number | null
}

interface SubscriptionCheckoutFlowProps {
  preselectedTierId?: string
  onClose?: () => void
}

export default function SubscriptionCheckoutFlow({
  preselectedTierId,
  onClose,
}: SubscriptionCheckoutFlowProps) {
  const { t } = useTranslation('subscription')
  const { toast } = useToast()
  const tenantId = useTenantId()
  const [selectedTierId, setSelectedTierId] = useState<string | null>(preselectedTierId ?? null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)

  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['subscription_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('id, name, price_monthly_brl, price_annual_brl, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      const list = (data ?? []) as SubscriptionTier[]
      return list.filter((tier) => tier.id !== 'sandbox' && tier.id !== 'trial')
    },
  })

  const selectedTier = tiers.find((tier) => tier.id === selectedTierId)

  const handleConfirm = async () => {
    if (!tenantId || !selectedTierId) {
      toast({
        title: t('tierPicker.selectTier', 'Select a plan'),
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tenant_id: tenantId, tier_id: selectedTierId, billing_period: billingPeriod },
      })
      if (error) throw error
      const url = (data as { url?: string })?.url
      if (url) {
        window.location.href = url
        return
      }
      throw new Error('No checkout URL returned')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Checkout failed'
      toast({
        title: t('tierPicker.checkoutError', 'Checkout error'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (tiersLoading) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        {t('tierPicker.loading', 'Loading plans...')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">
          {t('tierPicker.title', 'Choose your plan')}
        </h3>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBillingPeriod('monthly')}
          >
            {t('tierPicker.monthly', 'Monthly')}
          </Button>
          <Button
            type="button"
            variant={billingPeriod === 'annual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBillingPeriod('annual')}
          >
            {t('tierPicker.annual', 'Annual (save ~20%)')}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {tiers.map((tier) => {
            const p =
              billingPeriod === 'annual'
                ? tier.price_annual_brl ?? tier.price_monthly_brl
                : tier.price_monthly_brl
            const isSelected = selectedTierId === tier.id
            return (
              <Card
                key={tier.id}
                className={cn(
                  'cursor-pointer transition-colors',
                  isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                )}
                onClick={() => setSelectedTierId(tier.id)}
              >
                <CardHeader className="pb-2">
                  <span className="font-medium">{tier.name}</span>
                </CardHeader>
                <CardContent className="pt-0">
                  {p != null ? (
                    <span className="text-2xl font-semibold">
                      R$ {Number(p).toLocaleString('pt-BR')}
                      <span className="text-sm font-normal text-muted-foreground">
                        {billingPeriod === 'annual' ? t('tierPicker.perMonthAnnual', 'per month') : '/mo'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('tierPicker.custom', 'Custom')}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleConfirm}
          disabled={!selectedTierId || loading}
        >
          {selectedTier
            ? t('tierPicker.confirm', 'Subscribe to {{name}}', {
                name: selectedTier.name,
              })
            : t('tierPicker.selectTier', 'Select a plan')}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            {t('tierPicker.cancel', 'Cancel')}
          </Button>
        )}
      </div>
    </div>
  )
}
