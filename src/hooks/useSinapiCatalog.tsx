import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SinapiItem {
  id: string;
  sinapi_code: string;
  sinapi_item: string;
  sinapi_description: string;
  sinapi_unit: string;
  sinapi_quantity: number;
  sinapi_unit_price: number;
  sinapi_material_cost: number;
  sinapi_labor_cost: number;
  sinapi_total_cost: number;
  sinapi_type: string | null;
  base_year: number | null;
  base_state: string;
  created_at: string;
  updated_at: string;
}

interface UseSinapiCatalogParams {
  state?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export const useSinapiCatalog = ({ 
  state = "SP", 
  searchTerm = "", 
  page = 1, 
  pageSize = 25 
}: UseSinapiCatalogParams) => {
  const { data, isLoading } = useQuery({
    queryKey: ["sinapi-items", state, searchTerm, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from("sinapi_items")
        .select("*", { count: "exact" })
        .eq("base_state", state);

      if (searchTerm) {
        query = query.or(`sinapi_code.ilike.%${searchTerm}%,sinapi_item.ilike.%${searchTerm}%,sinapi_description.ilike.%${searchTerm}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .order("sinapi_description", { ascending: true })
        .range(from, to);

      if (error) throw error;

      return {
        items: (data as SinapiItem[]) || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });

  return {
    items: data?.items || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
  };
};
