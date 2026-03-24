import { useState } from 'react'
import { Copy, Plus, Pencil, Trash2, CheckCircle, Archive } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useGlobalTemplates, usePublishGlobalTemplate, useArchiveGlobalTemplate } from '@/hooks/useGlobalTemplates'
import { TemplateSheet } from '@/components/Platform/GlobalTemplates/TemplateSheet'
import { DeleteTemplateDialog } from '@/components/Platform/GlobalTemplates/DeleteTemplateDialog'
import { TemplateStatusBadge } from '@/components/Platform/GlobalTemplates/TemplateStatusBadge'
import type { GlobalTemplate, TemplateFamily } from '@/types/platform.types'

type TabFilter = 'all' | TemplateFamily
const TABS: TabFilter[] = ['all', 'phase', 'wbs', 'activity', 'budget', 'whatsapp']

export default function PlatformGlobalTemplates() {
  const { t } = useLocalization()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<GlobalTemplate | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<GlobalTemplate | null>(null)

  const { data: templates, isLoading } = useGlobalTemplates(
    activeTab !== 'all' ? activeTab as TemplateFamily : undefined
  )
  const publishTemplate = usePublishGlobalTemplate()
  const archiveTemplate = useArchiveGlobalTemplate()

  const openCreate = () => { setEditTemplate(undefined); setSheetOpen(true) }
  const openEdit = (tmpl: GlobalTemplate) => { setEditTemplate(tmpl); setSheetOpen(true) }

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Copy className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformGlobalTemplates')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformGlobalTemplatesSubtitle')}</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:globalTemplates.newTemplate')}
          </Button>
        </div>
      </SidebarHeaderShell>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab} value={tab}>
              {tab === 'all' ? t('platform:globalTemplates.tabs.all') : t(`platform:globalTemplates.tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform:globalTemplates.name')}</TableHead>
                <TableHead>{t('platform:globalTemplates.family')}</TableHead>
                <TableHead>{t('platform:globalTemplates.status')}</TableHead>
                <TableHead>{t('platform:globalTemplates.version')}</TableHead>
                <TableHead>{t('platform:globalTemplates.publishedAt')}</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map(tmpl => (
                <TableRow key={tmpl.id}>
                  <TableCell className="font-medium">{tmpl.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t(`platform:globalTemplates.families.${tmpl.family}`)}
                  </TableCell>
                  <TableCell><TemplateStatusBadge status={tmpl.status} /></TableCell>
                  <TableCell className="text-muted-foreground">v{tmpl.version}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {tmpl.published_at ? new Date(tmpl.published_at).toLocaleDateString() : '\u2014'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tmpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {tmpl.status === 'draft' && (
                        <Button variant="ghost" size="icon" title={t('platform:globalTemplates.publishTemplate')}
                          onClick={() => publishTemplate.mutate(tmpl.id)}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {tmpl.status === 'published' && (
                        <Button variant="ghost" size="icon" title={t('platform:globalTemplates.archiveTemplate')}
                          onClick={() => archiveTemplate.mutate(tmpl.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {tmpl.status === 'published' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon" disabled>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{t('platform:globalTemplates.deleteBlockedDesc')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(tmpl)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates?.length === 0 && (
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

      <TemplateSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        template={editTemplate}
      />
      <DeleteTemplateDialog
        template={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
