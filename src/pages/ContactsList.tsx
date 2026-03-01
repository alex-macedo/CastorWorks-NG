import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, Filter, X, Mail, Phone, Building2 } from 'lucide-react';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import { useContactTypes } from '@/hooks/useContactTypes';
import { ContactFormSheet } from '@/components/Contacts/ContactFormSheet';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Contact } from '@/types/contacts';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function ContactsList() {
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const { data: contacts, isLoading } = useContacts();
  const deleteContact = useDeleteContact();
  const { contactTypes, getContactTypeColor } = useContactTypes();

  // Translate contact type ID using i18n
  const translateContactType = (typeId: string): string => {
    return t(`contacts.types.${typeId}`, { defaultValue: typeId });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Filter contacts by type
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (filterType === 'all') return contacts;
    return contacts.filter((contact) => contact.role === filterType);
  }, [contacts, filterType]);

  const handleOpenDialog = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
    } else {
      setEditingContact(null);
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('contacts.deleteConfirm'))) {
      await deleteContact.mutateAsync(id);
    }
  };

  const handleClearFilter = () => {
    setFilterType('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('contacts.title')}
            </h1>
            <p className="text-sidebar-primary-foreground/90 font-medium text-base max-w-2xl">
              {t('contacts.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
              <SheetTrigger asChild>
                <Button variant="glass-style-white" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('contacts.addContact')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <ContactFormSheet
                  contact={editingContact}
                  onSuccess={() => setDialogOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="space-y-6 px-1">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-[300px]">
             <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-card border-none shadow-sm h-11 rounded-xl">
                <div className="flex items-center gap-2 text-foreground">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t('contacts.filterByType')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('contacts.allTypes')}</SelectItem>
                {contactTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: type.color }}
                      />
                      <span>{translateContactType(type.id)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filterType !== 'all' && (
            <Button
              variant="ghost"
              onClick={handleClearFilter}
              className="h-11 px-4 bg-muted/50 rounded-xl hover:bg-muted font-bold text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              {t('common.clearFilter')}
            </Button>
          )}
        </div>

        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 p-8">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
               <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              {t('contacts.title')}
            </CardTitle>
            <CardDescription className="font-medium">{t('contacts.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!filteredContacts || filteredContacts.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <div className="p-6 rounded-3xl bg-muted/30 w-fit mx-auto mb-6">
                  <Users className="h-12 w-12 opacity-20" />
                </div>
                <p className="font-bold uppercase tracking-widest text-sm">
                  {filterType !== 'all'
                    ? t('contacts.noContactsFiltered')
                    : t('contacts.noContacts')}
                </p>
                {filterType !== 'all' && (
                  <Button
                    variant="link"
                    onClick={handleClearFilter}
                    className="mt-4 font-bold text-primary"
                  >
                    {t('contacts.clearFilter')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest">{t('contacts.fullName')}</TableHead>
                      <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">{t('contacts.contactType')}</TableHead>
                      <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">{t('contacts.email')}</TableHead>
                      <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">{t('contacts.phone')}</TableHead>
                      <TableHead className="py-4 text-[10px] font-black uppercase tracking-widest">{t('contacts.company')}</TableHead>
                      <TableHead className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-right">{t('common.actions.label')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id} className="group hover:bg-muted/20 border-border/50 transition-colors">
                        <TableCell className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black shadow-inner">
                                 {contact.full_name?.charAt(0)}
                              </div>
                              <span className="font-bold text-base">{contact.full_name}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                          {contact.role ? (
                            <Badge
                              variant="outline"
                              className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-none shadow-none"
                              style={{
                                backgroundColor: `${getContactTypeColor(contact.role)}15`,
                                color: getContactTypeColor(contact.role),
                              }}
                            >
                              {translateContactType(contact.role)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">{contact.email || '-'}</TableCell>
                        <TableCell className="font-bold text-foreground/80">{contact.phone_number || '-'}</TableCell>
                        <TableCell className="font-medium uppercase tracking-tighter text-xs">{contact.company || '-'}</TableCell>
                        <TableCell className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(contact)}
                              className="h-10 w-10 rounded-xl hover:bg-primary hover:text-white transition-all"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contact.id)}
                              className="h-10 w-10 rounded-xl hover:bg-destructive hover:text-white transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
