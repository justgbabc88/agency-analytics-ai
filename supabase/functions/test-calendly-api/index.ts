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

    console.log('🔍 Testing direct Calendly API call for July 1-11...')
    
    // Get the Calendly token for this project
    const projectId = '382c6666-c24d-4de1-b449-3858a46fbed3'
    
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .single()

    if (tokenError || !tokenData?.data?.access_token) {
      console.error('❌ Failed to get access token')
      return new Response(JSON.stringify({ error: 'No access token' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const accessToken = tokenData.data.access_token
    console.log('✅ Got access token')

    // Get user info for organization
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const userData = await userResponse.json()
    const organizationUri = userData.resource.current_organization
    console.log('🏢 Organization:', organizationUri)

    // Direct API call to get events for July 1-11
    const fromDate = '2025-07-01T00:00:00.000Z'
    const toDate = '2025-07-11T23:59:59.999Z'
    
    console.log(`🔍 Fetching events from ${fromDate} to ${toDate}`)
    
    const eventsUrl = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${fromDate}&max_start_time=${toDate}&count=100`
    console.log('🌐 API URL:', eventsUrl)
    
    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text()
      console.error('❌ Calendly API error:', errorText)
      return new Response(JSON.stringify({ 
        error: 'Calendly API error', 
        details: errorText,
        status: eventsResponse.status 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const eventsData = await eventsResponse.json()
    const events = eventsData.collection || []
    
    console.log(`📊 Total events found: ${events.length}`)
    console.log(`📄 Pagination info:`, eventsData.pagination)
    
    // Filter for our specific event type
    const eventTypeId = 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f'
    const filteredEvents = events.filter(event => event.event_type === eventTypeId)
    
    console.log(`🎯 Events for Property Advantage Call: ${filteredEvents.length}`)
    
    // Show breakdown by date
    const eventsByDate = {}
    filteredEvents.forEach(event => {
      const date = event.start_time.split('T')[0]
      eventsByDate[date] = (eventsByDate[date] || 0) + 1
    })
    
    console.log('📅 Events by date:', eventsByDate)

    return new Response(JSON.stringify({ 
      success: true,
      totalEventsInPeriod: events.length,
      propertyAdvantageCallEvents: filteredEvents.length,
      eventsByDate,
      pagination: eventsData.pagination,
      hasNextPage: !!eventsData.pagination?.next_page_token
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return new Response(JSON.stringify({ 
      error: 'Test failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})