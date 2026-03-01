import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

// Row shape for simplebudget_labor_template (data table with actual line items)
export type LaborTemplateRow = {
  id: string;
  group: string;
  description: string;
  total_value: number | null;
  percentage: number | null;
  editable: boolean | null;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
};

type LaborTemplate = LaborTemplateRow;
type LaborTemplateInsert = Omit<LaborTemplateRow, "id" | "created_at" | "updated_at">;
type LaborTemplateUpdate = Partial<Omit<LaborTemplateRow, "id" | "created_at" | "updated_at">>;

export const useSimpleBudgetLaborTemplate = () => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  const { data: laborItems = [], isLoading, error: queryError } = useQuery<LaborTemplate[]>({
    queryKey: ["simplebudget-labor-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simplebudget_labor_template")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("group", { ascending: true })
        .order("description", { ascending: true });

      if (error) {
        console.error("Error fetching labor template:", error);
        throw error;
      }
      return (data || []) as LaborTemplate[];
    },
  });
  
  // Log errors for debugging
  if (queryError) {
    console.error("Query error in useSimpleBudgetLaborTemplate:", {
      message: queryError instanceof Error ? queryError.message : String(queryError),
      error: queryError,
    });
  }

  const createLabor = useMutation({
    mutationFn: async (newLabor: LaborTemplateInsert) => {
      const { data, error } = await supabase
        .from("simplebudget_labor_template")
        .insert(newLabor)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-labor-template"] });
      toast({ title: t('toast.templateLaborItemAddedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error adding template labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLabor = useMutation({
    mutationFn: async ({ id, ...updates }: LaborTemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("simplebudget_labor_template")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-labor-template"] });
      toast({ title: t('toast.templateLaborItemUpdatedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error updating template labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLabor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("simplebudget_labor_template")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-labor-template"] });
      toast({ title: t('toast.templateLaborItemDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderGroups = useMutation({
    mutationFn: async (groupNames: string[]) => {
      const { error } = await supabase.rpc('reorder_simplebudget_labor_groups', {
        p_group_names: groupNames,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-labor-template"] });
    },
    onError: (error) => {
      toast({
        title: "Error reordering groups",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return {
    laborItems: laborItems ?? [],
    isLoading,
    createLabor,
    updateLabor,
    deleteLabor,
    reorderGroups,
  };
};
