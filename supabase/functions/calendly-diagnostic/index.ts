import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userTimezone, projectId, dates } = await req.json()
    
    console.log(`🔍 Starting Calendly API diagnostic for project: ${projectId}`)
    console.log(`📅 Target dates: ${dates.join(', ')}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get access token directly from integrations table
    const { data: integrationData } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'calendly')
      .single()
    
    if (!integrationData) {
      throw new Error('No Calendly integration found')
    }

    // Get integration data to find access token
    const { data: tokenRecord } = await supabase
      .from('integration_data')
      .select('data')
      .eq('platform', 'calendly')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    const accessToken = tokenRecord?.data?.access_token
    
    if (!accessToken) {
      throw new Error('No access token found in integration data')
    }

    console.log('✅ Access token retrieved successfully')

    // Get organization URI first
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status}`)
    }
    
    const userData = await userResponse.json()
    const organizationUri = userData.resource.current_organization
    
    console.log(`🏢 Organization URI: ${organizationUri}`)

    // Simple API call to get events for July 16-17
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
      console.log(`❌ API Error: ${eventsResponse.status} ${errorText}`)
      throw new Error(`API call failed: ${eventsResponse.status} ${errorText}`)
    }
    
    const eventsData = await eventsResponse.json()
    console.log(`📊 API returned ${eventsData.collection?.length || 0} events`)
    
    // Filter Property Advantage Call events
    const propertyAdvantageEvents = eventsData.collection?.filter((event: any) => 
      event.name === 'Property Advantage Call'
    ) || []
    
    console.log(`🎯 Property Advantage Call events: ${propertyAdvantageEvents.length}`)

    // Count by creation date (simplified)
    let july16Created = 0
    let july17Created = 0
    
    for (const event of propertyAdvantageEvents) {
      const createdDate = new Date(event.created_at).toISOString().split('T')[0]
      if (createdDate === '2025-07-16') july16Created++
      if (createdDate === '2025-07-17') july17Created++
    }

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

    const summary = {
      july16: { apiCount: july16Created, dbCount: db16Count || 0 },
      july17: { apiCount: july17Created, dbCount: db17Count || 0 },
      missingEvents: (july16Created - (db16Count || 0)) + (july17Created - (db17Count || 0)),
      totalApiEvents: propertyAdvantageEvents.length
    }
    
    console.log('✅ Diagnostic complete:', summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        message: `API vs DB comparison complete`
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