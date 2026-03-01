import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTenantTrial } from '@/hooks/useTenantTrial'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'

export function TrialCountdownBanner() {
  const { isOnTrial, daysRemaining, isLoading } = useTenantTrial()
  const { t } = useTranslation('trial')

  if (isLoading || !isOnTrial || daysRemaining === null) return null

  const message =
    daysRemaining === 1
      ? t('daysLeft_one')
      : t('daysLeft', { count: daysRemaining })

  return (
    <Alert variant="default" className="mb-4 border-primary/50 bg-primary/5">
      <Clock className="h-4 w-4 text-primary" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
