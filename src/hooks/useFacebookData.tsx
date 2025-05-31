
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';

export const useFacebookData = () => {
  const { agency } = useAgency();

  const { data: facebookData, isLoading } = useQuery({
    queryKey: ['facebook-data', agency?.id],
    queryFn: async () => {
      if (!agency) return null;
      
      const { data, error } = await supabase
        .from('integration_data')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('platform', 'facebook')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching Facebook data:', error);
        throw error;
      }

      return data?.data || null;
    },
    enabled: !!agency,
  });

  return {
    facebookData,
    isLoading,
    insights: facebookData?.insights || {},
    campaigns: facebookData?.campaigns || [],
    metrics: facebookData?.aggregated_metrics || {},
  };
};
