import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 DEBUG Calendly sync started')
    const projectId = '382c6666-c24d-4de1-b449-3858a46fbed3'

    // Step 1: Check integration
    const { data: integrations, error: intError } = await supabaseClient
      .from('project_integrations')
      .select('*')
      .eq('platform', 'calendly')
      .eq('project_id', projectId)
      .eq('is_connected', true)

    console.log('📍 Step 1 - Integration check:', integrations?.length || 0)
    if (!integrations?.length) {
      console.log('❌ No connected Calendly integration found')
      return new Response(JSON.stringify({ error: 'No integration' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2: Get access token
    console.log('📍 Step 2 - Getting access token...')
    const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('calendly-oauth', {
      body: { action: 'get_access_token', projectId, code: 'missing' }
    })

    if (tokenError || !tokenData?.access_token) {
      console.log('❌ Token error:', tokenError)
      return new Response(JSON.stringify({ error: 'No token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    console.log('✅ Got access token')

    // Step 3: Check event mappings
    const { data: mappings, error: mapError } = await supabaseClient
      .from('calendly_event_mappings')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)

    console.log('📍 Step 3 - Event mappings:', mappings?.length || 0)
    if (!mappings?.length) {
      console.log('❌ No active event mappings')
      return new Response(JSON.stringify({ error: 'No mappings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 4: Try to fetch events from Calendly API
    console.log('📍 Step 4 - Fetching events from Calendly...')
    const now = new Date()
    const from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) // 7 days ago
    const to = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))   // 7 days from now

    const url = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(tokenData.organization_uri)}&min_start_time=${from.toISOString()}&max_start_time=${to.toISOString()}&count=20&status=active`
    
    console.log('📡 API URL:', url.substring(0, 100) + '...')

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ API Error:', response.status, errorText)
      return new Response(JSON.stringify({ error: 'API failed', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    const events = data.collection || []
    
    console.log('✅ API Success - Found events:', events.length)
    console.log('📊 Date range:', from.toISOString(), 'to', to.toISOString())
    
    // Show event details
    events.forEach((event, i) => {
      console.log(`  Event ${i + 1}: ${event.name || 'Unknown'} - ${event.start_time} - Status: ${event.status}`)
    })

    // Step 5: Filter by active mappings
    const mappingIds = mappings.map(m => m.calendly_event_type_id)
    const filteredEvents = events.filter(event => 
      mappingIds.includes(event.event_type?.uri || event.event_type_uri || event.event_type_id || event.event_type)
    )
    
    console.log('📍 Step 5 - Events matching mappings:', filteredEvents.length)

    return new Response(JSON.stringify({
      success: true,
      integrations: integrations.length,
      mappings: mappings.length,
      totalEvents: events.length,
      filteredEvents: filteredEvents.length,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
      events: events.slice(0, 5).map(e => ({ 
        name: e.name, 
        start_time: e.start_time, 
        status: e.status,
        event_type: e.event_type?.uri || e.event_type_uri
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Debug sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})