
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { useApiKeys } from './useApiKeys';
import { format } from 'date-fns';

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
  daily_insights?: any[];
  last_updated: string;
}

interface UseFacebookDataProps {
  dateRange?: { from: Date; to: Date };
}

export const useFacebookData = ({ dateRange }: UseFacebookDataProps = {}) => {
  const { agency } = useAgency();
  const { getApiKeys } = useApiKeys();

  const { data: facebookData, isLoading } = useQuery({
    queryKey: ['facebook-integrations', agency?.id, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!agency) return null;
      
      console.log('useFacebookData - Starting data fetch for agency:', agency.id);
      
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

      // Get API keys including the selected ad account
      const apiKeys = getApiKeys('facebook');
      console.log('useFacebookData - API keys retrieved:', {
        hasAccessToken: !!apiKeys.access_token,
        selectedAdAccount: apiKeys.selected_ad_account_id
      });

      // If we have a selected ad account, trigger a sync with that account
      if (apiKeys.selected_ad_account_id && apiKeys.access_token) {
        try {
          const syncPayload = {
            platform: 'facebook',
            apiKeys: {
              access_token: apiKeys.access_token,
              selected_ad_account_id: apiKeys.selected_ad_account_id,
              ...(dateRange && {
                date_range: {
                  since: format(dateRange.from, 'yyyy-MM-dd'),
                  until: format(dateRange.to, 'yyyy-MM-dd')
                }
              })
            },
            agencyId: agency.id
          };

          console.log('useFacebookData - Triggering sync with payload:', syncPayload);

          const syncResponse = await supabase.functions.invoke('sync-integrations', {
            body: syncPayload
          });

          if (syncResponse.error) {
            console.error('Sync error:', syncResponse.error);
          } else {
            console.log('Sync response:', syncResponse.data);
          }
        } catch (error) {
          console.error('Error triggering sync:', error);
        }
      }

      // Fetch the synced data
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

      console.log('useFacebookData - Synced data retrieved:', {
        hasData: !!syncedData,
        dataKeys: syncedData?.data ? Object.keys(syncedData.data as any) : 'no data',
        insights: (syncedData?.data as any)?.insights,
        aggregatedMetrics: (syncedData?.data as any)?.aggregated_metrics,
        campaignsCount: (syncedData?.data as any)?.campaigns?.length || 0
      });

      if (syncedData && syncedData.data) {
        const fbData = syncedData.data as any;
        
        // If we have a date range and daily insights, filter the data to that specific range
        if (dateRange && fbData.daily_insights) {
          const filteredDailyInsights = fbData.daily_insights.filter((day: any) => {
            const dayDate = new Date(day.date);
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            
            // Set all dates to start of day for accurate comparison
            dayDate.setHours(0, 0, 0, 0);
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(0, 0, 0, 0);
            
            return dayDate >= fromDate && dayDate <= toDate;
          });
          
          console.log('useFacebookData - Filtering daily insights:', {
            originalCount: fbData.daily_insights.length,
            filteredCount: filteredDailyInsights.length,
            dateRange: {
              from: format(dateRange.from, 'yyyy-MM-dd'),
              to: format(dateRange.to, 'yyyy-MM-dd')
            },
            filteredDates: filteredDailyInsights.map((d: any) => d.date)
          });
          
          // Calculate aggregated metrics from filtered daily data
          const filteredInsights = filteredDailyInsights.reduce((totals: any, day: any) => {
            return {
              impressions: (totals.impressions || 0) + (day.impressions || 0),
              clicks: (totals.clicks || 0) + (day.clicks || 0),
              spend: (totals.spend || 0) + (day.spend || 0),
              reach: Math.max(totals.reach || 0, day.reach || 0), // Reach is unique, take max
              conversions: (totals.conversions || 0) + (day.conversions || 0),
              conversion_values: (totals.conversion_values || 0) + (day.conversion_values || 0)
            };
          }, {});
          
          // Calculate derived metrics
          filteredInsights.frequency = filteredInsights.reach > 0 ? filteredInsights.impressions / filteredInsights.reach : 0;
          filteredInsights.ctr = filteredInsights.impressions > 0 ? (filteredInsights.clicks / filteredInsights.impressions) * 100 : 0;
          filteredInsights.cpm = filteredInsights.impressions > 0 ? (filteredInsights.spend / filteredInsights.impressions) * 1000 : 0;
          filteredInsights.cpc = filteredInsights.clicks > 0 ? filteredInsights.spend / filteredInsights.clicks : 0;
          
          return {
            insights: filteredInsights,
            campaigns: fbData.campaigns || [],
            daily_insights: filteredDailyInsights,
            last_updated: syncedData.synced_at,
          } as FacebookData;
        }
        
        // Fallback to original aggregated data if no date range or daily insights
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
          daily_insights: fbData.daily_insights || [],
          last_updated: syncedData.synced_at,
        } as FacebookData;
      }

      return null;
    },
    enabled: !!agency,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
