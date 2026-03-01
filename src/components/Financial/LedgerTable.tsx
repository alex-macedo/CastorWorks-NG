import { useState } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
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
import { ArrowUpDown, Edit, Trash2, Folder, Tag, CreditCard, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { formatDate } from "@/utils/reportFormatters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ColumnFilters } from "@/types/ledger";

const SortButton = ({ column, label, onSort, active }: { column: string; label: string; onSort: (key: string) => void; active?: boolean }) => (
  <Button
    variant="ghost"
    size="sm"
    className={cn("-ml-3 h-8 text-xs font-bold uppercase tracking-wider p-0 hover:bg-transparent", active && "text-primary")}
    onClick={() => onSort(column)}
  >
    {label}
    <ArrowUpDown className="ml-2 h-3 w-3" />
  </Button>
);

interface LedgerTableProps {
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

export function LedgerTable({
  entries,
  sortConfig,
  onSort,
  onEdit,
  isLoading,
}: LedgerTableProps) {
  const { t, currency } = useLocalization();
  const { deleteEntry } = useFinancialEntries();
  const { toast } = useToast();

  const translateCategory = (category: string) => {
    const keyMap: Record<string, string> = {
      'Labor': 'common.labor',
      'Materials': 'common.materials',
      'Equipment': 'common.equipment',
      'Taxes': 'common.taxes',
      'Logistics': 'common.logistics',
      'Other': 'common.other'
    };
    const key = keyMap[category] || 'common.other';
    return t(key);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('common.confirm'))) {
      try {
        await deleteEntry.mutateAsync(id);
        toast({ title: t('common.success'), description: t('toast.entryDeletedSuccessfully') });
      } catch (error) {
        toast({ title: t('common.errorTitle'), description: t('toast.failedToDeleteEntry'), variant: "destructive" });
      }
    }
  };

  if (isLoading) return <Card className="p-12 text-center text-muted-foreground">{t('common.loading')}</Card>;

  return (
    <Card className="overflow-hidden border-none shadow-2xl bg-background/50 backdrop-blur-md">
      <div className="overflow-x-auto">
        <Table className="w-full border-collapse">
          <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[250px] py-1.5 px-6 text-[10px] uppercase font-black tracking-widest text-slate-500">
                <SortButton column="description" label={t('financial.ledger.columns.information')} onSort={onSort} active={sortConfig.key === 'description'} />
              </TableHead>
              <TableHead className="w-[240px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">
                <SortButton column="project_id" label={t('financial.ledger.columns.context')} onSort={onSort} active={sortConfig.key === 'project_id'} />
              </TableHead>
              <TableHead className="w-[100px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.type')}</TableHead>
              <TableHead className="w-[240px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.recipientPayer')}</TableHead>
              <TableHead className="w-[150px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.audit')}</TableHead>
              <TableHead className="w-[220px] text-right py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500 pr-8">{t('financial.ledger.columns.balance')}</TableHead>
              <TableHead className="w-[100px] text-right py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500 pr-6">{t('financial.ledger.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">{t('financial.ledger.noEntries')}</TableCell></TableRow>
            ) : (
              entries.map((entry, index) => (
                <TableRow 
                  key={entry.id}
                  className={cn(
                    "group transition-all border-b border-muted/20 hover:bg-slate-50/50 dark:hover:bg-slate-900/30",
                    index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-100/60 dark:bg-slate-900/40"
                  )}
                >
                  <TableCell className="py-1 px-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest tabular-nums">
                        {formatDate(entry.date)}
                      </span>
                      <span className="text-sm text-slate-900 dark:text-slate-100 leading-tight break-words">
                        {entry.description || t('financial.noDescription')}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <Folder className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span className="break-words leading-tight">{entry.projects?.name || t('common.notAssigned')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                        <Tag className="h-3 w-3 text-blue-500 shrink-0" />
                        <span>{translateCategory(entry.category)}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-1">
                    <Badge variant={entry.entry_type === 'income' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-tighter">
                      {entry.entry_type === 'income' ? t('financial.income') : t('financial.expense')}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-1">
                    <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <User className="h-3.5 w-3.5 opacity-60 shrink-0 mt-0.5" />
                      <span className="break-words leading-tight">{entry.recipient_payer || '-'}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-muted/60 px-1.5 py-0 rounded w-fit">
                        {entry.reference || t('financial.notAvailable')}
                      </span>
                      <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                        <CreditCard className="h-3 w-3 opacity-60 shrink-0 mt-0.5" />
                        <span className="break-words leading-tight">{entry.payment_method || '-'}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right py-1 px-6">
                    <div className="flex flex-col items-end gap-0.5 tabular-nums">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-tighter">{t('financial.ledger.columns.credit')}</span>
                        <span className="text-xs min-w-[80px] text-right text-emerald-600 dark:text-emerald-400">
                          {entry.entry_type === 'income' ? formatCurrency(Number(entry.amount)) : formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-tighter w-12 text-right">{t('financial.ledger.columns.debit')}</span>
                        <span className="text-xs min-w-[80px] text-right text-red-600 dark:text-red-400">
                          {entry.entry_type === 'expense' ? formatCurrency(Number(entry.amount)) : formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 pt-0.5 border-t border-muted w-full justify-end">
                        <span className="text-muted-foreground text-[9px] uppercase font-black tracking-tighter">{t('financial.ledger.columns.balance')}</span>
                        <span className={cn(
                          "text-xs min-w-[80px] text-right",
                          entry.balance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                        )}>
                          {formatCurrency(entry.balance)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right px-6 py-1">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => onEdit(entry)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDelete(entry.id)}><Trash2 className="h-3.5 w-3.5 text-destructive/70" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
