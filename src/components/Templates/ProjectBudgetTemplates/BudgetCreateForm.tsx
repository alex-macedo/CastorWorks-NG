import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ensureProjectHasWbsPhases = async (projectId: string) => {
  const { count, error: wbsCountError } = await supabase
    .from('project_wbs_items')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('item_type', 'phase');

  if (!wbsCountError && (count ?? 0) > 0) return true;

  const { data: wbsTemplate, error: templateError } = await supabase
    .from('project_wbs_templates')
    .select('id')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (templateError || !wbsTemplate?.id) return false;

  const { error: applyError } = await supabase.rpc('apply_wbs_template_to_project_internal', {
    _project_id: projectId,
    _template_id: wbsTemplate.id,
  });

  return !applyError;
};

// Budget model validation logic
const getAllowedBudgetModels = (projectBudgetModel: string | null) => {
  switch (projectBudgetModel) {
    case 'simple':
      return ['simple']; // Simple requires simple budgets only
    case 'bdi_brazil':
      return ['bdi_brazil']; // BDI requires bdi_brazil budgets
    case 'cost_control':
      return ['cost_control']; // Cost control requires cost_control budgets
    default:
      return ['simple', 'bdi_brazil', 'cost_control'];
  }
};

const budgetCreateFormSchema = (t: any, allowedModels: string[]) => z.object({
  name: z.string().min(3, t("budgets:editor.validation.nameMinLength")),
  description: z.string().optional(),
  budget_model: z.enum(allowedModels as [string, ...string[]]),
  status: z.enum(["draft", "review", "approved", "archived"]),
});

type BudgetCreateFormData = z.infer<ReturnType<typeof budgetCreateFormSchema>>;

interface BudgetCreateFormProps {
  projectId: string;
  projectBudgetModel: string | null;
  onSave: (budgetId: string) => void;
  onCancel: () => void;
}

export function BudgetCreateForm({
  projectId,
  projectBudgetModel,
  onSave,
  onCancel
}: BudgetCreateFormProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedBudgetModels = getAllowedBudgetModels(projectBudgetModel);
  const defaultBudgetModel = allowedBudgetModels[0];

  const form = useForm<BudgetCreateFormData>({
    resolver: zodResolver(budgetCreateFormSchema(t, allowedBudgetModels)),
    defaultValues: {
      name: "",
      description: "",
      budget_model: defaultBudgetModel as any,
      status: "draft",
    },
  });

  const onSubmit = async (data: BudgetCreateFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: budget, error } = await supabase
        .from("project_budgets")
        .insert({
          project_id: projectId,
          name: data.name,
          description: data.description,
          budget_model: data.budget_model,
          status: data.status,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!budget) throw new Error("Failed to create budget");

      // Populate budget from template if applicable
      if (data.budget_model === 'bdi_brazil' || data.budget_model === 'cost_control') {
        try {
          const populateFunction =
            data.budget_model === 'cost_control'
              ? 'populate_budget_from_cost_control_template'
              : 'populate_budget_from_template';

          if (data.budget_model === 'cost_control') {
            await ensureProjectHasWbsPhases(projectId);
          }

          const { data: populateResult, error: populateError } = await supabase.rpc(populateFunction, {
            p_budget_id: budget.id,
            p_project_id: projectId,
          });

          if (populateError) {
            console.error('Failed to populate budget from template:', populateError);
            toast({
              title: t("common.success"),
              description: t("budgets:notifications.budgetCreated") + " " + t("budgets:notifications.templatePopulationWarning"),
              variant: "default",
            });
          } else {
            queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['budget-calculations', budget.id] });
            queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
          }
        } catch (populateErr: any) {
          console.error('Error populating budget template:', populateErr);
        }
      }

      toast({
        title: t("common.success"),
        description: t("budgets:notifications.budgetCreated"),
      });

      onSave(budget.id);
    } catch (error: any) {
      console.error("Error creating budget:", error);
      toast({
        title: t("common.errorTitle"),
        description: error.message || t("budgets:errors.creatingFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Project Budget Model Info */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">{t('budgets:create.projectBudgetModel')}</h4>
          <p className="text-sm text-muted-foreground">
            {projectBudgetModel
              ? t(`projects.budgetType${projectBudgetModel.charAt(0).toUpperCase() + projectBudgetModel.slice(1).replace('_', '')}`)
              : t('projects:budgetTypeSimple')
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('budgets:create.budgetModelConstraint', {
              allowedTypes: allowedBudgetModels.join(', ')
            })}
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("budgets:editor.name")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("budgets:editor.namePlaceholder")}
                  {...field}
                />
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
              <FormLabel>{t("budgets:editor.description")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("budgets:editor.descriptionPlaceholder")}
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {t("budgets:editor.descriptionHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="budget_model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("budgets:editor.budgetType")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("budgets:editor.selectType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowedBudgetModels.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`budgets:types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {t("budgets:editor.budgetTypeHint")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("budgets:status.label")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("budgets:status.label")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="draft">{t("budgets:status.draft")}</SelectItem>
                  <SelectItem value="review">{t("budgets:status.review")}</SelectItem>
                  <SelectItem value="approved">{t("budgets:status.approved")}</SelectItem>
                  <SelectItem value="archived">{t("budgets:status.archived")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("budgets:create.createBudget")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
