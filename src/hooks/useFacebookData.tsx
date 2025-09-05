
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { useSecureApiKeys } from './useSecureApiKeys';
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
  frequency?: number;
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
  filteredCampaigns?: FacebookCampaign[];
  adSets?: any[];
  filteredAdSets?: any[];
  daily_insights?: any[];
  last_updated: string;
  meta?: {
    adSetsAvailable: boolean;
    campaignInsightsAvailable: boolean;
    rateLimitHit: boolean;
    syncMethod: string;
  };
}

interface UseFacebookDataProps {
  dateRange?: { from: Date; to: Date };
  campaignIds?: string[];
  adSetIds?: string[];
  projectId: string; // Make projectId required
}

export const useFacebookData = ({ dateRange, campaignIds, adSetIds, projectId }: UseFacebookDataProps) => {
  const { agency } = useAgency();
  const { getApiKeys } = useSecureApiKeys();
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';
  const queryClient = useQueryClient();

  // Query for structured daily insights from the dedicated table
  const { data: dailyInsights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['facebook-daily-insights', projectId, dateRange?.from, dateRange?.to, campaignIds],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('📊 Fetching Facebook daily insights from dedicated table');
      
      let query = supabase
        .from('facebook_daily_insights')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });

      // Apply date range filter if provided
      if (dateRange) {
        const fromDate = format(toZonedTime(dateRange.from, userTimezone), 'yyyy-MM-dd');
        const toDate = format(toZonedTime(dateRange.to, userTimezone), 'yyyy-MM-dd');
        query = query.gte('date', fromDate).lte('date', toDate);
      }

      // Apply campaign filter if provided
      if (campaignIds && campaignIds.length > 0) {
        query = query.in('campaign_id', campaignIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Facebook daily insights:', error);
        throw error;
      }

      console.log(`📊 Fetched ${data?.length || 0} daily insights from dedicated table`);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Query for basic Facebook data (campaigns, ad sets, auth info) - still from project_integration_data
  const { data: facebookData, isLoading: isLoadingFacebook, error } = useQuery({
    queryKey: ['facebook-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      console.log('useFacebookData - Fetching basic Facebook data for project:', projectId);
      
      // First check if Facebook integration is connected for this project
      const { data: integration, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
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

      // Get the basic data (campaigns, ad sets, auth info)
      const { data: syncedData, error: syncError } = await supabase
        .from('project_integration_data')
        .select('*')
        .eq('project_id', projectId)
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
          campaigns: fbData.campaigns || [],
          adSets: fbData.adsets || [], // Note: keeping backward compatibility
          access_token: fbData.access_token,
          permissions: fbData.permissions,
          last_updated: syncedData.synced_at,
          meta: {
            adSetsAvailable: (fbData.adsets || []).length > 0,
            syncMethod: fbData.sync_method || 'cached'
          }
        };
      }

      return null;
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Background sync query - only runs when data is stale
  const { data: syncStatus } = useQuery({
    queryKey: ['facebook-sync-status', projectId, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!projectId || !facebookData) return null;
      
      const apiKeys = getApiKeys('facebook');
      if (!apiKeys.selected_ad_account_id || !apiKeys.access_token) {
        return null;
      }

      // Check if data is stale (older than 10 minutes)
      const dataAge = Date.now() - new Date(facebookData.last_updated).getTime();
      const isStale = dataAge > 10 * 60 * 1000;

      if (!isStale) {
        console.log('Facebook data is fresh, skipping sync');
        return { synced: false, reason: 'data_fresh' };
      }

      console.log('Facebook data is stale, triggering background sync');

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
          projectId: projectId
        };

        const syncResponse = await supabase.functions.invoke('sync-project-integrations', {
          body: syncPayload
        });

        if (syncResponse.error) {
          console.error('Background sync error:', syncResponse.error);
          return { synced: false, error: syncResponse.error };
        }

        console.log('Background sync completed successfully');
        return { synced: true, timestamp: new Date().toISOString() };
      } catch (error) {
        console.error('Background sync failed:', error);
        return { synced: false, error };
      }
    },
    enabled: !!projectId && !!facebookData,
    staleTime: 5 * 60 * 1000, // Check for sync every 5 minutes
    retry: 1, // Only retry once to avoid overwhelming the API
  });

  // Invalidate main query when sync completes
  React.useEffect(() => {
    if (syncStatus?.synced) {
      console.log('Background sync completed, invalidating cache');
      // Small delay to ensure data is written to database
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['facebook-integrations', projectId] });
      }, 1000);
    }
  }, [syncStatus, projectId, queryClient]);

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
    frequency: 0,
  };

  console.log('useFacebookData - Return data:', {
    hasData: !!facebookData,
    adSetsCount: facebookData?.adSets?.length || 0,
    campaignIds,
    adSetIds,
    timestamp: new Date().toISOString()
  });

  const isLoading = isLoadingFacebook || isLoadingInsights;

  // Apply filtering logic to the cached data and combine with daily insights
  const filteredData = React.useMemo(() => {
    if (!facebookData) return null;

    console.log('🔍 Facebook Data Filtering:', {
      hasBasicData: !!facebookData,
      totalDailyInsights: dailyInsights?.length || 0,
      dateRange: dateRange ? {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      } : null,
      campaignIds: campaignIds?.length || 0,
    });

    // Filter campaigns if campaign IDs are provided
    let filteredCampaigns = facebookData.campaigns;
    let filteredAdSets = facebookData.adSets || [];

    if (campaignIds && campaignIds.length > 0) {
      filteredCampaigns = facebookData.campaigns.filter(campaign => campaignIds.includes(campaign.id));
      
      // Filter ad sets by selected campaigns
      if (filteredAdSets.length > 0) {
        filteredAdSets = facebookData.adSets.filter(adSet => 
          campaignIds.includes(adSet.campaign_id)
        );
      }
    }

    // Calculate aggregated insights from daily insights data
    let aggregatedInsights = defaultInsights;
    
    if (dailyInsights && dailyInsights.length > 0) {
      console.log(`📊 Aggregating insights from ${dailyInsights.length} daily records`);
      
      // Group by date first to handle multiple campaigns per day
      const groupedByDate = dailyInsights.reduce((acc, day) => {
        const date = day.date;
        if (!acc[date]) {
          acc[date] = {
            impressions: 0,
            clicks: 0,
            spend: 0,
            reach: 0,
            conversions: 0,
            conversion_values: 0
          };
        }
        
        acc[date].impressions += (day.impressions || 0);
        acc[date].clicks += (day.clicks || 0);
        acc[date].spend += (day.spend || 0);
        acc[date].reach += (day.reach || 0);
        acc[date].conversions += (day.conversions || 0);
        acc[date].conversion_values += (day.conversion_values || 0);
        
        return acc;
      }, {} as Record<string, any>);
      
      // Now aggregate across all days
      aggregatedInsights = Object.values(groupedByDate).reduce((totals: any, day: any) => ({
        impressions: (totals.impressions || 0) + (day.impressions || 0),
        clicks: (totals.clicks || 0) + (day.clicks || 0),
        spend: (totals.spend || 0) + (day.spend || 0),
        reach: (totals.reach || 0) + (day.reach || 0),
        conversions: (totals.conversions || 0) + (day.conversions || 0),
        conversion_values: (totals.conversion_values || 0) + (day.conversion_values || 0),
        ctr: 0, // Will be calculated below
        cpc: 0, // Will be calculated below
        frequency: 0, // Will be calculated below
      }), { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0, conversion_values: 0, ctr: 0, cpc: 0, frequency: 0 });
      
      // Calculate derived metrics
      aggregatedInsights.ctr = aggregatedInsights.impressions > 0 ? (aggregatedInsights.clicks / aggregatedInsights.impressions) * 100 : 0;
      aggregatedInsights.cpc = aggregatedInsights.clicks > 0 ? aggregatedInsights.spend / aggregatedInsights.clicks : 0;
      aggregatedInsights.frequency = aggregatedInsights.reach > 0 ? aggregatedInsights.impressions / aggregatedInsights.reach : 0;
      
      console.log('📈 Aggregated insights from daily data:', {
        spend: aggregatedInsights.spend,
        impressions: aggregatedInsights.impressions,
        clicks: aggregatedInsights.clicks,
        reach: aggregatedInsights.reach,
        frequency: aggregatedInsights.frequency,
        ctr: aggregatedInsights.ctr,
        dataPoints: dailyInsights.length
      });
    }

    return {
      campaigns: facebookData.campaigns,
      adSets: facebookData.adSets,
      filteredCampaigns,
      filteredAdSets,
      insights: aggregatedInsights,
      daily_insights: dailyInsights || [],
      last_updated: facebookData.last_updated,
      meta: {
        ...facebookData.meta,
        dailyInsightsCount: dailyInsights?.length || 0,
        aggregatedFromDailyData: (dailyInsights?.length || 0) > 0,
        rateLimitHit: false // Add missing property
      }
    };
  }, [facebookData, dailyInsights, campaignIds, defaultInsights]);

  const returnData = {
    facebookData: filteredData,
    isLoading,
    insights: filteredData?.insights || defaultInsights,
    campaigns: facebookData?.campaigns || [], // All campaigns for the filter
    allCampaigns: facebookData?.campaigns || [], // Explicit all campaigns
    filteredCampaigns: filteredData?.filteredCampaigns || [], // Filtered campaigns
    adSets: facebookData?.adSets || [], // All ad sets for the filter
    filteredAdSets: filteredData?.filteredAdSets || [], // Filtered ad sets
    metrics: filteredData?.insights || defaultInsights,
    daily_insights: filteredData?.daily_insights || [], // Add daily insights to return data
    // Include metadata for better UX
    meta: filteredData?.meta || {
      adSetsAvailable: false,
      campaignInsightsAvailable: false,
      rateLimitHit: false,
      syncMethod: 'unknown',
      dailyInsightsCount: 0,
      aggregatedFromDailyData: false
    }
  };

  return returnData;
};
