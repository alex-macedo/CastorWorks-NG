import { useState } from 'react'
import { FileQuestion, Plus, Pencil, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useForms } from '@/hooks/useForms'
import { FormSheet } from '@/components/Platform/Forms/FormSheet'

type FormStatus = 'draft' | 'published' | 'closed' | 'archived'

const statusVariant: Record<FormStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  published: 'default',
  closed: 'secondary',
  archived: 'secondary',
}

export default function PlatformForms() {
  const { t } = useLocalization()
  const [activeTab, setActiveTab] = useState<'all' | FormStatus>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  const { forms, isLoading, error, deleteForm, duplicateForm, publishForm, unpublishForm } =
    useForms(activeTab !== 'all' ? { status: activeTab as FormStatus } : undefined)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteForm.mutateAsync(deleteId)
      setDeleteId(null)
    } catch (err) {
      // toast handled in hook
      void err;
    }
  }

  const TABS: Array<'all' | FormStatus> = ['all', 'draft', 'published', 'closed']

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <FileQuestion className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformForms')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformFormsSubtitle')}</p>
            </div>
          </div>
          <Button onClick={() => setSheetOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:forms.newForm')}
          </Button>
        </div>
      </SidebarHeaderShell>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab} value={tab}>
              {t(`platform:forms.tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {error && <p className="text-sm text-destructive">{String(error)}</p>}

      {!isLoading && !error && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform:forms.formTitle')}</TableHead>
                <TableHead>{t('platform:shared.statusLabel')}</TableHead>
                <TableHead>{t('platform:forms.responses')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead className="w-[160px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms?.map(form => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.title}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[form.status as FormStatus] ?? 'outline'}>
                      {form.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {(form as any).response_count ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(form.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {form.status === 'draft' && (
                        <Button variant="ghost" size="icon" title={t('platform:forms.publish')}
                          onClick={() => publishForm.mutate(form.id)}>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {form.status === 'published' && (
                        <Button variant="ghost" size="icon" title={t('platform:forms.unpublish')}
                          onClick={() => unpublishForm.mutate(form.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title={t('platform:forms.duplicate')}
                        onClick={() => duplicateForm.mutate(form.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => { setDeleteId(form.id); setDeleteName(form.title) }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {forms?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <FormSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('platform:forms.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('platform:forms.deleteConfirmDesc', { name: deleteName })}
            </AlertDialogDescription>
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
