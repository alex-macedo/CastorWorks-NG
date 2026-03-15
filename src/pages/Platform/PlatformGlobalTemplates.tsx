import { Copy } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'

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
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center gap-4">
          <Copy className="h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t('navigation:platformGlobalTemplates')}</h1>
            <p className="text-muted-foreground mt-1">{t('navigation:platformGlobalTemplatesSubtitle')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

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
