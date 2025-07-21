import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ForceFullSyncRequest {
  agencyId: string
  accessToken: string
  adAccountId: string
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

    const { agencyId, accessToken, adAccountId }: ForceFullSyncRequest = await req.json()

    console.log('=== FORCING FULL 30-DAY SYNC ===')
    console.log(`Agency ID: ${agencyId}`)
    console.log(`Ad Account: ${adAccountId}`)

    // Force a full 30-day sync by calling Facebook API directly
    const campaignsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?access_token=${accessToken}&fields=id,name,status,objective`
    
    console.log('Fetching campaigns...')
    const campaignsResponse = await fetch(campaignsUrl)
    const campaignsData = await campaignsResponse.json()
    
    if (!campaignsResponse.ok) {
      throw new Error(`Campaign fetch failed: ${JSON.stringify(campaignsData)}`)
    }
    
    console.log(`Found ${campaignsData.data?.length || 0} campaigns`)

    // Fetch last 30 days of insights for all campaigns using specific date range
    const today = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const sinceDate = thirtyDaysAgo.toISOString().split('T')[0]
    const untilDate = today.toISOString().split('T')[0]
    
    console.log(`Using specific date range: ${sinceDate} to ${untilDate}`)
    
    const allDailyInsights: any[] = []
    const campaignInsights: any[] = []
    
    for (const campaign of campaignsData.data || []) {
      console.log(`Fetching insights for campaign: ${campaign.name}`)
      
      const insightsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/insights?access_token=${accessToken}&fields=campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,ctr,cpm,cpp,cpc,conversions,conversion_values,date_start,date_stop&date_preset=maximum&time_increment=1&limit=1000`
      
      try {
        const insightsResponse = await fetch(insightsUrl)
        const insightsData = await insightsResponse.json()
        
        if (insightsResponse.ok && insightsData.data?.length > 0) {
          console.log(`Campaign ${campaign.name}: ${insightsData.data.length} days of data`)
          
          // Process each day
          insightsData.data.forEach((day: any) => {
            allDailyInsights.push({
              date: day.date_start,
              campaign_id: campaign.id,
              campaign_name: campaign.name,
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
            })
          })
          
          // Calculate campaign totals
          const campaignTotals = insightsData.data.reduce((totals: any, day: any) => {
            return {
              impressions: (totals.impressions || 0) + parseInt(day.impressions || '0'),
              clicks: (totals.clicks || 0) + parseInt(day.clicks || '0'),
              spend: (totals.spend || 0) + parseFloat(day.spend || '0'),
              reach: Math.max(totals.reach || 0, parseInt(day.reach || '0')),
              conversions: (totals.conversions || 0) + parseInt(day.conversions || '0'),
              conversion_values: (totals.conversion_values || 0) + parseFloat(day.conversion_values || '0')
            }
          }, {})
          
          campaignInsights.push({
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            ...campaignTotals
          })
        } else {
          console.log(`Campaign ${campaign.name}: No insights data available`)
        }
      } catch (error) {
        console.error(`Error fetching insights for campaign ${campaign.id}:`, error)
      }
    }

    console.log(`Total daily insights collected: ${allDailyInsights.length}`)
    
    // Sort by date to see range
    const sortedInsights = allDailyInsights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (sortedInsights.length > 0) {
      console.log(`Date range: ${sortedInsights[0].date} to ${sortedInsights[sortedInsights.length - 1].date}`)
    }

    // Calculate overall totals
    const overallInsights = allDailyInsights.reduce((totals: any, day: any) => {
      return {
        impressions: (totals.impressions || 0) + (day.impressions || 0),
        clicks: (totals.clicks || 0) + (day.clicks || 0),
        spend: (totals.spend || 0) + (day.spend || 0),
        reach: Math.max(totals.reach || 0, day.reach || 0),
        conversions: (totals.conversions || 0) + (day.conversions || 0),
        conversion_values: (totals.conversion_values || 0) + (day.conversion_values || 0)
      }
    }, {})

    // Build complete sync result
    const syncResult = {
      campaigns: campaignsData.data || [],
      adsets: [], // Keep empty for now
      campaign_insights: campaignInsights,
      insights: {
        impressions: overallInsights.impressions || 0,
        clicks: overallInsights.clicks || 0,
        spend: overallInsights.spend || 0,
        reach: overallInsights.reach || 0,
        frequency: overallInsights.impressions > 0 ? overallInsights.impressions / overallInsights.reach : 0,
        ctr: overallInsights.impressions > 0 ? (overallInsights.clicks / overallInsights.impressions) * 100 : 0,
        cpm: overallInsights.impressions > 0 ? (overallInsights.spend / overallInsights.impressions) * 1000 : 0,
        cpc: overallInsights.clicks > 0 ? overallInsights.spend / overallInsights.clicks : 0,
        conversions: overallInsights.conversions || 0,
        conversion_values: overallInsights.conversion_values || 0
      },
      daily_insights: sortedInsights,
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString()
    }

    // Store directly in database (merge with existing data)
    console.log('Fetching existing data to merge...')
    const { data: existingData } = await supabase
      .from('integration_data')
      .select('data')
      .eq('agency_id', agencyId)
      .eq('platform', 'facebook')
      .single()

    let mergedInsights = sortedInsights
    let mergedCampaignInsights = campaignInsights

    if (existingData?.data?.daily_insights) {
      const existingInsights = existingData.data.daily_insights
      const existingDates = new Set(existingInsights.map(i => i.date))
      
      // ONLY add new data for dates that don't already exist
      // NEVER overwrite existing data
      const newInsights = sortedInsights.filter(insight => !existingDates.has(insight.date))
      
      console.log(`Data protection: ${existingInsights.length} existing insights preserved`)
      console.log(`Adding ${newInsights.length} new insights for dates: ${newInsights.map(i => i.date).join(', ')}`)
      
      // Combine: keep ALL existing data + add only truly new data
      mergedInsights = [...existingInsights, ...newInsights]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      // For campaign insights, also be conservative
      const existingCampaignIds = new Set(existingData.data.campaign_insights?.map(c => c.campaign_id) || [])
      const newCampaignInsights = campaignInsights.filter(c => !existingCampaignIds.has(c.campaign_id))
      mergedCampaignInsights = [...(existingData.data.campaign_insights || []), ...newCampaignInsights]
      
      console.log(`Total after merge: ${mergedInsights.length} daily insights, ${mergedCampaignInsights.length} campaign insights`)
    }

    // Update sync result with merged data
    syncResult.daily_insights = mergedInsights
    syncResult.campaign_insights = mergedCampaignInsights

    console.log('Storing merged data in database...')
    const { error: insertError } = await supabase
      .from('integration_data')
      .upsert({
        agency_id: agencyId,
        platform: 'facebook',
        data: syncResult,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'agency_id,platform'
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw insertError
    }

    console.log('=== FORCE SYNC COMPLETE ===')
    console.log(`Stored ${allDailyInsights.length} daily insights`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Force sync complete',
        dailyInsightsCount: allDailyInsights.length,
        dateRange: sortedInsights.length > 0 ? {
          from: sortedInsights[0].date,
          to: sortedInsights[sortedInsights.length - 1].date
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Force sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})