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

    console.log('🔍 COMPREHENSIVE CALENDLY DIAGNOSTIC - July 20th Focus')
    
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

    // Focus on July 20th events - both created and scheduled
    const july20Start = '2025-07-20T00:00:00.000Z'
    const july20End = '2025-07-20T23:59:59.999Z'
    
    // Also check broader range to find events created on July 20th
    const broadStart = '2025-07-15T00:00:00.000Z'
    const broadEnd = '2025-07-25T23:59:59.999Z'
    
    const targetEventType = 'https://api.calendly.com/event_types/c6fa8f5f-9cdd-40b7-98ae-90c6caed9b6f'

    console.log(`🎯 Target event type: ${targetEventType}`)
    console.log(`📅 July 20th range: ${july20Start} to ${july20End}`)
    console.log(`📅 Broader range for created_at check: ${broadStart} to ${broadEnd}`)

    // Test 1: Check events SCHEDULED on July 20th
    console.log('\n🧪 TEST 1: Events SCHEDULED on July 20th')
    let july20ScheduledEvents = []
    let pageCount = 0
    let nextPageToken = null
    
    do {
      pageCount++
      let url = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${july20Start}&max_start_time=${july20End}&count=100`
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
      july20ScheduledEvents.push(...events)
      
      // Filter for our target event type
      const targetEvents = events.filter(e => e.event_type === targetEventType)
      console.log(`   Page ${pageCount}: ${events.length} total events, ${targetEvents.length} Property Advantage Call events`)
      
      nextPageToken = data.pagination?.next_page_token
      
      // Add delay to avoid rate limits
      if (nextPageToken) await new Promise(resolve => setTimeout(resolve, 200))
      
    } while (nextPageToken && pageCount < 20) // Limit to prevent infinite loops

    console.log(`\n📊 Events SCHEDULED on July 20th:`)
    const scheduledPropertyEvents = july20ScheduledEvents.filter(e => e.event_type === targetEventType)
    console.log(`🎯 Property Advantage Call events scheduled on July 20th: ${scheduledPropertyEvents.length}`)
    
    // Test 2: Check events CREATED on July 20th (broader date range)
    console.log('\n🧪 TEST 2: Events CREATED on July 20th (checking broader date range)')
    let createdOnJuly20Events = []
    pageCount = 0
    nextPageToken = null
    
    do {
      pageCount++
      let url = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${broadStart}&max_start_time=${broadEnd}&count=100`
      if (nextPageToken) url += `&page_token=${nextPageToken}`
      
      console.log(`📄 Fetching broader range page ${pageCount}...`)
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        console.error(`❌ API error on broader range page ${pageCount}:`, await response.text())
        break
      }
      
      const data = await response.json()
      const events = data.collection || []
      
      // Filter for events created on July 20th
      const july20CreatedEvents = events.filter(event => {
        return event.created_at && event.created_at.startsWith('2025-07-20')
      })
      
      createdOnJuly20Events.push(...july20CreatedEvents)
      
      const targetCreatedEvents = july20CreatedEvents.filter(e => e.event_type === targetEventType)
      console.log(`   Page ${pageCount}: ${events.length} total events, ${july20CreatedEvents.length} created on July 20th, ${targetCreatedEvents.length} Property Advantage Call created on July 20th`)
      
      nextPageToken = data.pagination?.next_page_token
      
      if (nextPageToken) await new Promise(resolve => setTimeout(resolve, 200))
      
    } while (nextPageToken && pageCount < 20)

    console.log(`\n📊 Events CREATED on July 20th:`)
    const createdPropertyEvents = createdOnJuly20Events.filter(e => e.event_type === targetEventType)
    console.log(`🎯 Property Advantage Call events CREATED on July 20th: ${createdPropertyEvents.length}`)
    
    // Show details of events created on July 20th
    if (createdPropertyEvents.length > 0) {
      console.log('\n📋 Details of Property Advantage Call events CREATED on July 20th:')
      createdPropertyEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.uri}`)
        console.log(`      Status: ${event.status}`)
        console.log(`      Created: ${event.created_at}`)
        console.log(`      Scheduled: ${event.start_time}`)
        console.log(`      Name: ${event.name}`)
      })
    }

    // Test 3: Try different status parameters for July 20th
    console.log('\n🧪 TEST 3: Different status filters for July 20th scheduled events...')
    
    const statusTests = ['active', 'canceled']
    const statusResults = {}
    
    for (const status of statusTests) {
      const statusUrl = `https://api.calendly.com/scheduled_events?organization=${organizationUri}&min_start_time=${july20Start}&max_start_time=${july20End}&status=${status}&count=100`
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

    // Compare with database - events created on July 20th
    const { data: dbEventsCreated, error: dbCreatedError } = await supabaseClient
      .from('calendly_events')
      .select('*')
      .eq('project_id', projectId)
      .eq('event_type_name', 'Property Advantage Call')
      .gte('created_at', '2025-07-20T00:00:00.000Z')
      .lte('created_at', '2025-07-20T23:59:59.999Z')

    const dbCreatedCount = dbEventsCreated?.length || 0
    
    // Also check events scheduled on July 20th
    const { data: dbEventsScheduled, error: dbScheduledError } = await supabaseClient
      .from('calendly_events')
      .select('*')
      .eq('project_id', projectId)
      .eq('event_type_name', 'Property Advantage Call')
      .gte('scheduled_at', '2025-07-20T00:00:00.000Z')
      .lte('scheduled_at', '2025-07-20T23:59:59.999Z')

    const dbScheduledCount = dbEventsScheduled?.length || 0

    console.log(`\n🗃️ DATABASE COMPARISON:`)
    console.log(`   Events CREATED on July 20th in DB: ${dbCreatedCount}`)
    console.log(`   Events SCHEDULED on July 20th in DB: ${dbScheduledCount}`)
    console.log(`   API shows ${createdPropertyEvents.length} events CREATED on July 20th`)
    console.log(`   API shows ${scheduledPropertyEvents.length} events SCHEDULED on July 20th`)

    return new Response(JSON.stringify({ 
      success: true,
      july20Focus: {
        eventsCreatedOnJuly20thFromAPI: createdPropertyEvents.length,
        eventsScheduledOnJuly20thFromAPI: scheduledPropertyEvents.length,
        eventsCreatedOnJuly20thInDB: dbCreatedCount,
        eventsScheduledOnJuly20thInDB: dbScheduledCount,
        missingCreatedEvents: Math.max(0, createdPropertyEvents.length - dbCreatedCount),
        createdEventDetails: createdPropertyEvents.map(e => ({
          uri: e.uri,
          status: e.status,
          created_at: e.created_at,
          start_time: e.start_time,
          name: e.name
        })),
        statusResults,
        analysis: {
          apiReturnsCreatedEvents: createdPropertyEvents.length > 0,
          dbMissingCreatedEvents: createdPropertyEvents.length > dbCreatedCount,
          syncIssueConfirmed: createdPropertyEvents.length > 0 && dbCreatedCount === 0
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