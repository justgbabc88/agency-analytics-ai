
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { useApiKeys } from './useApiKeys';
import { useUserProfile } from './useUserProfile';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

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
  filteredCampaigns?: FacebookCampaign[]; // Optional filtered campaigns
  daily_insights?: any[];
  last_updated: string;
}

interface UseFacebookDataProps {
  dateRange?: { from: Date; to: Date };
  campaignIds?: string[];
}

export const useFacebookData = ({ dateRange, campaignIds }: UseFacebookDataProps = {}) => {
  const { agency } = useAgency();
  const { getApiKeys } = useApiKeys();
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';

  const { data: facebookData, isLoading } = useQuery({
    queryKey: ['facebook-integrations', agency?.id, dateRange?.from, dateRange?.to, campaignIds],
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
                  since: format(toZonedTime(dateRange.from, userTimezone), 'yyyy-MM-dd'),
                  until: format(toZonedTime(dateRange.to, userTimezone), 'yyyy-MM-dd')
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

      console.log('useFacebookData - Synced data retrieved:', syncedData);

      if (syncedData && syncedData.data) {
        const fbData = syncedData.data as any;
        
        console.log('useFacebookData - Facebook data structure:', {
          campaigns: fbData.campaigns,
          dailyInsightsCount: fbData.daily_insights?.length || 0,
          firstDailyInsight: fbData.daily_insights?.[0],
          hasAggregatedMetrics: !!fbData.aggregated_metrics,
          campaignIds
        });
        
        // Filter data by campaign and date range
        let filteredCampaigns = fbData.campaigns || [];
        let filteredInsights = fbData.insights || {};
        let filteredDailyInsights = fbData.daily_insights || [];

        // Filter by campaigns if provided
        if (campaignIds && campaignIds.length > 0) {
          filteredCampaigns = fbData.campaigns?.filter((campaign: any) => campaignIds.includes(campaign.id)) || [];
          
          // Get insights for selected campaigns from campaign_insights array
          const selectedCampaignInsights = fbData.campaign_insights?.filter((insight: any) => 
            campaignIds.includes(insight.campaign_id)
          ) || [];
          
          if (selectedCampaignInsights.length > 0) {
            // Aggregate metrics from selected campaigns
            const aggregatedInsights = selectedCampaignInsights.reduce((totals: any, insight: any) => {
              return {
                impressions: (totals.impressions || 0) + (insight.impressions || 0),
                clicks: (totals.clicks || 0) + (insight.clicks || 0),
                spend: (totals.spend || 0) + (insight.spend || 0),
                reach: Math.max(totals.reach || 0, insight.reach || 0),
                conversions: (totals.conversions || 0) + (insight.conversions || 0),
                conversion_values: (totals.conversion_values || 0) + (insight.conversion_values || 0),
              };
            }, {});
            
            // Calculate derived metrics for aggregated data
            aggregatedInsights.ctr = aggregatedInsights.impressions > 0 ? (aggregatedInsights.clicks / aggregatedInsights.impressions) * 100 : 0;
            aggregatedInsights.cpm = aggregatedInsights.impressions > 0 ? (aggregatedInsights.spend / aggregatedInsights.impressions) * 1000 : 0;
            aggregatedInsights.cpc = aggregatedInsights.clicks > 0 ? aggregatedInsights.spend / aggregatedInsights.clicks : 0;
            
            filteredInsights = aggregatedInsights;
          } else {
            // Fallback if no campaign insights found
            filteredInsights = {
              impressions: 0,
              clicks: 0,
              spend: 0,
              reach: 0,
              ctr: 0,
              cpc: 0,
              conversions: 0,
              conversion_values: 0,
            };
          }
          
          // Filter daily insights by selected campaigns
          filteredDailyInsights = fbData.daily_insights?.filter((day: any) => 
            campaignIds.includes(day.campaign_id)
          ) || [];
          
          console.log('useFacebookData - Multi-campaign filtering:', {
            campaignIds,
            selectedCampaigns: selectedCampaignInsights.map((c: any) => c.campaign_name),
            aggregatedInsights: filteredInsights,
            dailyInsightsCount: filteredDailyInsights.length
          });
        } else {
          // Use original aggregated data for all campaigns
          filteredInsights = {
            impressions: fbData.insights?.impressions || fbData.aggregated_metrics?.total_impressions || 0,
            clicks: fbData.insights?.clicks || fbData.aggregated_metrics?.total_clicks || 0,
            spend: fbData.insights?.spend || fbData.aggregated_metrics?.total_spend || 0,
            reach: fbData.insights?.reach || 0,
            ctr: fbData.insights?.ctr || fbData.aggregated_metrics?.overall_ctr || 0,
            cpc: fbData.insights?.cpc || fbData.aggregated_metrics?.overall_cpc || 0,
            conversions: fbData.insights?.conversions || fbData.aggregated_metrics?.total_conversions || 0,
            conversion_values: fbData.insights?.conversion_values || fbData.aggregated_metrics?.total_revenue || 0,
          };
        }

        // Filter by date range if provided
        if (dateRange && filteredDailyInsights.length > 0) {
          console.log('useFacebookData - Filtering by date range:', {
            dateRange: {
              from: format(dateRange.from, 'yyyy-MM-dd'),
              to: format(dateRange.to, 'yyyy-MM-dd')
            },
            beforeFilterCount: filteredDailyInsights.length
          });

          filteredDailyInsights = filteredDailyInsights.filter((day: any) => {
            // Parse the day date (should be in YYYY-MM-DD format from Facebook)
            const dayDate = new Date(day.date + 'T00:00:00'); // Ensure it's treated as start of day
            
            // Convert the user's selected date range to the user's timezone for comparison
            const fromDateInUserTz = toZonedTime(dateRange.from, userTimezone);
            const toDateInUserTz = toZonedTime(dateRange.to, userTimezone);
            
            // Set all dates to start of day for accurate comparison
            dayDate.setHours(0, 0, 0, 0);
            fromDateInUserTz.setHours(0, 0, 0, 0);
            toDateInUserTz.setHours(0, 0, 0, 0);
            
            const isInRange = dayDate >= fromDateInUserTz && dayDate <= toDateInUserTz;
            
            if (!isInRange) {
              console.log('useFacebookData - Day filtered out:', {
                dayDate: format(dayDate, 'yyyy-MM-dd'),
                fromDate: format(fromDateInUserTz, 'yyyy-MM-dd'),
                toDate: format(toDateInUserTz, 'yyyy-MM-dd'),
                userTimezone,
                isInRange
              });
            }
            
            return isInRange;
          });
          
          console.log('useFacebookData - After date filtering:', {
            afterFilterCount: filteredDailyInsights.length,
            datesIncluded: filteredDailyInsights.map((d: any) => d.date)
          });
          
          // Recalculate aggregated metrics from filtered daily data if we have it
          if (filteredDailyInsights.length > 0) {
            const dailyAggregated = filteredDailyInsights.reduce((totals: any, day: any) => {
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
            dailyAggregated.ctr = dailyAggregated.impressions > 0 ? (dailyAggregated.clicks / dailyAggregated.impressions) * 100 : 0;
            dailyAggregated.cpm = dailyAggregated.impressions > 0 ? (dailyAggregated.spend / dailyAggregated.impressions) * 1000 : 0;
            dailyAggregated.cpc = dailyAggregated.clicks > 0 ? dailyAggregated.spend / dailyAggregated.clicks : 0;
            
            filteredInsights = dailyAggregated;
            
            console.log('useFacebookData - Recalculated insights from filtered daily data:', filteredInsights);
          }
        }

        console.log('useFacebookData - Final filtered data:', {
          insights: filteredInsights,
          campaignsCount: filteredCampaigns.length,
          dailyInsightsCount: filteredDailyInsights.length,
          campaignIds,
          dateRange: dateRange ? {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd')
          } : null
        });

        return {
          insights: filteredInsights,
          campaigns: fbData.campaigns || [], // Always return all campaigns for the filter
          filteredCampaigns: filteredCampaigns, // Filtered campaigns for display
          daily_insights: filteredDailyInsights,
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
    campaigns: facebookData?.campaigns || [], // All campaigns for the filter
    allCampaigns: facebookData?.campaigns || [], // Explicit all campaigns
    filteredCampaigns: facebookData?.filteredCampaigns || [], // Filtered campaigns
    metrics: facebookData?.insights || defaultInsights,
  };
};
