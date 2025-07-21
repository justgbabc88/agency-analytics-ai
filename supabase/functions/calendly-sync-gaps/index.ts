
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { triggerReason, eventTypeUri, specificProjectId, userTimezone } = await req.json()
    
    console.log('🔍 TIMEZONE-AWARE SYNC - Starting comprehensive sync:', {
      triggerReason,
      eventTypeUri,
      specificProjectId,
      userTimezone: userTimezone || 'UTC',
      timestamp: new Date().toISOString()
    })

    let totalGaps = 0
    let totalEvents = 0
    let totalProjects = 0

    // Get integrations to process
    let integrationsQuery = supabaseClient
      .from('project_integrations')
      .select('project_id, platform')
      .eq('platform', 'calendly')
      .eq('is_connected', true)

    if (specificProjectId) {
      integrationsQuery = integrationsQuery.eq('project_id', specificProjectId)
    }

    const { data: integrations, error: integrationsError } = await integrationsQuery

    if (integrationsError) {
      console.error('❌ Error fetching integrations:', integrationsError)
      throw integrationsError
    }

    console.log('📊 Found integrations:', integrations?.length || 0)

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No Calendly integrations found',
        gaps: 0,
        events: 0,
        projects: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const integration of integrations) {
      totalProjects++
      
      console.log(`\n🔄 === PROCESSING PROJECT: ${integration.project_id} ===`)

      // Get user timezone for this project if not provided
      let effectiveTimezone = userTimezone || 'UTC'
      if (!userTimezone) {
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('timezone')
          .eq('id', (await supabaseClient.auth.getUser()).data.user?.id)
          .single()
        
        if (profileData?.timezone) {
          effectiveTimezone = profileData.timezone
        }
      }

      console.log('🌍 Using timezone for sync:', effectiveTimezone)

      // Get access token for this project
      const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('calendly-oauth', {
        body: { action: 'get_access_token', projectId: integration.project_id, code: 'missing' }
      })

      if (tokenError || !tokenData?.access_token) {
        console.error('❌ Failed to get access token for project:', integration.project_id)
        continue
      }

      console.log('✅ Access token retrieved for project:', integration.project_id)

      // Get user info
      const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!userResponse.ok) {
        console.error('❌ Failed to get user info:', await userResponse.text())
        continue
      }

      const userData = await userResponse.json()
      const organizationUri = userData.resource.current_organization
      console.log('🏢 Organization URI:', organizationUri)

      // First, fetch all available event types from Calendly and auto-create mappings
      console.log('🔍 Fetching all event types from Calendly to ensure complete mappings...')
      
      const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?organization=${organizationUri}&count=100`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!eventTypesResponse.ok) {
        console.error('❌ Failed to fetch event types from Calendly:', await eventTypesResponse.text())
        continue
      }
      
      const eventTypesData = await eventTypesResponse.json()
      console.log(`📋 Found ${eventTypesData.collection.length} event types in Calendly:`, eventTypesData.collection.map(et => et.name))
      
      // Auto-create mappings for any missing event types
      for (const eventType of eventTypesData.collection) {
        if (eventType.status === 'active') {
          const { error: mappingError } = await supabaseClient
            .from('calendly_event_mappings')
            .upsert({
              project_id: integration.project_id,
              calendly_event_type_id: eventType.uri,
              event_type_name: eventType.name,
              is_active: true
            }, {
              onConflict: 'project_id,calendly_event_type_id'
            })
          
          if (mappingError) {
            console.error('❌ Error creating event type mapping:', mappingError)
          } else {
            console.log(`✅ Ensured mapping exists for event type: ${eventType.name}`)
          }
        }
      }

      // Get active event type mappings for this project
      const { data: mappings, error: mappingsError } = await supabaseClient
        .from('calendly_event_mappings')
        .select('calendly_event_type_id, event_type_name')
        .eq('project_id', integration.project_id)
        .eq('is_active', true)

      if (mappingsError) {
        console.error('❌ Error fetching mappings:', mappingsError)
        continue
      }

      console.log('📋 Active event type mappings:', mappings?.length || 0)
      if (mappings && mappings.length > 0) {
        mappings.forEach(mapping => {
          console.log(`  - ${mapping.event_type_name}: ${mapping.calendly_event_type_id}`)
        })
      }

      if (!mappings || mappings.length === 0) {
        console.log('⚠️ No active event type mappings found for project')
        continue
      }

      // Use timezone-aware date range - sync last 30 days from user's perspective
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      
      // Get tomorrow's date to ensure we capture all of today's events
      const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000))
      
      // Convert to user timezone for proper day boundaries - start from 30 days ago, end tomorrow
      const syncFrom = new Date(thirtyDaysAgo.toLocaleDateString('en-CA', { timeZone: effectiveTimezone }) + 'T00:00:00.000Z')
      const syncTo = new Date(tomorrow.toLocaleDateString('en-CA', { timeZone: effectiveTimezone }) + 'T23:59:59.999Z')

      console.log('📅 Timezone-aware sync date range:')
      console.log('  User timezone:', effectiveTimezone)
      console.log('  From (UTC):', syncFrom.toISOString())
      console.log('  To (UTC):', syncTo.toISOString())
      console.log('  From (User TZ):', syncFrom.toLocaleString('en-US', { timeZone: effectiveTimezone }))
      console.log('  To (User TZ):', syncTo.toLocaleString('en-US', { timeZone: effectiveTimezone }))

      // Use pagination to get all events
      let allEvents = []
      
      // Define function to fetch events by status
      async function fetchEventsByStatus(eventsList, orgUri, fromDate, toDate, accessToken, status) {
        let nextPageToken = null
        let pageCount = 0
        const maxPages = 100
        
        console.log(`🔄 Fetching ${status.toUpperCase()} events from Calendly`)
        
        do {
          pageCount++
          let calendlyUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&min_start_time=${fromDate.toISOString()}&max_start_time=${toDate.toISOString()}&count=100&status=${status}`
          
          if (nextPageToken) {
            calendlyUrl += `&page_token=${nextPageToken}`
          }
          
          console.log(`🌐 ${status} Events - Page ${pageCount}:`, calendlyUrl)

          try {
            const eventsResponse = await fetch(calendlyUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (!eventsResponse.ok) {
              const errorText = await eventsResponse.text()
              
              if (eventsResponse.status === 429) {
                const retryAfter = eventsResponse.headers.get('Retry-After') || '60'
                console.log(`⏰ Rate limited for ${status} events. Retry after: ${retryAfter} seconds`)
                return
              }
              
              console.error(`❌ Calendly API error (${status}): ${eventsResponse.status} ${errorText}`)
              break
            }

            const eventsData = await eventsResponse.json()
            const events = eventsData.collection || []
            
            console.log(`📊 ${status} events from page ${pageCount}:`, events.length)
            
            eventsList.push(...events)
            
            nextPageToken = eventsData.pagination?.next_page_token
            console.log(`🔄 ${status} next page token:`, nextPageToken)
            
            if (nextPageToken) {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          } catch (fetchError) {
            console.error(`❌ Error fetching ${status} events from Calendly:`, fetchError)
            break
          }
          
        } while (nextPageToken && pageCount < maxPages)
        
        console.log(`🏁 ${status.toUpperCase()} PAGINATION COMPLETE: ${pageCount} pages fetched`)
      }
      
      // Fetch all event statuses separately
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'active')
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'completed')
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'canceled')
      
      console.log(`📊 Total events collected:`, allEvents.length)

      if (allEvents.length > 0) {
        console.log('🔍 TIMEZONE DEBUG - First few events:')
        allEvents.slice(0, 3).forEach(event => {
          console.log(`  Event: ${event.name}`)
          console.log(`    Created (UTC): ${event.created_at}`)
          console.log(`    Created (${effectiveTimezone}): ${new Date(event.created_at).toLocaleString('en-US', { timeZone: effectiveTimezone })}`)
          console.log(`    Scheduled (UTC): ${event.start_time}`)
          console.log(`    Scheduled (${effectiveTimezone}): ${new Date(event.start_time).toLocaleString('en-US', { timeZone: effectiveTimezone })}`)
        })
      }

      // Create set of active event type IDs for filtering
      const activeEventTypeIds = new Set(mappings.map(m => m.calendly_event_type_id))
      console.log('🎯 Active event type IDs for filtering:', Array.from(activeEventTypeIds))

      // Filter events based on event type
      const filteredEvents = allEvents.filter(event => {
        const eventTypeUri = event.event_type
        const isMatched = activeEventTypeIds.has(eventTypeUri)
        
        if (!isMatched) {
          console.log(`🔍 Skipping event: ${event.name || 'unnamed'} - type: ${eventTypeUri}`)
        } else {
          console.log(`✅ Including event: ${event.name || 'unnamed'} - type: ${eventTypeUri}`)
        }
        
        return isMatched
      })
      
      console.log('🎯 Events matching active mappings:', filteredEvents.length)

      // Process each filtered event
      for (const event of filteredEvents) {
        try {
          // Check if event already exists
          const { data: existingEvent, error: checkError } = await supabaseClient
            .from('calendly_events')
            .select('id')
            .eq('calendly_event_id', event.uri)
            .eq('project_id', integration.project_id)
            .maybeSingle()

          if (checkError) {
            console.error('❌ Error checking existing event:', checkError)
            continue
          }

          let isNewEvent = !existingEvent
          
          if (existingEvent) {
            console.log('🔄 Event exists, checking for status updates:', event.uri, 'Status:', event.status)
          } else {
            console.log('➕ New event to insert:', event.uri, 'Status:', event.status)
          }

          // Get invitee information
          const inviteesResponse = await fetch(`${event.uri}/invitees`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            }
          })

          let inviteeName = null
          let inviteeEmail = null

          if (inviteesResponse.ok) {
            const inviteesData = await inviteesResponse.json()
            if (inviteesData.collection && inviteesData.collection.length > 0) {
              const invitee = inviteesData.collection[0]
              inviteeName = invitee.name
              inviteeEmail = invitee.email
            }
          }

          // Get the event type URI
          const eventTypeUri = event.event_type

          // Find the event type name from our mappings
          const mapping = mappings.find(m => m.calendly_event_type_id === eventTypeUri)
          const eventTypeName = mapping?.event_type_name || event.event_type?.name || event.name || 'Unknown Event Type'

          // Ensure we have valid timestamps
          const createdAt = event.created_at || event.start_time || new Date().toISOString()
          const updatedAt = event.updated_at || event.created_at || event.start_time || new Date().toISOString()

          // Upsert the event
          const { error: upsertError } = await supabaseClient
            .from('calendly_events')
            .upsert({
              project_id: integration.project_id,
              calendly_event_id: event.uri,
              calendly_event_type_id: eventTypeUri,
              event_type_name: eventTypeName,
              scheduled_at: event.start_time,
              invitee_name: inviteeName,
              invitee_email: inviteeEmail,
              status: event.status || 'scheduled',
              created_at: isNewEvent ? createdAt : undefined,
              updated_at: updatedAt
            }, {
              onConflict: 'project_id,calendly_event_id'
            })

          if (upsertError) {
            console.error('❌ Error upserting event:', upsertError)
            continue
          }

          totalEvents++
          const actionText = isNewEvent ? 'Inserted new' : 'Updated existing'
          console.log(`✅ ${actionText} event:`, {
            id: event.uri,
            name: eventTypeName,
            status: event.status,
            scheduled_at: event.start_time,
            created_at: createdAt,
            timezone_context: `Created ${new Date(createdAt).toLocaleString('en-US', { timeZone: effectiveTimezone })} in ${effectiveTimezone}`
          })

        } catch (eventError) {
          console.error('❌ Error processing individual event:', eventError)
          continue
        }
      }

      // Update the last sync timestamp
      const { error: updateError } = await supabaseClient
        .from('project_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('project_id', integration.project_id)
        .eq('platform', 'calendly')

      if (updateError) {
        console.error('❌ Error updating last sync:', updateError)
      }
    }

    console.log('\n🎉 === FINAL TIMEZONE-AWARE SYNC RESULTS ===')
    console.log('🎯 Gaps found:', totalGaps)
    console.log('📊 Events synced:', totalEvents)
    console.log('🏢 Projects processed:', totalProjects)
    console.log('🌍 Timezone used:', userTimezone || 'UTC (default)')
    console.log('⏰ Completed at:', new Date().toISOString())

    return new Response(JSON.stringify({
      success: true,
      gaps: totalGaps,
      events: totalEvents,
      projects: totalProjects,
      timezone: userTimezone || 'UTC',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Sync function error:', error)
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
