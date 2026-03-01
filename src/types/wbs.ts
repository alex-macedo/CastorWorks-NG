export interface WBSNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  code: string;
  title: string;
  description: string | null;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface WBSHierarchyNode extends WBSNode {
  children: WBSHierarchyNode[];
  total_amount?: number;
}
