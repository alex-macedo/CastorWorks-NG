import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRoles";

export interface SidebarOrderUpdate {
  type: "option" | "tab";
  optionId: string;
  tabId?: string;
  newSortOrder: number;
}

export interface BulkSidebarOrderUpdate {
  updates: SidebarOrderUpdate[];
}

/**
 * Hook to manage sidebar option and tab sort orders.
 * Provides mutations for updating sort orders with optimistic updates.
 */
export function useSidebarOrderManagement() {
  const queryClient = useQueryClient();

  // Update single option sort order
  const updateOptionSortOrder = useMutation({
    mutationFn: async ({ optionId, newSortOrder }: { optionId: string; newSortOrder: number }) => {
      const { error } = await supabase
        .from("sidebar_option_permissions")
        .update({ sort_order: newSortOrder })
        .eq("option_id", optionId);

      if (error) throw error;
    },
    onMutate: async ({ optionId, newSortOrder }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["sidebar-option-permissions"] });

      // Snapshot the previous value
      const previousOptions = queryClient.getQueryData(["sidebar-option-permissions"]);

      // Optimistically update the cache
      queryClient.setQueryData(["sidebar-option-permissions"], (old: any) => {
        if (!old) return old;
        return old.map((perm: any) =>
          perm.option_id === optionId ? { ...perm, sort_order: newSortOrder } : perm
        );
      });

      return { previousOptions };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOptions) {
        queryClient.setQueryData(["sidebar-option-permissions"], context.previousOptions);
      }
      console.error("Failed to update option sort order:", error);
      toast.error("Failed to update menu order");
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
    },
    onSuccess: () => {
      toast.success("Menu order updated successfully");
    },
  });

  // Update single tab sort order
  const updateTabSortOrder = useMutation({
    mutationFn: async ({ optionId, tabId, newSortOrder }: { optionId: string; tabId: string; newSortOrder: number }) => {
      const { error } = await supabase
        .from("sidebar_tab_permissions")
        .update({ sort_order: newSortOrder })
        .eq("option_id", optionId)
        .eq("tab_id", tabId);

      if (error) throw error;
    },
    onMutate: async ({ optionId, tabId, newSortOrder }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["sidebar-tab-permissions"] });

      // Snapshot the previous value
      const previousTabs = queryClient.getQueryData(["sidebar-tab-permissions"]);

      // Optimistically update the cache
      queryClient.setQueryData(["sidebar-tab-permissions"], (old: any) => {
        if (!old) return old;
        return old.map((perm: any) =>
          perm.option_id === optionId && perm.tab_id === tabId
            ? { ...perm, sort_order: newSortOrder }
            : perm
        );
      });

      return { previousTabs };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTabs) {
        queryClient.setQueryData(["sidebar-tab-permissions"], context.previousTabs);
      }
      console.error("Failed to update tab sort order:", error);
      toast.error("Failed to update submenu order");
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
    },
    onSuccess: () => {
      toast.success("Submenu order updated successfully");
    },
  });

  // Bulk update sort orders (for drag-and-drop reordering)
  const bulkUpdateSortOrders = useMutation({
    mutationFn: async ({ updates }: BulkSidebarOrderUpdate) => {
      console.log('[MUTATION] bulkUpdateSortOrders.mutationFn - Starting with updates:', updates);

      // Separate option and tab updates
      const optionUpdates = updates.filter(u => u.type === "option");
      const tabUpdates = updates.filter(u => u.type === "tab");

      console.log('[MUTATION] Option updates:', optionUpdates);
      console.log('[MUTATION] Tab updates:', tabUpdates);

      // Update options in bulk
      if (optionUpdates.length > 0) {
        const payload = optionUpdates.map(u => ({ option_id: u.optionId, sort_order: u.newSortOrder }));
        console.log('[MUTATION] Calling bulk_update_option_sort_orders with:', payload);
        const { error: optionError } = await supabase.rpc("bulk_update_option_sort_orders", {
          updates: payload
        });
        if (optionError) {
          console.error('[MUTATION] Option update error:', optionError);
          throw optionError;
        }
        console.log('[MUTATION] Option update successful');
      }

      // Update tabs in bulk
      if (tabUpdates.length > 0) {
        const payload = tabUpdates.map(u => ({
          option_id: u.optionId,
          tab_id: u.tabId!,
          sort_order: u.newSortOrder
        }));
        console.log('[MUTATION] Calling bulk_update_tab_sort_orders with:', payload);
        const { error: tabError } = await supabase.rpc("bulk_update_tab_sort_orders", {
          updates: payload
        });
        if (tabError) {
          console.error('[MUTATION] Tab update error:', tabError);
          throw tabError;
        }
        console.log('[MUTATION] Tab update successful');
      }
    },
    onMutate: async ({ updates }) => {
      console.log('[MUTATION] onMutate - Starting with updates:', updates);

      // Cancel any outgoing refetches
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["sidebar-option-permissions"] }),
        queryClient.cancelQueries({ queryKey: ["sidebar-tab-permissions"] })
      ]);
      console.log('[MUTATION] onMutate - Cancelled outgoing queries');

      // Snapshot the previous values
      const previousOptions = queryClient.getQueryData(["sidebar-option-permissions"]);
      const previousTabs = queryClient.getQueryData(["sidebar-tab-permissions"]);

      console.log('[MUTATION] onMutate - Previous options:', previousOptions);
      console.log('[MUTATION] onMutate - Previous tabs:', previousTabs);

      // Optimistically update the cache
      updates.forEach(update => {
        if (update.type === "option") {
          queryClient.setQueryData(["sidebar-option-permissions"], (old: any) => {
            if (!old) return old;
            const updated = old.map((perm: any) =>
              perm.option_id === update.optionId ? { ...perm, sort_order: update.newSortOrder } : perm
            );
            console.log('[MUTATION] onMutate - Updated option permissions:', updated);
            return updated;
          });
        } else if (update.type === "tab" && update.tabId) {
          queryClient.setQueryData(["sidebar-tab-permissions"], (old: any) => {
            if (!old) return old;
            const updated = old.map((perm: any) =>
              perm.option_id === update.optionId && perm.tab_id === update.tabId
                ? { ...perm, sort_order: update.newSortOrder }
                : perm
            );
            console.log('[MUTATION] onMutate - Updated tab permissions:', updated);
            return updated;
          });
        }
      });

      console.log('[MUTATION] onMutate - Complete, returning context');
      return { previousOptions, previousTabs };
    },
    onError: (error, _variables, context) => {
      console.error("[MUTATION] onError - Error occurred:", error);
      // Rollback on error
      if (context?.previousOptions) {
        console.log("[MUTATION] onError - Rolling back options");
        queryClient.setQueryData(["sidebar-option-permissions"], context.previousOptions);
      }
      if (context?.previousTabs) {
        console.log("[MUTATION] onError - Rolling back tabs");
        queryClient.setQueryData(["sidebar-tab-permissions"], context.previousTabs);
      }
      toast.error("Failed to update menu order");
    },
    onSuccess: () => {
      console.log("[MUTATION] onSuccess - Mutation succeeded, refetching queries");
      toast.success("Menu order updated successfully");
      // Refetch to ensure server state is updated in the UI
      const refetchPromise = Promise.all([
        queryClient.refetchQueries({ queryKey: ["sidebar-option-permissions"] }),
        queryClient.refetchQueries({ queryKey: ["sidebar-tab-permissions"] })
      ]);

      refetchPromise.then(() => {
        console.log("[MUTATION] onSuccess - Refetch completed");
        const optionsData = queryClient.getQueryData(["sidebar-option-permissions"]);
        const tabsData = queryClient.getQueryData(["sidebar-tab-permissions"]);
        console.log("[MUTATION] onSuccess - Fresh options data:", optionsData);
        console.log("[MUTATION] onSuccess - Fresh tabs data:", tabsData);
        
        // Log the sort order values specifically
        if (Array.isArray(optionsData)) {
          const sortOrders = optionsData.map(perm => `${perm.option_id}: ${perm.sort_order}`).join(', ');
          console.log("[MUTATION] onSuccess - Database sort_order values:", sortOrders);
        }
      });

      return refetchPromise;
    },
  });

  // Reset to default order
  const resetToDefaultOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("reset_sidebar_sort_orders");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Menu order reset to default");
      // Refetch all permission queries after successful update
      return Promise.all([
        queryClient.refetchQueries({ queryKey: ["sidebar-option-permissions"] }),
        queryClient.refetchQueries({ queryKey: ["sidebar-tab-permissions"] })
      ]);
    },
    onError: (error) => {
      console.error("Failed to reset menu order:", error);
      toast.error("Failed to reset menu order");
    },
  });

  return {
    updateOptionSortOrder,
    updateTabSortOrder,
    bulkUpdateSortOrders,
    resetToDefaultOrder,
    isUpdating: updateOptionSortOrder.isPending || updateTabSortOrder.isPending || bulkUpdateSortOrders.isPending,
  };
}
