import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface CreateUserParams {
  email: string;
  password: string;
  displayName?: string;
  roles?: AppRole[];
  sendInvite?: boolean;
  tenantId?: string;
  tenantRole?: AppRole;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateUserParams) => {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: params.email,
          password: params.password,
          display_name: params.displayName,
          roles: params.roles,
          send_invite: params.sendInvite,
          tenant_id: params.tenantId,
          tenant_role: params.tenantRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { ...data, tenantId: params.tenantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(data?.message || "User created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });
}
