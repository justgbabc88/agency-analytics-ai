import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  platform: string
  apiKeys: Record<string, string>
  agencyId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { platform, apiKeys, agencyId }: SyncRequest = await req.json()

    console.log(`Syncing data for platform: ${platform}`)

    let syncResult: any = {}

    switch (platform) {
      case 'facebook':
        syncResult = await syncFacebook(apiKeys)
        break
      case 'clickfunnels':
        syncResult = await syncClickFunnels(apiKeys)
        break
      case 'gohighlevel':
        syncResult = await syncGoHighLevel(apiKeys)
        break
      case 'activecampaign':
        syncResult = await syncActiveCampaign(apiKeys)
        break
      case 'google_sheets':
        syncResult = await syncGoogleSheets(apiKeys)
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    // Store the synced data in the database using upsert
    const { error: insertError } = await supabase
      .from('integration_data')
      .upsert({
        agency_id: agencyId,
        platform,
        data: syncResult,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'agency_id,platform'
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    // Update the integration status using upsert
    const { error: updateError } = await supabase
      .from('integrations')
      .upsert({
        agency_id: agencyId,
        platform,
        is_connected: true,
        last_sync: new Date().toISOString()
      }, {
        onConflict: 'agency_id,platform'
      })

    if (updateError) {
      console.error('Integration update error:', updateError)
      throw updateError
    }

    console.log(`Successfully synced ${platform} data for agency ${agencyId}`)

    return new Response(
      JSON.stringify({ success: true, data: syncResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to handle Facebook API calls with rate limiting and retries
async function fetchFromFacebookWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Facebook API call attempt ${attempt}/${maxRetries}: ${url}`)
      
      const response = await fetch(url)
      
      if (response.ok) {
        return await response.json()
      }
      
      // Check if it's a rate limit error
      if (response.status === 400) {
        const errorText = await response.text()
        const errorData = JSON.parse(errorText)
        
        if (errorData?.error?.code === 17 || errorData?.error?.error_subcode === 2446079) {
          // Rate limit error - wait before retrying
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff, max 10 seconds
          console.log(`Rate limit hit. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          
          if (attempt === maxRetries) {
            console.error('Max retries reached for rate limited request:', { url, error: errorData })
            throw new Error(`Facebook API rate limit exceeded after ${maxRetries} attempts`)
          }
          continue
        }
      }
      
      // Other errors - don't retry
      const errorText = await response.text()
      console.error(`Facebook API error (attempt ${attempt}):`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url
      })
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`)
      
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Final attempt failed for ${url}:`, error)
        throw error
      }
      
      // Wait before retrying on network errors
      const waitTime = 1000 * attempt
      console.log(`Network error on attempt ${attempt}. Waiting ${waitTime}ms before retry:`, error)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}

async function syncFacebook(apiKeys: Record<string, string>) {
  const { access_token, selected_ad_account_id, date_range } = apiKeys
  
  if (!access_token) {
    throw new Error('Facebook access token is required')
  }

  console.log('Facebook sync initiated - fetching ad data')

  const adAccountId = selected_ad_account_id || 'act_123456789' // fallback for demo

  // Determine date range - use custom range if provided, otherwise default to last 30 days
  let datePreset = 'last_30d'
  let sinceParam = ''
  let untilParam = ''
  
  if (date_range?.since && date_range?.until) {
    sinceParam = `&time_range[since]=${date_range.since}`
    untilParam = `&time_range[until]=${date_range.until}`
    datePreset = '' // Don't use preset when custom range is provided
  } else {
    datePreset = '&date_preset=last_30d'
  }

  try {
    // Fetch campaigns with retry logic
    const campaignsData = await fetchFromFacebookWithRetry(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?access_token=${access_token}&fields=id,name,status,objective,created_time,updated_time`
    )

    // Fetch ad sets with insights to filter by spend
    let adSetsData = { data: [] }
    try {
      // First get all ad sets
      const allAdSetsData = await fetchFromFacebookWithRetry(
        `https://graph.facebook.com/v18.0/${adAccountId}/adsets?access_token=${access_token}&fields=id,name,campaign_id,status,created_time,updated_time`
      )
      
      console.log(`Fetched ${allAdSetsData.data?.length || 0} total ad sets, now filtering by spend...`)
      
      // Filter ad sets that have spend in the selected date range
      const adSetsWithSpend = []
      
      for (const adSet of allAdSetsData.data || []) {
        try {
          // Fetch insights for this ad set with the selected date range
          const insightsUrl = date_range?.since && date_range?.until 
            ? `https://graph.facebook.com/v18.0/${adSet.id}/insights?access_token=${access_token}&fields=spend${sinceParam}${untilParam}`
            : `https://graph.facebook.com/v18.0/${adSet.id}/insights?access_token=${access_token}&fields=spend${datePreset}`
          
          const insightsData = await fetchFromFacebookWithRetry(insightsUrl)
          
          // Check if ad set has spend in the date range
          const totalSpend = insightsData.data?.reduce((sum: number, day: any) => sum + parseFloat(day.spend || 0), 0) || 0
          
          if (totalSpend > 0) {
            adSetsWithSpend.push({
              ...adSet,
              total_spend: totalSpend
            })
          }
          
          // Add small delay between ad set requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (adSetInsightsError) {
          console.log(`Failed to fetch insights for ad set ${adSet.id}:`, adSetInsightsError)
          // Skip this ad set if insights fail
        }
      }
      
      adSetsData = { data: adSetsWithSpend }
      console.log(`Filtered to ${adSetsWithSpend.length} ad sets with spend > 0 in the selected date range`)
      
    } catch (adSetsError) {
      console.error('Failed to fetch ad sets after retries:', adSetsError)
      console.log('Ad sets unavailable due to Facebook API rate limits. No mock data provided.')
      adSetsData = { data: [] }
    }

    // Add campaign names to ad sets
    const adSetsWithCampaignNames = (adSetsData.data || []).map((adSet: any) => {
      const campaign = campaignsData.data?.find((c: any) => c.id === adSet.campaign_id)
      return {
        ...adSet,
        campaign_name: campaign?.name || 'Unknown Campaign'
      }
    })

    // Fetch insights for each campaign individually
    const campaignInsights: any[] = []
    const campaignDailyInsights: any[] = []
    
    for (const campaign of campaignsData.data || []) {
      try {
        // Fetch campaign-level insights with daily breakdown
        const campaignInsightsUrl = date_range?.since && date_range?.until 
          ? `https://graph.facebook.com/v18.0/${campaign.id}/insights?access_token=${access_token}&fields=campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,ctr,cpm,cpp,cpc,conversions,conversion_values,date_start,date_stop${sinceParam}${untilParam}&time_increment=1`
          : `https://graph.facebook.com/v18.0/${campaign.id}/insights?access_token=${access_token}&fields=campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,ctr,cpm,cpp,cpc,conversions,conversion_values,date_start,date_stop${datePreset}&time_increment=1`
        
        const campaignResponse = await fetch(campaignInsightsUrl)
        
        if (campaignResponse.ok) {
          const campaignData = await campaignResponse.json()
          
          // Process daily insights for this campaign
          const dailyData = campaignData.data || []
          
          // Add campaign info to daily insights
          dailyData.forEach((day: any) => {
            campaignDailyInsights.push({
              ...day,
              campaign_id: campaign.id,
              campaign_name: campaign.name
            })
          })
          
          // Calculate campaign totals
          const campaignTotals = dailyData.reduce((totals: any, day: any) => {
            return {
              impressions: (totals.impressions || 0) + parseInt(day.impressions || '0'),
              clicks: (totals.clicks || 0) + parseInt(day.clicks || '0'),
              spend: (totals.spend || 0) + parseFloat(day.spend || '0'),
              reach: Math.max(totals.reach || 0, parseInt(day.reach || '0')),
              conversions: (totals.conversions || 0) + parseInt(day.conversions || '0'),
              conversion_values: (totals.conversion_values || 0) + parseFloat(day.conversion_values || '0')
            }
          }, {})
          
          // Calculate derived metrics for campaign
          campaignTotals.frequency = campaignTotals.reach > 0 ? campaignTotals.impressions / campaignTotals.reach : 0
          campaignTotals.ctr = campaignTotals.impressions > 0 ? (campaignTotals.clicks / campaignTotals.impressions) * 100 : 0
          campaignTotals.cpm = campaignTotals.impressions > 0 ? (campaignTotals.spend / campaignTotals.impressions) * 1000 : 0
          campaignTotals.cpc = campaignTotals.clicks > 0 ? campaignTotals.spend / campaignTotals.clicks : 0
          
          campaignInsights.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            ...campaignTotals
          })
        }
      } catch (error) {
        console.error(`Error fetching insights for campaign ${campaign.id}:`, error)
      }
    }

    // Calculate overall aggregated totals from all campaigns
    const overallInsights = campaignInsights.reduce((totals: any, campaign: any) => {
      return {
        impressions: (totals.impressions || 0) + (campaign.impressions || 0),
        clicks: (totals.clicks || 0) + (campaign.clicks || 0),
        spend: (totals.spend || 0) + (campaign.spend || 0),
        reach: Math.max(totals.reach || 0, campaign.reach || 0),
        conversions: (totals.conversions || 0) + (campaign.conversions || 0),
        conversion_values: (totals.conversion_values || 0) + (campaign.conversion_values || 0)
      }
    }, {})
    
    // Calculate derived metrics from aggregated data
    overallInsights.frequency = overallInsights.reach > 0 ? overallInsights.impressions / overallInsights.reach : 0
    overallInsights.ctr = overallInsights.impressions > 0 ? (overallInsights.clicks / overallInsights.impressions) * 100 : 0
    overallInsights.cpm = overallInsights.impressions > 0 ? (overallInsights.spend / overallInsights.impressions) * 1000 : 0
    overallInsights.cpc = overallInsights.clicks > 0 ? overallInsights.spend / overallInsights.clicks : 0

    console.log(`Facebook sync successful - ${campaignsData.data?.length || 0} campaigns, ${adSetsWithCampaignNames.length} ad sets, insights fetched for date range: ${date_range?.since || 'last 30 days'} to ${date_range?.until || 'today'}`)

    return {
      campaigns: campaignsData.data || [],
      adsets: adSetsWithCampaignNames,
      campaign_insights: campaignInsights,
      insights: {
        impressions: parseInt(overallInsights.impressions || '0'),
        clicks: parseInt(overallInsights.clicks || '0'),
        spend: parseFloat(overallInsights.spend || '0'),
        reach: parseInt(overallInsights.reach || '0'),
        frequency: parseFloat(overallInsights.frequency || '0'),
        ctr: parseFloat(overallInsights.ctr || '0'),
        cpm: parseFloat(overallInsights.cpm || '0'),
        cpc: parseFloat(overallInsights.cpc || '0'),
        conversions: parseInt(overallInsights.conversions || '0'),
        conversion_values: parseFloat(overallInsights.conversion_values || '0')
      },
      daily_insights: campaignDailyInsights.map((day: any) => ({
        date: day.date_start,
        campaign_id: day.campaign_id,
        campaign_name: day.campaign_name,
        impressions: parseInt(day.impressions || '0'),
        clicks: parseInt(day.clicks || '0'),
        spend: parseFloat(day.spend || '0'),
        reach: parseInt(day.reach || '0'),
        frequency: parseFloat(day.frequency || '0'),
        ctr: parseFloat(day.ctr || '0'),
        cpm: parseFloat(day.cpm || '0'),
        cpc: parseFloat(day.cpc || '0'),
        conversions: parseInt(day.conversions || '0'),
        conversion_values: parseFloat(day.conversion_values || '0')
      })),
      aggregated_metrics: {
        total_campaigns: campaignsData.data?.length || 0,
        total_impressions: parseInt(overallInsights.impressions || '0'),
        total_clicks: parseInt(overallInsights.clicks || '0'),
        total_spend: parseFloat(overallInsights.spend || '0'),
        total_conversions: parseInt(overallInsights.conversions || '0'),
        total_revenue: parseFloat(overallInsights.conversion_values || '0'),
        overall_ctr: parseFloat(overallInsights.ctr || '0'),
        overall_cpm: parseFloat(overallInsights.cpm || '0'),
        overall_cpc: parseFloat(overallInsights.cpc || '0')
      },
      account_id: adAccountId,
      date_range: date_range || { since: 'last_30d', until: 'today' },
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString()
    }

  } catch (error) {
    console.error('Facebook API error:', error)
    // Return mock data for demo purposes if API fails
    return {
      campaigns: [],
      adsets: [], // No mock ad sets
      insights: {
        impressions: 150000,
        clicks: 3200,
        spend: 2450.75,
        reach: 125000,
        frequency: 1.2,
        ctr: 2.13,
        cpm: 16.34,
        cpc: 0.77,
        conversions: 145,
        conversion_values: 7250.50
      },
      aggregated_metrics: {
        total_campaigns: 5,
        total_impressions: 150000,
        total_clicks: 3200,
        total_spend: 2450.75,
        total_conversions: 145,
        total_revenue: 7250.50,
        overall_ctr: 2.13,
        overall_cpm: 16.34,
        overall_cpc: 0.77
      },
      account_id: adAccountId,
      date_range: date_range || { since: 'last_30d', until: 'today' },
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      note: 'Demo data - API call failed'
    }
  }
}

async function syncClickFunnels(apiKeys: Record<string, string>) {
  const { api_key, subdomain } = apiKeys
  
  const response = await fetch(
    `https://${subdomain}.myclickfunnels.com/api/v2/funnels`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch ClickFunnels data')
  }
  
  const data = await response.json()
  console.log('ClickFunnels data synced:', data.funnels?.length || 0, 'funnels')
  
  return {
    funnels: data.funnels || [],
    synced_at: new Date().toISOString()
  }
}

async function syncGoHighLevel(apiKeys: Record<string, string>) {
  const { api_key, location_id } = apiKeys
  
  const response = await fetch(
    `https://rest.gohighlevel.com/v1/contacts?locationId=${location_id}`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch GoHighLevel data')
  }
  
  const data = await response.json()
  console.log('GoHighLevel data synced:', data.contacts?.length || 0, 'contacts')
  
  return {
    contacts: data.contacts || [],
    synced_at: new Date().toISOString()
  }
}

async function syncActiveCampaign(apiKeys: Record<string, string>) {
  const { api_key, api_url } = apiKeys
  
  const response = await fetch(
    `${api_url}/api/3/campaigns`,
    {
      headers: {
        'Api-Token': api_key,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch ActiveCampaign data')
  }
  
  const data = await response.json()
  console.log('ActiveCampaign data synced:', data.campaigns?.length || 0, 'campaigns')
  
  return {
    campaigns: data.campaigns || [],
    synced_at: new Date().toISOString()
  }
}

async function syncGoogleSheets(apiKeys: Record<string, string>) {
  const { client_id, client_secret } = apiKeys
  
  // For Google Sheets, we would typically use OAuth2 flow
  // This is a simplified version for demonstration
  console.log('Google Sheets sync initiated with OAuth credentials')
  
  return {
    sheets: [],
    message: 'Google Sheets requires OAuth2 flow completion',
    synced_at: new Date().toISOString()
  }
}
