import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { useSearchPotentialTeamMembers, useCreateContact } from '@/hooks/useContacts';
import { useLocalization } from '@/contexts/LocalizationContext';
import { PotentialTeamMember } from '@/types/contacts';
import { Loader2 } from 'lucide-react';

interface AddTeamMemberSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

export const AddTeamMemberSheet = ({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: AddTeamMemberSheetProps) => {
  const { t } = useLocalization();
  const [selectedMember, setSelectedMember] = useState<PotentialTeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: '',
    email: searchQuery,
    phone_number: '',
    role: '',
  });

  const { createTeamMember } = useProjectTeamMembers(projectId);
  const { data: searchResults, isLoading: isSearching } = useSearchPotentialTeamMembers(searchQuery);
  const createContact = useCreateContact();

  const handleSelectMember = (member: PotentialTeamMember) => {
    setSelectedMember(member);
    setSearchQuery('');
    setShowAddContactForm(false);
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
      const newMember: PotentialTeamMember = {
        source: 'contact',
        id: newContact.id,
        name: newContact.full_name,
        email: newContact.email,
        role: newContact.role || t('architect.tasks.contactRole'),
        avatar_url: null,
      };

      setSelectedMember(newMember);
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

  const handleAddTeamMember = async () => {
    if (!selectedMember || !projectId) {
      return;
    }

    try {
      await createTeamMember.mutateAsync({
        project_id: projectId,
        user_id: selectedMember.source === 'auth' ? selectedMember.id : null,
        user_name: selectedMember.name,
        role: selectedMember.role,
        title: title || null,
        email: selectedMember.email,
        phone: phone || null,
        avatar_url: selectedMember.avatar_url || null,
        sort_order: 0,
        is_visible_to_client: isVisible,
      } as any);

      // Reset form
      setSelectedMember(null);
      setSearchQuery('');
      setTitle('');
      setPhone('');
      setIsVisible(true);
      setShowAddContactForm(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const isLoading = createTeamMember.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('architect.tasks.addTeamMember')}</SheetTitle>
            <SheetDescription>
              {t('architect.tasks.addTeamMemberDescription')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {!showAddContactForm ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="member-search">{t('contacts.email')} *</Label>
                  <Input
                    id="member-search"
                    type="email"
                    placeholder={t("additionalPlaceholders.memberEmail")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <ScrollArea className="h-64 w-full rounded-md border p-2">
                    <div className="space-y-2">
                      {searchResults.map((member) => (
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

                {searchQuery.length > 2 && !isSearching && (!searchResults || searchResults.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('architect.tasks.teamMemberNotFound')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddContactForm(true);
                        setContactForm({ ...contactForm, email: searchQuery });
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
                      placeholder="+1 (555) 123-4567"
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
                      setSearchQuery('');
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

          {selectedMember && !showAddContactForm && (
            <>
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="font-medium text-sm">{selectedMember.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                <p className="text-xs text-muted-foreground">{selectedMember.role}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">{t('common.title')}</Label>
                <Input
                  id="title"
                  placeholder={t("additionalPlaceholders.jobTitle")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('contacts.phone')}</Label>
                <Input
                  id="phone"
                  placeholder={t('settings.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Label htmlFor="visibility" className="cursor-pointer">
                  {t('architect.tasks.visibleToClient')}
                </Label>
                <Switch
                  id="visibility"
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                  disabled={isLoading}
                />
              </div>

              <SheetFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddTeamMember} disabled={!selectedMember || isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.adding')}
                    </>
                  ) : (
                    t('architect.tasks.addTeamMember')
                  )}
                </Button>
              </SheetFooter>
            </>
          )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
