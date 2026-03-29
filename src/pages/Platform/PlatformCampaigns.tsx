import { useState } from 'react'
import { Megaphone, Play, XCircle, Trash2, Plus } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePlatformCampaigns } from '@/hooks/usePlatformCampaigns'
import { CampaignSheet } from '@/components/Platform/Campaigns/CampaignSheet'
import type { CampaignStatus } from '@/types/campaign.types'

const statusVariant: Record<CampaignStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  scheduled: 'secondary',
  sending: 'default',
  completed: 'secondary',
  cancelled: 'outline',
  failed: 'destructive',
}

export default function PlatformCampaigns() {
  const { t } = useLocalization()
  const {
    campaigns,
    isLoading,
    error,
    createCampaign,
    executeCampaign,
    cancelCampaign,
    deleteCampaign,
  } = usePlatformCampaigns()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [executeId, setExecuteId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const handleExecute = async () => {
    if (!executeId) return
    await executeCampaign.mutateAsync({ campaign_id: executeId, send_now: true })
    setExecuteId(null)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteCampaign.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Megaphone className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformCampaigns')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformCampaignsSubtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:campaigns.newCampaign')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && <p className="text-sm text-destructive">{String(error)}</p>}

      {!isLoading && !error && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('platform:shared.statusLabel')}</TableHead>
                <TableHead>{t('platform:campaigns.recipients')}</TableHead>
                <TableHead>{t('platform:campaigns.audienceType')}</TableHead>
                <TableHead>{t('platform:campaigns.scheduledAt')}</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status] ?? 'outline'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.total_recipients}</TableCell>
                  <TableCell className="text-muted-foreground">{c.audience_type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <Button variant="ghost" size="icon" title={t('platform:campaigns.execute')}
                          onClick={() => setExecuteId(c.id)}>
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {c.status === 'scheduled' && (
                        <Button variant="ghost" size="icon" title={t('platform:campaigns.cancelCampaign')}
                          onClick={() => cancelCampaign.mutate(c.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {(c.status === 'draft' || c.status === 'cancelled') && (
                        <Button variant="ghost" size="icon"
                          onClick={() => { setDeleteId(c.id); setDeleteName(c.name) }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CampaignSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        createCampaign={createCampaign}
      />

      <AlertDialog open={!!executeId} onOpenChange={(open) => !open && setExecuteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('platform:campaigns.executeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('platform:campaigns.executeConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecute}>{t('platform:campaigns.execute')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')} &ldquo;{deleteName}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>{t('platform:shared.actionCannotBeUndone')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
