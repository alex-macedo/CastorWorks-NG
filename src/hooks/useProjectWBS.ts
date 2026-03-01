import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WBSNode, WBSHierarchyNode } from "@/types/wbs";

export const useProjectWBS = (projectId?: string) => {
  return useQuery({
    queryKey: ["project-wbs", projectId],
    queryFn: async (): Promise<WBSHierarchyNode[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("project_wbs_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("code", { ascending: true });

      if (error) throw error;

      // Type assertion to bypass Supabase schema mismatch in local types
      const nodes = (data as unknown) as WBSNode[];
      return buildWBSHierarchy(nodes);
    },
    enabled: !!projectId,
  });
};

function buildWBSHierarchy(nodes: WBSNode[]): WBSHierarchyNode[] {
  const nodeMap: Record<string, WBSHierarchyNode> = {};
  const roots: WBSHierarchyNode[] = [];

  nodes.forEach((node) => {
    nodeMap[node.id] = { ...node, children: [] };
  });

  nodes.forEach((node) => {
    if (node.parent_id && nodeMap[node.parent_id]) {
      nodeMap[node.parent_id].children.push(nodeMap[node.id]);
    } else {
      roots.push(nodeMap[node.id]);
    }
  });

  return roots;
}
