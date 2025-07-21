import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`🚀 Diagnostic function started - ${new Date().toISOString()}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body:', JSON.stringify(body))
    
    const { userTimezone, projectId, dates } = body
    
    if (!projectId) {
      throw new Error('Missing projectId in request')
    }
    
    console.log(`🔍 Starting diagnostic for project: ${projectId}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('✅ Supabase client created')

    // First, let's see if we can query the database at all
    console.log('🔍 Testing database connection...')
    const { count: testCount, error: testError } = await supabase
      .from('calendly_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
    
    if (testError) {
      console.error('❌ Database test failed:', testError)
      throw new Error(`Database test failed: ${testError.message}`)
    }
    
    console.log(`✅ Database connection OK. Total events in DB: ${testCount}`)

    // Try to get integration data
    console.log('🔍 Getting access token...')
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('platform', 'calendly')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (tokenError) {
      console.error('❌ Token query failed:', tokenError)
      throw new Error(`Token query failed: ${tokenError.message}`)
    }
    
    if (!tokenRecord) {
      throw new Error('No token record found in project_integration_data')
    }
    
    const accessToken = tokenRecord?.data?.access_token
    
    if (!accessToken) {
      console.error('❌ No access token in data:', tokenRecord.data)
      throw new Error('No access token found in project integration data')
    }

    console.log('✅ Access token retrieved successfully')

    // Get organization URI
    console.log('🔍 Getting organization info...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ User API call failed:', errorText)
      throw new Error(`Failed to get user info: ${userResponse.status} ${errorText}`)
    }
    
    const userData = await userResponse.json()
    const organizationUri = userData.resource.current_organization
    
    console.log(`🏢 Organization URI: ${organizationUri}`)

    // Call Calendly API to get events for July 16-17
    const minTime = '2025-07-16T00:00:00.000Z'
    const maxTime = '2025-07-17T23:59:59.999Z'
    
    console.log(`🔍 Fetching events from ${minTime} to ${maxTime}`)
    
    const apiUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(organizationUri)}&min_start_time=${minTime}&max_start_time=${maxTime}&count=100&sort=created_at:asc`
    
    console.log(`📡 Making API call to: ${apiUrl}`)
    
    const eventsResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text()
      console.error(`❌ Events API Error: ${eventsResponse.status} ${errorText}`)
      throw new Error(`API call failed: ${eventsResponse.status} ${errorText}`)
    }
    
    const eventsData = await eventsResponse.json()
    console.log(`📊 API returned ${eventsData.collection?.length || 0} events`)
    
    // Filter Property Advantage Call events
    const propertyAdvantageEvents = eventsData.collection?.filter((event: any) => 
      event.name === 'Property Advantage Call'
    ) || []
    
    console.log(`🎯 Property Advantage Call events: ${propertyAdvantageEvents.length}`)

    // Count by creation date
    let july16Created = 0
    let july17Created = 0
    
    for (const event of propertyAdvantageEvents) {
      const createdDate = new Date(event.created_at).toISOString().split('T')[0]
      console.log(`Event created: ${createdDate} - ${event.created_at}`)
      if (createdDate === '2025-07-16') july16Created++
      if (createdDate === '2025-07-17') july17Created++
    }

    console.log(`📊 July 16 events created: ${july16Created}`)
    console.log(`📊 July 17 events created: ${july17Created}`)

    // Get DB counts
    const { count: db16Count } = await supabase
      .from('calendly_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('event_type_name', 'Property Advantage Call')
      .gte('created_at', '2025-07-16T00:00:00.000Z')
      .lte('created_at', '2025-07-16T23:59:59.999Z')
    
    const { count: db17Count } = await supabase
      .from('calendly_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('event_type_name', 'Property Advantage Call')
      .gte('created_at', '2025-07-17T00:00:00.000Z')
      .lte('created_at', '2025-07-17T23:59:59.999Z')

    console.log(`💾 July 16 DB count: ${db16Count || 0}`)
    console.log(`💾 July 17 DB count: ${db17Count || 0}`)

    // Just return database stats for now to see if the function works
    const summary = {
      july16: { apiCount: july16Created, dbCount: db16Count || 0 },
      july17: { apiCount: july17Created, dbCount: db17Count || 0 },
      missingEvents: (july16Created - (db16Count || 0)) + (july17Created - (db17Count || 0)),
      totalApiEvents: propertyAdvantageEvents.length,
      message: 'Full API diagnostic complete'
    }
    
    console.log('✅ Diagnostic complete:', summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        message: `API vs DB comparison: July 16th (API: ${july16Created}, DB: ${db16Count || 0}) | July 17th (API: ${july17Created}, DB: ${db17Count || 0})`
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
    console.error('❌ Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: `Diagnostic failed: ${error.message}`,
        stack: error.stack,
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