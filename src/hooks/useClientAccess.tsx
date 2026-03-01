import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientProjectAccess {
  id: string;
  client_id: string;
  project_id: string;
  user_id: string; // Required - references auth.users
  access_level: string;
  can_view_documents: boolean;
  can_view_financials: boolean;
  can_download_reports: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientAccessList = () => {
  return useQuery({
    queryKey: ["client-access-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_project_access")
        .select(`
          *,
          clients!client_id (id, name, email),
          projects!project_id (id, name, status)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ ERROR fetching client access list:");
        console.error("  Code:", error.code);
        console.error("  Message:", error.message);
        console.error("  Details:", error.details);
        console.error("  Hint:", error.hint);
        console.error("  Full error object:", error);

        // Show user-friendly toast message
        toast.error(`Failed to load client access list: ${error.message || 'Unknown error'}`);
        throw error;
      }

      console.log("Client access list fetched successfully:", {
        count: data?.length || 0,
        data: data
      });

      return data;
    },
  });
};

export const useCreateClientAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (access: {
      client_id: string;
      project_id: string;
      user_id: string; // Required - must be a valid user with client role
      can_view_documents?: boolean;
      can_view_financials?: boolean;
      can_download_reports?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("client_project_access")
        .insert(access)
        .select()
        .single();

      if (error) throw error;

      // Fetch client and project details for email notification
      const [clientResult, projectResult] = await Promise.all([
        supabase.from("clients").select("name, email").eq("id", access.client_id).single(),
        supabase.from("projects").select("name").eq("id", access.project_id).single(),
      ]);

      // Record audit log
      await supabase.functions.invoke("record_admin_event", {
        body: {
          event_key: "client_access_granted",
          payload: {
            access_id: data.id,
            client_id: access.client_id,
            client_name: clientResult.data?.name,
            project_id: access.project_id,
            project_name: projectResult.data?.name,
            permissions: {
              can_view_documents: access.can_view_documents ?? true,
              can_view_financials: access.can_view_financials ?? false,
              can_download_reports: access.can_download_reports ?? true,
            },
          },
        },
      });

      if (clientResult.data && projectResult.data && clientResult.data.email) {
        // Send email notification
        try {
          await supabase.functions.invoke("send-client-access-notification", {
            body: {
              clientEmail: clientResult.data.email,
              clientName: clientResult.data.name,
              projectName: projectResult.data.name,
              permissions: {
                can_view_documents: access.can_view_documents ?? true,
                can_view_financials: access.can_view_financials ?? false,
                can_download_reports: access.can_download_reports ?? true,
              },
              isUpdate: false,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access-list"] });
      toast.success("Client access created successfully");
    },
    onError: (error: any) => {
      // Check for duplicate constraint violation
      if (error.code === '23505' && error.message.includes('client_project_access_user_project_unique')) {
        toast.error('This user already has access to this project. Please edit the existing access instead.');
      } else {
        toast.error(`Failed to create client access: ${error.message}`);
      }
    },
  });
};

export const useUpdateClientAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ClientProjectAccess>;
    }) => {
      const { data, error } = await supabase
        .from("client_project_access")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          clients!client_id (name, email),
          projects!project_id (name)
        `)
        .single();

      if (error) throw error;

      // Record audit log
      const accessData = data as any;
      await supabase.functions.invoke("record_admin_event", {
        body: {
          event_key: "client_access_modified",
          payload: {
            access_id: id,
            client_id: accessData.client_id,
            client_name: accessData.clients?.name,
            project_id: accessData.project_id,
            project_name: accessData.projects?.name,
            permissions: {
              can_view_documents: accessData.can_view_documents,
              can_view_financials: accessData.can_view_financials,
              can_download_reports: accessData.can_download_reports,
            },
          },
        },
      });

      // Send email notification for permission updates
      if (accessData.clients?.email && accessData.projects?.name) {
        try {
          await supabase.functions.invoke("send-client-access-notification", {
            body: {
              clientEmail: accessData.clients.email,
              clientName: accessData.clients.name,
              projectName: accessData.projects.name,
              permissions: {
                can_view_documents: accessData.can_view_documents,
                can_view_financials: accessData.can_view_financials,
                can_download_reports: accessData.can_download_reports,
              },
              isUpdate: true,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't fail the whole operation if email fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access-list"] });
      toast.success("Client access updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update client access: ${error.message}`);
    },
  });
};

export const useDeleteClientAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get access details before deleting for audit log
      const { data: access } = await supabase
        .from("client_project_access")
        .select(`
          *,
          clients!client_id (name),
          projects!project_id (name)
        `)
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("client_project_access")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Record audit log
      if (access) {
        const accessData = access as any;
        await supabase.functions.invoke("record_admin_event", {
          body: {
            event_key: "client_access_revoked",
            payload: {
              access_id: id,
              client_id: accessData.client_id,
              client_name: accessData.clients?.name,
              project_id: accessData.project_id,
              project_name: accessData.projects?.name,
            },
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access-list"] });
      toast.success("Client access removed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove client access: ${error.message}`);
    },
  });
};

export const useClientUsers = () => {
  return useQuery({
    queryKey: ["client-users"],
    queryFn: async () => {
      // First get all user_ids with client role
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (rolesError) throw rolesError;
      if (!userRoles || userRoles.length === 0) return [];

      const userIds = userRoles.map(r => r.user_id);

      // Get user profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching user profiles:", profilesError);
        // If profiles fetch fails, return basic data from auth metadata
        return userRoles.map(role => ({
          user_id: role.user_id,
          user_profiles: null
        }));
      }

      // Combine the data
      return userRoles.map(role => {
        const profile = profiles?.find(p => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          user_profiles: profile || null
        };
      });
    },
  });
};
