import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useTaxAlerts = (taxProjectId?: string) => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['tax-alerts', taxProjectId],
    queryFn: async () => {
      if (!taxProjectId) return [];
      const { data, error } = await supabase
        .from('tax_alerts')
        .select('*')
        .eq('tax_project_id', taxProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!taxProjectId
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('tax_alerts')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-alerts', taxProjectId] });
      toast.success("Alert resolved successfully");
    },
    onError: (error) => {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  });

  return {
    alerts,
    isLoading,
    resolveAlert
  };
};
