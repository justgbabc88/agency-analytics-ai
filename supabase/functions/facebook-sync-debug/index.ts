import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DebugRequest {
  projectId: string
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

    const { projectId, accessToken, adAccountId }: DebugRequest = await req.json()

    console.log('=== FACEBOOK SYNC DEBUG START ===')
    console.log(`Project ID: ${projectId}`)
    console.log(`Ad Account: ${adAccountId}`)

    // 1. Check existing data
    console.log('--- Checking existing data ---')
    const { data: existingData, error: queryError } = await supabase
      .from('project_integration_data')
      .select('data, synced_at')
      .eq('project_id', projectId)
      .eq('platform', 'facebook')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      console.error('Query error:', queryError)
    } else if (existingData?.data?.daily_insights) {
      const dailyInsights = existingData.data.daily_insights as any[]
      const latestDate = dailyInsights
        .map(d => new Date(d.date))
        .sort((a, b) => b.getTime() - a.getTime())[0]
      
      console.log(`Existing data count: ${dailyInsights.length}`)
      console.log(`Latest existing date: ${latestDate.toISOString().split('T')[0]}`)
      console.log(`Last sync: ${existingData.synced_at}`)
      
      // Show date range of existing data
      const firstDate = dailyInsights
        .map(d => new Date(d.date))
        .sort((a, b) => a.getTime() - b.getTime())[0]
      console.log(`Date range: ${firstDate.toISOString().split('T')[0]} to ${latestDate.toISOString().split('T')[0]}`)
    } else {
      console.log('No existing data found')
    }

    // 2. Test Facebook API access
    console.log('--- Testing Facebook API ---')
    const testUrl = `https://graph.facebook.com/v18.0/${adAccountId}/campaigns?access_token=${accessToken}&fields=id,name&limit=1`
    
    try {
      const testResponse = await fetch(testUrl)
      const testData = await testResponse.json()
      
      if (testResponse.ok) {
        console.log(`✅ Facebook API access OK - Found ${testData.data?.length || 0} campaigns`)
      } else {
        console.error('❌ Facebook API error:', testData)
      }
    } catch (error) {
      console.error('❌ Facebook API request failed:', error)
    }

    // 3. Test insights API for last 7 days
    console.log('--- Testing insights API (last 7 days) ---')
    const insightsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?access_token=${accessToken}&fields=impressions,clicks,spend,date_start&date_preset=last_7d&time_increment=1&limit=10`
    
    try {
      const insightsResponse = await fetch(insightsUrl)
      const insightsData = await insightsResponse.json()
      
      if (insightsResponse.ok) {
        console.log(`✅ Insights API OK - Found ${insightsData.data?.length || 0} days of data`)
        if (insightsData.data?.length > 0) {
          const dates = insightsData.data.map((d: any) => d.date_start).sort()
          console.log(`Available dates: ${dates[0]} to ${dates[dates.length - 1]}`)
        }
      } else {
        console.error('❌ Insights API error:', insightsData)
      }
    } catch (error) {
      console.error('❌ Insights API request failed:', error)
    }

    // 4. Test specific date range (July 15-18)
    console.log('--- Testing specific date range (July 15-18) ---')
    const specificUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?access_token=${accessToken}&fields=impressions,clicks,spend,date_start&time_range[since]=2025-07-15&time_range[until]=2025-07-18&time_increment=1&limit=10`
    
    try {
      const specificResponse = await fetch(specificUrl)
      const specificData = await specificResponse.json()
      
      if (specificResponse.ok) {
        console.log(`✅ July 15-18 range OK - Found ${specificData.data?.length || 0} days of data`)
        if (specificData.data?.length > 0) {
          const dates = specificData.data.map((d: any) => d.date_start).sort()
          console.log(`July dates available: ${dates.join(', ')}`)
        }
      } else {
        console.error('❌ July 15-18 range error:', specificData)
      }
    } catch (error) {
      console.error('❌ July 15-18 range request failed:', error)
    }

    console.log('=== FACEBOOK SYNC DEBUG END ===')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Debug complete - check function logs for details',
        existingDataCount: existingData?.data?.daily_insights?.length || 0,
        lastSync: existingData?.synced_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Debug error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})