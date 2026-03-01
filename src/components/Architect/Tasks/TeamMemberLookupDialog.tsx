import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSearchPotentialTeamMembers, useCreateContact } from '@/hooks/useContacts';
import { useLocalization } from '@/contexts/LocalizationContext';
import { PotentialTeamMember } from '@/types/contacts';
import { Loader2 } from 'lucide-react';

interface TeamMemberLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (member: PotentialTeamMember) => void;
}

export const TeamMemberLookupDialog = ({
  open,
  onOpenChange,
  onSelect,
}: TeamMemberLookupDialogProps) => {
  const { t } = useLocalization();
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: '',
    email: searchEmail,
    phone_number: '',
    role: '',
  });

  const { data: results, isLoading: isSearching } = useSearchPotentialTeamMembers(searchEmail);
  const createContact = useCreateContact();

  const handleSelectMember = (member: PotentialTeamMember) => {
    onSelect(member);
    onOpenChange(false);
    setSearchEmail('');
  };

  const handleCreateContact = async () => {
    if (!contactForm.full_name || !contactForm.email) {
      return;
    }

    try {
      const newContact = await createContact.mutateAsync({
        full_name: contactForm.full_name,
        email: contactForm.email,
        phone_number: contactForm.phone_number || undefined,
        role: contactForm.role || undefined,
      });

      // Create contact as a potential team member
      onSelect({
        source: 'contact',
        id: newContact.id,
        name: newContact.full_name,
        email: newContact.email,
        role: newContact.role || t('architect.tasks.contactRole'),
        avatar_url: null,
      });

      onOpenChange(false);
      setSearchEmail('');
      setShowAddContactForm(false);
      setContactForm({
        full_name: '',
        email: '',
        phone_number: '',
        role: '',
      });
    } catch (error) {
      console.error('Error creating contact:', error);
    }
  };

  const hasResults = results && results.length > 0;
  const notFound = searchEmail.length > 2 && !hasResults && !isSearching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('architect.tasks.addTeamMember')}</DialogTitle>
          <DialogDescription>{t('architect.tasks.searchTeamMember')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showAddContactForm ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="search-email">{t('contacts.email')}</Label>
                <Input
                  id="search-email"
                  type="email"
                  placeholder={t("additionalPlaceholders.memberEmail")}
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  disabled={isSearching}
                />
              </div>

              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {hasResults && (
                <ScrollArea className="h-64 w-full rounded-md border p-2">
                  <div className="space-y-2">
                    {results.map((member) => (
                      <div
                        key={`${member.source}-${member.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-primary/10 cursor-pointer"
                        onClick={() => handleSelectMember(member)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant={member.source === 'auth' ? 'default' : 'secondary'}>
                          {member.source === 'auth' ? 'User' : 'Contact'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {notFound && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('architect.tasks.teamMemberNotFound')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddContactForm(true);
                      setContactForm({ ...contactForm, email: searchEmail });
                    }}
                  >
                    {t('contacts.addToContactList')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">{t('contacts.fullName')} *</Label>
                  <Input
                    id="full-name"
                    placeholder={t("additionalPlaceholders.johnDoe")}
                    value={contactForm.full_name}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, full_name: e.target.value })
                    }
                    disabled={createContact.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('contacts.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("additionalPlaceholders.exampleEmail")}
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, email: e.target.value })
                    }
                    disabled={createContact.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('contacts.phone')}</Label>
                  <Input
                    id="phone"
                    placeholder={t('settings.phonePlaceholder')}
                    value={contactForm.phone_number}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, phone_number: e.target.value })
                    }
                    disabled={createContact.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{t('contacts.role')}</Label>
                  <Input
                    id="role"
                    placeholder={t("additionalPlaceholders.memberRole")}
                    value={contactForm.role}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, role: e.target.value })
                    }
                    disabled={createContact.isPending}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddContactForm(false);
                    setSearchEmail('');
                  }}
                  disabled={createContact.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleCreateContact}
                  disabled={!contactForm.full_name || !contactForm.email || createContact.isPending}
                >
                  {createContact.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create & Add'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
