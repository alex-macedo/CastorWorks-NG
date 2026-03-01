import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProjectBudget {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  budget_model: "simple" | "bdi_brazil" | "cost_control";
  budget_template_id?: string | null;
  status: "draft" | "review" | "approved" | "archived";
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface CreateBudgetInput {
  project_id: string;
  name: string;
  description?: string;
  budget_model?: "simple" | "bdi_brazil" | "cost_control";
  status?: "draft" | "review" | "approved" | "archived";
}

interface UpdateBudgetInput {
  id: string;
  name?: string;
  description?: string;
  budget_model?: "simple" | "bdi_brazil" | "cost_control";
  status?: "draft" | "review" | "approved" | "archived";
}

export function useProjectBudget(projectId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch budgets for project
  const budgetsQuery = useQuery({
    queryKey: ["project_budgets", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProjectBudget[];
    },
    enabled: !!projectId,
  });

  // Create budget
  const createBudget = useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      const { data, error } = await supabase
        .from("project_budgets")
        .insert({
          project_id: input.project_id,
          name: input.name,
          description: input.description,
          budget_model: input.budget_model || "simple",
          status: input.status || "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_budgets", projectId] });
      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao criar orçamento: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update budget
  const updateBudget = useMutation({
    mutationFn: async (input: UpdateBudgetInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("project_budgets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_budgets", projectId] });
      toast({
        title: "Sucesso",
        description: "Orçamento atualizado",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete budget
  const deleteBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from("project_budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_budgets", projectId] });
      toast({
        title: "Sucesso",
        description: "Orçamento removido",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao remover: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Duplicate budget
  const duplicateBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const { data: original } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("id", budgetId)
        .single();

      if (!original) throw new Error("Orçamento não encontrado");

      const { data, error } = await supabase
        .from("project_budgets")
        .insert({
          project_id: original.project_id,
          name: `${original.name} (Cópia)`,
          description: original.description,
          budget_model: original.budget_model,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data as ProjectBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_budgets", projectId] });
      toast({
        title: "Sucesso",
        description: "Orçamento duplicado",
      });
    },
  });

  return {
    budgets: budgetsQuery.data || [],
    isLoading: budgetsQuery.isLoading,
    isError: budgetsQuery.isError,
    createBudget,
    updateBudget,
    deleteBudget,
    duplicateBudget,
  };
}
