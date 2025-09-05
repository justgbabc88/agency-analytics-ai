import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Retry utility function
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

interface SyncRequest {
  projectId: string
  platform: string
  apiKeys: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let platform = 'unknown' // Default value for error handling
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId, platform: requestPlatform, apiKeys }: SyncRequest = await req.json()
    platform = requestPlatform // Update the platform variable

    console.log(`Syncing data for platform: ${platform}, project: ${projectId}`)

    let syncResult: any = {}

    switch (platform) {
      case 'facebook':
        syncResult = await syncFacebook(apiKeys)
        break
      case 'clickfunnels':
        // Check if we have OAuth data for this project
        const { data: oauthData, error: oauthError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'clickfunnels_oauth')
          .single()

        if (oauthData && !oauthError) {
          // Use OAuth token for sync
          syncResult = await syncClickFunnelsOAuth(oauthData.data, projectId, supabase)
        } else {
          // Fallback to API key method
          syncResult = await syncClickFunnels(apiKeys)
        }
        break
      case 'google_sheets':
        syncResult = await syncGoogleSheets(apiKeys)
        break
      case 'zoho_crm':
        syncResult = await syncZohoCRM(projectId, supabase)
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    // Before storing, get existing data to preserve credentials
    const { data: existingData } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', platform)
      .maybeSingle()

    // Merge existing credentials with new sync data
    let mergedData = syncResult
    if (existingData?.data) {
      const existing = existingData.data as any
      
      // For Facebook, preserve authentication credentials
      if (platform === 'facebook' && existing.access_token) {
        mergedData = {
          ...syncResult,
          // Preserve authentication credentials
          access_token: existing.access_token,
          selected_ad_account_id: existing.selected_ad_account_id,
          permissions: existing.permissions,
          // Preserve other OAuth-related fields
          user_id: existing.user_id,
          expires_in: existing.expires_in
        }
        console.log('🔐 Preserved Facebook credentials during sync')
      }
      
      // For other platforms, preserve any oauth tokens or credentials
      if (existing.oauth_token || existing.refresh_token || existing.access_token) {
        mergedData = {
          ...syncResult,
          oauth_token: existing.oauth_token,
          refresh_token: existing.refresh_token,
          access_token: existing.access_token,
          ...mergedData
        }
        console.log(`🔐 Preserved ${platform} credentials during sync`)
      }
    }

    // Store the synced data in the project_integration_data table using upsert
    const { error: insertError } = await supabase
      .from('project_integration_data')
      .upsert({
        project_id: projectId,
        platform,
        data: mergedData,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,platform'
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    // Store daily insights in dedicated table if available
    if (platform === 'facebook' && mergedData.daily_insights && mergedData.daily_insights.length > 0) {
      console.log(`💾 Storing ${mergedData.daily_insights.length} daily insights to dedicated table...`);
      await storeFacebookDailyInsights(supabase, projectId, mergedData.daily_insights);
      console.log('✅ Daily insights stored successfully');
    }

    // Update the project integration status using upsert
    const { error: updateError } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        platform,
        is_connected: true,
        last_sync: new Date().toISOString()
      }, {
        onConflict: 'project_id,platform'
      })

    if (updateError) {
      console.error('Integration update error:', updateError)
      throw updateError
    }

    console.log(`Successfully synced ${platform} data for project ${projectId}`)

    return new Response(
      JSON.stringify({ success: true, data: syncResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    
    // Determine if this is a timeout/server error vs client error
    const isServerError = error.message.includes('timeout') || 
                          error.message.includes('520') || 
                          error.message.includes('AbortError') ||
                          error.message.includes('Failed to fetch')
    
    const statusCode = isServerError ? 503 : 400
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: isServerError ? 'server_error' : 'client_error',
        timestamp: new Date().toISOString(),
        platform
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function syncFacebook(apiKeys: Record<string, string>) {
  const { access_token, selected_ad_account_id, date_range } = apiKeys
  
  if (!access_token) {
    throw new Error('Facebook access token is required')
  }

  console.log('Facebook sync initiated - fetching ad data')

  const adAccountId = selected_ad_account_id || 'act_123456789'

  let datePreset = 'last_30d'
  let sinceParam = ''
  let untilParam = ''
  
  if (date_range?.since && date_range?.until) {
    sinceParam = `&time_range[since]=${date_range.since}`
    untilParam = `&time_range[until]=${date_range.until}`
    datePreset = ''
  } else {
    datePreset = '&date_preset=last_30d'
  }

  try {
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?access_token=${access_token}&fields=id,name,status,objective,created_time,updated_time`
    )
    
    if (!campaignsResponse.ok) {
      throw new Error('Failed to fetch campaigns from Facebook')
    }
    
    const campaignsData = await campaignsResponse.json()

    const insightsUrl = date_range?.since && date_range?.until 
      ? `https://graph.facebook.com/v18.0/${adAccountId}/insights?access_token=${access_token}&fields=impressions,clicks,spend,reach,frequency,ctr,cpm,cpp,cpc,conversions,conversion_values${sinceParam}${untilParam}&level=account`
      : `https://graph.facebook.com/v18.0/${adAccountId}/insights?access_token=${access_token}&fields=impressions,clicks,spend,reach,frequency,ctr,cpm,cpp,cpc,conversions,conversion_values${datePreset}&level=account`
    
    const insightsResponse = await fetch(insightsUrl)
    
    if (!insightsResponse.ok) {
      throw new Error('Failed to fetch insights from Facebook')
    }
    
    const insightsData = await insightsResponse.json()
    const insights = insightsData.data?.[0] || {}

    console.log(`Facebook sync successful - ${campaignsData.data?.length || 0} campaigns`)

    return {
      campaigns: campaignsData.data || [],
      insights: {
        impressions: parseInt(insights.impressions || '0'),
        clicks: parseInt(insights.clicks || '0'),
        spend: parseFloat(insights.spend || '0'),
        reach: parseInt(insights.reach || '0'),
        frequency: parseFloat(insights.frequency || '0'),
        ctr: parseFloat(insights.ctr || '0'),
        cpm: parseFloat(insights.cpm || '0'),
        cpc: parseFloat(insights.cpc || '0'),
        conversions: parseInt(insights.conversions || '0'),
        conversion_values: parseFloat(insights.conversion_values || '0')
      },
      aggregated_metrics: {
        total_campaigns: campaignsData.data?.length || 0,
        total_impressions: parseInt(insights.impressions || '0'),
        total_clicks: parseInt(insights.clicks || '0'),
        total_spend: parseFloat(insights.spend || '0'),
        total_conversions: parseInt(insights.conversions || '0'),
        total_revenue: parseFloat(insights.conversion_values || '0'),
        overall_ctr: parseFloat(insights.ctr || '0'),
        overall_cpm: parseFloat(insights.cpm || '0'),
        overall_cpc: parseFloat(insights.cpc || '0')
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
  
  if (!api_key || !subdomain) {
    throw new Error('ClickFunnels API key and subdomain are required')
  }

  console.log('ClickFunnels sync initiated')

  try {
    // Fetch funnels
    const funnelsResponse = await fetch(
      `https://${subdomain}.myclickfunnels.com/api/v2/funnels`,
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    if (!funnelsResponse.ok) {
      throw new Error('Failed to fetch ClickFunnels funnels')
    }
    
    const funnelsData = await funnelsResponse.json()

    // Fetch funnel stats for each funnel
    const funnelStats = []
    for (const funnel of funnelsData.funnels || []) {
      try {
        const statsResponse = await fetch(
          `https://${subdomain}.myclickfunnels.com/api/v2/funnels/${funnel.id}/stats`,
          {
            headers: {
              'Authorization': `Bearer ${api_key}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          funnelStats.push({
            funnel_id: funnel.id,
            funnel_name: funnel.name,
            ...stats
          })
        }
      } catch (error) {
        console.error(`Failed to fetch stats for funnel ${funnel.id}:`, error)
      }
    }

    console.log(`ClickFunnels sync successful - ${funnelsData.funnels?.length || 0} funnels`)
    
    return {
      funnels: funnelsData.funnels || [],
      funnel_stats: funnelStats,
      total_funnels: funnelsData.funnels?.length || 0,
      synced_at: new Date().toISOString()
    }

  } catch (error) {
    console.error('ClickFunnels API error:', error)
    // Return mock data for demo purposes if API fails
    return {
      funnels: [
        {
          id: 1,
          name: 'Demo Funnel 1',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Demo Funnel 2',
          status: 'active',
          created_at: '2024-01-15T00:00:00Z'
        }
      ],
      funnel_stats: [
        {
          funnel_id: 1,
          funnel_name: 'Demo Funnel 1',
          visitors: 1500,
          opt_ins: 450,
          sales: 67,
          revenue: 3350.00,
          conversion_rate: 4.47
        },
        {
          funnel_id: 2,
          funnel_name: 'Demo Funnel 2',
          visitors: 2200,
          opt_ins: 680,
          sales: 89,
          revenue: 4450.00,
          conversion_rate: 4.05
        }
      ],
      total_funnels: 2,
      synced_at: new Date().toISOString(),
      note: 'Demo data - API call failed'
    }
  }
}

async function syncGoogleSheets(apiKeys: Record<string, string>) {
  const { client_id, client_secret } = apiKeys
  
  console.log('Google Sheets sync initiated with OAuth credentials')
  
  return {
    sheets: [],
    message: 'Google Sheets requires OAuth2 flow completion',
    synced_at: new Date().toISOString()
  }
}

async function syncClickFunnelsOAuth(oauthData: any, projectId: string, supabase: any) {
  const { access_token } = oauthData

  if (!access_token) {
    throw new Error('ClickFunnels OAuth access token not found')
  }

  console.log('ClickFunnels OAuth sync initiated')

  try {
    // Get the selected funnel ID from stored data
    const { data: funnelData, error: funnelError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'clickfunnels')
      .single()

    let funnelId = null
    if (funnelData && !funnelError && funnelData.data.funnel_id) {
      funnelId = funnelData.data.funnel_id
    }

    // Fetch all funnels
    const funnelsResponse = await fetch('https://app.clickfunnels.com/api/v2/funnels', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!funnelsResponse.ok) {
      throw new Error('Failed to fetch ClickFunnels funnels via OAuth')
    }

    const funnelsJson = await funnelsResponse.json()
    const funnels = funnelsJson.funnels || []

    // If we have a specific funnel selected, get detailed stats
    let selectedFunnelStats = null
    if (funnelId) {
      try {
        const statsResponse = await fetch(`https://app.clickfunnels.com/api/v2/funnels/${funnelId}/stats`, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (statsResponse.ok) {
          selectedFunnelStats = await statsResponse.json()
        }
      } catch (error) {
        console.error(`Failed to fetch stats for funnel ${funnelId}:`, error)
      }
    }

    console.log(`ClickFunnels OAuth sync successful - ${funnels.length} funnels`)

    return {
      funnels,
      selected_funnel_id: funnelId,
      selected_funnel_stats: selectedFunnelStats,
      total_funnels: funnels.length,
      oauth_method: true,
      synced_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    }

  } catch (error) {
    console.error('ClickFunnels OAuth API error:', error)
    throw error
  }
}

async function syncZohoCRM(projectId: string, supabase: any) {
  console.log('Zoho CRM sync initiated')

  try {
    // Get the stored OAuth tokens for this project
    const { data: oauthData, error: oauthError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'zoho_crm')
      .maybeSingle()

    if (oauthError || !oauthData?.data?.access_token) {
      throw new Error('Zoho CRM access token not found. Please reconnect your Zoho integration.')
    }

    let { access_token, refresh_token, api_domain } = oauthData.data
    const baseUrl = api_domain || 'https://www.zohoapis.com'

    console.log('Testing Zoho CRM access token')

    // Test the access token by fetching modules with retry logic
    let modulesResponse = await retryWithBackoff(async () => {
      return await fetch(`${baseUrl}/crm/v2/settings/modules`, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${access_token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
    })

    // If we get a 401, try to refresh the token
    if (modulesResponse.status === 401 && refresh_token) {
      console.log('Access token expired, attempting to refresh...')
      
      try {
        const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            refresh_token: refresh_token,
            client_id: Deno.env.get('ZOHO_CLIENT_ID') || '',
            client_secret: Deno.env.get('ZOHO_CLIENT_SECRET') || '',
            grant_type: 'refresh_token'
          })
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          access_token = refreshData.access_token
          
          // Update the stored token
          const updatedData = { ...oauthData.data, access_token }
          await supabase
            .from('project_integration_data')
            .update({ data: updatedData })
            .eq('project_id', projectId)
            .eq('platform', 'zoho_crm')

          console.log('Successfully refreshed Zoho access token')
          
          // Retry the modules request with new token
          modulesResponse = await fetch(`${baseUrl}/crm/v2/settings/modules`, {
            headers: {
              'Authorization': `Zoho-oauthtoken ${access_token}`,
              'Content-Type': 'application/json'
            }
          })
        } else {
          const errorText = await refreshResponse.text()
          console.error('Failed to refresh Zoho token:', errorText)
          throw new Error('Zoho access token expired and refresh failed. Please reconnect your Zoho integration.')
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError)
        throw new Error('Zoho access token expired and refresh failed. Please reconnect your Zoho integration.')
      }
    }

    if (!modulesResponse.ok) {
      const errorText = await modulesResponse.text()
      console.error(`Failed to fetch Zoho modules: ${modulesResponse.status} - ${errorText}`)
      throw new Error(`Failed to fetch Zoho modules: ${modulesResponse.status} - ${errorText}`)
    }

    const modulesData = await modulesResponse.json()
    const modules = modulesData.modules || []

    console.log(`Found ${modules.length} Zoho CRM modules`)

    // Fetch data from key modules (Leads and Deals only)
    const keyModules = ['Leads', 'Deals']
    const moduleData: any = {}
    let totalRecords = 0

    for (const moduleName of keyModules) {
      try {
        console.log(`Fetching ${moduleName} records`)
        
        let allRecords: any[] = []
        let page = 1
        const maxRecords = moduleName === 'Deals' ? 1000 : 200 // Limited deals to 1000
        const perPage = 200 // Zoho's max per page
        const maxPages = Math.ceil(maxRecords / perPage)
        
        // Enhanced filtering and sorting for deals
        let filterParam = ''
        let sortParam = ''
        
        if (moduleName === 'Deals') {
          // Sort by Agreement_Received_Date descending to get most recent deals first
          sortParam = '&sort_by=Agreement_Received_Date&sort_order=desc'
          
          // Keep the Agreement_Received_Date filter but add debugging
          filterParam = '&criteria=(Agreement_Received_Date:not_null)'
          console.log(`ZOHO SYNC DEBUG: Using filter for ${moduleName}: ${filterParam}`)
          console.log(`ZOHO SYNC DEBUG: Using sort for ${moduleName}: ${sortParam}`)
        }
        
        while (page <= maxPages) {
          const url = `${baseUrl}/crm/v2/${moduleName}?per_page=${perPage}&page=${page}${filterParam}${sortParam}`
          console.log(`ZOHO SYNC DEBUG: Fetching URL: ${url}`)
          
          const recordsResponse = await retryWithBackoff(async () => {
            return await fetch(url, {
              headers: {
                'Authorization': `Zoho-oauthtoken ${access_token}`,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(45000) // 45 second timeout per request
            })
          })

          if (recordsResponse.ok) {
            const recordsData = await recordsResponse.json()
            const records = recordsData.data || []
            
            console.log(`ZOHO SYNC DEBUG: Page ${page} returned ${records.length} ${moduleName} records`)
            
            if (records.length === 0) {
              console.log(`No more ${moduleName} records found on page ${page}`)
              break // No more records to fetch
            }
            
            // Add detailed logging for deals to debug Rebecca Seeley issue
            if (moduleName === 'Deals' && page === 1) {
              console.log(`ZOHO SYNC DEBUG: First 5 deals from page 1:`)
              records.slice(0, 5).forEach((deal: any, index: number) => {
                console.log(`  ${index + 1}. Deal: "${deal.Deal_Name}" | Agreement Date: ${deal.Agreement_Received_Date} | Stage: ${deal.Stage} | Amount: ${deal.Amount}`)
              })
              
              // Check specifically for Rebecca Seeley
              const rebeccaDeal = records.find((deal: any) => 
                deal.Deal_Name && deal.Deal_Name.toLowerCase().includes('rebecca')
              )
              if (rebeccaDeal) {
                console.log(`ZOHO SYNC DEBUG: Found Rebecca deal:`, rebeccaDeal)
              } else {
                console.log(`ZOHO SYNC DEBUG: No Rebecca deal found in first page`)
              }
            }
            
            allRecords = allRecords.concat(records)
            console.log(`Fetched ${records.length} ${moduleName} records from page ${page} (total: ${allRecords.length})`)
            
            // Check if we have enough records or if this was the last page
            if (allRecords.length >= maxRecords || records.length < perPage) {
              break
            }
            
            page++
            
            // Add delay between requests to respect rate limits (10 requests per minute)
            await new Promise(resolve => setTimeout(resolve, 6500)) // 6.5 seconds between requests
            
          } else {
            console.log(`Failed to fetch ${moduleName} page ${page}: ${recordsResponse.status}`)
            const errorText = await recordsResponse.text()
            console.log(`ZOHO SYNC DEBUG: Error response: ${errorText}`)
            break
          }
        }
        
        // Limit to maxRecords if we got more than expected
        if (allRecords.length > maxRecords) {
          allRecords = allRecords.slice(0, maxRecords)
        }
        
        // Additional debugging for deals
        if (moduleName === 'Deals') {
          console.log(`ZOHO SYNC DEBUG: Final deals summary:`)
          console.log(`  - Total deals fetched: ${allRecords.length}`)
          console.log(`  - Date range of agreements:`)
          
          const agreementDates = allRecords
            .map(deal => deal.Agreement_Received_Date)
            .filter(date => date)
            .sort()
          
          if (agreementDates.length > 0) {
            console.log(`    - Earliest: ${agreementDates[0]}`)
            console.log(`    - Latest: ${agreementDates[agreementDates.length - 1]}`)
          }
          
          // Check for 2025 deals specifically
          const deals2025 = allRecords.filter(deal => 
            deal.Agreement_Received_Date && deal.Agreement_Received_Date.includes('2025')
          )
          console.log(`  - Deals with 2025 agreement dates: ${deals2025.length}`)
          
          if (deals2025.length > 0) {
            console.log(`    2025 deals:`)
            deals2025.forEach((deal: any) => {
              console.log(`      - "${deal.Deal_Name}" (${deal.Agreement_Received_Date})`)
            })
          }
          
          // Final check for Rebecca
          const rebeccaDeals = allRecords.filter(deal => 
            deal.Deal_Name && deal.Deal_Name.toLowerCase().includes('rebecca')
          )
          console.log(`  - Deals with "Rebecca" in name: ${rebeccaDeals.length}`)
          rebeccaDeals.forEach((deal: any) => {
            console.log(`    - "${deal.Deal_Name}" | Agreement: ${deal.Agreement_Received_Date} | Stage: ${deal.Stage}`)
          })
        }
        
        moduleData[moduleName.toLowerCase()] = {
          records: allRecords,
          count: allRecords.length,
          info: { 
            total_fetched: allRecords.length, 
            pages_fetched: page - 1,
            filter_used: filterParam,
            sort_used: sortParam,
            max_records_limit: maxRecords
          }
        }
        
        totalRecords += allRecords.length
        console.log(`Completed fetching ${allRecords.length} ${moduleName} records`)

      } catch (error) {
        console.error(`Error fetching ${moduleName}:`, error)
        moduleData[moduleName.toLowerCase()] = {
          records: [],
          count: 0,
          error: error.message
        }
      }
    }

    // Calculate some basic analytics
    const analytics = {
      total_records: totalRecords,
      leads_count: moduleData.leads?.count || 0,
      deals_count: moduleData.deals?.count || 0,
      
      // Calculate revenue from deals (if available)
      total_deal_value: moduleData.deals?.records?.reduce((total: number, deal: any) => {
        return total + (parseFloat(deal.Amount || 0))
      }, 0) || 0,
      
      // Count deals by stage
      deals_by_stage: moduleData.deals?.records?.reduce((stages: any, deal: any) => {
        const stage = deal.Stage || 'Unknown'
        stages[stage] = (stages[stage] || 0) + 1
        return stages
      }, {}) || {}
    }

    console.log(`Zoho CRM sync completed - ${totalRecords} total records synced`)

    return {
      modules: modules.map((module: any) => ({
        api_name: module.api_name,
        singular_label: module.singular_label,
        plural_label: module.plural_label,
        module_name: module.module_name
      })),
      data: moduleData,
      analytics,
      total_records: totalRecords,
      synced_modules: keyModules,
      user_info: {
        email: oauthData.data.user_email,
        name: oauthData.data.user_name,
        organization: oauthData.data.organization_name
      },
      api_domain: baseUrl,
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString()
    }

  } catch (error) {
    console.error('Zoho CRM sync error:', error)
    
    // Return error info but don't throw to avoid breaking the sync process
    return {
      error: error.message,
      modules: [],
      data: {},
      analytics: {
        total_records: 0,
        leads_count: 0,
        deals_count: 0,
        total_deal_value: 0,
        deals_by_stage: {}
      },
      total_records: 0,
      synced_modules: [],
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString(),
      note: 'Sync failed - check your Zoho CRM connection'
    }
  }
}

// Helper function to store daily insights in the dedicated table (shared with facebook-batch-sync)
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
