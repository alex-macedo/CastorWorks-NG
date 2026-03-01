import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowUpCircle, Loader2, FileText, CreditCard, Edit, Globe, RefreshCw } from "lucide-react";

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
import { formatCurrency } from "@/utils/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FinancialARInvoice, FinancialARInvoiceInsert, ARInvoiceStatus } from "@/types/finance";
import { useFinancialARWorkspace } from '@/hooks/useFinancialARWorkspace'

const createInvoiceSchema = (t: (key: string) => string) => z.object({
  project_id: z.string().uuid(t('financial.arInvoiceForm.validation.projectRequired')),
  invoice_number: z.string().min(1, t('financial.arInvoiceForm.validation.invoiceNumberRequired')),
  client_name: z.string().min(1, t('financial.arInvoiceForm.validation.clientNameRequired')),
  client_email: z.string().email().optional().or(z.literal("")).nullable(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"] as const).optional(),
  issue_date: z.string(),
  due_date: z.string(),
  amount: z.coerce.number().positive(t('financial.arInvoiceForm.validation.amountPositive')),
  tax_amount: z.coerce.number().default(0),
  total_amount: z.coerce.number().positive(t('financial.arInvoiceForm.validation.totalAmountPositive')),
  currency: z.string().default("BRL"),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface ARInvoiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: FinancialARInvoice;
}

export function ARInvoiceForm({
  open,
  onOpenChange,
  invoice,
}: ARInvoiceFormProps) {
  const { currency, t } = useLocalization();

  const defaultValues = React.useMemo(() => ({
    project_id: invoice?.project_id || "",
    invoice_number: invoice?.invoice_number || "",
    client_name: invoice?.client_name || "",
    client_email: invoice?.client_email || "",
    status: (invoice?.status || "draft") as ARInvoiceStatus,
    issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    amount: invoice?.amount ? Number(invoice.amount) : 0,
    tax_amount: invoice?.tax_amount ? Number(invoice.tax_amount) : 0,
    total_amount: invoice?.total_amount ? Number(invoice.total_amount) : 0,
    currency: invoice?.currency || "BRL",
    description: invoice?.description || "",
    notes: invoice?.notes || "",
  }), [invoice]);

  const invoiceSchema = React.useMemo(() => createInvoiceSchema(t), [t]);

  const form = useForm<any>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const { createInvoice } = useFinancialARWorkspace();

  const { toast } = useToast();
  const { projects } = useProjects();

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
      description: t('financial.arInvoiceForm.validation.pleaseCheckFields'),
      variant: "destructive"
    });
  };

  const onSubmit = async (data: any) => {
    try {
      await createInvoice.mutateAsync(data as FinancialARInvoiceInsert);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Invoice creation failed:", error);
    }
  };

  const isSubmitting = createInvoice.isPending;
  const isEditing = Boolean(invoice);

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
              {invoice ? (
                <>
                  <Edit className="h-6 w-6 text-orange-500" />
                  {t('financial.arInvoiceForm.editTitle')}
                </>
              ) : (
                <>
                  <ArrowUpCircle className="h-6 w-6 text-emerald-500" />
                  {t('financial.arInvoiceForm.newInvoice')}
                </>
              )}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium">
              {t('financial.arInvoiceForm.description')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form id="invoice-form" onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <FileText className="h-4 w-4" />
                    {t('financial.arInvoiceForm.invoiceDetails')}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-muted/50 space-y-4">
                    <FormField
                      control={form.control}
                      name="project_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.projectLabel')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="h-10 font-medium"><SelectValue placeholder={t('financial.arInvoiceForm.projectPlaceholder')} /></SelectTrigger></FormControl>
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
                        name="invoice_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.invoiceNumberLabel')}</FormLabel>
                            <FormControl><Input {...field} placeholder={t('financial.arInvoiceForm.invoiceNumberPlaceholder')} className="h-10 font-mono" /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.statusLabel')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "draft"}>
                              <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="draft">{t('financial.arInvoiceForm.statuses.draft')}</SelectItem>
                                <SelectItem value="sent">{t('financial.arInvoiceForm.statuses.sent')}</SelectItem>
                                <SelectItem value="paid">{t('financial.arInvoiceForm.statuses.paid')}</SelectItem>
                                <SelectItem value="overdue">{t('financial.arInvoiceForm.statuses.overdue')}</SelectItem>
                                <SelectItem value="cancelled">{t('financial.arInvoiceForm.statuses.cancelled')}</SelectItem>
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
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.issueDateLabel')}</FormLabel>
                            <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.dueDateLabel')}</FormLabel>
                            <FormControl><DateInput value={field.value || ''} onChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 border-t border-dashed mt-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                        <Globe className="h-4 w-4" />
                        {t('financial.arInvoiceForm.amountsLabel')}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">
                                {t('financial.arInvoiceForm.amountLabel')}
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
                              <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.taxAmountLabel')}</FormLabel>
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
                              <FormLabel className="text-[10px] font-black uppercase text-emerald-600">
                                {t('financial.arInvoiceForm.totalAmountLabel')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input {...field} type="number" step="0.01" readOnly className="pl-7 font-mono text-sm font-bold h-10 border-emerald-200 bg-emerald-50/50" />
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">R$</span>
                                </div>
                              </FormControl>
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
                    {t('financial.arInvoiceForm.clientInformation')}
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-dashed space-y-4">
                    <FormField
                      control={form.control}
                      name="client_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.clientNameLabel')}</FormLabel>
                          <FormControl><Input {...field} placeholder={t('financial.arInvoiceForm.clientNamePlaceholder')} className="h-10" /></FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="client_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.clientEmailLabel')}</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder={t('financial.arInvoiceForm.clientEmailPlaceholder')} className="h-10" /></FormControl>
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
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.descriptionLabel')}</FormLabel>
                        <FormControl><Textarea {...field} rows={3} placeholder={t('financial.arInvoiceForm.descriptionPlaceholder')} className="resize-none rounded-xl border-muted bg-white dark:bg-slate-950" /></FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-muted-foreground">{t('financial.arInvoiceForm.notesLabel')}</FormLabel>
                        <FormControl><Textarea {...field} rows={2} placeholder={t('financial.arInvoiceForm.notesPlaceholder')} className="resize-none rounded-xl border-muted bg-white dark:bg-slate-950" /></FormControl>
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
            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">{t('financial.arInvoiceForm.invoiceTotal')}</span>
            <p className="text-lg font-black text-emerald-600">{formattedTotal}</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="font-bold text-muted-foreground hover:text-foreground">
              {t('financial.arInvoiceForm.cancel')}
            </Button>
            <Button type="submit" form="invoice-form" disabled={isSubmitting} className="font-black uppercase tracking-wider px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-white transition-all active:scale-95">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? t('financial.arInvoiceForm.updateInvoice') : t('financial.arInvoiceForm.createInvoice')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}