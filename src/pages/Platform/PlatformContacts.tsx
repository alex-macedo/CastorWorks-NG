import { useState } from 'react'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useContacts } from '@/hooks/useContacts'
import { ContactSheet } from '@/components/Platform/Contacts/ContactSheet'
import { DeleteContactDialog } from '@/components/Platform/Contacts/DeleteContactDialog'
import type { Contact } from '@/types/contacts'

export default function PlatformContacts() {
  const { t } = useLocalization()
  const { data: contacts, isLoading } = useContacts()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

  const openCreate = () => { setEditContact(undefined); setSheetOpen(true) }
  const openEdit = (c: Contact) => { setEditContact(c); setSheetOpen(true) }

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Users className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformContacts')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformContactsSubtitle')}</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:contacts.newContact')}
          </Button>
        </div>
      </SidebarHeaderShell>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform:contacts.fullName')}</TableHead>
                <TableHead>{t('platform:contacts.email')}</TableHead>
                <TableHead>{t('platform:contacts.phone')}</TableHead>
                <TableHead>{t('platform:contacts.role')}</TableHead>
                <TableHead>{t('platform:contacts.company')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone_number ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.role ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{c.company ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {contacts?.length === 0 && (
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

      <ContactSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        contact={editContact}
      />
      <DeleteContactDialog
        contact={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
