import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import type { AppRole } from "@/hooks/useUserRoles";

export interface SidebarOptionPermission {
  id: string;
  option_id: string;
  role: AppRole;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SidebarTabPermission {
  id: string;
  option_id: string;
  tab_id: string;
  role: AppRole;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SidebarPermissions {
  optionPermissions: Map<string, AppRole[]>;
  tabPermissions: Map<string, AppRole[]>;
  optionSortOrder: Map<string, number>; // option_id -> sort_order
  tabSortOrder: Map<string, number>; // "option_id.tab_id" -> sort_order
  hasOptionAccess: (optionId: string) => boolean;
  hasTabAccess: (optionId: string, tabId: string) => boolean;
  hasTabPermissions: (optionId: string, tabId: string) => boolean; // Check if tab has any permissions defined
  optionHasAnyTabPermissions: (optionId: string) => boolean; // True if at least one tab of this option has DB permissions
  isLoading: boolean;
}

/**
 * Hook to fetch and check sidebar permissions for the current user.
 * Returns permission maps and helper functions to check access.
 */
export function useSidebarPermissions(): SidebarPermissions {
  const { data: optionPermissions = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: ["sidebar-option-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sidebar_option_permissions")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("option_id", { ascending: true });

      if (error) throw error;
      return (data || []) as SidebarOptionPermission[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: tabPermissions = [], isLoading: isLoadingTabs } = useQuery({
    queryKey: ["sidebar-tab-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sidebar_tab_permissions")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("option_id", { ascending: true })
        .order("tab_id", { ascending: true });

      if (error) throw error;
      return (data || []) as SidebarTabPermission[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: userRoles = [] } = useUserRoles();

  // Build permission maps: option_id -> roles[]
  const optionPermissionsMap = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    optionPermissions.forEach((perm) => {
      const existing = map.get(perm.option_id) || [];
      map.set(perm.option_id, [...existing, perm.role]);
    });
    return map;
  }, [optionPermissions]);

  // Build permission maps: "option_id.tab_id" -> roles[]
  const tabPermissionsMap = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    tabPermissions.forEach((perm) => {
      const key = `${perm.option_id}.${perm.tab_id}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, perm.role]);
    });
    return map;
  }, [tabPermissions]);

  // Build sort order maps for options
  const optionSortOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    // Get the minimum sort_order for each option_id across all roles
    const optionMinOrders = new Map<string, number>();
    optionPermissions.forEach((perm) => {
      const current = optionMinOrders.get(perm.option_id);
      if (current === undefined || perm.sort_order < current) {
        optionMinOrders.set(perm.option_id, perm.sort_order);
      }
    });
    return optionMinOrders;
  }, [optionPermissions]);

  // Build sort order maps for tabs
  const tabSortOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    // Get the minimum sort_order for each tab_id across all roles
    const tabMinOrders = new Map<string, number>();
    tabPermissions.forEach((perm) => {
      const key = `${perm.option_id}.${perm.tab_id}`;
      const current = tabMinOrders.get(key);
      if (current === undefined || perm.sort_order < current) {
        tabMinOrders.set(key, perm.sort_order);
      }
    });
    return tabMinOrders;
  }, [tabPermissions]);

  // Get user's roles as array
  const userRolesArray = useMemo(
    () => userRoles.map((r) => r.role),
    [userRoles]
  );

  // Check if user has access to an option
  const hasOptionAccess = useMemo(
    () => (optionId: string) => {
      const allowedRoles = optionPermissionsMap.get(optionId) || [];
      return allowedRoles.some((role) => userRolesArray.includes(role));
    },
    [optionPermissionsMap, userRolesArray]
  );

  // Check if user has access to a tab
  const hasTabAccess = useMemo(
    () => (optionId: string, tabId: string) => {
      const key = `${optionId}.${tabId}`;
      const allowedRoles = tabPermissionsMap.get(key) || [];
      return allowedRoles.some((role) => userRolesArray.includes(role));
    },
    [tabPermissionsMap, userRolesArray]
  );

  // Check if a tab has any permissions defined in the database
  const hasTabPermissions = useMemo(
    () => (optionId: string, tabId: string) => {
      const key = `${optionId}.${tabId}`;
      return tabPermissionsMap.has(key);
    },
    [tabPermissionsMap]
  );

  // Check if an option has at least one tab with explicit permissions (used for strict tab visibility)
  const optionHasAnyTabPermissions = useMemo(
    () => (optionId: string) => {
      const prefix = `${optionId}.`;
      for (const key of tabPermissionsMap.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },
    [tabPermissionsMap]
  );

  return {
    optionPermissions: optionPermissionsMap,
    tabPermissions: tabPermissionsMap,
    optionSortOrder: optionSortOrderMap,
    tabSortOrder: tabSortOrderMap,
    hasOptionAccess,
    hasTabAccess,
    hasTabPermissions,
    optionHasAnyTabPermissions,
    isLoading: isLoadingOptions || isLoadingTabs,
  };
}
