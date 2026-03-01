import * as React from "react";
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
import { ChevronDown, ChevronRight, Edit, Trash2, Tag, Folder, ListTree, CreditCard, User, Receipt, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { formatDate } from "@/utils/reportFormatters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { WBSHierarchyNode } from "@/types/wbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HierarchicalLedgerTableProps {
  wbsHierarchy: WBSHierarchyNode[];
  entries: any[];
  onEdit: (entry: any) => void;
  isLoading: boolean;
}

export function HierarchicalLedgerTable({
  wbsHierarchy,
  entries,
  onEdit,
  isLoading,
}: HierarchicalLedgerTableProps) {
  const { t, currency } = useLocalization();
  const { deleteEntry } = useFinancialEntries();
  const { toast } = useToast();
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({ "01": true, "02": true, "03": true });

  const formatCurrencyValue = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const toggleNode = (code: string) => {
    setExpandedNodes(prev => ({ ...prev, [code]: !prev[code] }));
  };

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

  const calculateNodeTotal = (node: WBSHierarchyNode): number => {
    const nodeEntries = entries.filter(e => e.wbs_node_id === node.id);
    const entriesTotal = nodeEntries.reduce((acc, curr) => {
      const amount = Number(curr.amount) || 0;
      return curr.entry_type === 'income' ? acc + amount : acc - amount;
    }, 0);

    const childrenTotal = node.children?.reduce((acc, child) => acc + calculateNodeTotal(child), 0) || 0;
    
    return entriesTotal + childrenTotal;
  };

  const renderWBSNode = (node: WBSHierarchyNode, depth = 0) => {
    const isExpanded = expandedNodes[node.code];
    const nodeEntries = entries.filter(e => e.wbs_node_id === node.id);
    const total = calculateNodeTotal(node);
    const hasContent = nodeEntries.length > 0 || (node.children && node.children.length > 0);

    return (
      <React.Fragment key={node.id}>
        <TableRow className={cn(
          "group transition-colors",
          depth === 0 ? "bg-slate-50/80 dark:bg-slate-900/50 font-bold" : "bg-transparent"
        )}>
          <TableCell className={cn(
            "py-1.5 px-6",
            depth === 0 ? "border-l-4 border-l-orange-500" : "border-l-2 border-l-muted/20"
          )}>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {hasContent ? (
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-orange-100 dark:hover:bg-orange-900/30" onClick={() => toggleNode(node.code)}>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-orange-600" /> : <ChevronRight className="h-3.5 w-3.5 text-orange-600" />}
                </Button>
              ) : <div className="w-6 shrink-0" />}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">{node.code}</span>
                <span className="truncate text-slate-900 dark:text-slate-100 font-bold">
                  {node.title === "Uncategorized" ? t('common.uncategorized') : node.title}
                </span>
              </div>
            </div>
          </TableCell>
          
          <TableCell />
          <TableCell />
          <TableCell />
          <TableCell />
          
          <TableCell className="text-right py-1.5 pr-8">
            <div className="flex items-center justify-end gap-3 tabular-nums text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-tighter">{t('financial.ledger.nodeAggregation')}</span>
              <span className={cn("text-sm", total >= 0 ? "text-emerald-600" : "text-red-600")}>
                {formatCurrencyValue(total)}
              </span>
            </div>
          </TableCell>
          <TableCell />
        </TableRow>

        {isExpanded && nodeEntries.map((entry, index) => (
          <TableRow 
            key={entry.id} 
            className={cn(
              "hover:bg-primary/5 transition-colors border-b border-muted/30 group/item",
              index % 2 === 0 ? "bg-white dark:bg-slate-950" : "bg-slate-100/50 dark:bg-slate-900/40"
            )}
          >
            <TableCell className="py-1 px-6 border-l-2 border-l-muted/10">
              <div className="flex flex-col gap-0.5" style={{ paddingLeft: `${(depth + 1) * 20 + 32}px` }}>
                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest tabular-nums shrink-0">{formatDate(entry.date)}</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-tight break-words">
                  {entry.description || t('financial.noDescription')}
                </span>
                
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {entry.original_currency && entry.original_currency !== 'BRL' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 cursor-help">
                            <Globe className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">
                              {entry.original_amount} {entry.original_currency}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[10px] font-medium">
                            {t('financial.ledger.columns.exchangeRate', { defaultValue: 'Exchange Rate' })}: 1 {entry.original_currency} = {entry.exchange_rate} BRL
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {entry.total_tax_withholding > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-help">
                            <Receipt className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">
                              {t('financial.ledger.columns.taxWithheld', { defaultValue: 'Tax Withheld' })}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 space-y-2">
                          <p className="text-xs font-bold border-b pb-1 mb-1">{t('financial.entryForm.serviceTaxesLabel', { defaultValue: 'Service Tax Withholdings' })}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                            {entry.iss_amount > 0 && (
                              <>
                                <span className="text-muted-foreground">ISS ({entry.iss_tax_rate}%):</span>
                                <span className="font-mono text-right">{formatCurrencyValue(entry.iss_amount)}</span>
                              </>
                            )}
                            {entry.inss_amount > 0 && (
                              <>
                                <span className="text-muted-foreground">INSS ({entry.inss_tax_rate}%):</span>
                                <span className="font-mono text-right">{formatCurrencyValue(entry.inss_amount)}</span>
                              </>
                            )}
                            {entry.pis_amount > 0 && (
                              <>
                                <span className="text-muted-foreground">PIS ({entry.pis_tax_rate}%):</span>
                                <span className="font-mono text-right">{formatCurrencyValue(entry.pis_amount)}</span>
                              </>
                            )}
                            {entry.cofins_amount > 0 && (
                              <>
                                <span className="text-muted-foreground">COFINS ({entry.cofins_tax_rate}%):</span>
                                <span className="font-mono text-right">{formatCurrencyValue(entry.cofins_amount)}</span>
                              </>
                            )}
                            {entry.csll_amount > 0 && (
                              <>
                                <span className="text-muted-foreground">CSLL ({entry.csll_tax_rate}%):</span>
                                <span className="font-mono text-right">{formatCurrencyValue(entry.csll_amount)}</span>
                              </>
                            )}
                            <div className="col-span-2 border-t mt-1 pt-1 flex justify-between font-bold">
                              <span>Total:</span>
                              <span>{formatCurrencyValue(entry.total_tax_withholding)}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell className="w-[200px] py-1">
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Folder className="h-3.5 w-3.5 text-orange-500/70 shrink-0 mt-0.5" />
                  <span className="break-words leading-tight">{entry.projects?.name || t('common.notAssigned')}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <Tag className="h-3 w-3 text-blue-500/70 shrink-0" />
                  <span>{translateCategory(entry.category)}</span>
                </div>
              </div>
            </TableCell>

            <TableCell className="w-[100px] py-1">
              <Badge variant={entry.entry_type === 'income' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1.5 font-bold uppercase tracking-tighter">
                {entry.entry_type === 'income' ? t('financial.income') : t('financial.expense')}
              </Badge>
            </TableCell>

            <TableCell className="w-[200px] py-1">
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <User className="h-3.5 w-3.5 opacity-60 shrink-0 mt-0.5" />
                <span className="break-words leading-tight">{entry.recipient_payer || '-'}</span>
              </div>
            </TableCell>

            <TableCell className="w-[150px] py-1">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-muted/60 px-1.5 py-0 rounded w-fit truncate">
                  {entry.reference || t('financial.notAvailable')}
                </span>
                <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                  <CreditCard className="h-3 w-3 opacity-60 shrink-0 mt-0.5" />
                  <span className="break-words leading-tight">{entry.payment_method || '-'}</span>
                </div>
              </div>
            </TableCell>

            <TableCell className="text-right py-1 pr-8 w-[220px]">
              <div className="flex flex-col items-end gap-0.5 tabular-nums leading-none">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-tighter">{t('financial.ledger.columns.credit')}</span>
                  <span className="text-xs min-w-[80px] text-right text-emerald-600 dark:text-emerald-400">
                    {entry.entry_type === 'income' ? formatCurrencyValue(Number(entry.amount)) : formatCurrencyValue(0)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-tighter">{t('financial.ledger.columns.debit')}</span>
                  <span className="text-xs min-w-[80px] text-right text-red-600 dark:text-red-400">
                    {entry.entry_type === 'expense' ? formatCurrencyValue(Number(entry.amount)) : formatCurrencyValue(0)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 pt-0.5 border-t border-muted/30 w-full justify-end">
                  <span className="text-muted-foreground text-[9px] uppercase font-black tracking-tighter">{t('financial.ledger.columns.balance')}</span>
                  <span className={cn(
                    "text-xs min-w-[80px] text-right",
                    entry.balance >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
                  )}>
                    {formatCurrencyValue(entry.balance)}
                  </span>
                </div>
              </div>
            </TableCell>

            <TableCell className="text-right pr-6 w-[100px] py-1">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
                  <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}

        {isExpanded && node.children?.map(child => renderWBSNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  if (isLoading) return <Card className="p-12 text-center text-muted-foreground">{t('common.loading')}</Card>;

  return (
    <Card className="overflow-hidden border-none shadow-2xl bg-background/50 backdrop-blur-md">
      <div className="overflow-x-auto">
        <Table className="w-full border-collapse table-auto">
          <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[300px] py-1.5 px-6 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.information')}</TableHead>
              <TableHead className="w-[200px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500 whitespace-nowrap">{t('financial.ledger.columns.context')}</TableHead>
              <TableHead className="w-[100px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.type')}</TableHead>
              <TableHead className="w-[200px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.recipientPayer')}</TableHead>
              <TableHead className="w-[150px] py-1.5 text-[10px] uppercase font-black tracking-widest text-slate-500">{t('financial.ledger.columns.audit')}</TableHead>
              <TableHead className="w-[220px] py-1.5 text-right text-[10px] uppercase font-black tracking-widest text-slate-500 pr-8">{t('financial.ledger.columns.financials')}</TableHead>
              <TableHead className="w-[100px] py-1.5 text-right text-[10px] uppercase font-black tracking-widest text-slate-500 pr-6">{t('financial.ledger.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wbsHierarchy.length > 0 ? (
              wbsHierarchy.map(root => renderWBSNode(root))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                    <ListTree className="h-12 w-12 opacity-20" />
                    <p className="text-sm font-medium">{t('financial.ledger.noWbsFound')}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
