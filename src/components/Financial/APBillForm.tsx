import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownCircle, Loader2, Receipt, CreditCard, Edit, Globe, RefreshCw } from "lucide-react";

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
import { useLocalization } from "@/contexts/LocalizationContext";
import { useProjects } from "@/hooks/useProjects";
import { useCostCodes } from "@/hooks/useCostCodes";
import { formatCurrency } from "@/utils/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FinancialAPBill, FinancialAPBillInsert, APBillStatus } from "@/types/finance";
import { useFinancialAPWorkspace } from '@/hooks/useFinancialAPWorkspace'

const createBillSchema = (t: (key: string) => string) => z.object({
  project_id: z.string().uuid(t('financial.apBillForm.validation.projectRequired')),
  bill_number: z.string().min(1, t('financial.apBillForm.validation.billNumberRequired')),
  vendor_name: z.string().min(1, t('financial.apBillForm.validation.vendorNameRequired')),
  vendor_cnpj: z.string().optional().nullable(),
  status: z.enum(["pending", "approved", "scheduled", "overdue", "paid", "cancelled", "disputed"] as const).optional(),
  issue_date: z.string(),
  due_date: z.string(),
  amount: z.coerce.number().positive(t('financial.apBillForm.validation.amountPositive')),
  tax_amount: z.coerce.number().default(0),
  total_amount: z.coerce.number().positive(t('financial.apBillForm.validation.totalAmountPositive')),
  currency: z.string().default("BRL"),
  category: z.string().optional().nullable(),
  cost_code_id: z.string().uuid().optional().nullable(),
  phase_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface APBillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: FinancialAPBill;
}

export function APBillForm({
  open,
  onOpenChange,
  bill,
}: APBillFormProps) {
  const { currency, t } = useLocalization();

  const defaultValues = React.useMemo(() => ({
    project_id: bill?.project_id || "",
    bill_number: bill?.bill_number || "",
    vendor_name: bill?.vendor_name || "",
    vendor_cnpj: bill?.vendor_cnpj || "",
    status: (bill?.status || "pending") as APBillStatus,
    issue_date: bill?.issue_date || new Date().toISOString().split('T')[0],
    due_date: bill?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    amount: bill?.amount ? Number(bill.amount) : 0,
    tax_amount: bill?.tax_amount ? Number(bill.tax_amount) : 0,
    total_amount: bill?.total_amount ? Number(bill.total_amount) : 0,
    currency: bill?.currency || "BRL",
    category: bill?.category || "",
    cost_code_id: bill?.cost_code_id || "",
    phase_id: bill?.phase_id || "",
    description: bill?.description || "",
    notes: bill?.notes || "",
  }), [bill]);

  const billSchema = React.useMemo(() => createBillSchema(t), [t]);

  const form = useForm<any>({
    resolver: zodResolver(billSchema),
    defaultValues,
  });

  const { createBill } = useFinancialAPWorkspace();

  const { toast } = useToast();
  const { projects } = useProjects();
  const { data: costCodes } = useCostCodes();

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const watchAmount = useWatch({ control: form.control, name: "amount" });
  const watchTaxAmount = useWatch({ control: form.control, name: "tax_amount" });

  // Auto-calculate total amount
  React.useEffect(() => {
    const amount = Number(watchAmount || 0);
    const tax = Number(watchTaxAmount || 0);
    const total = amount + tax;
    form.setValue("total_amount", Number(total.toFixed(2)), { shouldValidate: true });
  }, [watchAmount, watchTaxAmount, form]);

  const onInvalid = (errors: any) => {
    console.error("Form validation failed:", errors);
    toast({
      title: t('common.errorTitle'),
      description: t('financial.apBillForm.validation.pleaseCheckFields'),
      variant: "destructive"
    });
  };

  const onSubmit = async (data: any) => {
    try {
      await createBill.mutateAsync(data as FinancialAPBillInsert);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Bill creation failed:", error);
    }
  };

  const isSubmitting = createBill.isPending;
  const isEditing = Boolean(bill);

  const formattedAmount = React.useMemo(
    () => formatCurrency(Number(watchAmount || 0), currency),
    [currency, watchAmount],
  );

  const formattedTotal = React.useMemo(
    () => formatCurrency(Number(form.watch('total_amount') || 0), currency),
    [currency, form],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl lg:max-w-5xl h-screen flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              {bill ? (
                <>
                  <Edit className="h-6 w-6 text-orange-500" />
                  {t('financial.apBillForm.editTitle')}
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-6 w-6 text-red-500" />
                  {t('financial.apBillForm.newBill')}
                </>
              )}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium">
              {t('financial.apBillForm.description')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form id="bill-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <Receipt className="h-4 w-4" />
                    {t('financial.apBillForm.billDetails')}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-muted/50 space-y-4">
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.projectLabel')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="h-10 font-medium"><SelectValue placeholder={t('financial.apBillForm.projectPlaceholder')} /></SelectTrigger></FormControl>
                            <SelectContent>
                              {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bill_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.billNumberLabel')}</FormLabel>
                            <FormControl><Input {...field} placeholder={t('financial.apBillForm.billNumberPlaceholder')} className="h-10 font-mono" /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.statusLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "pending"}>
                              <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="pending">{t('financial.apBillForm.statuses.pending')}</SelectItem>
                                <SelectItem value="approved">{t('financial.apBillForm.statuses.approved')}</SelectItem>
                                <SelectItem value="scheduled">{t('financial.apBillForm.statuses.scheduled')}</SelectItem>
                                <SelectItem value="overdue">{t('financial.apBillForm.statuses.overdue')}</SelectItem>
                                <SelectItem value="paid">{t('financial.apBillForm.statuses.paid')}</SelectItem>
                                <SelectItem value="cancelled">{t('financial.apBillForm.statuses.cancelled')}</SelectItem>
                                <SelectItem value="disputed">{t('financial.apBillForm.statuses.disputed')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="issue_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.issueDateLabel')}</FormLabel>
                            <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.dueDateLabel')}</FormLabel>
                            <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 border-t border-dashed mt-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Globe className="h-4 w-4" />
                        {t('financial.apBillForm.amountsLabel')}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                {t('financial.apBillForm.amountLabel')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type="number" step="0.01" className="pl-7 font-mono text-sm h-10" />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tax_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.taxAmountLabel')}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type="number" step="0.01" className="pl-7 font-mono text-sm h-10" />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">R$</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="total_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-red-600">
                                {t('financial.apBillForm.totalAmountLabel')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type="number" step="0.01" readOnly className="pl-7 font-mono text-sm font-bold h-10 border-red-200 bg-red-50/50" />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-600 font-bold text-xs">R$</span>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-dashed mt-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <CreditCard className="h-4 w-4" />
                        {t('financial.apBillForm.accountingLabel')}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.categoryLabel')}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-10"><SelectValue placeholder={t('financial.apBillForm.categoryPlaceholder')} /></SelectTrigger></FormControl>
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

                        <FormField
                          control={form.control}
                          name="cost_code_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-orange-600">{t('financial.apBillForm.costCodeLabel')}</FormLabel>
                              <Select onValueChange={(value) => field.onChange(value || undefined)} value={field.value || ""}>
                                <FormControl><SelectTrigger className="h-10 font-mono text-xs"><SelectValue placeholder={t('financial.apBillForm.costCodePlaceholder')} /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {costCodes?.map((code) => <SelectItem key={code.id} value={code.id}>{code.code} - {code.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <CreditCard className="h-4 w-4" />
                    {t('financial.apBillForm.vendorInformation')}
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-dashed space-y-4">
                    <FormField
                      control={form.control}
                      name="vendor_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.vendorNameLabel')}</FormLabel>
                          <FormControl><Input {...field} placeholder={t('financial.apBillForm.vendorNamePlaceholder')} className="h-10" /></FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vendor_cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.vendorCnpjLabel')}</FormLabel>
                          <FormControl><Input {...field} placeholder={t('financial.apBillForm.vendorCnpjPlaceholder')} className="h-10 font-mono" /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.descriptionLabel')}</FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder={t('financial.apBillForm.descriptionPlaceholder')} className="resize-none rounded-xl border-muted bg-white dark:bg-slate-950" /></FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.apBillForm.notesLabel')}</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder={t('financial.apBillForm.notesPlaceholder')} className="resize-none rounded-xl border-muted bg-white dark:bg-slate-950" /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="p-6 border-t bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{t('financial.apBillForm.billTotal')}</span>
            <p className="text-lg font-black text-red-600">{formattedTotal}</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="font-bold text-muted-foreground hover:text-foreground">
              {t('financial.apBillForm.cancel')}
            </Button>
            <Button type="submit" form="bill-form" disabled={isSubmitting} className="font-black uppercase tracking-wider px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 text-white transition-all active:scale-95">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? t('financial.apBillForm.updateBill') : t('financial.apBillForm.createBill')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}