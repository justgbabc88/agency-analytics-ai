
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
}

export const useFacebookData = ({ dateRange, campaignIds, adSetIds }: UseFacebookDataProps = {}) => {
  const { agency } = useAgency();
  const { getApiKeys } = useApiKeys();
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';
  const queryClient = useQueryClient();

  // First, get cached data immediately without any sync
  const { data: facebookData, isLoading, error } = useQuery({
    queryKey: ['facebook-integrations', agency?.id],
    queryFn: async () => {
      if (!agency) return null;
      
      console.log('useFacebookData - Fetching cached data for agency:', agency.id);
      
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

      // Get the most recent cached data first
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

      // Get fallback data with ad sets
      const { data: fallbackData } = await supabase
        .from('integration_data')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('platform', 'facebook')
        .order('synced_at', { ascending: false })
        .limit(5);

      if (syncedData && syncedData.data) {
        const fbData = syncedData.data as any;
        
        // Use ad sets from fallback if current sync doesn't have them
        let adSetsToUse = fbData.adsets || [];
        if (adSetsToUse.length === 0 && fallbackData && fallbackData.length > 0) {
          const dataWithAdSets = fallbackData.find(data => 
            data.data && (data.data as any).adsets && (data.data as any).adsets.length > 0
          );
          
          if (dataWithAdSets) {
            adSetsToUse = (dataWithAdSets.data as any).adsets;
          }
        }

        // Return raw data - filtering will be done in the component
        return {
          insights: fbData.insights || {},
          campaigns: fbData.campaigns || [],
          adSets: adSetsToUse || [],
          daily_insights: fbData.daily_insights || [],
          campaign_insights: fbData.campaign_insights || [],
          aggregated_metrics: fbData.aggregated_metrics || {},
          last_updated: syncedData.synced_at,
          // Add empty filtered arrays for TypeScript compatibility
          filteredCampaigns: fbData.campaigns || [],
          filteredAdSets: adSetsToUse || [],
          meta: {
            adSetsAvailable: adSetsToUse.length > 0,
            campaignInsightsAvailable: (fbData.campaign_insights || []).length > 0,
            rateLimitHit: fbData.rate_limit_hit || false,
            syncMethod: fbData.sync_method || 'cached'
          }
        };
      }

      return null;
    },
    enabled: !!agency,
    staleTime: 2 * 60 * 1000, // Data is fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Background sync query - only runs when data is stale
  const { data: syncStatus } = useQuery({
    queryKey: ['facebook-sync-status', agency?.id, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!agency || !facebookData) return null;
      
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
          agencyId: agency.id
        };

        const syncResponse = await supabase.functions.invoke('sync-integrations', {
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
    enabled: !!agency && !!facebookData,
    staleTime: 5 * 60 * 1000, // Check for sync every 5 minutes
    retry: 1, // Only retry once to avoid overwhelming the API
  });

  // Invalidate main query when sync completes
  React.useEffect(() => {
    if (syncStatus?.synced) {
      console.log('Background sync completed, invalidating cache');
      // Small delay to ensure data is written to database
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['facebook-integrations', agency?.id] });
      }, 1000);
    }
  }, [syncStatus, agency?.id, queryClient]);

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

  console.log('useFacebookData - Return data:', {
    hasData: !!facebookData,
    adSetsCount: facebookData?.adSets?.length || 0,
    filteredAdSetsCount: facebookData?.filteredAdSets?.length || 0,
    campaignIds,
    adSetIds,
    timestamp: new Date().toISOString(),
    queryKey: ['facebook-integrations', agency?.id, dateRange?.from, dateRange?.to, campaignIds, adSetIds]
  });

  // Apply filtering logic to the cached data
  const filteredData = React.useMemo(() => {
    if (!facebookData) return null;

    console.log('🔍 Facebook Data Filtering:', {
      hasData: !!facebookData,
      totalDailyInsights: facebookData.daily_insights?.length || 0,
      dateRange: dateRange ? {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      } : null,
      availableDates: facebookData.daily_insights?.map(d => d.date).slice(0, 10) || [],
      campaignIds: campaignIds?.length || 0,
      sampleDailyInsight: facebookData.daily_insights?.[0] || null
    });

    // Filter campaigns if campaign IDs are provided
    let filteredCampaigns = facebookData.campaigns;
    let filteredInsights = facebookData.insights;
    let filteredDailyInsights = facebookData.daily_insights || [];

    if (campaignIds && campaignIds.length > 0) {
      filteredCampaigns = facebookData.campaigns.filter(campaign => campaignIds.includes(campaign.id));
      
      // Filter daily insights by campaigns
      if (facebookData.daily_insights?.length > 0) {
        filteredDailyInsights = facebookData.daily_insights.filter(day => 
          campaignIds.includes(day.campaign_id)
        );
      }

      // Calculate insights from campaign insights if available
      if (facebookData.campaign_insights?.length > 0) {
        const selectedCampaignInsights = facebookData.campaign_insights.filter(insight => 
          campaignIds.includes(insight.campaign_id)
        );
        
        if (selectedCampaignInsights.length > 0) {
          filteredInsights = selectedCampaignInsights.reduce((totals, insight) => ({
            impressions: (totals.impressions || 0) + (insight.impressions || 0),
            clicks: (totals.clicks || 0) + (insight.clicks || 0),
            spend: (totals.spend || 0) + (insight.spend || 0),
            reach: Math.max(totals.reach || 0, insight.reach || 0),
            conversions: (totals.conversions || 0) + (insight.conversions || 0),
            conversion_values: (totals.conversion_values || 0) + (insight.conversion_values || 0),
            ctr: 0, // Will be calculated below
            cpc: 0, // Will be calculated below
          }), { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0, conversion_values: 0, ctr: 0, cpc: 0 });
          
          // Calculate derived metrics
          filteredInsights.ctr = filteredInsights.impressions > 0 ? (filteredInsights.clicks / filteredInsights.impressions) * 100 : 0;
          filteredInsights.cpc = filteredInsights.clicks > 0 ? filteredInsights.spend / filteredInsights.clicks : 0;
        }
      }
    }

    // Handle date range filtering with better fallback logic
    let dateFilteredInsights = filteredDailyInsights;
    let usingFallbackData = false;
    
    if (dateRange && filteredDailyInsights?.length > 0) {
      console.log('📅 Applying date range filter...');
      
      const filtered = filteredDailyInsights.filter(day => {
        const dayDate = new Date(day.date + 'T00:00:00');
        const fromDateInUserTz = toZonedTime(dateRange.from, userTimezone);
        const toDateInUserTz = toZonedTime(dateRange.to, userTimezone);
        
        dayDate.setHours(0, 0, 0, 0);
        fromDateInUserTz.setHours(0, 0, 0, 0);
        toDateInUserTz.setHours(0, 0, 0, 0);
        
        const isInRange = dayDate >= fromDateInUserTz && dayDate <= toDateInUserTz;
        
        if (isInRange) {
          console.log(`✅ Date ${day.date} is in range`);
        }
        
        return isInRange;
      });
      
      console.log('📊 Date filtering results:', {
        originalCount: filteredDailyInsights.length,
        filteredCount: filtered.length,
        dateRange: `${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}`,
        availableDates: filteredDailyInsights.map(d => d.date).slice(0, 10)
      });
      
      if (filtered.length > 0) {
        // Use filtered data if we have matches in the selected range
        dateFilteredInsights = filtered;
        console.log('✅ Using filtered data within date range');
      } else {
        // No data in selected range - use ALL original daily insights as fallback (before any campaign filtering)
        const allOriginalDailyInsights = facebookData.daily_insights || [];
        dateFilteredInsights = allOriginalDailyInsights;
        usingFallbackData = true;
        console.log('⚠️ No data in selected date range, using ALL available data as fallback');
        console.log('📈 Fallback data details:', {
          totalDays: dateFilteredInsights.length,
          dateRange: dateFilteredInsights.length > 0 ? 
            `${dateFilteredInsights[0].date} to ${dateFilteredInsights[dateFilteredInsights.length - 1].date}` : 
            'no data',
          sampleDates: dateFilteredInsights.map(d => d.date).slice(0, 10),
          campaigns: [...new Set(dateFilteredInsights.map(d => d.campaign_name))].slice(0, 3)
        });
      }
    }

    // Always recalculate insights from daily data if available
    if (dateFilteredInsights.length > 0) {
      console.log('📊 Raw daily insights sample:', dateFilteredInsights.slice(0, 3));
      
      const dailyAggregated = dateFilteredInsights.reduce((totals, day) => {
        console.log('Processing day:', day.date, 'spend:', day.spend, 'impressions:', day.impressions);
        return {
          impressions: (totals.impressions || 0) + (day.impressions || 0),
          clicks: (totals.clicks || 0) + (day.clicks || 0),
          spend: (totals.spend || 0) + (day.spend || 0),
          reach: Math.max(totals.reach || 0, day.reach || 0),
          conversions: (totals.conversions || 0) + (day.conversions || 0),
          conversion_values: (totals.conversion_values || 0) + (day.conversion_values || 0),
          ctr: 0, // Will be calculated below
          cpc: 0, // Will be calculated below
        };
      }, { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0, conversion_values: 0, ctr: 0, cpc: 0 });
      
      // Calculate derived metrics
      dailyAggregated.ctr = dailyAggregated.impressions > 0 ? (dailyAggregated.clicks / dailyAggregated.impressions) * 100 : 0;
      dailyAggregated.cpc = dailyAggregated.clicks > 0 ? dailyAggregated.spend / dailyAggregated.clicks : 0;
      
      filteredInsights = dailyAggregated;
      
      console.log('📈 Aggregated insights from daily data:', {
        spend: dailyAggregated.spend,
        impressions: dailyAggregated.impressions,
        clicks: dailyAggregated.clicks,
        ctr: dailyAggregated.ctr,
        dataPoints: dateFilteredInsights.length,
        usingFallbackData
      });
    } else {
      console.log('⚠️ No daily insights available for aggregation');
    }

    // Filter ad sets by selected campaigns
    let filteredAdSets = facebookData.adSets;
    if (campaignIds && campaignIds.length > 0 && filteredAdSets?.length > 0) {
      filteredAdSets = facebookData.adSets.filter(adSet => 
        campaignIds.includes(adSet.campaign_id)
      );
    }

    return {
      ...facebookData,
      insights: filteredInsights,
      filteredCampaigns,
      filteredAdSets,
      daily_insights: dateFilteredInsights, // Use the date-filtered insights
      meta: {
        ...facebookData.meta,
        usingFallbackData,
        actualDataDateRange: dateFilteredInsights.length > 0 ? {
          from: Math.min(...dateFilteredInsights.map(d => new Date(d.date).getTime())),
          to: Math.max(...dateFilteredInsights.map(d => new Date(d.date).getTime()))
        } : null
      }
    };
  }, [facebookData, campaignIds, dateRange, userTimezone]);

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
      syncMethod: 'unknown'
    }
  };

  return returnData;
};
