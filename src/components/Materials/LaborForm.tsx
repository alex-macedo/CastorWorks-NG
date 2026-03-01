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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocalization } from "@/contexts/LocalizationContext";

const laborSchema = z.object({
  group: z.string().min(1, "Group name is required"),
  description: z.string().min(1, "Description is required"),
  total_value: z.number().min(0).default(0),
  percentage: z.number().min(0).max(100).default(0),
  editable: z.boolean().default(true),
});

type LaborFormData = z.infer<typeof laborSchema>;

interface LaborFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laborItem?: any;
  onSave: (data: LaborFormData) => void;
}

export function LaborForm({ open, onOpenChange, laborItem, onSave }: LaborFormProps) {
  const { t } = useLocalization();

  const form = useForm<LaborFormData>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      group: "",
      description: "",
      total_value: 0,
      percentage: 0,
      editable: true,
    },
  });

  useEffect(() => {
    if (laborItem) {
      form.reset({
        group: laborItem.group || "",
        description: laborItem.description || "",
        total_value: laborItem.total_value || 0,
        percentage: laborItem.percentage || 0,
        editable: laborItem.editable !== false,
      });
    } else {
      form.reset({
        group: "",
        description: "",
        total_value: 0,
        percentage: 0,
        editable: true,
      });
    }
  }, [laborItem, form]);

  const handleSubmit = (data: LaborFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {laborItem ? t("materials:laborForm.editItem") : t("materials:laborForm.addItem")}
          </SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="group"
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
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("materials:form.totalValue")}</FormLabel>
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
                name="percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("materials:form.percentage")}</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="editable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("materials:form.editable")}</FormLabel>
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
              <Button type="submit">
                {t("materials:form.save")}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
