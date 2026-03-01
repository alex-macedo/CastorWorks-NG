import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSeedDataStatus = () => {
  return useQuery({
    queryKey: ['seed-data-status'],
    queryFn: async () => {
      const { data: registry } = await supabase
        .from('seed_data_registry')
        .select('entity_type, entity_id');

      if (!registry) return new Set<string>();

      // Create a set of all seed entity IDs for fast lookup
      const seedIds = new Set<string>(
        registry.map(record => record.entity_id)
      );

      return seedIds;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useIsSeedProject = (projectId: string | undefined) => {
  const { data: seedIds } = useSeedDataStatus();
  
  if (!projectId || !seedIds) return false;
  return seedIds.has(projectId);
};
