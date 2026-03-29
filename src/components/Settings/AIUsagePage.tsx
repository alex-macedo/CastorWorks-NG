import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAIUsage } from '@/hooks/useAIUsage'
import { BoostPackModal } from '@/components/Settings/BoostPackModal'

interface AIUsagePageProps {
  tenantId?: string | null
}

export function AIUsagePage({ tenantId = null }: AIUsagePageProps) {
  const { t } = useTranslation('settings')
  const [isPackModalOpen, setIsPackModalOpen] = useState(false)
  const {
    isLoading,
    error,
    usedThisMonth,
    effectiveBudget,
    isEnterprise,
    featureBreakdown,
    resetDate,
  } = useAIUsage()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p>{t('aiUsage.loading', { defaultValue: 'Loading AI usage...' })}</p>
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

  const hasBudget = !isEnterprise && typeof effectiveBudget === 'number' && effectiveBudget > 0
  const percentage = hasBudget
    ? Math.min(100, Math.round((usedThisMonth / effectiveBudget) * 100))
    : 0
  const showUsageBadge = !isEnterprise && percentage >= 80
  const showReducedModeNudge = !isEnterprise && hasBudget && usedThisMonth >= effectiveBudget

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('aiUsage.title', { defaultValue: 'AI Usage' })}</CardTitle>
            {showUsageBadge && (
              <Badge role="status" data-testid="usage-badge" variant="secondary">
                {t('aiUsage.nearLimit', { defaultValue: 'Near limit' })}
              </Badge>
            )}
          </div>
          <CardDescription>
            {isEnterprise
              ? t('aiUsage.enterpriseUnlimited', { defaultValue: 'Unlimited AI actions' })
              : t('aiUsage.resetOn', {
                  defaultValue: 'Resets on {{date}}',
                  date: resetDate,
                })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isEnterprise
                ? t('aiUsage.unlimitedLabel', { defaultValue: 'Unlimited AI Actions' })
                : t('aiUsage.progressLabel', {
                    defaultValue: '{{used}} / {{total}} AI Actions used this month',
                    used: usedThisMonth,
                    total: effectiveBudget,
                  })}
            </p>
            {!isEnterprise && (
              <Progress value={percentage} aria-label={t('aiUsage.actionsLabel', { defaultValue: 'AI Actions' })} />
            )}
          </div>

          {showReducedModeNudge && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t('aiUsage.reducedModeNudge', {
                defaultValue: 'Running on reduced AI — Get More Actions',
              })}
            </div>
          )}

          <div className="rounded-md border">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {t('aiUsage.topFeatures', { defaultValue: 'Top features this month' })}
            </div>
            <div className="divide-y">
              {featureBreakdown.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  {t('aiUsage.noUsage', { defaultValue: 'No AI usage recorded yet.' })}
                </div>
              ) : (
                featureBreakdown.map((row) => (
                  <div key={row.feature} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{row.feature}</span>
                    <span className="font-medium">{row.total}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {!isEnterprise && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsPackModalOpen(true)}>
                {t('aiUsage.getMoreActions', { defaultValue: 'Get More Actions' })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BoostPackModal
        open={isPackModalOpen}
        onOpenChange={setIsPackModalOpen}
        tenantId={tenantId}
      />
    </div>
  )
}
