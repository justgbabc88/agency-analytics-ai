import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  created_at: string;
  event_type: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userTimezone, projectId, dates } = await req.json()
    
    console.log(`🔍 Starting Calendly API diagnostic for project: ${projectId}`)
    console.log(`📅 Target dates: ${dates.join(', ')}`)
    console.log(`🌍 User timezone: ${userTimezone}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get access token for this project
    const { data: tokenData } = await supabase.functions.invoke('calendly-oauth', {
      body: { 
        action: 'get_access_token',
        projectId: projectId
      }
    })

    if (!tokenData?.access_token) {
      throw new Error('No access token available')
    }

    console.log('✅ Access token retrieved successfully')

    // Get organization URI
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const userData = await userResponse.json()
    const organizationUri = userData.resource.current_organization
    
    console.log(`🏢 Organization URI: ${organizationUri}`)

    // Fetch all events from Calendly API with expanded date range
    const minTime = '2025-07-15T00:00:00.000000Z' // Start earlier to catch all events
    const maxTime = '2025-07-19T23:59:59.999999Z' // End later to catch all events
    
    console.log(`🔍 Fetching events from ${minTime} to ${maxTime}`)
    
    let allEvents: CalendlyEvent[] = []
    let nextPageToken = null
    let apiCallCount = 0
    
    do {
      apiCallCount++
      let apiUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(organizationUri)}&min_start_time=${minTime}&max_start_time=${maxTime}&count=100&sort=created_at:asc`
      
      if (nextPageToken) {
        apiUrl += `&page_token=${nextPageToken}`
      }
      
      console.log(`📡 API Call ${apiCallCount}: ${apiUrl}`)
      
      const eventsResponse = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!eventsResponse.ok) {
        throw new Error(`API call failed: ${eventsResponse.status} ${eventsResponse.statusText}`)
      }
      
      const eventsData = await eventsResponse.json()
      console.log(`📊 Page ${apiCallCount} returned ${eventsData.collection?.length || 0} events`)
      
      if (eventsData.collection) {
        allEvents = allEvents.concat(eventsData.collection)
      }
      
      nextPageToken = eventsData.pagination?.next_page_token
      console.log(`🔄 Next page token: ${nextPageToken ? 'exists' : 'none'}`)
      
    } while (nextPageToken && apiCallCount < 50) // Safety limit
    
    console.log(`📊 Total events fetched from API: ${allEvents.length}`)
    console.log(`🔍 Total API calls made: ${apiCallCount}`)

    // Filter for Property Advantage Call events and analyze by creation date
    const propertyAdvantageEvents = allEvents.filter(event => 
      event.name === 'Property Advantage Call'
    )
    
    console.log(`🎯 Property Advantage Call events found: ${propertyAdvantageEvents.length}`)

    // Analyze events by creation date in user timezone
    const eventAnalysis: Record<string, {
      apiCount: number;
      dbCount: number;
      missingEvents: CalendlyEvent[];
      apiEvents: CalendlyEvent[];
    }> = {}
    
    for (const targetDate of dates) {
      const startOfDay = new Date(`${targetDate}T00:00:00+10:00`) // AEST
      const endOfDay = new Date(`${targetDate}T23:59:59.999+10:00`) // AEST
      
      // Filter API events by creation date
      const apiEventsForDate = propertyAdvantageEvents.filter(event => {
        const createdAt = new Date(event.created_at)
        return createdAt >= startOfDay && createdAt <= endOfDay
      })
      
      console.log(`📅 ${targetDate}: Found ${apiEventsForDate.length} events created on this date`)
      
      // Get DB count for this date
      const { count: dbCount } = await supabase
        .from('calendly_events')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('event_type_name', 'Property Advantage Call')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
      
      // Get existing events from DB
      const { data: existingEvents } = await supabase
        .from('calendly_events')
        .select('calendly_event_id')
        .eq('project_id', projectId)
        .eq('event_type_name', 'Property Advantage Call')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
      
      const existingEventIds = new Set(existingEvents?.map(e => e.calendly_event_id) || [])
      
      // Find missing events
      const missingEvents = apiEventsForDate.filter(event => 
        !existingEventIds.has(event.uri)
      )
      
      eventAnalysis[targetDate] = {
        apiCount: apiEventsForDate.length,
        dbCount: dbCount || 0,
        missingEvents,
        apiEvents: apiEventsForDate
      }
      
      console.log(`📊 ${targetDate} Analysis:`)
      console.log(`   📡 API Events: ${apiEventsForDate.length}`)
      console.log(`   💾 DB Events: ${dbCount || 0}`)
      console.log(`   ❌ Missing: ${missingEvents.length}`)
      
      if (missingEvents.length > 0) {
        console.log(`   🔍 Missing Event IDs:`)
        missingEvents.forEach(event => {
          console.log(`      - ${event.uri} (${event.status}) created: ${event.created_at}`)
        })
      }
    }

    const summary = {
      july16: eventAnalysis['2025-07-16'],
      july17: eventAnalysis['2025-07-17'],
      missingEvents: Object.values(eventAnalysis).reduce((sum, analysis) => sum + analysis.missingEvents.length, 0),
      totalApiCalls: apiCallCount,
      totalEventsFromApi: allEvents.length,
      propertyAdvantageEvents: propertyAdvantageEvents.length
    }
    
    console.log('✅ Diagnostic complete:', summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        eventAnalysis,
        message: `Found ${summary.missingEvents} missing events across ${dates.length} dates`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Calendly diagnostic error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})