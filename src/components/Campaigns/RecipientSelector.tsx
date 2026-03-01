import { useState } from 'react';
import { useContactsForCampaigns } from '@/hooks/useCampaigns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Search, Star, User, Building2, HardHat } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ContactSelection, ContactType } from '@/types/campaign.types';
import { useLocalization } from '@/contexts/LocalizationContext';

interface RecipientSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function RecipientSelector({ selectedIds, onSelectionChange }: RecipientSelectorProps) {
  const { t } = useLocalization();
  const { contacts, isLoading } = useContactsForCampaigns();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContactType | 'all'>('all');
  const [filterVipOnly, setFilterVipOnly] = useState(false);

  const filteredContacts = contacts?.filter((contact) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    // Type filter
    if (filterType !== 'all' && contact.type !== filterType) {
      return false;
    }

    // VIP filter
    if (filterVipOnly && !contact.isVip) {
      return false;
    }

    return true;
  });

  const handleToggle = (contactId: string) => {
    if (selectedIds.includes(contactId)) {
      onSelectionChange(selectedIds.filter((id) => id !== contactId));
    } else {
      onSelectionChange([...selectedIds, contactId]);
    }
  };

  const handleSelectAll = () => {
    if (!filteredContacts) return;
    const allIds = filteredContacts.map((c) => c.id);
    onSelectionChange(allIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case 'client':
        return <User className="h-4 w-4" />;
      case 'supplier':
        return <Building2 className="h-4 w-4" />;
      case 'contractor':
        return <HardHat className="h-4 w-4" />;
    }
  };

  const getContactTypeBadge = (type: ContactType) => {
    const colors = {
      client: 'bg-blue-100 text-blue-800',
      supplier: 'bg-blue-100 text-blue-800',
      contractor: 'bg-orange-100 text-orange-800',
    };

    return (
      <Badge variant="secondary" className={colors[type]}>
        {type}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">{t("common.components.loadingContacts")}</div>
    );
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        {t("common.noContactsAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.additionalPlaceholders.searchByName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          {t("common.allTypes")}
        </Button>
        <Button
          variant={filterType === 'client' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('client')}
        >
          <User className="h-4 w-4 mr-1" />
          {t("common.clients")}
        </Button>
        <Button
          variant={filterType === 'supplier' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('supplier')}
        >
          <Building2 className="h-4 w-4 mr-1" />
          {t("common.suppliers")}
        </Button>
        <Button
          variant={filterType === 'contractor' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('contractor')}
        >
          <HardHat className="h-4 w-4 mr-1" />
          {t("common.contractors")}
        </Button>
        <Button
          variant={filterVipOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterVipOnly(!filterVipOnly)}
        >
          <Star className="h-4 w-4 mr-1" />
          {t("common.vipOnly")}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("common.selectedCount", { selected: selectedIds.length, total: filteredContacts?.length || 0 })}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSelectAll}>
            {t("common.selectAll")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            {t("common.clearAll")}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] border rounded-lg">
        <div className="p-2 space-y-1">
          {filteredContacts && filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
              >
                <Checkbox
                  checked={selectedIds.includes(contact.id)}
                  onCheckedChange={() => handleToggle(contact.id)}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getContactIcon(contact.type)}
                    <span className="font-medium truncate">{contact.name}</span>
                    {contact.isVip && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate">{contact.phone}</span>
                    {contact.email && (
                      <>
                        <span>•</span>
                        <span className="truncate">{contact.email}</span>
                      </>
                    )}
                  </div>
                </div>

                <div>{getContactTypeBadge(contact.type)}</div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {t("common.noContactsMatchFilters")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
