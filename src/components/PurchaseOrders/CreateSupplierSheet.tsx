import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Form, FormField } from '@/components/ui/form'
import SupplierFormCommon from '@/components/Suppliers/SupplierFormCommon'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useLocalization } from '@/contexts/LocalizationContext'

const supplierFormSchema = (t: any) => z.object({
  name: z.string().min(1, t('procurement.validationErrors.supplierNameRequired') || 'Name is required'),
  contact_name: z.string().optional(),
  email: z.string().email(t('procurement.validationErrors.invalidEmail') || 'Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  supplier_category: z.string().optional(),
  payment_terms: z.string().default('Net 30'),
  notes: z.string().optional()
})

type SupplierFormValues = z.infer<ReturnType<typeof supplierFormSchema>>

export function CreateSupplierSheet() {
  const [open, setOpen] = useState(false)
  const { t } = useLocalization()
  const { createSupplier } = useSuppliers()

  const form = useForm({
    resolver: zodResolver(supplierFormSchema(t)) as any,
    defaultValues: {
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      tax_id: '',
      supplier_category: 'materials',
      payment_terms: 'Net 30',
      notes: ''
    }
  })

  const onSubmit = async (values: SupplierFormValues) => {
    await createSupplier.mutateAsync({
      name: values.name,
      category: values.supplier_category || 'materials',
      contact_email: values.email || null,
      contact_phone: values.phone || null,
      rating: 0,
      orders_completed: 0,
      preferred_contact_method: 'email'
    })
    setOpen(false)
    form.reset()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="glass-style-white"
        >
          <Building2 className="mr-2 h-4 w-4" />
          {t('procurement.addSupplier')}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('procurement.addSupplier')}</SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <SupplierFormCommon
              form={form}
              supplier={undefined}
              isPending={createSupplier.isPending}
              onCancel={() => setOpen(false)}
              submitLabel={t('procurement.addSupplier')}
              categoryField="supplier_category"
              emailField="email"
              phoneField="phone"
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }: any) => (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-muted-foreground">{t('procurement.address') || 'Address'}</label>
                  <textarea {...field} rows={2} className="mt-1 block w-full rounded-md border" />
                </div>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }: any) => (
                    <div>
                      <label htmlFor="tax_id" className="block text-sm font-medium text-muted-foreground">Tax ID / CNPJ</label>
                      <input id="tax_id" {...field} className="mt-1 block w-full rounded-md border" />
                    </div>
                  )}
                />

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }: any) => (
                  <div>
                    <label htmlFor="payment_terms" className="block text-sm font-medium text-muted-foreground">{t("clientPortal.paymentTerms")}</label>
                    <select id="payment_terms" onChange={(e) => field.onChange(e.target.value)} value={field.value} className="mt-1 block w-full rounded-md border">
                      <option value="Net 15">{t("tooltips.net15")}</option>
                      <option value="Net 30">{t("tooltips.net30")}</option>
                      <option value="Net 45">{t("tooltips.net45")}</option>
                      <option value="Net 60">{t("tooltips.net60")}</option>
                      <option value="Due on Receipt">{t("tooltips.dueOnReceipt")}</option>
                    </select>
                  </div>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }: any) => (
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground">Notes</label>
                  <textarea id="notes" {...field} rows={3} className="mt-1 block w-full rounded-md border" />
                </div>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSupplier.isPending}>
                {createSupplier.isPending ? 'Creating...' : 'Create Supplier'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
