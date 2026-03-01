import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import { formatDate } from '@/utils/reportFormatters';
import { Plus, Trash2, Play, Calendar as CalendarIcon, Loader2, X, Check, Layers, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { useBudgetLineItems } from '@/hooks/useBudgetLineItems';
import { cn } from '@/lib/utils';

interface RecurringExpenseManagerProps {
  projectId: string;
}

export const RecurringExpenseManager = ({ projectId }: RecurringExpenseManagerProps) => {
  const { t, currency, dateFormat } = useLocalization();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [wbsOpen, setWbsOpen] = useState(false);
  
  const [newPattern, setNewPattern] = useState({
    description: '',
    amount: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget_line_item_id: '',
  });

  // Fetch the project's main budget (the one with materials template)
  const { data: projectBudget, isLoading: budgetLoading } = useQuery({
    queryKey: ['project-budget-for-recurring', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      // First get the project's budget with materials template
      const { data: budgets, error } = await supabase
        .from('project_budgets')
        .select(`
          id,
          name,
          budget_model,
          budget_template_id,
          budget_templates (
            id,
            has_materials
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!budgets || budgets.length === 0) return null;

      // Prefer budget with materials template, otherwise use the first one
      const budgetWithMaterials = budgets.find((b: any) => 
        b.budget_templates?.has_materials === true
      );
      
      return budgetWithMaterials || budgets[0];
    },
    enabled: !!projectId,
  });

  // Fetch budget line items using the existing hook
  const { lineItems, isLoading: lineItemsLoading } = useBudgetLineItems(projectBudget?.id);

  // Get unique, sorted list of line items for the WBS dropdown
  // These are the "children tasks" from the Budget WITH Materials tab
  const budgetWbsItems = useMemo(() => {
    if (!lineItems || lineItems.length === 0) return [];
    
    // Deduplicate by description to avoid identical items appearing multiple times
    const uniqueDescriptions = new Map<string, typeof lineItems[0]>();
    
    lineItems.forEach(item => {
      // Only include items with valid descriptions
      if (item.description && !uniqueDescriptions.has(item.description)) {
        uniqueDescriptions.set(item.description, item);
      }
    });

    return Array.from(uniqueDescriptions.values())
      .sort((a, b) => (a.description || '').localeCompare(b.description || ''));
  }, [lineItems]);

  // Fetch patterns - now using budget_line_item_id instead of wbs_node_id
  const { data: patterns, isLoading } = useQuery({
    queryKey: ['recurring-patterns', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_expense_patterns')
        .select(`
          *,
          budget_line_item:budget_line_items(description)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create pattern mutation
  const createMutation = useMutation({
    mutationFn: async (pattern: any) => {
      const { data, error } = await supabase
        .from('recurring_expense_patterns')
        .insert([{ ...pattern, project_id: projectId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-patterns', projectId] });
      setIsAdding(false);
      setNewPattern({
        description: '',
        amount: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget_line_item_id: '',
      });
      toast.success(t('common.success'));
    },
  });

  // Delete pattern mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_expense_patterns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-patterns', projectId] });
      toast.success(t('common.deleted'));
    },
  });

  // Manual process mutation
  const processMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-recurring-expenses');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['financial-entries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['recurring-patterns', projectId] });
      toast.success(t('financial.entriesGenerated', { count: data.processed, defaultValue: `${data.processed} entries generated` }));
    },
  });

  const handleAdd = () => {
    if (!newPattern.description || !newPattern.amount) {
      toast.error(t('common.fillAllFields', { defaultValue: 'Please fill all fields' }));
      return;
    }
    createMutation.mutate({
      ...newPattern,
      amount: parseFloat(newPattern.amount),
      budget_line_item_id: newPattern.budget_line_item_id || null,
      end_date: newPattern.end_date || null,
    });
  };

  if (isLoading || budgetLoading || lineItemsLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  const selectedBudgetItem = budgetWbsItems.find((item) => item.id === newPattern.budget_line_item_id);

  return (
    <div className="space-y-4">
      {/* Inline Header & Form Row */}
      <div className="bg-muted/20 p-3 rounded-lg border">
        {!isAdding ? (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t('financial.recurringExpenses', { defaultValue: 'Recurring Expenses' })}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
                <Play className="mr-2 h-3.5 w-3.5" />
                {t('financial.processNow', { defaultValue: 'Process Now' })}
              </Button>
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                {t('common.add')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3 w-full">
              {/* Description */}
              <div className="flex-[2] min-w-[200px] space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.recurring.description')}</label>
                <Input 
                  className="h-8 text-sm"
                  value={newPattern.description} 
                  onChange={(e) => setNewPattern({...newPattern, description: e.target.value})}
                  placeholder={t('financial.recurringPlaceholder')}
                />
              </div>

              {/* Amount */}
              <div className="w-32 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.recurring.amount')}</label>
                <Input 
                  type="number" 
                  className="h-8 text-sm"
                  value={newPattern.amount} 
                  onChange={(e) => setNewPattern({...newPattern, amount: e.target.value})}
                />
              </div>

              {/* Frequency */}
              <div className="w-32 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.recurring.frequency')}</label>
                <Select value={newPattern.frequency} onValueChange={(val) => setNewPattern({...newPattern, frequency: val})}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('financial.recurring.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('financial.recurring.weekly')}</SelectItem>
                    <SelectItem value="bi-weekly">{t('financial.recurring.bi-weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('financial.recurring.monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('financial.recurring.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* WBS / Budget Item */}
              <div className="flex-[1.5] min-w-[180px] space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.ledger.wbs', { defaultValue: 'WBS / Budget Item' })}</label>
                <Popover open={wbsOpen} onOpenChange={setWbsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={wbsOpen}
                      className="w-full h-8 justify-between text-sm font-normal"
                    >
                      <span className="truncate">
                        {selectedBudgetItem ? selectedBudgetItem.description : t('common.select', { defaultValue: 'Select...' })}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('common.search', { defaultValue: 'Search...' })} className="h-9" />
                      <CommandList>
                        <CommandEmpty>{t('common.noData')}</CommandEmpty>
                        <CommandGroup>
                          {budgetWbsItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`${item.description} ${item.id}`}
                              onSelect={() => {
                                setNewPattern({ ...newPattern, budget_line_item_id: item.id });
                                setWbsOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newPattern.budget_line_item_id === item.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span>{item.description}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Start Date */}
              <div className="w-44 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.recurring.startDate')}</label>
                <CalendarDatePicker 
                  className="h-8 w-full"
                  value={newPattern.start_date} 
                  onChange={(date) => setNewPattern({...newPattern, start_date: date})}
                  placeholder={t('financial.recurring.startDate')}
                />
              </div>

              {/* End Date */}
              <div className="w-44 space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">{t('financial.recurring.endDate')}</label>
                <CalendarDatePicker 
                  className="h-8 w-full"
                  value={newPattern.end_date} 
                  onChange={(date) => setNewPattern({...newPattern, end_date: date})}
                  placeholder={t('financial.recurring.endDate')}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pb-0.5">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4" />
                </Button>
                <Button size="sm" className="h-8 px-3" onClick={handleAdd} disabled={createMutation.isPending}>
                  <Check className="mr-1 h-4 w-4" />
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of existing patterns */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(patterns as any[])?.map((pattern) => (
          <Card key={pattern.id} className="relative group border-none shadow-none bg-muted/10 hover:bg-muted/20 transition-colors">
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-bold uppercase tracking-tight flex justify-between items-center">
                <span className="truncate">{pattern.description}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate(pattern.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-lg font-bold text-right">{formatCurrency(Number(pattern.amount), currency)}</div>
              
              {pattern.budget_line_item?.description && (
                <div className="flex items-center gap-1 text-[9px] text-primary font-medium uppercase mt-0.5">
                  <Layers className="h-2 w-2" />
                  <span className="truncate">{pattern.budget_line_item.description}</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground border-b pb-2 mb-2">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-2.5 w-2.5" />
                  {t(`financial.recurring.${pattern.frequency}`)}
                </div>
                <div className="flex flex-col items-end">
                   <span>{formatDate(pattern.start_date, dateFormat)}</span>
                </div>
              </div>

              {/* Audit Timestamps Row */}
              <div className="flex w-full text-[8px] uppercase font-medium text-muted-foreground/60">
                <div className="flex-1"></div>
                <div className="w-[15%] text-right px-1">
                  <span className="block opacity-70">{t('common.createdAt')}</span>
                  <span className="block text-foreground/70">{formatDate(pattern.created_at, dateFormat)}</span>
                </div>
                <div className="w-[15%] text-right px-1 border-l border-muted/30">
                  <span className="block opacity-70">{t('common.updatedAt')}</span>
                  <span className="block text-foreground/70">{formatDate(pattern.updated_at, dateFormat)}</span>
                </div>
                <div className="w-[15%] text-right px-1 border-l border-muted/30">
                  <span className="block opacity-70">{t('common.lastProcessed')}</span>
                  <span className="block text-foreground/70">
                    {pattern.last_processed_at ? formatDate(pattern.last_processed_at, dateFormat) : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
