import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export interface SinapiItem {
  id: string;
  sinapi_code: string;
  sinapi_item: string;
  sinapi_description: string;
  sinapi_unit: string;
  sinapi_material_cost: number;
  sinapi_labor_cost: number;
  sinapi_type: string | null;
  base_year: number | null;
  base_state: string | null;
}

export function useSinapiLookup(searchTerm: string = "") {
  const [selectedItem, setSelectedItem] = useState<SinapiItem | null>(null);

  // Search SINAPI items
  const searchQuery = useQuery({
    queryKey: ["sinapi_search", searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase.rpc("search_sinapi_items", {
        search_term: searchTerm,
        limit_results: 20,
      });

      if (error) throw error;
      return data as SinapiItem[];
    },
    enabled: !!searchTerm && searchTerm.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get specific SINAPI item by code
  const getItemQuery = useQuery({
    queryKey: ["sinapi_item", selectedItem?.sinapi_code],
    queryFn: async () => {
      if (!selectedItem?.sinapi_code) return null;

      const { data, error } = await supabase.rpc("get_sinapi_item_by_code", {
        item_code: selectedItem.sinapi_code,
      });

      if (error) throw error;
      return data?.[0] as SinapiItem | null;
    },
    enabled: !!selectedItem?.sinapi_code,
  });

  return {
    results: searchQuery.data || [],
    isLoading: searchQuery.isLoading,
    isError: searchQuery.isError,
    selectedItem,
    setSelectedItem,
    getItemDetails: getItemQuery.data,
  };
}
