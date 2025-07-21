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

    console.log('🔍 COMPREHENSIVE CALENDLY DIAGNOSTIC - July 1-11, 2025')
    
    const projectId = '382c6666-c24d-4de1-b449-3858a46fbed3'
    
    // Get token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .single()

    if (tokenError || !tokenData?.data?.access_token) {
      return new Response(JSON.stringify({ error: 'No access token' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const accessToken = tokenData.data.access_token

    // Get organization
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    })
    const userData = await userResponse.json()
    const organizationUri = userData.resource.current_organization

    console.log('🏢 Organization:', organizationUri)

    // Test multiple date ranges and status combinations
    const fromDate = '2025-07-01T00:00:00.000Z'
    const toDate = '2025-07-11T23:59:59.999Z'
    const targetEventType = 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f'

    console.log(`🎯 Target event type: ${targetEventType}`)
    console.log(`📅 Date range: ${fromDate} to ${toDate}`)

    // Test 1: Get ALL events (default API call)
    console.log('\n🧪 TEST 1: Default API call (all events)')
    let allEventsCollected = []
    let pageCount = 0
    let nextPageToken = null
    
    do {
      pageCount++
      let url = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${fromDate}&max_start_time=${toDate}&count=100`
      if (nextPageToken) url += `&page_token=${nextPageToken}`
      
      console.log(`📄 Fetching page ${pageCount}...`)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        console.error(`❌ API error on page ${pageCount}:`, await response.text())
        break
      }
      
      const data = await response.json()
      const events = data.collection || []
      allEventsCollected.push(...events)
      
      // Filter for our target event type
      const targetEvents = events.filter(e => e.event_type === targetEventType)
      console.log(`   Page ${pageCount}: ${events.length} total events, ${targetEvents.length} Property Advantage Call events`)
      
      nextPageToken = data.pagination?.next_page_token
      
      // Add delay to avoid rate limits
      if (nextPageToken) await new Promise(resolve => setTimeout(resolve, 200))
      
    } while (nextPageToken && pageCount < 20) // Limit to prevent infinite loops

    console.log(`\n📊 SUMMARY - Pages fetched: ${pageCount}`)
    console.log(`📊 Total events collected: ${allEventsCollected.length}`)
    
    // Analyze our target events
    const propertyAdvantageEvents = allEventsCollected.filter(e => e.event_type === targetEventType)
    console.log(`🎯 Property Advantage Call events found: ${propertyAdvantageEvents.length}`)
    
    // Analyze by status
    const statusBreakdown = {}
    propertyAdvantageEvents.forEach(event => {
      statusBreakdown[event.status] = (statusBreakdown[event.status] || 0) + 1
    })
    console.log(`📊 Status breakdown:`, statusBreakdown)
    
    // Analyze by date
    const dateBreakdown = {}
    propertyAdvantageEvents.forEach(event => {
      const date = event.start_time.split('T')[0]
      dateBreakdown[date] = (dateBreakdown[date] || 0) + 1
    })
    console.log(`📅 Date breakdown:`, dateBreakdown)

    // Test 2: Try different status parameters
    console.log('\n🧪 TEST 2: Trying specific status filters...')
    
    const statusTests = ['active', 'canceled']
    const statusResults = {}
    
    for (const status of statusTests) {
      const statusUrl = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${fromDate}&max_start_time=${toDate}&status=${status}&count=100`
      console.log(`Testing status: ${status}`)
      
      const statusResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      })
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        const statusEvents = (statusData.collection || []).filter(e => e.event_type === targetEventType)
        statusResults[status] = statusEvents.length
        console.log(`   Status '${status}': ${statusEvents.length} Property Advantage Call events`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Compare with database
    const { data: dbEvents, error: dbError } = await supabaseClient
      .from('calendly_events')
      .select('*')
      .eq('project_id', projectId)
      .eq('event_type_name', 'Property Advantage Call')
      .gte('scheduled_at', '2025-07-01T00:00:00.000Z')
      .lte('scheduled_at', '2025-07-11T23:59:59.999Z')

    const dbCount = dbEvents?.length || 0
    const dbStatusBreakdown = {}
    if (dbEvents) {
      dbEvents.forEach(event => {
        dbStatusBreakdown[event.status] = (dbStatusBreakdown[event.status] || 0) + 1
      })
    }

    console.log(`\n🗃️ DATABASE COMPARISON:`)
    console.log(`   Events in DB: ${dbCount}`)
    console.log(`   DB status breakdown:`, dbStatusBreakdown)

    return new Response(JSON.stringify({ 
      success: true,
      summary: {
        pagesFetched: pageCount,
        totalEventsFromAPI: allEventsCollected.length,
        propertyAdvantageCallFromAPI: propertyAdvantageEvents.length,
        expectedTotal: 254,
        missing: 254 - propertyAdvantageEvents.length,
        statusBreakdownAPI: statusBreakdown,
        statusResults,
        dateBreakdown,
        eventsInDatabase: dbCount,
        dbStatusBreakdown,
        analysis: {
          apiLimitReached: pageCount >= 20,
          possibleRateLimit: false,
          statusFilterNeeded: Object.keys(statusBreakdown).length > 1
        }
      }
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('❌ Diagnostic error:', error)
    return new Response(JSON.stringify({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})