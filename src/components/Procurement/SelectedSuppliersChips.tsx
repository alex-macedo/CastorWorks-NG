import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SupplierContactBadge } from './SupplierContactBadge';
import { useLocalization } from '@/contexts/LocalizationContext';

interface Supplier {
  id: string;
  name: string;
  preferred_contact_method: string;
}

interface SelectedSuppliersChipsProps {
  suppliers: Supplier[];
  selectedIds: string[];
  onRemoveSupplier: (supplierId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function SelectedSuppliersChips({
  suppliers,
  selectedIds,
  onRemoveSupplier,
  onClearAll,
  className,
}: SelectedSuppliersChipsProps) {
  // Use localization if available; fall back to English defaults for tests/server environments
  let t = (key: string) => key;
  try {
    const ctx = useLocalization();
    t = ctx.t;
  } catch (e) {
    t = (key: string) => {
      const map: Record<string, string> = {
        'procurement.selectedSuppliers': 'Selected Suppliers',
        'procurement.clearAll': 'Clear All',
      };
      return map[key] || key;
    };
  }

  const selectedSuppliers = suppliers.filter(supplier => 
    selectedIds.includes(supplier.id)
  );

  if (selectedSuppliers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{`${t('procurement.selectedSuppliers')} (${selectedSuppliers.length})`}</span>
        {selectedSuppliers.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs"
          >
            {t('procurement.clearAll')}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedSuppliers.map((supplier) => (
          <Badge
            key={supplier.id}
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            <span className="text-sm">{supplier.name}</span>
            <SupplierContactBadge 
              contactMethod={supplier.preferred_contact_method} 
              className="ml-1 text-xs h-4"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveSupplier(supplier.id)}
              data-testid={`remove-${supplier.id}`}
              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}