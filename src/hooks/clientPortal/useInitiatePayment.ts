import { useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useInitiatePayment() {
  const { projectId } = useParams<{ projectId: string }>();

  return useMutation({
    mutationFn: async (paymentData: any) => {
      // Prefer edge function if available, fallback to table insert
      if (typeof (window as any).__SUPABASE_EDGE__ !== 'undefined') {
        // hypothetical edge invocation
      }

      const payload = { ...paymentData, project_id: projectId };
      const { data, error } = await supabase.from('client_payments').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
  });
}
