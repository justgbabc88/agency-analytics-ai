
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';

export const useFacebookData = () => {
  const { agency } = useAgency();

  const { data: facebookData, isLoading } = useQuery({
    queryKey: ['facebook-integrations', agency?.id],
    queryFn: async () => {
      if (!agency) return null;
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('platform', 'facebook')
        .eq('is_connected', true)
        .order('last_sync', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching Facebook integration:', error);
        throw error;
      }

      // For now, return mock data structure since we don't have the actual data schema
      if (data) {
        return {
          insights: {
            impressions: 125000,
            clicks: 3200,
            spend: 850,
            reach: 95000,
            ctr: 2.56,
            cpc: 0.27,
            conversions: 75,
            conversion_values: 3200,
          },
          campaigns: [
            {
              id: '1',
              name: 'Holiday Sale Campaign',
              status: 'ACTIVE',
              objective: 'CONVERSIONS',
              created_time: new Date().toISOString(),
            },
            {
              id: '2',
              name: 'Brand Awareness Campaign',
              status: 'ACTIVE',
              objective: 'REACH',
              created_time: new Date().toISOString(),
            }
          ],
          last_updated: data.last_sync || new Date().toISOString(),
        };
      }

      return null;
    },
    enabled: !!agency,
  });

  return {
    facebookData,
    isLoading,
    insights: facebookData?.insights || {},
    campaigns: facebookData?.campaigns || [],
    metrics: facebookData?.insights || {},
  };
};
