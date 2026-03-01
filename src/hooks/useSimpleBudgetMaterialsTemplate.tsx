import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

// Row shape for simplebudget_materials_template (data table with actual line items)
export type MaterialsTemplateRow = {
  id: string;
  sinapi_code: string | null;
  group_name: string;
  description: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  total?: number;
  freight_percentage: number | null;
  factor: number | null;
  tgfa_applicable: boolean | null;
  fee_desc: string | null;
  editable: boolean;
  sort_order?: number | null;
  created_at: string;
  updated_at: string;
};

type MaterialsTemplate = MaterialsTemplateRow;
type MaterialsTemplateInsert = Omit<MaterialsTemplateRow, "id" | "created_at" | "updated_at" | "total">;
type MaterialsTemplateUpdate = Partial<Omit<MaterialsTemplateRow, "id" | "created_at" | "updated_at" | "total">>;

export const useSimpleBudgetMaterialsTemplate = () => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  const { data: materials = [], isLoading, error: queryError } = useQuery<MaterialsTemplate[]>({
    queryKey: ["simplebudget-materials-template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("simplebudget_materials_template")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("group_name", { ascending: true })
        .order("description", { ascending: true });

      if (error) {
        console.error("Error fetching materials template:", error);
        throw error;
      }
      return (data || []) as MaterialsTemplate[];
    },
  });
  
  // Log errors for debugging
  if (queryError) {
    console.error("Query error in useSimpleBudgetMaterialsTemplate:", {
      message: queryError instanceof Error ? queryError.message : String(queryError),
      error: queryError,
    });
  }

  const createMaterial = useMutation({
    mutationFn: async (newMaterial: MaterialsTemplateInsert) => {
      const { data, error } = await supabase
        .from("simplebudget_materials_template")
        .insert(newMaterial)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-materials-template"] });
      toast({ title: t('toast.templateMaterialAddedSuccessfully') });
    },
    onError: (error) => {
      toast({ 
        title: "Error adding template material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: MaterialsTemplateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("simplebudget_materials_template")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-materials-template"] });
      toast({ title: t('toast.templateMaterialUpdatedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error updating template material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("simplebudget_materials_template")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-materials-template"] });
      toast({ title: t('toast.templateMaterialDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const reorderGroups = useMutation({
    mutationFn: async (groupNames: string[]) => {
      const { error } = await supabase.rpc('reorder_simplebudget_materials_groups', {
        p_group_names: groupNames,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simplebudget-materials-template"] });
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
    materials: materials ?? [],
    isLoading,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    reorderGroups,
  };
};
