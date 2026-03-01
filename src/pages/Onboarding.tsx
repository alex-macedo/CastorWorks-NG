/**
 * Tenant onboarding: create company/tenant and tenant_users.
 * Full form implementation in Task 12; this placeholder allows TenantGuard redirect to work.
 */
import { useLocalization } from '@/contexts/LocalizationContext'

export default function Onboarding() {
  const { t } = useLocalization()
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <p className="text-muted-foreground">{t('common:loading')}</p>
    </div>
  )
}
