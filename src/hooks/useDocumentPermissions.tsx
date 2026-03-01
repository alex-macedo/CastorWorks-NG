import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PermissionLevel = "view" | "edit" | "admin";

export interface DocumentPermission {
  id: string;
  document_id: string;
  user_id: string;
  permission_level: PermissionLevel;
  granted_by: string;
  created_at: string;
  user_profiles?: {
    display_name: string;
  };
}

export function useDocumentPermissions(documentId?: string) {
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["document-permissions", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from("document_permissions")
        .select("*")
        .eq("document_id", documentId);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = data?.map(p => p.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      // Combine permissions with user profiles
      return data.map(permission => ({
        ...permission,
        user_profiles: profiles?.find(p => p.user_id === permission.user_id),
      })) as DocumentPermission[];
    },
    enabled: !!documentId,
  });

  const grantPermission = useMutation({
    mutationFn: async ({
      userId,
      permissionLevel,
    }: {
      userId: string;
      permissionLevel: PermissionLevel;
    }) => {
      if (!documentId) throw new Error("Document ID is required");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("document_permissions").insert({
        document_id: documentId,
        user_id: userId,
        permission_level: permissionLevel,
        granted_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-permissions", documentId] });
      toast.success("Permission granted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant permission: ${error.message}`);
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({
      permissionId,
      permissionLevel,
    }: {
      permissionId: string;
      permissionLevel: PermissionLevel;
    }) => {
      const { error } = await supabase
        .from("document_permissions")
        .update({ permission_level: permissionLevel })
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-permissions", documentId] });
      toast.success("Permission updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });

  const revokePermission = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("document_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-permissions", documentId] });
      toast.success("Permission revoked successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke permission: ${error.message}`);
    },
  });

  return {
    permissions,
    isLoading,
    grantPermission: grantPermission.mutate,
    updatePermission: updatePermission.mutate,
    revokePermission: revokePermission.mutate,
  };
}
