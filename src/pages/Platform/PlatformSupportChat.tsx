import { MessageCircle } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'

export default function PlatformSupportChat() {
  const { t } = useLocalization()

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center gap-4">
          <MessageCircle className="h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t('navigation:platformSupportChat')}</h1>
            <p className="text-muted-foreground mt-1">{t('navigation:platformSupportChatSubtitle')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('navigation:platformSupportChat')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('settings:roleDescriptions.platform_support')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
