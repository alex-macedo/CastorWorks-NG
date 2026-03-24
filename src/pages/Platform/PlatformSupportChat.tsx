import { useState } from 'react'
import { MessageCircle, Plus, XCircle, Send } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  usePlatformSupportTickets,
  usePlatformSupportTicket,
  useAddSupportMessage,
  useCloseSupportTicket,
} from '@/hooks/usePlatformSupportTickets'
import { TicketSheet } from '@/components/Platform/SupportChat/TicketSheet'
import {
  SupportTicketStatusBadge,
  SupportTicketPriorityBadge,
} from '@/components/Platform/SupportChat/SupportTicketStatusBadge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { t } = useLocalization()
  const { data: ticket, isLoading } = usePlatformSupportTicket(ticketId)
  const addMessage = useAddSupportMessage()
  const closeTicket = useCloseSupportTicket()
  const [reply, setReply] = useState('')
  const [closeConfirm, setCloseConfirm] = useState(false)

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">{t('common.loading')}</div>
  if (!ticket) return null

  const handleSendReply = async () => {
    if (!reply.trim()) return
    try {
      await addMessage.mutateAsync({ ticketId, body: reply.trim() })
      setReply('')
    } catch (err) { void err; }
  }

  const handleClose = async () => {
    await closeTicket.mutateAsync(ticketId)
    setCloseConfirm(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Ticket header */}
      <div className="border-b px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base">{ticket.subject}</h3>
          <div className="flex gap-2 mt-1">
            <SupportTicketStatusBadge status={ticket.status} />
            <SupportTicketPriorityBadge priority={ticket.priority} />
          </div>
        </div>
        {ticket.status !== 'closed' && (
          <Button variant="outline" size="sm" onClick={() => setCloseConfirm(true)}>
            <XCircle className="h-4 w-4 mr-2" />
            {t('platform:supportChat.closeTicket')}
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {ticket.platform_support_messages?.map(msg => (
            <div key={msg.id} className="bg-muted/40 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {new Date(msg.created_at).toLocaleString()}
              </p>
              <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply box */}
      {ticket.status !== 'closed' && (
        <div className="border-t px-6 py-4 space-y-2">
          <Textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder={t('platform:supportChat.replyPlaceholder')}
            rows={3}
            disabled={addMessage.isPending}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSendReply}
              disabled={!reply.trim() || addMessage.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {t('platform:supportChat.sendReply')}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={closeConfirm} onOpenChange={setCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('platform:supportChat.closeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('platform:supportChat.closeConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>{t('platform:supportChat.closeTicket')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function PlatformSupportChat() {
  const { t } = useLocalization()
  const { data: tickets, isLoading } = usePlatformSupportTickets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <MessageCircle className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformSupportChat')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformSupportChatSubtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:supportChat.newTicket')}
          </Button>
        </div>
      </SidebarHeaderShell>

      <div className="grid sm:grid-cols-[300px_1fr] gap-4 h-[600px]">
        {/* Ticket list */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">{t('platform:supportChat.title')}</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">{t('common.loading')}</p>
            )}
            {!isLoading && tickets?.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t('platform:supportChat.noTickets')}</p>
            )}
            {tickets?.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50',
                  selectedId === ticket.id && 'bg-muted'
                )}
              >
                <p className="text-sm font-medium truncate">{ticket.subject}</p>
                <div className="flex gap-1.5 mt-1">
                  <SupportTicketStatusBadge status={ticket.status} />
                  <SupportTicketPriorityBadge priority={ticket.priority} />
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* Ticket detail */}
        <Card className="overflow-hidden flex flex-col">
          {selectedId ? (
            <TicketDetailView ticketId={selectedId} />
          ) : (
            <CardContent className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('platform:supportChat.selectTicket')}
            </CardContent>
          )}
        </Card>
      </div>

      <TicketSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
