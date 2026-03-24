import { useState } from 'react'
import { MessageSquare, Plus, Trash2, Mail, Phone, MessageCircle, Users } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { usePlatformCommunicationLog } from '@/hooks/usePlatformCommunicationLog'
import { LogEntrySheet } from '@/components/Platform/CommunicationLog/LogEntrySheet'
import { DeleteLogEntryDialog } from '@/components/Platform/CommunicationLog/DeleteLogEntryDialog'
import type { CommChannel, CommDirection, CommStatus } from '@/types/platform.types'

const channelIcon: Record<CommChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  meeting: Users,
}

const directionVariant: Record<CommDirection, 'default' | 'outline'> = {
  inbound: 'default',
  outbound: 'outline',
}

const statusVariant: Record<CommStatus, 'default' | 'secondary' | 'outline'> = {
  logged: 'outline',
  follow_up: 'default',
  resolved: 'secondary',
}

export default function PlatformCommunicationLog() {
  const { t } = useLocalization()
  const { data: entries, isLoading } = usePlatformCommunicationLog()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <MessageSquare className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformCommunicationLog')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformCommunicationLogSubtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:commLog.logInteraction')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform:commLog.contactName')}</TableHead>
                <TableHead>{t('platform:commLog.channel')}</TableHead>
                <TableHead>{t('platform:commLog.direction')}</TableHead>
                <TableHead>{t('platform:commLog.subject')}</TableHead>
                <TableHead>{t('platform:commLog.status')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map(entry => {
                const Icon = channelIcon[entry.channel]
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.contact_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-4 w-4" />
                        {t(`platform:commLog.channels.${entry.channel}`)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={directionVariant[entry.direction]}>
                        {t(`platform:commLog.directions.${entry.direction}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {entry.subject ?? '\u2014'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[entry.status]}>
                        {t(`platform:commLog.statuses.${entry.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {entries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <LogEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      <DeleteLogEntryDialog entryId={deleteId} onClose={() => setDeleteId(null)} />
    </div>
  )
}
