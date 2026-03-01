import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DuplicationParams {
  projectId: string;
  totalGrossFloorArea: number;
}

/**
 * Hook for duplicating template materials to a new project.
 * 
 * Uses the RPC function duplicate_materials_template to copy materials from
 * simplebudget_materials_template to project_materials with calculated quantities
 * based on TGFA (Total Gross Floor Area).
 * 
 * @example
 * const { duplicateTemplateToProject } = useTemplateMaterialsDuplication();
 * await duplicateTemplateToProject.mutateAsync({
 *   projectId: newProject.id,
 *   totalGrossFloorArea: 200.5
 * });
 */
export const useTemplateMaterialsDuplication = () => {
  const duplicateTemplateToProject = useMutation({
    mutationFn: async ({ projectId, totalGrossFloorArea }: DuplicationParams) => {
      console.log(`[Materials Duplication] Starting for project ${projectId} with TGFA: ${totalGrossFloorArea}m²`);

      // Use RPC function to duplicate materials template
      const { data: itemsInserted, error } = await supabase.rpc('duplicate_materials_template', {
        p_project_id: projectId,
        p_total_gross_floor_area: totalGrossFloorArea
      });

      if (error) {
        console.error('[Materials Duplication] Failed to duplicate materials:', error);
        throw new Error(`Failed to duplicate materials: ${error.message}`);
      }

      console.log(`[Materials Duplication] Successfully inserted ${itemsInserted || 0} materials`);

      return { 
        inserted: [],
        count: itemsInserted || 0,
        skipped: false
      };
    },
    onSuccess: (data) => {
      if (data?.skipped) {
        console.log('[Materials Duplication] Skipped - all materials already exist');
        return;
      }
      toast.success(`Materials synced`, {
        description: `${data?.inserted?.length || 0} missing items added to project budget`,
      });
    },
    onError: (error: Error) => {
      console.error('[Materials Duplication] Error:', error);
      toast.error('Failed to sync materials', {
        description: error.message,
      });
    },
  });

  return { duplicateTemplateToProject };
};
