import { Copy } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TEMPLATE_FAMILIES = [
  'phaseTemplates',
  'wbsTemplates',
  'activityTemplates',
  'budgetTemplates',
  'whatsAppTemplates',
] as const

export default function PlatformGlobalTemplates() {
  const { t } = useLocalization()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Copy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{t('navigation:platformGlobalTemplates')}</h1>
      </div>
      <p className="text-sm text-muted-foreground max-w-prose">
        Platform-managed global templates are published to a shared catalog. Onboarded tenants can
        view and apply published templates. Only <strong>platform_owner</strong> and{' '}
        <strong>super_admin</strong> can publish, update, or archive global templates.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_FAMILIES.map(family => (
          <Card key={family}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t(`navigation:${family}` as never, { defaultValue: family })}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {t('common:comingSoon', { defaultValue: 'Coming soon' })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
