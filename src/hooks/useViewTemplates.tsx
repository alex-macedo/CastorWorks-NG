import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ViewTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  view_type: string;
  filters: Record<string, any>;
  sort_config: {
    field?: string;
    direction?: 'asc' | 'desc';
  };
  visible_columns: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ViewTemplateInput {
  name: string;
  description?: string;
  view_type?: string;
  filters?: {
    status: string[];
    progressMin: number | null;
    progressMax: number | null;
    startDateFrom: string;
    startDateTo: string;
    endDateFrom: string;
    endDateTo: string;
  };
  sort_config?: {
    field?: string;
    direction?: 'asc' | 'desc';
  };
  visible_columns?: string[];
  is_default?: boolean;
}

export function useViewTemplates(viewType: string = 'project_plan') {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["view-templates", viewType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("view_templates")
        .select("*")
        .eq("view_type", viewType)
        .order("name");

      if (error) throw error;
      return data as ViewTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (input: ViewTemplateInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("view_templates")
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description,
          view_type: input.view_type || viewType,
          filters: input.filters || {},
          sort_config: input.sort_config || {},
          visible_columns: input.visible_columns || [],
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["view-templates", viewType] });
      toast.success("View template saved successfully");
    },
    onError: (error) => {
      console.error("Failed to create view template:", error);
      toast.error("Failed to save view template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ViewTemplateInput> }) => {
      const { data, error } = await supabase
        .from("view_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["view-templates", viewType] });
      toast.success("View template updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update view template:", error);
      toast.error("Failed to update view template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("view_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["view-templates", viewType] });
      toast.success("View template deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete view template:", error);
      toast.error("Failed to delete view template");
    },
  });

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
