import { useState } from 'react'
import { Controller, useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateInput } from '@/components/ui/DateInput'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Plus, Trash2, AlertCircle, User } from 'lucide-react'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency } from '@/utils/formatters'

const poFormSchema = (t: any) => z.object({
  project_id: z.string().min(1, t('procurement.validationErrors.projectRequired')),
  supplier_id: z.string().min(1, t('procurement.validationErrors.supplierRequired')),
  expected_delivery_date: z.preprocess((arg) => {
    // Accept Date objects from Calendar or strings; normalize to 'yyyy-MM-dd' string or undefined
    if (!arg) return undefined
    if (arg instanceof Date) {
      try {
        const y = arg.getFullYear()
        const m = String(arg.getMonth() + 1).padStart(2, '0')
        const d = String(arg.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      } catch {
        return undefined
      }
    }
    if (typeof arg === 'string') return arg || undefined
    return undefined
  }, z.string().optional()),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, t('procurement.validationErrors.descriptionRequired')),
    quantity: z.coerce.number().min(0.01, t('procurement.validationErrors.quantityPositive')),
    unit_price: z.coerce.number().min(0, t('procurement.validationErrors.unitPriceNonNegative')),
    unit: z.string().optional().default('unit'),
    notes: z.string().optional()
  })).min(1, t('procurement.validationErrors.atLeastOneItem'))
})

type POFormValues = z.infer<ReturnType<typeof poFormSchema>>

interface CreatePOSheetProps {
  projects: Array<{ id: string; name: string }>
}

const generatePurchaseOrderNumber = () => {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PO-${dateStr}-${randomNum}`
}

export function CreatePOSheet({ projects }: CreatePOSheetProps) {
  const [open, setOpen] = useState(false)
  const { t, currency } = useLocalization()
  const { createPurchaseOrder } = usePurchaseOrders()
  const { suppliers } = useSuppliers()
  const { data: currentUser, isLoading: isLoadingUser, error: userError } = useCurrentUserProfile()

  const form = useForm({
    resolver: zodResolver(poFormSchema(t)) as any,
    defaultValues: {
      project_id: '',
      supplier_id: '',
      expected_delivery_date: undefined,
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0, unit: 'unit', notes: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  })
  const watchedItems = useWatch({ control: form.control, name: 'items' }) || []

  const onSubmit = async (values: POFormValues) => {
    // Calculate total amount
    const total_amount = values.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    
    // Generate PO number (simple format: PO-YYYYMMDD-XXX)
    const purchase_order_number = generatePurchaseOrderNumber()
    
    await createPurchaseOrder.mutateAsync({
      purchase_order_number,
      project_id: values.project_id,
      supplier_id: values.supplier_id,
      expected_delivery_date: values.expected_delivery_date || null,
      notes: values.notes || null,
      total_amount,
      currency_id: 'BRL',
      status: 'draft'
    })
    
    setOpen(false)
    form.reset()
  }

  const hasNoProjects = projects.length === 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="glass-style-white"
          disabled={hasNoProjects}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('procurement.newPurchaseOrder')}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-none sm:w-[min(1200px,95vw)]">
        <SheetHeader>
          <SheetTitle>{t('procurement.createPurchaseOrderForm.title')}</SheetTitle>
          <SheetDescription>{t('procurement.createPurchaseOrderForm.description')}</SheetDescription>
        </SheetHeader>

        {/* No Projects Available - Permission/Membership Check */}
        {hasNoProjects && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('procurement.createPurchaseOrderForm.noProjectsAvailable')}</AlertTitle>
            <AlertDescription>
              {t('procurement.createPurchaseOrderForm.noProjectsDescription')}
            </AlertDescription>
          </Alert>
        )}

        {/* User Authentication Check */}
        {userError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('procurement.createPurchaseOrderForm.authenticationRequired')}</AlertTitle>
            <AlertDescription>
              {t('procurement.createPurchaseOrderForm.authenticationDescription')}
            </AlertDescription>
          </Alert>
        )}

        {/* Entered By Display */}
        {currentUser && (
          <div className="bg-muted p-3 rounded-md border mt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t('procurement.createPurchaseOrderForm.enteredBy')}</span>
              <span className="text-sm font-medium">{currentUser.display_name}</span>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data as POFormValues))} className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,420px),minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="project_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('procurement.createPurchaseOrderForm.project')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('procurement.createPurchaseOrderForm.selectProject')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map(project => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('procurement.createPurchaseOrderForm.supplier')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('procurement.createPurchaseOrderForm.selectSupplier')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map(supplier => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="expected_delivery_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('procurement.createPurchaseOrderForm.expectedDeliveryDate')}</FormLabel>
                      <FormControl>
                        <Controller
                          control={form.control}
                          name="expected_delivery_date"
                          render={({ field: ctrlField }) => (
                            <DateInput
                              value={ctrlField.value || ''}
                              onChange={ctrlField.onChange}
                            />
                          )}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('procurement.createPurchaseOrderForm.notesOptional')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{t('procurement.createPurchaseOrderForm.lineItems')}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unit_price: 0, unit: 'unit', notes: '' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('procurement.createPurchaseOrderForm.addItem')}
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>{t('procurement.createPurchaseOrderForm.description')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t('procurement.createPurchaseOrderForm.itemDescription')} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="mt-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('procurement.createPurchaseOrderForm.quantity')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('procurement.createPurchaseOrderForm.unit')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t("additionalPlaceholders.unitFormat")} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('procurement.createPurchaseOrderForm.unitPrice')}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('procurement.createPurchaseOrderForm.notesOptional')}</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-sm font-semibold text-right">
                      {t('procurement.createPurchaseOrderForm.subtotal')}: {formatCurrency(((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0)), currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t mt-6">
              <div className="text-lg font-bold">
                {t('procurement.createPurchaseOrderForm.total')}: {formatCurrency(watchedItems.reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.unit_price || 0)), 0), currency)}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('procurement.createPurchaseOrderForm.cancel')}
                </Button>
                <Button type="submit" disabled={createPurchaseOrder.isPending || !currentUser || isLoadingUser || !!userError}>
                  {createPurchaseOrder.isPending ? t('procurement.createPurchaseOrderForm.creating') : t('procurement.createPurchaseOrderForm.createButton')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
