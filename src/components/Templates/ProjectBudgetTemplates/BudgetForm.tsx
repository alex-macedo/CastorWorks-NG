import { useState, useEffect } from "react";
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

// Helper function to determine allowed budget models based on project's budget_model
const getAllowedBudgetModels = (projectBudgetModel: string | null) => {
  switch (projectBudgetModel) {
    case 'simple':
      return ['simple'] as const;
    case 'bdi_brazil':
      return ['bdi_brazil'] as const;
    case 'cost_control':
      return ['cost_control'] as const;
    default:
      return ['simple', 'bdi_brazil', 'cost_control'] as const;
  }
};

const budgetFormSchema = (t: any, allowedModels: readonly string[]) => z.object({
  name: z.string().min(3, t("budgets:editor.validation.nameMinLength")),
  description: z.string().optional(),
  budget_model: z.enum(allowedModels as [string, ...string[]], {
    errorMap: () => ({ message: t("budgets:editor.validation.invalidBudgetModel") || "Invalid budget model for this project" })
  }),
  status: z.enum(["draft", "review", "approved", "archived"]),
});

type BudgetFormData = z.infer<ReturnType<typeof budgetFormSchema>>;

interface BudgetFormProps {
  projectId: string;
  budgetId?: string;
  onSave: (budgetId: string) => void;
  onCancel: () => void;
}

export function BudgetForm({ projectId, budgetId, onSave, onCancel }: BudgetFormProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectBudgetModel, setProjectBudgetModel] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Fetch parent project's budget_model
  useEffect(() => {
    const fetchProjectBudgetModel = async () => {
      try {
        setIsLoadingProject(true);
        const { data: project, error } = await supabase
          .from('projects')
          .select('budget_model')
          .eq('id', projectId)
          .single();

        if (error) {
          console.error('Error fetching project budget model:', error);
          // Fallback: allow all budget models if fetch fails
          setProjectBudgetModel(null);
        } else {
          setProjectBudgetModel(project?.budget_model ?? null);
        }
      } catch (error) {
        console.error('Exception while fetching project budget model:', error);
        setProjectBudgetModel(null);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProjectBudgetModel();
  }, [projectId]);

  // Determine allowed budget models based on project's budget_model
  const allowedBudgetModels = getAllowedBudgetModels(projectBudgetModel);

  // Create form with dynamic schema based on allowed models
  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema(t, allowedBudgetModels)),
    defaultValues: {
      name: "",
      description: "",
      budget_model: allowedBudgetModels[0], // Default to the first (and possibly only) allowed model
      status: "draft",
    },
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema(t)),
    defaultValues: {
      name: "",
      description: "",
      budget_model: "simple",
      status: "draft",
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    setIsSubmitting(true);
    try {
      if (budgetId) {
        // Update existing budget
        const { error } = await supabase
          .from("project_budgets")
          .update({
            name: data.name,
            description: data.description,
            budget_model: data.budget_model,
            status: data.status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", budgetId);

        if (error) throw error;

        toast({
          title: t("common.success"),
          description: t("budgets:notifications.budgetUpdated"),
        });
        onSave(budgetId);
      } else {
        // Create new budget
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

        // Populate budget from template if budget model is bdi_brazil or cost_control
        if (data.budget_model === 'bdi_brazil' || data.budget_model === 'cost_control') {
          try {
            console.log('Populating budget from template...', { budgetId: budget.id, projectId });

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
              // Don't fail budget creation if template population fails
              toast({
                title: t("common.success"),
                description: t("budgets:notifications.budgetCreated") + " " + t("budgets:notifications.templatePopulationWarning"),
                variant: "default",
              });
            } else {
              console.log('Budget template populated successfully', populateResult);
              // Successfully populated - invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: ['budget_line_items', budget.id] });
              queryClient.invalidateQueries({ queryKey: ['budget-calculations', budget.id] });
              queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
              queryClient.invalidateQueries({ queryKey: ['project-phases', projectId] });
            }
          } catch (populateErr: any) {
            console.error('Error populating budget template:', populateErr);
            // Continue anyway - budget is created, user can add items manually
          }
        }

        toast({
          title: t("common.success"),
          description: t("budgets:notifications.budgetCreated"),
        });
        onSave(budget.id);
      }
    } catch (error: any) {
      console.error("Error saving budget:", error);
      toast({
        title: t("common.error"),
        description: error.message || t("budgets:errors.savingFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProject}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("budgets:editor.selectType")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allowedBudgetModels.includes('simple') && (
                    <SelectItem value="simple">{t("budgets:types.simple")}</SelectItem>
                  )}
                  {allowedBudgetModels.includes('bdi_brazil') && (
                    <SelectItem value="bdi_brazil">{t("budgets:types.bdi_brazil")}</SelectItem>
                  )}
                  {allowedBudgetModels.includes('cost_control') && (
                    <SelectItem value="cost_control">{t("budgets:types.cost_control")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {t("budgets:editor.budgetTypeHint")}
                {allowedBudgetModels.length === 1 && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    {t("budgets:editor.budgetModelFixed") || "Budget model is fixed for this project."}
                  </span>
                )}
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
            {budgetId ? t("common.update") : t("common.create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
