import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import SupplierFormCommon from './SupplierFormCommon'
import { useSuppliers } from "@/hooks/useSuppliers";
import type { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  contact_email: z.string().email("Invalid email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
}

export function SupplierForm({ open, onOpenChange, supplier }: SupplierFormProps) {
  const { t } = useLocalization();
  const { createSupplier, updateSupplier } = useSuppliers();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: supplier?.name || "",
      category: supplier?.category || "",
      contact_email: supplier?.contact_email || "",
      contact_phone: supplier?.contact_phone || "",
      rating: supplier?.rating ? Number(supplier.rating) : undefined,
    },
  });

  const onSubmit = async (data: SupplierFormValues) => {
    if (supplier) {
      await updateSupplier.mutateAsync({ 
        id: supplier.id,
        name: data.name,
        category: data.category,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        rating: data.rating || null,
      });
    } else {
      await createSupplier.mutateAsync({
        name: data.name,
        category: data.category,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        rating: data.rating || null,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{supplier ? t("suppliers:editSupplier") : t("suppliers:newSupplier")}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <SupplierFormCommon
              form={form}
              supplier={supplier}
              isPending={createSupplier.isPending || updateSupplier?.isPending}
              onCancel={() => onOpenChange(false)}
              submitLabel={supplier ? 'Update' : 'Create'}
            />
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}