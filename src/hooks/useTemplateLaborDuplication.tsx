import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DuplicationParams {
  projectId: string;
}

/**
 * Hook for duplicating template labor to a new project.
 * 
 * Uses the RPC function duplicate_labor_template to copy labor items from
 * simplebudget_labor_template to project_labor.
 * 
 * @example
 * const { duplicateLaborTemplateToProject } = useTemplateLaborDuplication();
 * await duplicateLaborTemplateToProject.mutateAsync({
 *   projectId: newProject.id
 * });
 */
export const useTemplateLaborDuplication = () => {
  const duplicateLaborTemplateToProject = useMutation({
    mutationFn: async ({ projectId }: DuplicationParams) => {
      console.log(`[Labor Duplication] Starting for project ${projectId}`);

      // Use RPC function to duplicate labor template
      const { data: itemsInserted, error } = await supabase.rpc('duplicate_labor_template', {
        p_project_id: projectId
      });

      if (error) {
        console.error('[Labor Duplication] Failed to duplicate labor:', error);
        throw new Error(`Failed to duplicate labor: ${error.message}`);
      }

      console.log(`[Labor Duplication] Successfully inserted ${itemsInserted || 0} labor items`);

      return { 
        inserted: [],
        count: itemsInserted || 0,
        skipped: false
      };
    },
    onSuccess: (data) => {
      if (data?.skipped) {
        console.log('[Labor Duplication] Skipped - all labor items already exist');
        return;
      }
      toast.success(`Labor items synced`, {
        description: `${data?.count || 0} labor items added to project budget`,
      });
    },
    onError: (error: Error) => {
      console.error('[Labor Duplication] Error:', error);
      toast.error('Failed to sync labor items', {
        description: error.message,
      });
    },
  });

  return { duplicateLaborTemplateToProject };
};
