import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownCircle, ArrowUpCircle, Loader2, AlertCircle, User as UserIcon, Info, Briefcase, CreditCard, Edit, Globe, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/ui/DateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useClientPortalAuth } from "@/hooks/clientPortal/useClientPortalAuth";
import { formatCurrency } from "@/utils/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCostCodeFromCategory } from "@/utils/categoryToCostCodeMap";
import { useProjectWBS } from "@/hooks/useProjectWBS";
import { useCostCodes } from "@/hooks/useCostCodes";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calculateTaxWithholdings, DEFAULT_TAX_RATES } from "@/utils/taxCalculations";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchExchangeRate, SUPPORTED_CURRENCIES } from "@/utils/currencyService";
import type { Database } from "@/integrations/supabase/types";
import type { WBSHierarchyNode } from "@/types/wbs";

type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];

const createEntrySchema = (t: (key: string) => string) => z.object({
  entry_type: z.enum(["income", "expense"]),
  project_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  phase_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  cost_code_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  wbs_node_id: z.string().uuid().or(z.literal("")).optional().nullable(),
  category: z.string().min(1, t('financial.entryForm.validation.categoryRequired')),
  amount: z.coerce.number().positive(t('financial.entryForm.validation.amountPositive')),
  date: z.string(),
  payment_method: z.string().optional().nullable(),
  recipient_payer: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  // Multi-Currency Fields
  original_amount: z.coerce.number().optional().nullable(),
  original_currency: z.string().default("BRL"),
  exchange_rate: z.coerce.number().default(1),
  // Tax Engine Fields
  is_service_entry: z.boolean().default(false),
  gross_amount: z.coerce.number().default(0),
  iss_tax_rate: z.coerce.number().default(DEFAULT_TAX_RATES.ISS),
  inss_tax_rate: z.coerce.number().default(DEFAULT_TAX_RATES.INSS),
  pis_tax_rate: z.coerce.number().default(DEFAULT_TAX_RATES.PIS),
  cofins_tax_rate: z.coerce.number().default(DEFAULT_TAX_RATES.COFINS),
  csll_tax_rate: z.coerce.number().default(DEFAULT_TAX_RATES.CSLL),
  iss_amount: z.coerce.number().default(0),
  inss_amount: z.coerce.number().default(0),
  pis_amount: z.coerce.number().default(0),
  cofins_amount: z.coerce.number().default(0),
  csll_amount: z.coerce.number().default(0),
  total_tax_withholding: z.coerce.number().default(0),
});

interface FinancialEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: FinancialEntry;
  defaultType?: "income" | "expense";
}

export function FinancialEntryForm({
  open,
  onOpenChange,
  entry,
  defaultType = "income"
}: FinancialEntryFormProps) {
  const { currency, t } = useLocalization();
  
  const defaultValues = React.useMemo(() => ({
    entry_type: (entry?.entry_type || defaultType) as "income" | "expense",
    project_id: entry?.project_id || undefined,
    phase_id: entry?.phase_id || undefined,
    cost_code_id: entry?.cost_code_id || undefined,
    wbs_node_id: (entry as any)?.wbs_node_id || undefined,
    category: entry?.category || "",
    amount: entry?.amount ? Number(entry.amount) : 0,
    date: entry?.date || new Date().toISOString().split('T')[0],
    payment_method: entry?.payment_method || "",
    recipient_payer: entry?.recipient_payer || "",
    reference: entry?.reference || "",
    description: entry?.description || "",
    // Multi-Currency Defaults
    original_amount: (entry as any)?.original_amount || entry?.amount || 0,
    original_currency: (entry as any)?.original_currency || "BRL",
    exchange_rate: (entry as any)?.exchange_rate || 1,
    is_service_entry: (entry as any)?.is_service_entry || false,
    gross_amount: (entry as any)?.gross_amount || entry?.amount || 0,
    iss_tax_rate: (entry as any)?.iss_tax_rate || DEFAULT_TAX_RATES.ISS,
    inss_tax_rate: (entry as any)?.inss_tax_rate || DEFAULT_TAX_RATES.INSS,
    pis_tax_rate: (entry as any)?.pis_tax_rate || DEFAULT_TAX_RATES.PIS,
    cofins_tax_rate: (entry as any)?.cofins_tax_rate || DEFAULT_TAX_RATES.COFINS,
    csll_tax_rate: (entry as any)?.csll_tax_rate || DEFAULT_TAX_RATES.CSLL,
    iss_amount: (entry as any)?.iss_amount || 0,
    inss_amount: (entry as any)?.inss_amount || 0,
    pis_amount: (entry as any)?.pis_amount || 0,
    cofins_amount: (entry as any)?.cofins_amount || 0,
    csll_amount: (entry as any)?.csll_amount || 0,
    total_tax_withholding: (entry as any)?.total_tax_withholding || 0,
  }), [defaultType, entry]);

  const entrySchema = React.useMemo(() => createEntrySchema(t), [t]);
  
  const form = useForm<any>({
    resolver: zodResolver(entrySchema),
    defaultValues,
  });

  const { createEntry, updateEntry } = useFinancialEntries();
  const { toast } = useToast();
  const { projects: allProjects } = useProjects();
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUserProfile();
  const { isAuthenticated: isClientPortal, projectId: clientProjectId } = useClientPortalAuth();

  const watchProjectId = useWatch({ control: form.control, name: "project_id" });
  const { data: wbsNodes } = useProjectWBS(watchProjectId || undefined);
  const { data: costCodes } = useCostCodes();

  const projects = React.useMemo(() => {
    if (!allProjects) return [];
    if (isClientPortal && currentUser?.id) {
      return allProjects.filter(project => project.id === clientProjectId);
    }
    return allProjects;
  }, [allProjects, isClientPortal, currentUser?.id, clientProjectId]);

  const onInvalid = (errors: any) => {
    console.error("Form validation failed:", errors);
    toast({
      title: t('common.errorTitle'),
      description: t('financial.entryForm.validation.pleaseCheckFields'),
      variant: "destructive"
    });
  };

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchAmount = useWatch({ control: form.control, name: "amount" });
  const watchCategory = useWatch({ control: form.control, name: "category" });
  const watchCostCodeId = useWatch({ control: form.control, name: "cost_code_id" });
  const watchIsService = useWatch({ control: form.control, name: "is_service_entry" });
  const watchGrossAmount = useWatch({ control: form.control, name: "gross_amount" });
  const watchIssRate = useWatch({ control: form.control, name: "iss_tax_rate" });
  const watchInssRate = useWatch({ control: form.control, name: "inss_tax_rate" });
  const watchPisRate = useWatch({ control: form.control, name: "pis_tax_rate" });
  const watchCofinsRate = useWatch({ control: form.control, name: "cofins_tax_rate" });
  const watchCsllRate = useWatch({ control: form.control, name: "csll_tax_rate" });
  
  // Multi-Currency Watches
  const watchOriginalAmount = useWatch({ control: form.control, name: "original_amount" });
  const watchOriginalCurrency = useWatch({ control: form.control, name: "original_currency" });
  const watchExchangeRate = useWatch({ control: form.control, name: "exchange_rate" });

  const [isFetchingRate, setIsFetchingRate] = React.useState(false);

  // Handle Exchange Rate Fetching
  React.useEffect(() => {
    const updateRate = async () => {
      if (watchOriginalCurrency === 'BRL') {
        form.setValue("exchange_rate", 1);
        return;
      }

      setIsFetchingRate(true);
      try {
        const rate = await fetchExchangeRate(watchOriginalCurrency, 'BRL');
        form.setValue("exchange_rate", rate);
      } finally {
        setIsFetchingRate(false);
      }
    };

    updateRate();
  }, [watchOriginalCurrency, form]);

  // Handle Currency Conversion (Base BRL Amount Calculation)
  React.useEffect(() => {
    if (watchOriginalCurrency !== 'BRL' || Number(watchExchangeRate) !== 1) {
      const calculatedBrl = Number(watchOriginalAmount || 0) * Number(watchExchangeRate || 1);
      
      // If it's a service entry, the tax engine will use this as the Gross Amount
      if (watchIsService) {
        form.setValue("gross_amount", Number(calculatedBrl.toFixed(2)));
      } else {
        form.setValue("amount", Number(calculatedBrl.toFixed(2)), { shouldValidate: true });
      }
    }
  }, [watchOriginalAmount, watchOriginalCurrency, watchExchangeRate, watchIsService, form]);

  // Handle Tax Calculations
  React.useEffect(() => {
    if (watchIsService && Number(watchGrossAmount) > 0) {
      const breakdown = calculateTaxWithholdings(Number(watchGrossAmount), {
        iss: Number(watchIssRate),
        inss: Number(watchInssRate),
        pis: Number(watchPisRate),
        cofins: Number(watchCofinsRate),
        csll: Number(watchCsllRate)
      });

      form.setValue("iss_amount", breakdown.issAmount);
      form.setValue("inss_amount", breakdown.inssAmount);
      form.setValue("pis_amount", breakdown.pisAmount);
      form.setValue("cofins_amount", breakdown.cofinsAmount);
      form.setValue("csll_amount", breakdown.csllAmount);
      form.setValue("total_tax_withholding", breakdown.totalWithholding);
      
      // The final 'amount' is the Net Amount
      form.setValue("amount", breakdown.netAmount, { shouldValidate: true });
    }
  }, [watchIsService, watchGrossAmount, watchIssRate, watchInssRate, watchPisRate, watchCofinsRate, watchCsllRate, form]);

  const selectedProject = React.useMemo(
    () => projects?.find((project) => project.id === watchProjectId),
    [projects, watchProjectId]
  );

  const disableIncome = React.useMemo(
    () => !!selectedProject && !!selectedProject.type && selectedProject.type.toLowerCase().includes('final'),
    [selectedProject],
  );

  React.useEffect(() => {
    if (disableIncome && form.getValues("entry_type") === "income") {
      form.setValue("entry_type", "expense", { shouldDirty: true, shouldTouch: true });
    }
  }, [disableIncome, form]);

  React.useEffect(() => {
    if (watchCategory && !watchCostCodeId && costCodes) {
      const suggestedCode = getCostCodeFromCategory(watchCategory);
      if (suggestedCode) {
        // Find the actual UUID for this canonical code
        const actualCostCode = costCodes.find(c => c.code === suggestedCode);
        if (actualCostCode) {
          form.setValue("cost_code_id", actualCostCode.id);
        }
      }
    }
  }, [watchCategory, watchCostCodeId, costCodes, form]);

  const formattedAmount = React.useMemo(
    () => formatCurrency(Number(watchAmount || 0), currency),
    [currency, watchAmount],
  );

  const onSubmit = async (data: any) => {
    let finalCostCodeId = data.cost_code_id;
    if (finalCostCodeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalCostCodeId)) {
      if (costCodes) {
        const found = costCodes.find(c => c.code === finalCostCodeId);
        finalCostCodeId = found ? found.id : null;
      } else {
        finalCostCodeId = null;
      }
    }

    // Normalize date field: convert empty strings to null
    const normalizeDate = (value: any): string | null => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        return null;
      }
      return String(value).trim() || null;
    };

    const entryData = {
      ...data,
      date: normalizeDate(data.date),
      project_id: data.project_id || null,
      phase_id: data.phase_id || null,
      cost_code_id: finalCostCodeId || null,
      wbs_node_id: data.wbs_node_id || null,
      payment_method: data.payment_method || null,
      recipient_payer: data.recipient_payer || null,
      reference: data.reference || null,
      description: data.description || null,
      // Multi-currency storage
      original_amount: data.original_amount || data.amount,
      original_currency: data.original_currency || 'BRL',
      exchange_rate: data.exchange_rate || 1,
    };

    try {
      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, ...entryData });
      } else {
        await createEntry.mutateAsync(entryData as any);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Form submission failed:", error);
    }
  };

  const isSubmitting = form.formState.isSubmitting || createEntry.isPending || updateEntry.isPending;
  const isEditing = Boolean(entry);
  const isFormDisabled = !currentUser || isLoadingUser || !!userError;

  const flattenWBS = React.useCallback((nodes: WBSHierarchyNode[], depth = 0): { id: string; label: string }[] => {
    let result: { id: string; label: string }[] = [];
    nodes.forEach(node => {
      const translatedTitle = node.title === "Uncategorized" ? t('common.uncategorized') : node.title;
      result.push({ 
        id: node.id, 
        label: `${"\u00A0".repeat(depth * 4)}${node.code} - ${translatedTitle}` 
      });
      if (node.children && node.children.length > 0) {
        result = [...result, ...flattenWBS(node.children, depth + 1)];
      }
    });
    return result;
  }, [t]);

  const flattenedWBS = React.useMemo(() => (wbsNodes ? flattenWBS(wbsNodes) : []), [wbsNodes, flattenWBS]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-5xl h-screen flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              {entry ? (
                <>
                  <Edit className="h-6 w-6 text-orange-500" />
                  {t('financial.entryForm.editTitle')}
                </>
              ) : (
                <>
                  {defaultValues.entry_type === "income" ? <ArrowUpCircle className="h-6 w-6 text-emerald-500" /> : <ArrowDownCircle className="h-6 w-6 text-red-500" />}
                  {defaultValues.entry_type === "income" ? t('financial.entryForm.newInvoice') : t('financial.entryForm.newExpense')}
                </>
              )}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium">
              {t('financial.entryForm.description')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form id="entry-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Info className="h-4 w-4" />
                    {t('financial.entryForm.primaryInformation')}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-muted/50 space-y-4">
                    <FormField
                      control={form.control}
                      name="entry_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.typeLabel')}</FormLabel>
                          <ToggleGroup
                            type="single"
                            value={field.value}
                            onValueChange={(value) => value && field.onChange(value)}
                            className="grid grid-cols-2 gap-2"
                          >
                            <ToggleGroupItem value="income" variant="outline" size="sm" disabled={disableIncome} className="flex-1 justify-center gap-2 h-10 data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-200">
                              <ArrowUpCircle className="h-4 w-4" />
                              <span className="font-bold text-xs">{t('financial.entryForm.inv')}</span>
                            </ToggleGroupItem>
                            <ToggleGroupItem value="expense" variant="outline" size="sm" className="flex-1 justify-center gap-2 h-10 data-[state=on]:bg-red-50 data-[state=on]:text-red-700 data-[state=on]:border-red-200">
                              <ArrowDownCircle className="h-4 w-4" />
                              <span className="font-bold text-xs">{t('financial.entryForm.exp')}</span>
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.dateLabel')}</FormLabel>
                            <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                              {watchIsService ? t('financial.entryForm.netAmountLabel', { defaultValue: 'Net Amount' }) : t('financial.entryForm.totalAmountLabel')}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input {...field} type="number" step="0.01" readOnly={watchIsService || watchOriginalCurrency !== 'BRL'} className={cn("pl-7 font-mono text-sm font-bold h-10", (watchIsService || watchOriginalCurrency !== 'BRL') && "bg-slate-100 dark:bg-slate-800")} />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 border-t border-dashed mt-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Globe className="h-4 w-4" />
                        {t('financial.entryForm.multiCurrencyLabel', { defaultValue: 'Foreign Currency' })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="original_currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.currencyLabel', { defaultValue: 'Currency' })}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {SUPPORTED_CURRENCIES.map(curr => (
                                    <SelectItem key={curr.code} value={curr.code}>
                                      {curr.code} - {curr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {watchOriginalCurrency !== 'BRL' && (
                          <>
                            <FormField
                              control={form.control}
                              name="original_amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.originalAmountLabel', { defaultValue: 'Original Amount' })}</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input {...field} type="number" step="0.01" className="pl-7 font-mono text-sm h-10" />
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                                        {SUPPORTED_CURRENCIES.find(c => c.code === watchOriginalCurrency)?.symbol || '$'}
                                      </span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="exchange_rate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[10px] font-black uppercase text-muted-foreground flex items-center justify-between">
                                    <span>{t('financial.entryForm.exchangeRateLabel', { defaultValue: 'Exchange Rate' })}</span>
                                    {isFetchingRate && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                                  </FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.0001" className="h-10 font-mono text-sm" />
                                  </FormControl>
                                  <p className="text-[9px] text-muted-foreground italic">1 {watchOriginalCurrency} = {watchExchangeRate} BRL</p>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-dashed mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={watchIsService}
                            onCheckedChange={(checked) => form.setValue("is_service_entry", checked)}
                            id="tax-mode"
                          />
                          <Label htmlFor="tax-mode" className="text-xs font-bold uppercase tracking-tighter">
                            {t('financial.entryForm.serviceTaxesLabel', { defaultValue: 'Apply Service Tax Withholdings' })}
                          </Label>
                        </div>
                      </div>

                      {watchIsService && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                          <FormField
                            control={form.control}
                            name="gross_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-emerald-600">
                                  {t('financial.entryForm.grossAmountLabel', { defaultValue: 'Gross Amount (Valor Bruto)' })}
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input {...field} type="number" step="0.01" className="pl-7 font-mono text-sm font-bold h-10 border-emerald-200" />
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">R$</span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name="iss_tax_rate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">ISS (%)</FormLabel>
                                  <FormControl><Input {...field} type="number" className="h-8 text-xs font-mono" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="inss_tax_rate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">INSS (%)</FormLabel>
                                  <FormControl><Input {...field} type="number" className="h-8 text-xs font-mono" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormItem>
                              <FormLabel className="text-[9px] uppercase font-bold text-muted-foreground">Federal (%)</FormLabel>
                              <Input value={Number(watchPisRate || 0) + Number(watchCofinsRate || 0) + Number(watchCsllRate || 0)} readOnly className="h-8 text-xs font-mono bg-slate-50" />
                            </FormItem>
                          </div>

                          <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                             <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Withholding Total (Retenções):</span>
                                <span className="font-bold text-red-600">-{formatCurrency(form.watch('total_tax_withholding'), 'BRL')}</span>
                             </div>
                             <div className="flex justify-between text-[10px] border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                                <span className="text-muted-foreground font-bold">Net Amount (Líquido):</span>
                                <span className="font-black text-emerald-600">{formatCurrency(form.watch('amount'), 'BRL')}</span>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end items-center px-1">
                      <span className={cn("text-[10px] font-black uppercase tracking-tighter", form.watch('entry_type') === 'income' ? 'text-emerald-600' : 'text-red-600')}>
                        {t('financial.entryForm.recordedAs')} {formattedAmount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <CreditCard className="h-4 w-4" />
                    {t('financial.entryForm.auditAndPayer')}
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-dashed space-y-4">
                    <FormField
                      control={form.control}
                      name="recipient_payer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.recipientPayerName')}</FormLabel>
                          <FormControl><Input {...field} placeholder={t('financial.entryForm.recipientPayerPlaceholder')} className="h-10" /></FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.referenceCode')}</FormLabel>
                            <FormControl><Input {...field} placeholder={t('financial.entryForm.referenceCodePlaceholder')} className="h-10 font-mono" /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="payment_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.paymentMethodLabel')}</FormLabel>
                            <FormControl><Input {...field} placeholder={t('financial.entryForm.paymentMethodPlaceholder')} className="h-10" /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Briefcase className="h-4 w-4" />
                    {t('financial.entryForm.projectAssignment')}
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-5 rounded-xl border space-y-4 shadow-sm">
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.projectLabel')}</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value || undefined)} value={field.value || ""}>
                            <FormControl><SelectTrigger className="h-10 font-medium"><SelectValue placeholder={t('financial.entryForm.projectPlaceholder')} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="wbs_node_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-orange-600">{t('financial.entryForm.wbsStructure')}</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value || undefined)} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-10 font-mono text-xs"><SelectValue placeholder={t('financial.entryForm.selectWBS')} /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {flattenedWBS.map((node) => <SelectItem key={node.id} value={node.id}>{node.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.entryForm.categoryLabel')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder={t('financial.entryForm.categoryPlaceholder')} /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="labor">{t('common.labor')}</SelectItem>
                                  <SelectItem value="materials">{t('common.materials')}</SelectItem>
                                  <SelectItem value="equipment">{t('common.equipment')}</SelectItem>
                                  <SelectItem value="taxes">{t('common.taxes')}</SelectItem>
                                  <SelectItem value="logistics">{t('common.logistics')}</SelectItem>
                                  <SelectItem value="other">{t('common.other')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <UserIcon className="h-4 w-4" />
                    {t('financial.entryForm.narrative')}
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl><Textarea {...field} rows={8} placeholder={t('financial.entryForm.descriptionPlaceholder')} className="resize-none rounded-xl border-muted bg-white dark:bg-slate-950" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="p-6 border-t bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center">
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{t('financial.entryForm.loggedBy')}</span>
            <span className="text-xs font-bold">{currentUser?.display_name || 'System User'}</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1 sm:flex-none font-bold text-muted-foreground hover:text-foreground">
              {t('financial.entryForm.cancel')}
            </Button>
            <Button type="submit" form="entry-form" disabled={isSubmitting || isFormDisabled} className="flex-1 sm:flex-none font-black uppercase tracking-wider px-8 bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 text-white transition-all active:scale-95">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? t('financial.entryForm.updateEntry') : t('financial.entryForm.createEntry')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
