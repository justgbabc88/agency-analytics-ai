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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting Facebook batch sync for all agencies...');

    // Get all Facebook project integrations that are connected
    const { data: integrations, error: integrationsError } = await supabase
      .from('project_integrations')
      .select(`
        *,
        projects (
          id,
          name,
          agency_id
        )
      `)
      .eq('platform', 'facebook')
      .eq('is_connected', true);

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
          console.log(`No API keys found for project ${integration.project_id}, skipping...`);
          continue;
        }

        const apiKeys = apiKeyData.data as any;
        const accessToken = apiKeys.access_token;
        const adAccountId = apiKeys.selected_ad_account_id;

        if (!accessToken || !adAccountId) {
          console.log(`Missing access token or ad account for project ${integration.project_id}, skipping...`);
          continue;
        }

        // Perform batch sync using Facebook's batch API
        const syncResult = await performBatchSync(accessToken, adAccountId);
        
        // Store the synced data
        await supabase
          .from('project_integration_data')
          .upsert({
            project_id: integration.project_id,
            platform: 'facebook',
            data: syncResult,
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'project_id,platform'
          });

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
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function fetchWithUsageCheck(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const headers = Object.fromEntries(response.headers.entries());

  try {
    const usage = headers['x-ad-account-usage'] ? JSON.parse(headers['x-ad-account-usage']) : null;
    const appUsage = headers['x-app-usage'] ? JSON.parse(headers['x-app-usage']) : null;
    
    console.log('📊 Ad account usage:', usage);
    console.log('📊 App usage:', appUsage);

    if (usage && usage.call_count > 80000) {
      console.warn('⏳ Approaching rate limit. Sleeping for 60 seconds...');
      await sleep(60000);
    }
  } catch (err) {
    console.warn('Could not parse usage headers:', headers['x-ad-account-usage'], headers['x-app-usage']);
  }

  return response;
}

async function performBatchSync(accessToken: string, adAccountId: string): Promise<any> {
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

  // Make single batch API call to Facebook
  const batchResponse = await fetchWithUsageCheck('https://graph.facebook.com/v18.0/', {
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
    throw new Error(`Facebook batch API error: ${batchResponse.status} ${batchResponse.statusText}`);
  }

  const batchResults: BatchResponse[] = await batchResponse.json();
  console.log(`📦 Received ${batchResults.length} batch responses`);

  // Parse batch responses
  const campaigns = batchResults[0]?.code === 200 ? JSON.parse(batchResults[0].body).data || [] : [];
  const insights = batchResults[2]?.code === 200 ? JSON.parse(batchResults[2].body).data?.[0] || {} : {};

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
  if (campaigns.length > 0) {
    console.log(`📊 Processing ${campaigns.length} campaigns in chunks of 10...`);
    
    // Split campaigns into chunks of 10 to reduce burst rate
    const chunkSize = 10;
    for (let i = 0; i < campaigns.length; i += chunkSize) {
      const chunk = campaigns.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(campaigns.length / chunkSize)} (${chunk.length} campaigns)`);
      
      const campaignBatchRequests = chunk.map((campaign: any) => ({
        method: 'GET',
        relative_url: `${campaign.id}/insights?fields=impressions,clicks,spend,reach,conversions,conversion_values&date_preset=last_30d`
      }));

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
        const chunkInsights = campaignBatchResults.map((result, index) => {
          const campaignData = result.code === 200 ? JSON.parse(result.body).data?.[0] || {} : {};
          return {
            campaign_id: chunk[index].id,
            campaign_name: chunk[index].name,
            ...campaignData
          };
        });
        campaignInsights.push(...chunkInsights);
      }
      
      // Add delay between chunks to reduce burst rate (except for the last chunk)
      if (i + chunkSize < campaigns.length) {
        console.log('⏱️  Waiting 1.5 seconds before next chunk...');
        await sleep(1500);
      }
    }
  }

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
    daily_insights: [], // We'll keep this for compatibility but won't fetch daily data in batch sync
    sync_method: 'batch_api',
    synced_at: new Date().toISOString(),
    // Add metadata for better UX
    rate_limit_hit: rateLimitHit,
    meta: {
      adSetsAvailable: enhancedAdSets.length > 0,
      campaignInsightsAvailable: campaignInsights.length > 0,
      rateLimitHit: rateLimitHit,
      syncMethod: 'batch_api'
    }
  };

  console.log(`✅ Batch sync completed for ad account ${adAccountId}`);
  return result;
}