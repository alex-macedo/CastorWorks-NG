import { useState, useMemo, memo } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useConfig } from "@/contexts/ConfigContext";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Edit, Trash2, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { formatDate } from "@/utils/reportFormatters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ColumnFilters } from "@/types/ledger";
import { DateRangeFilter, TextFilter, SelectFilter, NumberRangeFilter } from "./ColumnFilters";

const SortButton = ({ column, label, onSort }: { column: string; label: string; onSort: (key: string) => void }) => (
  <Button
    variant="ghost"
    size="sm"
    className="-ml-3 h-8"
    onClick={() => onSort(column)}
  >
    {label}
    <ArrowUpDown className="ml-2 h-4 w-4" />
  </Button>
);

// Memoized table row component to prevent unnecessary re-renders
const LedgerTableRow = memo(({
  entry,
  index,
  formatCurrency,
  financialCategories,
  t,
  onEdit,
  onDelete
}: {
  entry: any;
  index: number;
  formatCurrency: (amount: number) => string;
  financialCategories: any[];
  t: any;
  onEdit: (entry: any) => void;
  onDelete: (id: string) => void;
}) => {
  const configCategory = financialCategories.find(fc => fc.key === entry.category);

  return (
    <TableRow
      className={cn(
        "hover:bg-muted/50",
        index % 2 === 0 ? "bg-background" : "bg-muted/20"
      )}
    >
      <TableCell className="whitespace-nowrap px-2">
            {formatDate(entry.date)}
      </TableCell>
      <TableCell className="whitespace-nowrap px-2">{entry.reference || '-'}</TableCell>
      <TableCell className="px-2">{entry.description || '-'}</TableCell>
      <TableCell className="px-2">{entry.projects?.name || '-'}</TableCell>
      <TableCell className="px-2">
        <Badge
          variant="outline"
          className="border-2 whitespace-nowrap"
          style={{
            borderColor: configCategory?.color || 'hsl(var(--border))',
            backgroundColor: configCategory?.color ? `${configCategory.color}15` : 'transparent'
          }}
        >
          {configCategory?.color && (
            <div
              className="h-2 w-2 rounded-full mr-1.5"
              style={{ backgroundColor: configCategory.color }}
            />
          )}
          {entry.category}
        </Badge>
      </TableCell>
      <TableCell className="px-2">
        <Badge variant={entry.entry_type === 'income' ? 'default' : 'secondary'} className="whitespace-nowrap">
          {entry.entry_type === 'income' ? t('financial.income') : t('financial.expense')}
        </Badge>
      </TableCell>
      <TableCell className="px-2">{entry.payment_method || '-'}</TableCell>
      <TableCell className="px-2">{entry.recipient_payer || '-'}</TableCell>
      <TableCell className="text-right px-2">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-3 text-sm whitespace-nowrap">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              {t('financial.ledger.columns.debit')}
            </span>
            {entry.entry_type === 'expense' ? (
              <span className="text-red-600 font-medium">
                {formatCurrency(Number(entry.amount))}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {formatCurrency(0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm whitespace-nowrap">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              {t('financial.ledger.columns.credit')}
            </span>
            {entry.entry_type === 'income' ? (
              <span className="text-green-600 font-medium">
                {formatCurrency(Number(entry.amount))}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {formatCurrency(0)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm whitespace-nowrap">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              {t('financial.ledger.columns.balance')}
            </span>
            <span
              className={cn(
                'font-semibold',
                entry.balance >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {formatCurrency(entry.balance)}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right px-2">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(entry)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

LedgerTableRow.displayName = 'LedgerTableRow';

interface LedgerTableOptimizedProps {
  entries: Array<any>;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  onEdit: (entry: any) => void;
  isLoading: boolean;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  projects: Array<any>;
  categories: string[];
}

export function LedgerTableOptimized({
  entries,
  sortConfig,
  onSort,
  onEdit,
  isLoading,
  columnFilters,
  onColumnFiltersChange,
  projects,
  categories,
}: LedgerTableOptimizedProps) {
  const { t, currency } = useLocalization();
  const { getConfigValues } = useConfig();
  const { deleteEntry } = useFinancialEntries();
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);

  // Get category colors from config
  const financialCategories = getConfigValues('financial_category');

  const formatCurrency = useMemo(() => {
    return (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };
  }, [currency]);

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirm'))) {
      try {
        await deleteEntry.mutateAsync(id);
        toast({
          title: t('common.success'),
          description: t('toast.entryDeletedSuccessfully'),
        });
      } catch (error) {
        toast({
          title: t('common.errorTitle'),
          description: t('toast.failedToDeleteEntry'),
          variant: "destructive",
        });
      }
    }
  };

  const paymentMethods = useMemo(() =>
    [...new Set(entries.map(e => e.payment_method).filter(Boolean))],
    [entries]
  );

  const hasActiveFilters = useMemo(() =>
    columnFilters.dateFrom || columnFilters.dateTo || columnFilters.reference ||
    columnFilters.description || columnFilters.project !== 'all' || columnFilters.category !== 'all' ||
    columnFilters.type !== 'all' || columnFilters.paymentMethod !== 'all' ||
    columnFilters.recipientPayer || columnFilters.debitMin !== null || columnFilters.debitMax !== null ||
    columnFilters.creditMin !== null || columnFilters.creditMax !== null ||
    columnFilters.balanceMin !== null || columnFilters.balanceMax !== null,
    [columnFilters]
  );

  const clearAllFilters = () => {
    onColumnFiltersChange({
      dateFrom: null,
      dateTo: null,
      reference: '',
      description: '',
      project: 'all',
      category: 'all',
      type: 'all',
      paymentMethod: 'all',
      recipientPayer: '',
      debitMin: null,
      debitMax: null,
      creditMin: null,
      creditMax: null,
      balanceMin: null,
      balanceMax: null,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">{t('common.loading')}</p>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">{t('financial.ledger.noEntries')}</p>
      </Card>
    );
  }

  // For small datasets (< 100 rows), use regular rendering for better UX
  const shouldScroll = entries.length > 100;

  return (
    <Card>
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? t('financial.ledger.filters.hideFilters') : t('financial.ledger.filters.showFilters')}
          </Button>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {Object.values(columnFilters).filter(v => v && v !== 'all').length} {t('financial.ledger.filters.activeFilters')}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            {t('financial.ledger.filters.clearAllFilters')}
          </Button>
        )}
      </div>
      <div
        className="relative z-0 overflow-x-auto"
        style={{ maxHeight: shouldScroll ? '600px' : 'none', overflow: 'auto' }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">
                <SortButton column="date" label={t('financial.ledger.columns.date')} onSort={onSort} />
              </TableHead>
              <TableHead className="w-[100px]">{t('financial.ledger.columns.reference')}</TableHead>
              <TableHead className="min-w-[150px]">
                <SortButton column="description" label={t('financial.ledger.columns.description')} onSort={onSort} />
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton column="project_id" label={t('financial.ledger.columns.project')} onSort={onSort} />
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton column="category" label={t('financial.ledger.columns.category')} onSort={onSort} />
              </TableHead>
              <TableHead className="w-[90px]">{t('financial.ledger.columns.type')}</TableHead>
              <TableHead className="w-[100px]">{t('financial.ledger.columns.paymentMethod')}</TableHead>
              <TableHead className="w-[120px]">{t('financial.ledger.columns.recipientPayer')}</TableHead>
              <TableHead className="text-right w-[220px] align-top">
                <div className="flex flex-col items-end gap-1">
                  <SortButton
                    column="amount"
                    label={`${t('financial.ledger.columns.debit')} / ${t('financial.ledger.columns.credit')} / ${t('financial.ledger.columns.balance')}`}
                    onSort={onSort}
                  />
                  <div className="flex gap-4 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>{t('financial.ledger.columns.debit')}</span>
                    <span>{t('financial.ledger.columns.credit')}</span>
                    <span>{t('financial.ledger.columns.balance')}</span>
                  </div>
                </div>
              </TableHead>
              <TableHead className="text-right w-[80px]">{t('financial.ledger.columns.actions')}</TableHead>
            </TableRow>
            {showFilters && (
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="p-2">
                  <DateRangeFilter
                    from={columnFilters.dateFrom}
                    to={columnFilters.dateTo}
                    onFromChange={(date) => onColumnFiltersChange({ ...columnFilters, dateFrom: date })}
                    onToChange={(date) => onColumnFiltersChange({ ...columnFilters, dateTo: date })}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <TextFilter
                    value={columnFilters.reference}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, reference: value })}
                    placeholder={t('financial.ledger.columnFilters.refPlaceholder')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <TextFilter
                    value={columnFilters.description}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, description: value })}
                    placeholder={t('financial.ledger.columnFilters.descPlaceholder')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <SelectFilter
                    value={columnFilters.project}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, project: value })}
                    options={projects.map(p => ({ value: p.id, label: p.name }))}
                    placeholder={t('financial.ledger.columnFilters.all')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <SelectFilter
                    value={columnFilters.category}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, category: value })}
                    options={categories.map(c => ({ value: c, label: c }))}
                    placeholder={t('financial.ledger.columnFilters.all')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <SelectFilter
                    value={columnFilters.type}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, type: value })}
                    options={[
                      { value: 'income', label: t('financial.income') },
                      { value: 'expense', label: t('financial.expense') }
                    ]}
                    placeholder={t('financial.ledger.columnFilters.all')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <SelectFilter
                    value={columnFilters.paymentMethod}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, paymentMethod: value })}
                    options={paymentMethods.map(pm => ({ value: pm, label: pm }))}
                    placeholder={t('financial.ledger.columnFilters.all')}
                  />
                </TableHead>
                <TableHead className="p-2">
                  <TextFilter
                    value={columnFilters.recipientPayer}
                    onChange={(value) => onColumnFiltersChange({ ...columnFilters, recipientPayer: value })}
                    placeholder={t('financial.ledger.columnFilters.namePlaceholder')}
                  />
                </TableHead>
                <TableHead className="p-2 align-top">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('financial.ledger.columns.debit')}
                      </span>
                      <NumberRangeFilter
                        min={columnFilters.debitMin}
                        max={columnFilters.debitMax}
                        onMinChange={(value) => onColumnFiltersChange({ ...columnFilters, debitMin: value })}
                        onMaxChange={(value) => onColumnFiltersChange({ ...columnFilters, debitMax: value })}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('financial.ledger.columns.credit')}
                      </span>
                      <NumberRangeFilter
                        min={columnFilters.creditMin}
                        max={columnFilters.creditMax}
                        onMinChange={(value) => onColumnFiltersChange({ ...columnFilters, creditMin: value })}
                        onMaxChange={(value) => onColumnFiltersChange({ ...columnFilters, creditMax: value })}
                      />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t('financial.ledger.columns.balance')}
                      </span>
                      <NumberRangeFilter
                        min={columnFilters.balanceMin}
                        max={columnFilters.balanceMax}
                        onMinChange={(value) => onColumnFiltersChange({ ...columnFilters, balanceMin: value })}
                        onMaxChange={(value) => onColumnFiltersChange({ ...columnFilters, balanceMax: value })}
                      />
                    </div>
                  </div>
                </TableHead>
                <TableHead className="p-2"></TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <LedgerTableRow
                key={entry.id}
                entry={entry}
                index={index}
                formatCurrency={formatCurrency}
                financialCategories={financialCategories}
                t={t}

                onEdit={onEdit}
                onDelete={handleDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
