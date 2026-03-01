import { useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SupplierContactBadge } from './SupplierContactBadge';
import { SelectedSuppliersChips } from './SelectedSuppliersChips';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Supplier {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  preferred_contact_method: string | null;
  rating: number;
  orders_completed: number;
  is_active?: boolean;
}

interface SupplierSelectorProps {
  suppliers: Supplier[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSupplier: (id: string) => void;
  onClearAll: () => void;
}

export function SupplierSelector({
  suppliers,
  isLoading,
  selectedIds,
  onToggleSupplier,
  onClearAll,
}: SupplierSelectorProps) {
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = useMemo(() => {
    const activeSuppliers = suppliers?.filter(s => s.is_active !== false) || [];
    if (!searchQuery.trim()) return activeSuppliers;
    
    const query = searchQuery.toLowerCase();
    return activeSuppliers.filter(s =>
      s.name?.toLowerCase().includes(query) ||
      s.contact_email?.toLowerCase().includes(query) ||
      s.contact_phone?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  const preferredSuppliers = useMemo(() => {
    return filteredSuppliers.filter(s => s.rating >= 4 && s.orders_completed > 0);
  }, [filteredSuppliers]);

  const isAllPreferredSelected = preferredSuppliers.length > 0 &&
    preferredSuppliers.every(s => selectedIds.includes(s.id));

  const handleSelectAllPreferred = (checked: boolean) => {
    preferredSuppliers.forEach(s => {
      const isSelected = selectedIds.includes(s.id);
      if (checked && !isSelected) {
        onToggleSupplier(s.id);
      } else if (!checked && isSelected) {
        onToggleSupplier(s.id);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex flex-col gap-4">
        {selectedIds.length > 0 && (
          <SelectedSuppliersChips
            selectedIds={selectedIds}
            suppliers={suppliers}
            onRemoveSupplier={onToggleSupplier}
            onClearAll={onClearAll}
          />
        )}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('procurement.searchSuppliersPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {preferredSuppliers.length > 0 && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-preferred"
              checked={isAllPreferredSelected}
              onCheckedChange={handleSelectAllPreferred}
            />
            <Label htmlFor="select-preferred" className="text-sm font-medium cursor-pointer">
              {`${t('procurement.selectAllPreferred')} (${preferredSuppliers.length})`}
            </Label>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border rounded-md p-2 bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? t('procurement.noSupplierFound', { query: searchQuery }) : t('procurement.noActiveSuppliers')}
          </p>
        ) : (
          <div className="divide-y">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center space-x-3 p-3 hover:bg-muted/50 transition-colors"
                onClick={() => onToggleSupplier(supplier.id)}
              >
                <Checkbox
                  id={`supplier-${supplier.id}`}
                  checked={selectedIds.includes(supplier.id)}
                  onCheckedChange={() => onToggleSupplier(supplier.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 cursor-pointer min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {supplier.contact_email} {supplier.contact_phone ? `• ${supplier.contact_phone}` : ''}
                      </div>
                    </div>
                    <SupplierContactBadge 
                      contactMethod={supplier.preferred_contact_method}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
