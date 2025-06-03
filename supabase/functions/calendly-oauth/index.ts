
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthUrl(projectId: string) {
  console.log('=== GENERATING AUTH URL ===')
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  if (!clientId) {
    throw new Error('CALENDLY_CLIENT_ID not configured')
  }
  
  // Use the actual app domain for redirect
  const redirectUri = 'https://agency-analytics-ai.lovable.app/calendly-callback'
  
  const authUrl = `https://auth.calendly.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=default&` +
    `state=${projectId}`

  console.log('Auth URL generated successfully')

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCallback(code: string, projectId: string, supabaseClient: any) {
  console.log('=== PROCESSING OAUTH CALLBACK ===')
  console.log('Project ID:', projectId)
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET')
  const redirectUri = 'https://agency-analytics-ai.lovable.app/calendly-callback'

  if (!clientId || !clientSecret) {
    throw new Error('Calendly OAuth credentials not configured')
  }

  try {
    // Exchange code for token
    console.log('Exchanging code for token...')
    const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token received successfully')

    // Test the token by getting user info
    console.log('Testing token with user info request...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Token validation failed:', userResponse.status)
      throw new Error(`Invalid token: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    console.log('Token validated successfully')

    // Store everything in one transaction
    console.log('Storing integration data...')
    
    // Delete existing records first
    await supabaseClient
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    await supabaseClient
      .from('project_integration_data')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Insert new integration record
    const { error: integrationError } = await supabaseClient
      .from('project_integrations')
      .insert({
        project_id: projectId,
        platform: 'calendly',
        is_connected: true,
        last_sync: new Date().toISOString(),
      })

    if (integrationError) {
      console.error('Integration insert failed:', integrationError)
      throw new Error(`Failed to store integration: ${integrationError.message}`)
    }

    // Insert token data
    const { error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .insert({
        project_id: projectId,
        platform: 'calendly',
        data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type || 'Bearer',
          expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
          scope: tokenData.scope || 'default',
          user_info: userData.resource
        },
        synced_at: new Date().toISOString(),
      })

    if (tokenError) {
      console.error('Token insert failed:', tokenError)
      throw new Error(`Failed to store token: ${tokenError.message}`)
    }

    console.log('=== OAUTH CALLBACK SUCCESS ===')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    throw error
  }
}

async function getEventTypes(projectId: string, supabaseClient: any) {
  console.log('=== GET EVENT TYPES ===')
  console.log('Project ID:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  // Check integration exists and is connected
  const { data: integration, error: integrationError } = await supabaseClient
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .eq('is_connected', true)
    .maybeSingle()

  if (integrationError) {
    console.error('Integration query error:', integrationError)
    throw new Error(`Database error: ${integrationError.message}`)
  }

  if (!integration) {
    console.error('No connected integration found')
    throw new Error('No Calendly integration found for this project. Please connect your Calendly account first.')
  }

  // Get token data
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  if (tokenError || !tokenData?.data?.access_token) {
    console.error('Token error:', tokenError)
    throw new Error('Invalid token data. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token
  const userInfo = tokenData.data.user_info
  console.log('Token found, fetching event types...')

  // Use the user URI from the stored user info to fetch event types
  if (!userInfo?.uri) {
    console.error('No user URI found in stored data')
    throw new Error('User information incomplete. Please reconnect your Calendly account.')
  }

  // Fetch event types using the user's URI
  const eventTypesUrl = `https://api.calendly.com/event_types?user=${encodeURIComponent(userInfo.uri)}`
  console.log('Fetching event types from:', eventTypesUrl)
  
  const eventTypesResponse = await fetch(eventTypesUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!eventTypesResponse.ok) {
    console.error('Event types API error:', eventTypesResponse.status)
    const errorText = await eventTypesResponse.text()
    console.error('Error response:', errorText)
    
    if (eventTypesResponse.status === 401) {
      // Mark as disconnected
      await supabaseClient
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
      
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch event types: ${eventTypesResponse.status} - ${errorText}`)
  }

  const eventTypesData = await eventTypesResponse.json()
  const eventTypes = eventTypesData.collection || []
  
  console.log('Successfully retrieved', eventTypes.length, 'event types')

  return new Response(
    JSON.stringify({ event_types: eventTypes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function syncHistoricalEvents(projectId: string, dateRange: { startDate: string, endDate: string }, supabaseClient: any) {
  console.log('=== SYNC HISTORICAL EVENTS ===')
  console.log('Project ID:', projectId)
  console.log('Date Range:', dateRange)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  // Check integration exists and is connected
  const { data: integration, error: integrationError } = await supabaseClient
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .eq('is_connected', true)
    .maybeSingle()

  if (integrationError) {
    console.error('Integration query error:', integrationError)
    throw new Error(`Database error: ${integrationError.message}`)
  }

  if (!integration) {
    console.error('No connected integration found')
    throw new Error('No Calendly integration found for this project. Please connect your Calendly account first.')
  }

  // Get token data
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  if (tokenError || !tokenData?.data?.access_token) {
    console.error('Token error:', tokenError)
    throw new Error('Invalid token data. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token
  const userInfo = tokenData.data.user_info

  if (!userInfo?.uri) {
    console.error('No user URI found in stored data')
    throw new Error('User information incomplete. Please reconnect your Calendly account.')
  }

  // Get active event mappings to know which event types to sync
  const { data: eventMappings, error: mappingsError } = await supabaseClient
    .from('calendly_event_mappings')
    .select('calendly_event_type_id, event_type_name')
    .eq('project_id', projectId)
    .eq('is_active', true)

  if (mappingsError) {
    console.error('Event mappings error:', mappingsError)
    throw new Error('Failed to fetch event mappings')
  }

  if (!eventMappings || eventMappings.length === 0) {
    console.log('No active event mappings found')
    return {
      synced_events: 0,
      message: 'No event types are currently being tracked. Please select event types to track first.'
    }
  }

  console.log(`Found ${eventMappings.length} active event type mappings`)

  // Clear existing events for this project before re-importing with correct timestamps
  console.log('Clearing existing events for fresh import...')
  const { error: deleteError } = await supabaseClient
    .from('calendly_events')
    .delete()
    .eq('project_id', projectId)

  if (deleteError) {
    console.error('Failed to clear existing events:', deleteError)
    throw new Error('Failed to clear existing events for re-import')
  }

  // Fetch scheduled events from Calendly
  const eventsUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userInfo.uri)}&min_start_time=${dateRange.startDate}&max_start_time=${dateRange.endDate}&count=100&sort=start_time:desc`
  console.log('Fetching events from:', eventsUrl)
  
  const eventsResponse = await fetch(eventsUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!eventsResponse.ok) {
    console.error('Events API error:', eventsResponse.status)
    const errorText = await eventsResponse.text()
    console.error('Error response:', errorText)
    
    if (eventsResponse.status === 401) {
      // Mark as disconnected
      await supabaseClient
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
      
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch events: ${eventsResponse.status} - ${errorText}`)
  }

  const eventsData = await eventsResponse.json()
  const events = eventsData.collection || []
  
  console.log(`Retrieved ${events.length} events from Calendly`)

  // Filter events to only include those from mapped event types
  const mappedEventTypeIds = new Set(eventMappings.map(m => m.calendly_event_type_id))
  const relevantEvents = events.filter(event => mappedEventTypeIds.has(event.event_type))

  console.log(`${relevantEvents.length} events match tracked event types`)

  let syncedCount = 0

  // Store events in database with proper created_at timestamps
  for (const event of relevantEvents) {
    try {
      // Get event type name from mappings
      const mapping = eventMappings.find(m => m.calendly_event_type_id === event.event_type)
      const eventTypeName = mapping?.event_type_name || 'Unknown Event Type'

      // Extract invitee information
      let inviteeName = null
      let inviteeEmail = null

      if (event.event_memberships && event.event_memberships.length > 0) {
        const invitee = event.event_memberships[0]
        inviteeName = invitee.user_name || null
        inviteeEmail = invitee.user_email || null
      }

      console.log('Processing event:', {
        uri: event.uri,
        created_time: event.created_time,
        start_time: event.start_time,
        status: event.status
      })

      // Upsert event with proper created_at timestamp from Calendly
      const { error: insertError } = await supabaseClient
        .from('calendly_events')
        .upsert({
          project_id: projectId,
          calendly_event_id: event.uri,
          calendly_event_type_id: event.event_type,
          event_type_name: eventTypeName,
          scheduled_at: event.start_time,
          created_at: event.created_time, // THIS IS THE KEY FIX - use Calendly's created_time
          status: event.status,
          invitee_name: inviteeName,
          invitee_email: inviteeEmail,
        }, {
          onConflict: 'project_id,calendly_event_id'
        })

      if (insertError) {
        console.error('Failed to insert event:', event.uri, insertError)
      } else {
        syncedCount++
        console.log('Successfully synced event with created_at:', event.created_time)
      }
    } catch (error) {
      console.error('Error processing event:', event.uri, error)
    }
  }

  console.log(`Successfully synced ${syncedCount} events with proper creation timestamps`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      synced_events: syncedCount,
      total_events_found: events.length,
      relevant_events: relevantEvents.length,
      date_range: dateRange,
      message: 'Events re-imported with correct creation timestamps'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function disconnectCalendly(projectId: string, supabaseClient: any) {
  console.log('=== DISCONNECT CALENDLY ===')
  
  try {
    // Delete integration data
    await supabaseClient
      .from('project_integration_data')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Delete integration record
    await supabaseClient
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Delete event mappings
    await supabaseClient
      .from('calendly_event_mappings')
      .delete()
      .eq('project_id', projectId)

    console.log('Calendly disconnected successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Disconnect error:', error)
    throw error
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('=== CALENDLY OAUTH REQUEST ===')
    console.log('Method:', req.method)
    
    const requestBody = await req.text()
    if (!requestBody) {
      throw new Error('No request body provided')
    }

    const { action, projectId, code, dateRange } = JSON.parse(requestBody)
    console.log('Action:', action, 'ProjectId:', projectId)

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(projectId)
      
      case 'handle_callback':
        return await handleCallback(code, projectId, supabaseClient)
      
      case 'get_event_types':
        return await getEventTypes(projectId, supabaseClient)
      
      case 'sync_historical_events':
        return await syncHistoricalEvents(projectId, dateRange, supabaseClient)
      
      case 'disconnect':
        return await disconnectCalendly(projectId, supabaseClient)
      
      default:
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error) {
    console.error('=== ERROR ===', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
