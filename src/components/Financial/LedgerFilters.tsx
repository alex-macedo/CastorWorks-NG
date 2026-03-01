import { useMemo } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useConfig } from "@/contexts/ConfigContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import type { FilterState } from "@/types/ledger";

interface LedgerFiltersProps {
  filters: FilterState;
  onUpdateFilters: (filters: FilterState) => void;
  projects: Array<{ id: string; name: string }>;
  categories: string[];
}

export function LedgerFilters({
  filters,
  onUpdateFilters,
  projects,
  categories,
}: LedgerFiltersProps) {
  const { t } = useLocalization();
  const { getConfigValues } = useConfig();

  const clearAllFilters = () => {
    onUpdateFilters({
      projects: [],
      categories: [],
      type: 'all',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  const hasActiveFilters = 
    filters.projects.length > 0 || 
    filters.categories.length > 0 || 
    filters.type !== 'all' || 
    filters.startDate !== '' || 
    filters.endDate !== '' || 
    filters.search !== '';

  // Get category colors from config
  const financialCategories = getConfigValues('financial_category');
  
  const projectOptions = useMemo(() => 
    projects.map(p => ({ id: p.id, name: p.name })),
    [projects]
  );

  const categoryOptions = useMemo(() => 
    categories.map(cat => {
      const configCategory = financialCategories.find(fc => fc.key === cat);
      return {
        id: cat,
        name: cat,
        color: configCategory?.color
      };
    }),
    [categories, financialCategories]
  );

  return (
    <Card className="p-3 shadow-sm bg-slate-50/50 dark:bg-slate-900/20 border-muted/30">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search - Smaller width to prevent overflow of other filters */}
        <div className="w-full lg:w-[280px] relative">
          <Input
            id="search"
            type="text"
            className="h-9 pr-8 text-xs"
            placeholder={t('financial.ledger.filters.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => onUpdateFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button 
              onClick={() => onUpdateFilters({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-wrap items-center gap-2">
          {/* Type */}
          <div className="w-[140px]">
            <Select
              value={filters.type}
              onValueChange={(value: 'all' | 'income' | 'expense') =>
                onUpdateFilters({ ...filters, type: value })
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('financial.ledger.filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('financial.ledger.filters.all')}</SelectItem>
                <SelectItem value="income">{t('financial.ledger.filters.income')}</SelectItem>
                <SelectItem value="expense">{t('financial.ledger.filters.expense')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-background border rounded-md px-2 h-9">
            <DateInput
              value={filters.startDate}
              onChange={(value) => onUpdateFilters({ ...filters, startDate: value })}
              className="border-none shadow-none h-7 w-[105px] text-xs p-0 focus-visible:ring-0"
              placeholder={t('financial.ledger.filters.startDate')}
              max={filters.endDate || undefined}
            />
            <span className="text-muted-foreground text-xs">→</span>
            <DateInput
              value={filters.endDate}
              onChange={(value) => onUpdateFilters({ ...filters, endDate: value })}
              className="border-none shadow-none h-7 w-[105px] text-xs p-0 focus-visible:ring-0"
              placeholder={t('financial.ledger.filters.endDate')}
              min={filters.startDate || undefined}
            />
          </div>

          {/* Projects - Increased width */}
          <div className="w-[220px]">
            <MultiSelect
              options={projectOptions}
              selected={filters.projects}
              onChange={(selected) => onUpdateFilters({ ...filters, projects: selected })}
              placeholder={t('financial.ledger.filters.allProjects')}
              className="h-9 text-xs"
            />
          </div>

          {/* Categories - Increased width */}
          <div className="w-[200px]">
            <MultiSelect
              options={categoryOptions}
              selected={filters.categories}
              onChange={(selected) => onUpdateFilters({ ...filters, categories: selected })}
              placeholder={t('financial.ledger.filters.allCategories')}
              withColors={true}
              className="h-9 text-xs"
            />
          </div>

          {/* Clear Filters */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
            className="h-9 px-3 text-xs border-dashed border-muted-foreground/20 text-muted-foreground hover:text-destructive hover:border-destructive transition-all ml-auto"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            {t('financial.ledger.filters.clearAll')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
