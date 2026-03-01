import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { useLocalization } from "@/contexts/LocalizationContext";

type GeneratedReport = Database['public']['Tables']['generated_reports']['Row'];
type GeneratedReportInsert = Database['public']['Tables']['generated_reports']['Insert'];

export const useGeneratedReports = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['generated-reports', projectId],
    queryFn: async () => {
      let query = supabase
        .from('generated_reports')
        .select('*, projects(name)')
        .order('generated_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as (GeneratedReport & { projects: { name: string } | null })[];
    }
  });
  
  const saveReport = useMutation({
    mutationFn: async (reportData: GeneratedReportInsert) => {
      const { data, error } = await supabase
        .from('generated_reports')
        .insert(reportData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      toast({ title: t('toast.reportSavedToHistory') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save report: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      toast({ title: t('toast.reportDeleted') });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete report: ${error.message}`,
        variant: 'destructive'
      });
    }
  });
  
  return { reports, isLoading, saveReport, deleteReport };
};
