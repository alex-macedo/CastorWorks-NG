import { Building2, Users, MessageCircle, Send, FileQuestion, KanbanSquare, MessageSquare, Briefcase, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PLATFORM_TILES = [
  { titleKey: 'navigation:platformSupportChat', path: '/platform/support-chat', icon: MessageCircle },
  { titleKey: 'navigation:platformCampaigns', path: '/platform/campaigns', icon: Send },
  { titleKey: 'navigation:platformContacts', path: '/platform/contacts', icon: Users },
  { titleKey: 'navigation:platformForms', path: '/platform/forms', icon: FileQuestion },
  { titleKey: 'navigation:platformTasks', path: '/platform/tasks', icon: KanbanSquare },
  { titleKey: 'navigation:platformCommunicationLog', path: '/platform/communication-log', icon: MessageSquare },
  { titleKey: 'navigation:platformCustomers', path: '/platform/customers', icon: Briefcase },
  { titleKey: 'navigation:platformGlobalTemplates', path: '/platform/global-templates', icon: Copy },
] as const

export default function PlatformDashboard() {
  const { t } = useLocalization()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">{t('navigation:platformWorkspace')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings:roleDescriptions.platform_owner')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {PLATFORM_TILES.map(({ titleKey, path, icon: Icon }) => (
          <Link key={path} to={path}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-sm font-medium">{t(titleKey)}</CardTitle>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
