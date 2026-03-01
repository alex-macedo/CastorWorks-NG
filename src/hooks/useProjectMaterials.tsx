import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";

type ProjectMaterial = Database["public"]["Tables"]["project_materials"]["Row"];
type ProjectMaterialInsert = Database["public"]["Tables"]["project_materials"]["Insert"];
type ProjectMaterialUpdate = Database["public"]["Tables"]["project_materials"]["Update"];

export const useProjectMaterials = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't query for template project ID (all-zeros UUID)
  const TEMPLATE_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
  const isTemplateId = projectId === TEMPLATE_PROJECT_ID;
  const shouldQuery = Boolean(projectId && !isTemplateId);

  console.log("[useProjectMaterials] Hook called with projectId:", projectId, "isTemplateId:", isTemplateId, "shouldQuery:", shouldQuery);

  const canEditProject = () => {
    if (!shouldQuery) {
      console.warn("[useProjectMaterials] Mutation blocked for template or missing projectId", { projectId });
      return false;
    }
    return true;
  };

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["project-materials", projectId],
    queryFn: async () => {
      if (!projectId) {
        console.log("[useProjectMaterials] No projectId, returning empty array");
        return [];
      }

      const { data, error } = await supabase
        .from("project_materials")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("group_name", { ascending: true })
        .order("description", { ascending: true });

      if (error) throw error;
      return data as ProjectMaterial[];
    },
    enabled: shouldQuery,
  });

  const createMaterial = useMutation({
    mutationFn: async (newMaterial: ProjectMaterialInsert) => {
      if (!canEditProject()) {
        return null;
      }
      const payload: any = { ...newMaterial };
      if (payload.project_id === "" || payload.project_id == null) {
        // ensure we don't send empty string to uuid column
        payload.project_id = null;
      }

      const { data, error } = await supabase
        .from("project_materials")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!shouldQuery || !data) return;
      queryClient.invalidateQueries({ queryKey: ["project-materials", projectId] });
      toast({ title: t('toast.materialAddedSuccessfully') });
    },
    onError: (error) => {
      toast({ 
        title: "Error adding material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: ProjectMaterialUpdate & { id: string }) => {
      if (!canEditProject()) {
        return null;
      }
      const payload: any = { ...updates };
      if (payload.project_id === "" || payload.project_id == null) {
        payload.project_id = null;
      }

      const { data, error } = await supabase
        .from("project_materials")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!shouldQuery || !data) return;
      queryClient.invalidateQueries({ queryKey: ["project-materials", projectId] });
      toast({ title: t('toast.materialUpdatedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error updating material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      if (!canEditProject()) {
        return null;
      }
      const { error } = await supabase
        .from("project_materials")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (!shouldQuery) return;
      queryClient.invalidateQueries({ queryKey: ["project-materials", projectId] });
      toast({ title: t('toast.materialDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting material",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const reorderGroups = useMutation({
    mutationFn: async (groupNames: string[]) => {
      if (!canEditProject() || !projectId) return null;
      
      const { error } = await supabase.rpc('reorder_project_materials_groups', {
        p_project_id: projectId,
        p_group_names: groupNames,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      if (!shouldQuery) return;
      queryClient.invalidateQueries({ queryKey: ["project-materials", projectId] });
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
    materials,
    isLoading,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    reorderGroups,
  };
};
