
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';

interface FacebookInsights {
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversion_values: number;
}

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
}

interface FacebookData {
  insights: FacebookInsights;
  campaigns: FacebookCampaign[];
  last_updated: string;
}

export const useFacebookData = () => {
  const { agency } = useAgency();

  const { data: facebookData, isLoading } = useQuery({
    queryKey: ['facebook-integrations', agency?.id],
    queryFn: async () => {
      if (!agency) return null;
      
      // First check if Facebook integration is connected
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('platform', 'facebook')
        .eq('is_connected', true)
        .maybeSingle();

      if (integrationError) {
        console.error('Error fetching Facebook integration:', integrationError);
        throw integrationError;
      }

      if (!integration) {
        console.log('No Facebook integration found or not connected');
        return null;
      }

      // Then fetch the actual synced data
      const { data: syncedData, error: syncError } = await supabase
        .from('integration_data')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('platform', 'facebook')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncError) {
        console.error('Error fetching Facebook data:', syncError);
        throw syncError;
      }

      if (syncedData && syncedData.data) {
        const fbData = syncedData.data as any;
        
        return {
          insights: {
            impressions: fbData.insights?.impressions || fbData.aggregated_metrics?.total_impressions || 0,
            clicks: fbData.insights?.clicks || fbData.aggregated_metrics?.total_clicks || 0,
            spend: fbData.insights?.spend || fbData.aggregated_metrics?.total_spend || 0,
            reach: fbData.insights?.reach || 0,
            ctr: fbData.insights?.ctr || fbData.aggregated_metrics?.overall_ctr || 0,
            cpc: fbData.insights?.cpc || fbData.aggregated_metrics?.overall_cpc || 0,
            conversions: fbData.insights?.conversions || fbData.aggregated_metrics?.total_conversions || 0,
            conversion_values: fbData.insights?.conversion_values || fbData.aggregated_metrics?.total_revenue || 0,
          },
          campaigns: fbData.campaigns || [],
          last_updated: syncedData.synced_at,
        } as FacebookData;
      }

      // If no synced data but integration exists, show connection message
      if (integration) {
        console.log('Facebook integration connected but no synced data found');
        return null;
      }

      return null;
    },
    enabled: !!agency,
  });

  // Default insights with proper typing
  const defaultInsights: FacebookInsights = {
    impressions: 0,
    clicks: 0,
    spend: 0,
    reach: 0,
    ctr: 0,
    cpc: 0,
    conversions: 0,
    conversion_values: 0,
  };

  return {
    facebookData,
    isLoading,
    insights: facebookData?.insights || defaultInsights,
    campaigns: facebookData?.campaigns || [],
    metrics: facebookData?.insights || defaultInsights,
  };
};
