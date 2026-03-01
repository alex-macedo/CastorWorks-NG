import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { useLocalization } from "@/contexts/LocalizationContext";

type ProjectLabor = Database["public"]["Tables"]["project_labor"]["Row"];
type ProjectLaborInsert = Database["public"]["Tables"]["project_labor"]["Insert"];
type ProjectLaborUpdate = Database["public"]["Tables"]["project_labor"]["Update"];

export const useProjectLabor = (projectId?: string) => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  // Don't query for template project ID (all-zeros UUID)
  const TEMPLATE_PROJECT_ID = "00000000-0000-0000-0000-000000000000";
  
  // Check if projectId is the template ID (multiple ways to check)
  const isTemplateId = projectId === TEMPLATE_PROJECT_ID || 
                       projectId === "TEMPLATE" ||
                       (projectId && projectId.toString() === TEMPLATE_PROJECT_ID);
  
  // Don't query if undefined, null, empty string, or template ID
  const shouldQuery = Boolean(projectId && projectId !== "" && !isTemplateId);

  console.log("[useProjectLabor] Hook called with projectId:", projectId, "typeof:", typeof projectId, "isTemplateId:", isTemplateId, "shouldQuery:", shouldQuery);
  console.log("[useProjectLabor] Comparison: projectId=", projectId, "TEMPLATE_PROJECT_ID=", TEMPLATE_PROJECT_ID, "strictEqual:", projectId === TEMPLATE_PROJECT_ID);

  const canEditProject = () => {
    if (!shouldQuery) {
      console.warn("[useProjectLabor] Mutation blocked for template or missing projectId", { projectId });
      return false;
    }
    return true;
  };

  const { data: laborItems = [], isLoading } = useQuery({
    queryKey: ["project-labor", projectId],
    queryFn: async () => {
      if (!projectId) {
        console.log("[useProjectLabor] No projectId, returning empty array");
        return [];
      }

      console.log("[useProjectLabor] Querying for projectId:", projectId);

      const { data, error } = await supabase
        .from("project_labor")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("group", { ascending: true })
        .order("description", { ascending: true });

      console.log("[useProjectLabor] Query result:", { data, error, count: data?.length });

      if (error) {
        console.error("[useProjectLabor] Query error:", error);
        throw error;
      }
      return data as ProjectLabor[];
    },
    enabled: shouldQuery,
  });

  const createLabor = useMutation({
    mutationFn: async (newLabor: ProjectLaborInsert) => {
      if (!canEditProject()) {
        return null;
      }
      const payload: ProjectLaborInsert = { ...newLabor };
      const { data, error } = await supabase
        .from("project_labor")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!shouldQuery || !data) return;
      queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
      toast({ title: t('toast.laborItemAddedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error adding labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLabor = useMutation({
    mutationFn: async ({ id, ...updates }: ProjectLaborUpdate & { id: string }) => {
      if (!canEditProject()) {
        return null;
      }
      const { data, error } = await supabase
        .from("project_labor")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!shouldQuery || !data) return;
      queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
      toast({ title: t('toast.laborItemUpdatedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error updating labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteLabor = useMutation({
    mutationFn: async (id: string) => {
      if (!canEditProject()) {
        return null;
      }
      const { error } = await supabase
        .from("project_labor")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      if (!shouldQuery) return;
      queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
      toast({ title: t('toast.laborItemDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting labor item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderGroups = useMutation({
    mutationFn: async (groupNames: string[]) => {
      if (!canEditProject() || !projectId) return null;

      const { error } = await supabase.rpc('reorder_project_labor_groups', {
        p_project_id: projectId,
        p_group_names: groupNames,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      if (!shouldQuery) return;
      queryClient.invalidateQueries({ queryKey: ["project-labor", projectId] });
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
    laborItems,
    isLoading,
    createLabor,
    updateLabor,
    deleteLabor,
    reorderGroups,
  };
};
