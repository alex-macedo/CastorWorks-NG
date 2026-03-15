import { Send } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'

export default function PlatformCampaigns() {
  const { t } = useLocalization()

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center gap-4">
          <Send className="h-8 w-8 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t('navigation:platformCampaigns')}</h1>
            <p className="text-muted-foreground mt-1">{t('navigation:platformCampaignsSubtitle')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('navigation:platformCampaigns')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('settings:roleDescriptions.platform_sales')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
