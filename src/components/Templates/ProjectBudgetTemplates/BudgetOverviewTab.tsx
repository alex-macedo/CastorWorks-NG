import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { LedgerPagination } from "@/components/Financial/LedgerPagination";
import { useState } from 'react';
import { formatCurrency } from "@/utils/formatters";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BudgetOverviewTabProps {
  projectId: string;
  budgetId: string;
}

export function BudgetOverviewTab({ projectId, budgetId }: BudgetOverviewTabProps) {
  const { t, currency } = useLocalization();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const { data: budgetItems, isLoading } = useQuery({
    queryKey: ['project-budget-items', budgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_line_items')
        .select('*')
        .eq('budget_id', budgetId);
      if (error) throw error;
      return data || [];
    }
  });

  const totals = useMemo(() => {
    if (!budgetItems) return { material: 0, labor: 0, total: 0 };
    return (budgetItems as any[]).reduce((acc, item) => {
      const m = Number(item.unit_cost_material || 0) * Number(item.quantity || 0);
      const l = Number(item.unit_cost_labor || 0) * Number(item.quantity || 0);
      return {
        material: acc.material + m,
        labor: acc.labor + l,
        total: acc.total + m + l
      };
    }, { material: 0, labor: 0, total: 0 });
  }, [budgetItems]);

  if (isLoading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  // Client-side search and pagination
  const filteredItems = (budgetItems as any[] || []).filter((item) => {
    if (!search) return true;
    return String(item.description || '').toLowerCase().includes(search.toLowerCase());
  });

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / rowsPerPage));

  // Ensure current page is within bounds when search or rowsPerPage changes
  if (currentPage > totalPages) setCurrentPage(totalPages);

  const pageItems = filteredItems.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{t('budgets:summary.materials')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.material, currency as any)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{t('budgets:summary.labor')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.labor, currency as any)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary uppercase">{t('budgets:summary.finalTotal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.total, currency as any)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 px-2">
          <div className="w-72">
            <Input
              placeholder={t('budgets:table.searchPlaceholder', { defaultValue: 'Search description...' })}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="h-8 px-2 w-[60%]">{t('budgets:table.description')}</TableHead>
                <TableHead className="h-8 px-2 w-[6%] text-right">{t('budgets:table.quantity')}</TableHead>
                <TableHead className="h-8 px-2 w-[6%]">{t('budgets:table.unit')}</TableHead>
                <TableHead className="h-8 px-2 w-[8%] text-right">{t('budgets:table.material')}</TableHead>
                <TableHead className="h-8 px-2 w-[10%] text-right">{t('budgets:table.labor')}</TableHead>
                <TableHead className="h-8 px-2 w-[10%] text-right">{t('budgets:table.total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pageItems as any[])?.length > 0 ? (
              (pageItems as any[]).map((item, idx) => (
                <TableRow key={item.id} className={idx % 2 === 1 ? 'bg-muted/50' : ''}>
                  <TableCell className="p-2 font-medium w-[60%]">
                    <div>
                      {item.description}
                      {item.sinapi_code && <span className="ml-2 text-[10px] text-muted-foreground font-mono">{item.sinapi_code}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="p-2 text-right w-[6%]">{item.quantity}</TableCell>
                  <TableCell className="p-2 w-[6%]">{item.unit}</TableCell>
                  <TableCell className="p-2 text-right w-[8%]">{formatCurrency(item.unit_cost_material, currency as any)}</TableCell>
                  <TableCell className="p-2 text-right w-[10%]">{formatCurrency(item.unit_cost_labor, currency as any)}</TableCell>
                  <TableCell className="p-2 text-right w-[10%] font-bold">
                    {formatCurrency((Number(item.unit_cost_material) + Number(item.unit_cost_labor)) * Number(item.quantity), currency as any)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        <LedgerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          rowsPerPage={rowsPerPage}
          totalEntries={totalEntries}
          onPageChange={(p) => setCurrentPage(p)}
          onRowsPerPageChange={(r) => { setRowsPerPage(r); setCurrentPage(1); }}
        />
      </div>
    </div>
  );
}
