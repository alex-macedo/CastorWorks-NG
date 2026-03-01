import React from 'react'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { useLocalization } from "@/contexts/LocalizationContext";
type SupplierFormCommonProps = {
  form: any
  supplier?: any
  isPending?: boolean
  onCancel: () => void
  submitLabel?: string
  /** field name mappings in the form for category/email/phone */
  categoryField?: string
  emailField?: string
  phoneField?: string
}

export function SupplierFormCommon({
  form,
  supplier,
  isPending,
  onCancel,
  submitLabel = 'Save',
  categoryField = 'category',
  emailField = 'contact_email',
  phoneField = 'contact_phone'
}: SupplierFormCommonProps) {
  const { t } = useLocalization()

  return (
    <>
      <Form {...form}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={categoryField as any}
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("additionalPlaceholders.materialCategory")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={emailField as any}
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={phoneField as any}
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!!isPending}>
            {isPending ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </Form>
    </>
  )
}

export default SupplierFormCommon
