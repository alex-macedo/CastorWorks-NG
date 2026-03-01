import { useState, useMemo } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useProjects } from "@/hooks/useProjects";
import { LedgerFilters } from "@/components/Financial/LedgerFilters";
import { LedgerSummary } from "@/components/Financial/LedgerSummary";
import { LedgerTable } from "@/components/Financial/LedgerTable";
import { LedgerPagination } from "@/components/Financial/LedgerPagination";
import { ExportButton } from "@/components/Financial/ExportButton";
import { Button } from "@/components/ui/button";
import { Plus, LayoutList, ListTree } from "lucide-react";
import { FinancialEntryForm } from "@/components/Financial/FinancialEntryForm";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HierarchicalLedgerTable } from "@/components/Financial/HierarchicalLedgerTable";
import { useProjectWBS } from "@/hooks/useProjectWBS";
import type { FilterState, ColumnFilters } from "@/types/ledger";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function FinancialLedger() {
  const { t } = useLocalization();
  const { financialEntries, isLoading } = useFinancialEntries();
  const { projects } = useProjects();
  
  const [viewMode, setViewMode] = useState<"flat" | "hierarchical">("flat");
  
  const entries = useMemo(() => financialEntries ?? [], [financialEntries]);
  const projectList = projects ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("income");
  const [editingEntry, setEditingEntry] = useState<typeof financialEntries[0] | undefined>();

  const [filters, setFilters] = useState<FilterState>(() => {
    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    return {
      projects: [],
      categories: [],
      type: 'all',
      startDate: ninetyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      search: ''
    };
  });

  const selectedProjectId = filters.projects.length === 1 ? filters.projects[0] : undefined;
  const { data: wbsHierarchy } = useProjectWBS(selectedProjectId);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'date', direction: 'desc' });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    dateFrom: '',
    dateTo: '',
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
    balanceMax: null
  });

  // Get unique categories from financial entries
  const categories = useMemo(() => {
    const cats = new Set<string>();
    entries.forEach(entry => {
      if (entry.category) cats.add(entry.category);
    });
    return Array.from(cats);
  }, [entries]);

  // Apply global filters
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          entry.description?.toLowerCase().includes(searchLower) ||
          entry.reference?.toLowerCase().includes(searchLower) ||
          entry.recipient_payer?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Project filter
      if (filters.projects.length > 0 && entry.project_id && !filters.projects.includes(entry.project_id)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && entry.category && !filters.categories.includes(entry.category)) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && entry.entry_type !== filters.type) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const entryDate = new Date(entry.date);
        const startDate = new Date(filters.startDate);
        if (entryDate < startDate) return false;
      }
      if (filters.endDate) {
        const entryDate = new Date(entry.date);
        const endDate = new Date(filters.endDate);
        if (entryDate > endDate) return false;
      }

      return true;
    });
  }, [entries, filters]);

  // Apply column filters
  const columnFilteredEntries = useMemo(() => {
    return filteredEntries.filter(entry => {
      // Date range filter
      if (columnFilters.dateFrom) {
        const entryDate = new Date(entry.date);
        const fromDate = new Date(columnFilters.dateFrom);
        if (entryDate < fromDate) return false;
      }
      if (columnFilters.dateTo) {
        const entryDate = new Date(entry.date);
        const toDate = new Date(columnFilters.dateTo);
        if (entryDate > toDate) return false;
      }

      // Reference filter
      if (columnFilters.reference && !entry.reference?.toLowerCase().includes(columnFilters.reference.toLowerCase())) {
        return false;
      }

      // Description filter
      if (columnFilters.description && !entry.description?.toLowerCase().includes(columnFilters.description.toLowerCase())) {
        return false;
      }

      // Project filter
      if (columnFilters.project !== 'all' && entry.project_id !== columnFilters.project) {
        return false;
      }

      // Category filter
      if (columnFilters.category !== 'all' && entry.category !== columnFilters.category) {
        return false;
      }

      // Type filter
      if (columnFilters.type !== 'all' && entry.entry_type !== columnFilters.type) {
        return false;
      }

      // Payment method filter
      if (columnFilters.paymentMethod !== 'all' && entry.payment_method !== columnFilters.paymentMethod) {
        return false;
      }

      // Recipient/Payer filter
      if (columnFilters.recipientPayer && !entry.recipient_payer?.toLowerCase().includes(columnFilters.recipientPayer.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [filteredEntries, columnFilters]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    const sorted = [...columnFilteredEntries];
    sorted.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof typeof a];
      let bVal: any = b[sortConfig.key as keyof typeof b];

      if (sortConfig.key === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [columnFilteredEntries, sortConfig]);

  // Add running balance
  const entriesWithBalance = useMemo(() => {
    let balance = 0;
    return sortedEntries.map(entry => {
      if (entry.entry_type === 'income') {
        balance += entry.amount;
      } else {
        balance -= entry.amount;
      }
      return { ...entry, balance };
    });
  }, [sortedEntries]);

  // Apply balance filters
  const balanceFilteredEntries = useMemo(() => {
    return entriesWithBalance.filter(entry => {
      // Debit filters (expenses)
      const debit = entry.entry_type === 'expense' ? entry.amount : 0;
      if (columnFilters.debitMin !== null && debit < columnFilters.debitMin) return false;
      if (columnFilters.debitMax !== null && debit > columnFilters.debitMax) return false;

      // Credit filters (income)
      const credit = entry.entry_type === 'income' ? entry.amount : 0;
      if (columnFilters.creditMin !== null && credit < columnFilters.creditMin) return false;
      if (columnFilters.creditMax !== null && credit > columnFilters.creditMax) return false;

      // Balance filters
      if (columnFilters.balanceMin !== null && entry.balance < columnFilters.balanceMin) return false;
      if (columnFilters.balanceMax !== null && entry.balance > columnFilters.balanceMax) return false;

      return true;
    });
  }, [entriesWithBalance, columnFilters]);

  // Pagination
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return balanceFilteredEntries.slice(startIndex, endIndex);
  }, [balanceFilteredEntries, currentPage, rowsPerPage]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalIncome = balanceFilteredEntries
      .filter(e => e.entry_type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalExpenses = balanceFilteredEntries
      .filter(e => e.entry_type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: balanceFilteredEntries.length
    };
  }, [balanceFilteredEntries]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (entry: typeof financialEntries[0]) => {
    setEditingEntry(entry);
    setFormType(entry.entry_type);
    setFormOpen(true);
  };

  const handleNewEntry = (type: 'income' | 'expense') => {
    setEditingEntry(undefined);
    setFormType(type);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('financial.ledger.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('financial.ledger.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
              <ToggleGroupItem value="flat" size="sm" variant="outline" className="h-8 px-2 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 data-[state=on]:bg-white/30 data-[state=on]:text-white backdrop-blur-sm" title={t('financial.ledger.filters.flat')}>
                <LayoutList className="h-3.5 w-3.5 mr-1.5" />
                {t('financial.ledger.filters.flat')}
              </ToggleGroupItem>
              <ToggleGroupItem value="hierarchical" size="sm" variant="outline" className="h-8 px-2 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20 data-[state=on]:bg-white/30 data-[state=on]:text-white backdrop-blur-sm" title={t('financial.ledger.filters.wbs')}>
                <ListTree className="h-3.5 w-3.5 mr-1.5" />
                {t('financial.ledger.filters.wbs')}
              </ToggleGroupItem>
            </ToggleGroup>
            <Button 
              variant="glass-style-white"
              onClick={() => handleNewEntry('income')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('financial.income')}
            </Button>
            <Button 
              variant="glass-style-white"
              onClick={() => handleNewEntry('expense')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('financial.expense')}
            </Button>
            <ExportButton 
              variant="glass-style-white"
              entries={balanceFilteredEntries} 
            />
          </div>
        </div>
      </SidebarHeaderShell>

      <LedgerSummary summary={summary} />

      <LedgerFilters
        filters={filters}
        onUpdateFilters={setFilters}
        projects={projectList}
        categories={categories}
      />

      <div className="pt-1">
        {viewMode === "flat" ? (
          <>
            <LedgerTable
              entries={paginatedEntries}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={handleEdit}
              isLoading={isLoading}
              columnFilters={columnFilters}
              onColumnFiltersChange={setColumnFilters}
              projects={projectList}
              categories={categories}
            />

            <LedgerPagination
              currentPage={currentPage}
              totalPages={Math.ceil(balanceFilteredEntries.length / rowsPerPage)}
              rowsPerPage={rowsPerPage}
              totalEntries={balanceFilteredEntries.length}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </>
        ) : (
          <HierarchicalLedgerTable
            wbsHierarchy={wbsHierarchy || []}
            entries={balanceFilteredEntries}
            onEdit={handleEdit}
            isLoading={isLoading}
          />
        )}
      </div>

      <FinancialEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultType={formType}
        entry={editingEntry}
      />
    </div>
  );
}
