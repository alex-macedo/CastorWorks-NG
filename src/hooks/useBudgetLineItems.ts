import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BudgetLineItem {
  id: string;
  budget_id: string;
  phase_id?: string;
  phase_name?: string; // Added from joined project_phases
  sinapi_code: string;
  sinapi_item?: string;
  item_number?: string;
  description: string;
  unit: string;
  unit_cost_material: number;
  unit_cost_labor: number;
  quantity: number;
  total_material: number;
  total_labor: number;
  total_cost: number;
  sort_order: number;
  group_name?: string; // Group/category name for organizing items
  percentage?: number; // Percentage for labor items (from template)
  editable?: boolean; // Whether item can be edited
  created_at: string;
  updated_at: string;
}

interface CreateLineItemInput {
  budget_id: string;
  phase_id?: string;
  sinapi_code: string;
  item_number?: string;
  description: string;
  unit: string;
  unit_cost_material: number;
  unit_cost_labor: number;
  quantity?: number;
  sort_order?: number;
  group_name?: string;
}

interface UpdateLineItemInput {
  id: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unit_cost_material?: number;
  unit_cost_labor?: number;
  phase_id?: string;
  sort_order?: number;
  group_name?: string;
}

export function useBudgetLineItems(budgetId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch line items with phase information
  const lineItemsQuery = useQuery({
    queryKey: ["budget_line_items", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      console.log(`[useBudgetLineItems] Called with budgetId: ${budgetId}`);

      // First, fetch budget line items without join to avoid RLS filtering issues
      const { data: itemsData, error: itemsError } = await supabase
        .from("budget_line_items")
        .select("*")
        .eq("budget_id", budgetId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error(`[useBudgetLineItems] Query error for budget ${budgetId}:`, itemsError);
        throw itemsError;
      }

      console.log(`[useBudgetLineItems] Query returned ${itemsData?.length || 0} items for budget ${budgetId}`);
      console.log(`[useBudgetLineItems] First few items:`, itemsData?.slice(0, 3));
      console.log(`[useBudgetLineItems] Sinapi codes in result:`, itemsData?.map(item => item.sinapi_code).slice(0, 5));

      if (!itemsData || itemsData.length === 0) {
        console.log(`[useBudgetLineItems] No items found for budget ${budgetId}`);
        return [];
      }

      // Get unique phase IDs to fetch phase names
      const phaseIds = [...new Set(itemsData.map(item => item.phase_id).filter(Boolean))];
      console.log(`[useBudgetLineItems] Found ${phaseIds.length} unique phase IDs:`, phaseIds);

      let phaseMap = new Map<string, string>();
      if (phaseIds.length > 0) {
        const { data: phasesData, error: phasesError } = await supabase
          .from("project_phases")
          .select("id, phase_name")
          .in("id", phaseIds);

        if (phasesError) {
          console.warn("[useBudgetLineItems] Failed to fetch phase names:", phasesError);
          // Continue without phase names - this won't break functionality
        } else if (phasesData) {
          phaseMap = new Map(phasesData.map(phase => [phase.id, phase.phase_name]));
          console.log(`[useBudgetLineItems] Phase map:`, Object.fromEntries(phaseMap));
        }
      }

      // Map phase names and return items
      const result = itemsData.map((item: any) => ({
        ...item,
        phase_name: item.phase_id ? phaseMap.get(item.phase_id) || null : null,
      })) as BudgetLineItem[];

      console.log(`[useBudgetLineItems] Final result: ${result.length} items`);
      return result;
    },
    enabled: !!budgetId,
  });

  // Add line item
  const addLineItem = useMutation({
    mutationFn: async (input: CreateLineItemInput) => {
      // Get max sort order
      const { data: items } = await supabase
        .from("budget_line_items")
        .select("sort_order")
        .eq("budget_id", input.budget_id)
        .order("sort_order", { ascending: false })
        .limit(1);

      const maxOrder = items?.[0]?.sort_order ?? -1;

      const { data, error } = await supabase
        .from("budget_line_items")
        .insert({
          ...input,
          quantity: input.quantity || 0,
          sort_order: input.sort_order ?? maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetLineItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", budgetId] });
      toast({
        title: "Sucesso",
        description: "Insumo adicionado",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao adicionar: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update line item
  const updateLineItem = useMutation({
    mutationFn: async (input: UpdateLineItemInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("budget_line_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as BudgetLineItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", budgetId] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete line item
  const deleteLineItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("budget_line_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", budgetId] });
      toast({
        title: "Sucesso",
        description: "Insumo removido",
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

  // Bulk import line items
  const bulkImport = useMutation({
    mutationFn: async (
      items: Omit<CreateLineItemInput, "budget_id">[]
    ) => {
      const itemsWithBudgetId = items.map((item, index) => ({
        ...item,
        budget_id: budgetId!,
        sort_order: index,
      }));

      const { data, error } = await supabase
        .from("budget_line_items")
        .insert(itemsWithBudgetId)
        .select();

      if (error) throw error;
      return data as BudgetLineItem[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["budget_line_items", budgetId] });
      toast({
        title: "Sucesso",
        description: `${data.length} insumos importados`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha na importação: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    lineItems: lineItemsQuery.data || [],
    isLoading: lineItemsQuery.isLoading,
    isError: lineItemsQuery.isError,
    addLineItem,
    updateLineItem,
    deleteLineItem,
    bulkImport,
  };
}
