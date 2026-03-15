import { KanbanSquare } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PlatformTasks() {
  const { t } = useLocalization()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <KanbanSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{t('navigation:platformTasks')}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('navigation:platformTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('settings:roleDescriptions.platform_support')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
