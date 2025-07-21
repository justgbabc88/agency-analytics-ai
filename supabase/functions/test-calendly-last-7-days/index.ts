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

    console.log('🔍 Testing Calendly API for last 7 days (July 16-22)...')
    
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

    // Test for last 7 days (July 16-22 AEST = July 15-22 UTC)
    const fromDate = '2025-07-15T14:00:00.000Z'  // July 16 00:00 AEST
    const toDate = '2025-07-22T13:59:59.999Z'    // July 22 23:59 AEST
    
    console.log(`🔍 Fetching events from ${fromDate} to ${toDate}`)
    
    // Get all events for this period
    let allEvents = []
    let nextPageToken = null
    let pageCount = 0
    
    do {
      pageCount++
      let eventsUrl = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${fromDate}&max_start_time=${toDate}&count=100&status=active`
      
      if (nextPageToken) {
        eventsUrl += `&page_token=${nextPageToken}`
      }
      
      console.log(`🌐 Page ${pageCount} API URL:`, eventsUrl)
      
      const eventsResponse = await fetch(eventsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!eventsResponse.ok) {
        const errorText = await eventsResponse.text()
        console.error('❌ Calendly API error:', errorText)
        break
      }

      const eventsData = await eventsResponse.json()
      const events = eventsData.collection || []
      
      console.log(`📊 Page ${pageCount}: ${events.length} events found`)
      allEvents = allEvents.concat(events)
      
      nextPageToken = eventsData.pagination?.next_page_token
      console.log('📄 Next page token:', nextPageToken ? 'exists' : 'none')
      
    } while (nextPageToken && pageCount < 50)
    
    console.log(`📊 Total events found: ${allEvents.length}`)
    
    // Filter for Property Advantage Call specifically
    const propertyAdvantageCallId = 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f'
    const propertyEvents = allEvents.filter(event => event.event_type === propertyAdvantageCallId)
    
    console.log(`🎯 Property Advantage Call events: ${propertyEvents.length}`)
    
    // Break down by day
    const eventsByDate = {}
    const eventTypeBreakdown = {}
    
    allEvents.forEach(event => {
      const date = event.start_time.split('T')[0]
      eventsByDate[date] = (eventsByDate[date] || 0) + 1
      
      const eventTypeName = event.name || 'Unknown'
      eventTypeBreakdown[eventTypeName] = (eventTypeBreakdown[eventTypeName] || 0) + 1
    })
    
    console.log('📅 Events by date:', eventsByDate)
    console.log('📋 Events by type:', eventTypeBreakdown)

    return new Response(JSON.stringify({ 
      success: true,
      totalEventsInPeriod: allEvents.length,
      propertyAdvantageCallEvents: propertyEvents.length,
      eventsByDate,
      eventTypeBreakdown,
      dateRange: {
        from: fromDate,
        to: toDate
      },
      pagesProcessed: pageCount
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