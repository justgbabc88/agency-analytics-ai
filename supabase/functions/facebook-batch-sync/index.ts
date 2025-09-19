import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BatchRequest {
  method: string;
  relative_url: string;
}

interface BatchResponse {
  code: number;
  headers: { [key: string]: string }[];
  body: string;
}

interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
}

interface FacebookError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const { projectId, dateRange } = body;
    
    console.log('🚀 Starting Facebook batch sync...', { 
      projectId, 
      dateRange, 
      bodyKeys: Object.keys(body || {}),
      method: req.method 
    });
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get Facebook project integrations - either specific project or all connected ones
    let query = supabase
      .from('project_integrations')
      .select(`
        *
      `)
      .eq('platform', 'facebook')
      .eq('is_connected', true);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data: integrations, error: integrationsError } = await query;

    if (integrationsError) {
      console.error('Error fetching integrations:', integrationsError);
      throw integrationsError;
    }

    if (!integrations || integrations.length === 0) {
      console.log('No Facebook integrations found');
      return new Response(
        JSON.stringify({ success: true, message: 'No Facebook integrations to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${integrations.length} Facebook integrations to sync`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each integration
    for (const integration of integrations) {
      try {
        console.log(`Syncing project ${integration.project_id}...`);

        // Get stored API keys for this project
        const { data: apiKeyData, error: apiKeyError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', integration.project_id)
          .eq('platform', 'facebook')
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (apiKeyError || !apiKeyData?.data) {
          const errorMsg = `No API keys found for project ${integration.project_id}`;
          console.log(errorMsg);
          if (projectId) {
            // If syncing a specific project, return error
            return new Response(
              JSON.stringify({ success: false, error: 'No Facebook integration data found. Please connect Facebook first.' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }

        const apiKeys = apiKeyData.data as any;
        const accessToken = apiKeys.access_token;
        const adAccountId = apiKeys.selected_ad_account_id;

        if (!accessToken || !adAccountId) {
          const errorMsg = `Missing access token or ad account for project ${integration.project_id}`;
          console.log(errorMsg);
          if (projectId) {
            // If syncing a specific project, return error
            return new Response(
              JSON.stringify({ success: false, error: 'Missing Facebook access token or ad account. Please reconnect Facebook.' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          continue;
        }

        // Perform batch sync using Facebook's batch API with retry logic
        // Always sync the last 30 days of data regardless of UI date range
        console.log('📅 Setting up date range for sync...');
        
        let syncResult;
        try {
          const today = new Date();
          const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          const yesterday = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);
          
          const syncDateRange = {
            since: thirtyDaysAgo.toISOString().split('T')[0], // YYYY-MM-DD format
            until: yesterday.toISOString().split('T')[0]      // YYYY-MM-DD format
          };
          
          console.log(`📅 Syncing Facebook data from ${syncDateRange.since} to ${syncDateRange.until}`);
          
          // Try sync with retry logic and token refresh
          syncResult = await performBatchSyncWithRetry(
            accessToken, 
            adAccountId, 
            syncDateRange,
            integration.project_id,
            supabase
          );
          console.log('✅ performBatchSync completed successfully');
        } catch (syncError) {
          console.error('❌ Error in performBatchSync:', syncError);
          
          // Try to get cached data as fallback
          const fallbackData = await getCachedFacebookData(integration.project_id, supabase);
          if (fallbackData) {
            console.log('📦 Using cached data as fallback');
            syncResult = { ...fallbackData, fromCache: true };
          } else {
            throw syncError;
          }
        }
        
        // Store the synced data - preserve existing credentials
        console.log('💾 Storing synced data...');
        try {
          // Get existing data to preserve credentials
          const { data: existingRecord } = await supabase
            .from('project_integration_data')
            .select('data')
            .eq('project_id', integration.project_id)
            .eq('platform', 'facebook')
            .maybeSingle();

          // Merge existing credentials with new sync data
          let mergedData = syncResult;
          if (existingRecord?.data) {
            const existing = existingRecord.data as any;
            if (existing.access_token) {
              mergedData = {
                ...syncResult,
                // Preserve authentication credentials
                access_token: existing.access_token,
                selected_ad_account_id: existing.selected_ad_account_id,
                permissions: existing.permissions,
                user_id: existing.user_id,
                expires_in: existing.expires_in
              };
              console.log('🔐 Preserved Facebook credentials during batch sync');
            }
          }

          await supabase
            .from('project_integration_data')
            .upsert({
              project_id: integration.project_id,
              platform: 'facebook',
              data: mergedData,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'project_id,platform'
            });
          console.log('✅ Data stored successfully');
          
          // Also store daily insights in the dedicated table
          if (mergedData.daily_insights && mergedData.daily_insights.length > 0) {
            console.log(`💾 Storing ${mergedData.daily_insights.length} daily insights to dedicated table...`);
            await storeFacebookDailyInsights(supabase, integration.project_id, mergedData.daily_insights);
            console.log('✅ Daily insights stored successfully');
          }
        } catch (storeError) {
          console.error('❌ Error storing data:', storeError);
          throw storeError;
        }

        // Update last sync timestamp
        await supabase
          .from('project_integrations')
          .update({
            last_sync: new Date().toISOString(),
            is_connected: true
          })
          .eq('id', integration.id);

        console.log(`✅ Successfully synced project ${integration.project_id}`);
        successCount++;
        
        results.push({
          project_id: integration.project_id,
          status: 'success',
          campaigns: syncResult.campaigns?.length || 0,
          adSets: syncResult.adsets?.length || 0
        });

        // Add delay between agencies to respect rate limits
        if (integrations.indexOf(integration) < integrations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Error syncing project ${integration.project_id}:`, error);
        errorCount++;
        
        results.push({
          project_id: integration.project_id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`🎯 Batch sync completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Batch sync completed: ${successCount} success, ${errorCount} errors`,
        results,
        total_integrations: integrations.length,
        success_count: successCount,
        error_count: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in batch sync:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        name: error.name
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function exponentialBackoff(attempt: number): Promise<void> {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  console.log(`⏳ Backing off for ${delay}ms (attempt ${attempt + 1})`);
  await sleep(delay);
}

async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${accessToken}`);
    return response.ok;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
}

async function refreshFacebookToken(projectId: string, supabase: any): Promise<string | null> {
  try {
    console.log('🔄 Attempting to refresh Facebook token...');
    
    // In a real implementation, you would store refresh tokens and use them here
    // For now, we'll return null to indicate manual reconnection is needed
    console.log('⚠️ Token refresh not implemented - manual reconnection required');
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

async function getCachedFacebookData(projectId: string, supabase: any): Promise<any> {
  try {
    console.log('📦 Retrieving cached Facebook data...');
    
    const { data } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'facebook')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (data?.data) {
      console.log('✅ Found cached data');
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get cached data:', error);
    return null;
  }
}

async function fetchWithEnhancedUsageCheck(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  // Check rate limit headers before processing response
  const rateLimitInfo = await checkRateLimitHeaders(response);
  
  if (rateLimitInfo.isRateLimited) {
    console.warn(`⚠️ Rate limit warning: ${rateLimitInfo.message} (${rateLimitInfo.usagePercentage}% used)`);
    
    // If we're very close to limits, proactively wait
    if (rateLimitInfo.usagePercentage && rateLimitInfo.usagePercentage > 95) {
      console.warn('🛑 Proactive rate limit protection: waiting 5 minutes...');
      await sleep(300000);
    }
  }

  return response;
}

function validateFacebookResponse(data: any): boolean {
  // Basic validation of Facebook API response structure
  if (!data) return false;
  
  // Check for Facebook error structure
  if (data.error) {
    console.error('Facebook API error:', data.error);
    return false;
  }
  
  return true;
}

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfter?: number;
  usagePercentage?: number;
  message?: string;
}

async function checkRateLimitHeaders(response: Response): Promise<RateLimitInfo> {
  const headers = Object.fromEntries(response.headers.entries());
  
  try {
    const usage = headers['x-ad-account-usage'] ? JSON.parse(headers['x-ad-account-usage']) : null;
    const appUsage = headers['x-app-usage'] ? JSON.parse(headers['x-app-usage']) : null;
    
    console.log('📊 Rate limit usage:', { usage, appUsage });
    
    // Check if we're approaching limits
    if (usage && usage.call_count > 90000) {
      return {
        isRateLimited: true,
        retryAfter: 3600, // 1 hour
        usagePercentage: (usage.call_count / 100000) * 100,
        message: 'Approaching ad account call limit'
      };
    }
    
    if (appUsage && appUsage.call_count > 190) {
      return {
        isRateLimited: true,
        retryAfter: 3600, // 1 hour  
        usagePercentage: (appUsage.call_count / 200) * 100,
        message: 'Approaching app rate limit'
      };
    }
    
    return { isRateLimited: false };
    
  } catch (err) {
    console.warn('Could not parse rate limit headers:', err);
    return { isRateLimited: false };
  }
}

async function smartExponentialBackoff(attempt: number, isRateLimit: boolean = false): Promise<void> {
  let delay: number;
  
  if (isRateLimit) {
    // For rate limits, use longer delays
    const rateLimitDelays = [30000, 60000, 300000, 900000]; // 30s, 1m, 5m, 15m
    delay = rateLimitDelays[Math.min(attempt, rateLimitDelays.length - 1)];
  } else {
    // For other errors, use standard exponential backoff
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 120000; // 2 minutes
    delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  }
  
  console.log(`⏳ Smart backoff: waiting ${delay}ms (attempt ${attempt + 1}, isRateLimit: ${isRateLimit})`);
  await sleep(delay);
}

async function performBatchSyncWithRetry(
  accessToken: string, 
  adAccountId: string, 
  dateRange: { since: string; until: string },
  projectId: string,
  supabase: any,
  maxRetries: number = 5
): Promise<any> {
  let lastError: Error | null = null;
  let rateLimitInfo: RateLimitInfo = { isRateLimited: false };
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔄 Enhanced sync attempt ${attempt + 1}/${maxRetries}`);
      
      // If we detected rate limiting, wait before proceeding
      if (rateLimitInfo.isRateLimited && attempt > 0) {
        console.log(`⏳ Rate limit detected: ${rateLimitInfo.message}`);
        await smartExponentialBackoff(attempt, true);
      }
      
      // Validate token before each attempt
      const isTokenValid = await validateToken(accessToken);
      if (!isTokenValid) {
        console.warn('🔑 Token appears invalid, attempting refresh...');
        const newToken = await refreshFacebookToken(projectId, supabase);
        if (newToken) {
          accessToken = newToken;
          console.log('✅ Token refreshed successfully');
        } else {
          throw new Error('Token expired and refresh failed. Please reconnect Facebook.');
        }
      }
      
      const result = await performBatchSync(accessToken, adAccountId, dateRange);
      
      // Validate the response
      if (!validateFacebookResponse(result)) {
        throw new Error('Invalid Facebook API response structure');
      }
      
      console.log(`✅ Enhanced sync successful on attempt ${attempt + 1}`);
      return result;
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Enhanced sync attempt ${attempt + 1} failed:`, error);
      
      // Parse the error to understand if it's rate limiting
      const errorMessage = error.message.toLowerCase();
      const isRateLimit = errorMessage.includes('rate limit') || 
                         errorMessage.includes('429') || 
                         errorMessage.includes('user request limit reached') ||
                         errorMessage.includes('too many calls');
      
      const isTokenError = errorMessage.includes('token') || 
                          errorMessage.includes('401') || 
                          errorMessage.includes('invalid_token');
      
      if (isRateLimit) {
        rateLimitInfo = {
          isRateLimited: true,
          retryAfter: 3600,
          message: 'Facebook API rate limit exceeded'
        };
        
        // Log rate limit incident for monitoring
        await supabase.from('sync_health_metrics').insert({
          project_id: projectId,
          platform: 'facebook',
          metric_type: 'rate_limit_hit',
          metric_value: attempt + 1,
          metadata: { error_message: error.message, attempt }
        });
        
      } else if (isTokenError) {
        console.log('🔑 Token error detected, stopping retries');
        break;
      }
      
      // Only retry if we haven't exceeded max attempts
      if (attempt < maxRetries - 1) {
        await smartExponentialBackoff(attempt, isRateLimit);
      }
    }
  }
  
  // All retries failed - provide helpful error message
  const errorMsg = rateLimitInfo.isRateLimited 
    ? `Facebook API rate limit exceeded. Please wait ${Math.round((rateLimitInfo.retryAfter || 3600) / 60)} minutes and try again.`
    : `Sync failed after ${maxRetries} attempts. Last error: ${lastError?.message}`;
    
  throw new Error(errorMsg);
}

async function performBatchSync(accessToken: string, adAccountId: string, dateRange: { since: string; until: string } = { since: '30', until: '1' }): Promise<any> {
  console.log(`🔄 Starting batch sync for ad account ${adAccountId}`);

  // Create batch requests - this reduces API calls from 3+ to just 1!
  const batchRequests: BatchRequest[] = [
    {
      method: 'GET',
      relative_url: `act_${adAccountId}/campaigns?fields=id,name,status,objective,created_time,updated_time`
    },
    {
      method: 'GET', 
      relative_url: `act_${adAccountId}/adsets?fields=id,name,campaign_id,status,created_time,updated_time`
    },
    {
      method: 'GET',
      relative_url: `act_${adAccountId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc,conversions,conversion_values&date_preset=last_30d`
    }
  ];

  // Make single batch API call to Facebook with enhanced error handling
  const batchResponse = await fetchWithEnhancedUsageCheck('https://graph.facebook.com/v18.0/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_token: accessToken,
      batch: batchRequests
    })
  });

  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    console.error('Facebook batch API error details:', errorText);
    
    try {
      const errorData = JSON.parse(errorText) as FacebookError;
      if (errorData.error) {
        throw new Error(`Facebook API error: ${errorData.error.message} (Code: ${errorData.error.code})`);
      }
    } catch (parseError) {
      // Fallback to generic error if parsing fails
      throw new Error(`Facebook batch API error: ${batchResponse.status} ${batchResponse.statusText}`);
    }
  }

  let batchResults: BatchResponse[];
  try {
    batchResults = await batchResponse.json();
    
    // Validate batch results structure
    if (!Array.isArray(batchResults)) {
      throw new Error('Invalid batch response format: expected array');
    }
    
    console.log(`📦 Received ${batchResults.length} batch responses`);
    
    // Log any individual batch errors
    batchResults.forEach((result, index) => {
      if (result.code !== 200) {
        console.warn(`Batch request ${index} failed with code ${result.code}:`, result.body);
      }
    });
    
  } catch (parseError) {
    throw new Error(`Failed to parse Facebook batch response: ${parseError.message}`);
  }
  // Parse batch responses with data validation
  let campaigns = [];
  let insights = {};
  
  // Parse campaigns with validation
  if (batchResults[0]?.code === 200) {
    try {
      const campaignsData = JSON.parse(batchResults[0].body);
      if (campaignsData.data && Array.isArray(campaignsData.data)) {
        campaigns = campaignsData.data;
        console.log(`✅ Successfully parsed ${campaigns.length} campaigns`);
      } else {
        console.warn('⚠️ Campaigns data has unexpected structure');
      }
    } catch (error) {
      console.error('❌ Failed to parse campaigns data:', error);
    }
  } else {
    console.warn(`⚠️ Campaigns request failed with code ${batchResults[0]?.code}`);
  }
  
  // Parse insights with validation
  if (batchResults[2]?.code === 200) {
    try {
      const insightsData = JSON.parse(batchResults[2].body);
      if (insightsData.data && Array.isArray(insightsData.data)) {
        insights = insightsData.data[0] || {};
        console.log('✅ Successfully parsed insights data');
      } else {
        console.warn('⚠️ Insights data has unexpected structure');
      }
    } catch (error) {
      console.error('❌ Failed to parse insights data:', error);
    }
  } else {
    console.warn(`⚠️ Insights request failed with code ${batchResults[2]?.code}`);
  }

  // Handle ad sets with rate limit awareness
  let adSets = [];
  let rateLimitHit = false;
  let preserveExistingAdSets = false;

  if (batchResults[1]?.code === 200) {
    adSets = JSON.parse(batchResults[1].body).data || [];
    console.log(`📊 Successfully fetched ${adSets.length} ad sets`);
  } else if (batchResults[1]?.code === 400 || batchResults[1]?.code === 429) {
    rateLimitHit = true;
    preserveExistingAdSets = true;
    console.log('⚠️  Rate limit detected for ad sets - will preserve existing data');
    
    // Try to get existing ad sets from the most recent sync
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: existingData } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('platform', 'facebook')
        .order('synced_at', { ascending: false })
        .limit(3); // Check last 3 syncs for ad sets
      
      if (existingData) {
        for (const record of existingData) {
          const fbData = record.data as any;
          if (fbData.adsets && fbData.adsets.length > 0) {
            adSets = fbData.adsets;
            console.log(`📚 Using ${adSets.length} ad sets from previous sync`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Could not retrieve existing ad sets:', error.message);
    }
  } else {
    console.log(`❌ Ad sets request failed with code ${batchResults[1]?.code}`);
  }
  
  console.log(`📊 Final data: ${campaigns.length} campaigns, ${adSets.length} ad sets`);
  
  if (rateLimitHit) {
    console.log('⚠️  Rate limit hit - using fallback ad sets data');
  }

  // Enhance ad sets with campaign names
  const enhancedAdSets = adSets.map((adSet: any) => {
    const campaign = campaigns.find((c: any) => c.id === adSet.campaign_id);
    return {
      ...adSet,
      campaign_name: campaign?.name || 'Unknown Campaign'
    };
  });

  // Get detailed insights for campaigns (using chunked batch requests)
  let campaignInsights = [];
  let dailyInsights = [];
  
  if (campaigns.length > 0) {
    console.log(`📊 Processing ${campaigns.length} campaigns in chunks of 8...`);
    
    // Split campaigns into chunks of 8 to allow for both campaign and daily insights
    const chunkSize = 8;
    for (let i = 0; i < campaigns.length; i += chunkSize) {
      const chunk = campaigns.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(campaigns.length / chunkSize)} (${chunk.length} campaigns)`);
      
      // Create batch requests for both campaign insights and daily insights
      const campaignBatchRequests = chunk.flatMap((campaign: any) => [
        {
          method: 'GET',
          relative_url: `${campaign.id}/insights?fields=impressions,clicks,spend,reach,conversions,conversion_values&date_preset=last_30d`
        },
        {
          method: 'GET',
          relative_url: `${campaign.id}/insights?fields=impressions,clicks,spend,reach,conversions,conversion_values&time_range={'since':'${dateRange.since}','until':'${dateRange.until}'}&time_increment=1`
        }
      ]);

      const campaignBatchResponse = await fetchWithUsageCheck('https://graph.facebook.com/v18.0/', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          batch: campaignBatchRequests
        })
      });

      if (campaignBatchResponse.ok) {
        const campaignBatchResults: BatchResponse[] = await campaignBatchResponse.json();
        
        // Process results in pairs (campaign insights, daily insights)
        for (let j = 0; j < chunk.length; j++) {
          const campaign = chunk[j];
          const campaignInsightIndex = j * 2;
          const dailyInsightIndex = j * 2 + 1;
          
          // Process campaign insights
          if (campaignBatchResults[campaignInsightIndex]?.code === 200) {
            const campaignData = JSON.parse(campaignBatchResults[campaignInsightIndex].body).data?.[0] || {};
            campaignInsights.push({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              ...campaignData
            });
          }
          
          // Process daily insights
          if (campaignBatchResults[dailyInsightIndex]?.code === 200) {
            const dailyData = JSON.parse(campaignBatchResults[dailyInsightIndex].body).data || [];
            const campaignDailyInsights = dailyData.map((day: any) => ({
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              date: day.date_start,
              ...day
            }));
            dailyInsights.push(...campaignDailyInsights);
          }
        }
      }
      
      // Add delay between chunks to reduce burst rate (except for the last chunk)
      if (i + chunkSize < campaigns.length) {
        console.log('⏱️  Waiting 2 seconds before next chunk...');
        await sleep(2000);
      }
    }
  }
  
  console.log(`📈 Fetched daily insights: ${dailyInsights.length} data points across ${campaigns.length} campaigns`);

  // Calculate aggregated metrics
  const aggregatedMetrics = {
    total_impressions: insights.impressions || 0,
    total_clicks: insights.clicks || 0,
    total_spend: insights.spend || 0,
    total_reach: insights.reach || 0,
    total_conversions: insights.conversions || 0,
    total_revenue: insights.conversion_values || 0,
    overall_ctr: insights.ctr || 0,
    overall_cpc: insights.cpc || 0
  };

  const result = {
    campaigns: campaigns,
    adsets: enhancedAdSets,
    insights: insights,
    campaign_insights: campaignInsights,
    aggregated_metrics: aggregatedMetrics,
    daily_insights: dailyInsights, // Now includes actual daily insights data
    sync_method: 'batch_api',
    synced_at: new Date().toISOString(),
    // Add metadata for better UX
    rate_limit_hit: rateLimitHit,
    meta: {
      adSetsAvailable: enhancedAdSets.length > 0,
      campaignInsightsAvailable: campaignInsights.length > 0,
      dailyInsightsAvailable: dailyInsights.length > 0,
      rateLimitHit: rateLimitHit,
      syncMethod: 'batch_api'
    }
  };

  console.log(`✅ Batch sync completed for ad account ${adAccountId}`);
  return result;
}

// Helper function to store daily insights in the dedicated table
async function storeFacebookDailyInsights(supabase: any, projectId: string, dailyInsights: any[]) {
  try {
    console.log(`📊 Processing ${dailyInsights.length} daily insights for project ${projectId}`);
    
    // Batch process insights (avoid too many individual calls)
    const batchSize = 100;
    let processed = 0;
    
    for (let i = 0; i < dailyInsights.length; i += batchSize) {
      const batch = dailyInsights.slice(i, i + batchSize);
      
      // Use upsert function for each insight
      for (const insight of batch) {
        try {
          await supabase.rpc('upsert_facebook_daily_insight', {
            p_project_id: projectId,
            p_campaign_id: insight.campaign_id,
            p_campaign_name: insight.campaign_name || 'Unknown Campaign',
            p_date: insight.date,
            p_impressions: parseInt(insight.impressions || '0'),
            p_clicks: parseInt(insight.clicks || '0'),
            p_spend: parseFloat(insight.spend || '0'),
            p_reach: parseInt(insight.reach || '0'),
            p_conversions: parseInt(insight.conversions || '0'),
            p_conversion_values: parseFloat(insight.conversion_values || '0')
          });
          processed++;
        } catch (insightError) {
          console.error(`⚠️ Failed to store insight for campaign ${insight.campaign_id} on ${insight.date}:`, insightError);
          // Continue processing other insights
        }
      }
      
      // Small delay between batches
      if (i + batchSize < dailyInsights.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Successfully processed ${processed}/${dailyInsights.length} daily insights`);
  } catch (error) {
    console.error('❌ Error storing daily insights:', error);
    throw error;
  }
}