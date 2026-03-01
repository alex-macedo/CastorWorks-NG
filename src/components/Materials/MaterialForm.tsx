import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Switch } from "@/components/ui/switch";

const materialSchema = z.object({
  group_name: z.string().min(1, "Group name is required"),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0).default(0),
  unit: z.string().min(1, "Unit is required"),
  price_per_unit: z.number().min(0).default(0),
  factor: z.number().min(0).default(0),
  tgfa_applicable: z.boolean().default(false),
  editable: z.boolean().default(true),
});

type MaterialFormData = z.infer<typeof materialSchema>;

interface MaterialFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: any;
  onSave: (data: any) => void;
}

export function MaterialForm({ open, onOpenChange, material, onSave }: MaterialFormProps) {
  const { t } = useLocalization();
  
  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      group_name: "",
      description: "",
      quantity: 0,
      unit: "",
      price_per_unit: 0,
      factor: 0,
      tgfa_applicable: false,
      editable: true,
    },
  });

  useEffect(() => {
    if (material) {
      form.reset({
        group_name: material.group_name || "",
        description: material.description || "",
        quantity: material.quantity || 0,
        unit: material.unit || "",
        price_per_unit: material.price_per_unit || 0,
        factor: material.factor || 0,
        tgfa_applicable: material.tgfa_applicable || false,
        editable: material.editable !== false,
      });
    } else {
      form.reset({
        group_name: "",
        description: "",
        quantity: 0,
        unit: "",
        price_per_unit: 0,
        factor: 0,
        tgfa_applicable: false,
        editable: true,
      });
    }
  }, [material, form]);

  const handleSubmit = (data: MaterialFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {material ? t("materials:form.editMaterial") : t("materials:form.addMaterial")}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="group_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("materials:form.group")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("materials:form.description")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("materials:form.quantity")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("materials:form.unit")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("additionalPlaceholders.unitFormat")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price_per_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("materials:form.unitPrice")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="factor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("materials:form.factor")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tgfa_applicable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("materials:form.tgfaApplicable")}
                    </FormLabel>
                    <FormDescription>
                      {t("materials:form.tgfaApplicableDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="editable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("materials:form.editable")}
                    </FormLabel>
                    <FormDescription>
                      {t("materials:form.editableDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("materials:form.cancel")}
              </Button>
              <Button type="submit">{t("materials:form.save")}</Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
