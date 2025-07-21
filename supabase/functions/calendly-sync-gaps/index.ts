
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

    const { triggerReason, eventTypeUri, specificProjectId } = await req.json()
    
    console.log('🔍 ENHANCED GAP DETECTION - Starting comprehensive sync:', {
      triggerReason,
      eventTypeUri,
      specificProjectId,
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
    console.log('🎯 Processing', integrations?.length || 0, 'projects for sync')
    
    // Debug: Show all integrations found
    if (integrations?.length) {
      integrations.forEach(integration => {
        console.log(`   📍 Project ID: ${integration.project_id}`)
      })
    } else {
      console.log('⚠️  No Calendly integrations found! Checking what exists...')
      
      // Let's check what integrations exist
      const { data: allIntegrations } = await supabaseClient
        .from('project_integrations')
        .select('project_id, platform, is_connected')
        .eq('platform', 'calendly')
      
      console.log(`   📊 Total calendly records: ${allIntegrations?.length || 0}`)
      if (allIntegrations?.length) {
        allIntegrations.forEach(integration => {
          console.log(`     - Project ${integration.project_id}: connected=${integration.is_connected}`)
        })
      }
    }

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

      // Get active event type mappings for this project (including newly created ones)
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

      // Sync events from the last 7 days for focused recent data
      const now = new Date()
      const syncFrom = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) // 7 days ago
      const syncTo = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000))   // 1 day from now

      console.log('📅 Sync date range:')
      console.log('  From:', syncFrom.toISOString())
      console.log('  To:', syncTo.toISOString())
      console.log('  Target period: Last 7 days + 1 day future (focused sync)')

      // Use pagination to get all events (Calendly API has a limit of 100 events per request)
      let allEvents = []
      
      // Define function to fetch events by status
      async function fetchEventsByStatus(eventsList, orgUri, fromDate, toDate, accessToken, status) {
        let nextPageToken = null
        let pageCount = 0
        const maxPages = 500  // Increased significantly to handle more events
        let retryCount = 0
        const maxRetries = 3
        
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
              
              // Handle rate limiting with extended retry logic for Calendly's 100 events/minute limit
              if (eventsResponse.status === 429) {
                const retryAfter = parseInt(eventsResponse.headers.get('Retry-After') || '60')
                console.log(`⏰ Rate limited for ${status} events (Calendly: 100 events/minute). Retry attempt ${retryCount + 1}/${maxRetries}. Waiting ${retryAfter} seconds...`)
                
                if (retryCount < maxRetries) {
                  retryCount++
                  // Wait for rate limit reset + small buffer
                  await new Promise(resolve => setTimeout(resolve, (retryAfter + 5) * 1000))
                  continue // Retry the same page
                } else {
                  console.log(`⚠️ Rate limit exceeded for ${status} events. This is expected with Calendly's 100 events/minute limit.`)
                  console.log(`📊 Successfully fetched ${eventsList.length} events before hitting rate limit.`)
                  console.log(`🔄 Run sync again in 1 minute to fetch more events.`)
                  break
                }
              }
              
              console.error(`❌ Calendly API error (${status}): ${eventsResponse.status} ${errorText}`)
              break
            }

            // Reset retry count on successful request
            retryCount = 0

            const eventsData = await eventsResponse.json()
            const events = eventsData.collection || []
            
            console.log(`📊 ${status} events from page ${pageCount}:`, events.length)
            console.log(`🔍 Pagination info:`, {
              hasNextPage: !!eventsData.pagination?.next_page_token,
              nextPageToken: eventsData.pagination?.next_page_token?.substring(0, 20) + '...',
              totalCount: eventsData.pagination?.count,
              currentPageEvents: events.length
            })
            
            // Add events to our collection
            eventsList.push(...events)
            
            // Check if there's a next page
            nextPageToken = eventsData.pagination?.next_page_token
            console.log(`🔄 ${status} - Page ${pageCount} complete. Next page available: ${!!nextPageToken}`)
            
            // Reduce delay to get events faster and avoid timeouts
            if (nextPageToken) {
              console.log(`⏳ ${status} - Waiting 100ms before next page...`)
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          } catch (fetchError) {
            console.error(`❌ Error fetching ${status} events from Calendly:`, fetchError)
            break
          }
          
        } while (nextPageToken && pageCount < maxPages)
        
        console.log(`🏁 ${status.toUpperCase()} PAGINATION COMPLETE:`)
        console.log(`   📄 Pages fetched: ${pageCount}`)
        console.log(`   📊 Total events: ${eventsList.length}`)
        console.log(`   🚫 Stopped because: ${nextPageToken ? 'Max pages reached' : 'No more pages'}`)
      }
      
      // Fetch all event statuses separately to ensure we get everything
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'active')
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'completed')
      await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'canceled')
      
      console.log(`📊 Total events collected:`, allEvents.length)

      // Log the complete structure of first event to understand the API response
      if (allEvents.length > 0) {
          console.log('🔍 FULL EVENT STRUCTURE ANALYSIS:')
          console.log('Raw event object keys:', Object.keys(allEvents[0]))
          console.log('Full first event:', JSON.stringify(allEvents[0], null, 2))
          
          // Check different possible event type properties
          const firstEvent = allEvents[0]
          console.log('🧪 Testing event type properties:')
          console.log('  - event.event_type:', firstEvent.event_type)
          console.log('  - event.event_type_uri:', firstEvent.event_type_uri)
          console.log('  - event.event_type_id:', firstEvent.event_type_id)
          console.log('  - event.type:', firstEvent.type)
          console.log('  - event.uri itself:', firstEvent.uri)
        }

        // Create set of active event type IDs for filtering
        const activeEventTypeIds = new Set(mappings.map(m => m.calendly_event_type_id))
        console.log('🎯 Active event type IDs for filtering:', Array.from(activeEventTypeIds))

        // Filter events based on event type, then sort by date and take 100 most recent
        const matchingEvents = allEvents.filter(event => {
          // Based on our test, the correct property is event.event_type (which contains the URI)
          const eventTypeUri = event.event_type
          const isMatched = activeEventTypeIds.has(eventTypeUri)
          
          if (!isMatched) {
            console.log(`🔍 Skipping event: ${event.name || 'unnamed'} - type: ${eventTypeUri}`)
          } else {
            console.log(`✅ Including event: ${event.name || 'unnamed'} - type: ${eventTypeUri}`)
          }
          
          return isMatched
        })
        
        // Sort by start_time (most recent first) and take only 100 most recent
        const filteredEvents = matchingEvents
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
          .slice(0, 100)
        
        console.log(`🎯 Found ${matchingEvents.length} matching events, processing ${filteredEvents.length} most recent`)
        
        if (filteredEvents.length > 0) {
          console.log('📋 Date range of selected events:')
          console.log(`  Most recent: ${filteredEvents[0].start_time}`)
          console.log(`  Oldest: ${filteredEvents[filteredEvents.length - 1].start_time}`)
        }

        if (filteredEvents.length > 0) {
          console.log('📋 Sample filtered events:')
          filteredEvents.slice(0, 3).forEach(event => {
            console.log(`  - ${event.name} (${event.status}) - ${event.start_time}`)
          })
        }

        // First, get all existing events in a single query for efficiency
        const existingEventIds = filteredEvents.length > 0 ? await supabaseClient
          .from('calendly_events')
          .select('calendly_event_id, status')
          .eq('project_id', integration.project_id)
          .in('calendly_event_id', filteredEvents.map(e => e.uri))
          .then(({ data }) => new Map(data?.map(e => [e.calendly_event_id, e.status]) || [])) 
          : new Map()

        console.log(`📋 Found ${existingEventIds.size} existing events in database`)

        // Process events in even smaller batches to avoid timeouts and database limits
        const batchSize = 5  // Reduced batch size for better reliability
        for (let i = 0; i < filteredEvents.length; i += batchSize) {
          const batch = filteredEvents.slice(i, i + batchSize)
          console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filteredEvents.length/batchSize)} (${batch.length} events)`)
          
          const eventsToUpsert = []
          
          for (const event of batch) {
            try {
              const eventTypeUri = event.event_type?.uri || 
                                  event.event_type_uri || 
                                  event.event_type_id ||
                                  event.event_type

              const existingStatus = existingEventIds.get(event.uri)
              const isNewEvent = !existingStatus
              
              // Find the event type name from our mappings
              const mapping = mappings.find(m => m.calendly_event_type_id === eventTypeUri)
              const eventTypeName = mapping?.event_type_name || event.event_type?.name || event.name || 'Unknown Event Type'

              // Only fetch invitee info for new events to reduce API calls
              let inviteeName = null
              let inviteeEmail = null

              if (isNewEvent) {
                try {
                  const inviteesResponse = await fetch(`${event.uri}/invitees`, {
                    headers: {
                      'Authorization': `Bearer ${tokenData.access_token}`,
                      'Content-Type': 'application/json'
                    }
                  })

                  if (inviteesResponse.ok) {
                    const inviteesData = await inviteesResponse.json()
                    if (inviteesData.collection && inviteesData.collection.length > 0) {
                      const invitee = inviteesData.collection[0]
                      inviteeName = invitee.name
                      inviteeEmail = invitee.email
                    }
                  }
                } catch (inviteeError) {
                  console.log('⚠️ Could not fetch invitee info for:', event.uri)
                }
              }

              // Debug logging for events missing created_at
              if (!event.created_at) {
                console.log('⚠️ Event missing created_at:', {
                  uri: event.uri,
                  status: event.status,
                  start_time: event.start_time,
                  updated_at: event.updated_at,
                  availableFields: Object.keys(event)
                })
              }

              const eventData = {
                project_id: integration.project_id,
                calendly_event_id: event.uri,
                calendly_event_type_id: eventTypeUri,
                event_type_name: eventTypeName,
                scheduled_at: event.start_time,
                invitee_name: inviteeName,
                invitee_email: inviteeEmail,
                status: event.status || 'scheduled',
                created_at: event.created_at || new Date().toISOString(),
                updated_at: event.updated_at || event.created_at || new Date().toISOString()
              }

              eventsToUpsert.push(eventData)

              if (isNewEvent) {
                console.log('➕ New event to insert:', event.uri, 'Status:', event.status)
              } else if (existingStatus !== event.status) {
                console.log('🔄 Event status changed:', event.uri, `${existingStatus} → ${event.status}`)
              }

            } catch (eventError) {
              console.error('❌ Error processing event:', event.uri, eventError)
            }
          }

          // Batch upsert all events in this batch
          if (eventsToUpsert.length > 0) {
            const { error: batchUpsertError } = await supabaseClient
              .from('calendly_events')
              .upsert(eventsToUpsert, {
                onConflict: 'project_id,calendly_event_id'
              })

            if (batchUpsertError) {
              console.error('❌ Error batch upserting events:', batchUpsertError)
            } else {
              totalEvents += eventsToUpsert.length
              console.log(`✅ Successfully processed batch of ${eventsToUpsert.length} events`)
            }
          }

          // Add progress logging and small delay between batches
          if (i + batchSize < filteredEvents.length) {
            console.log(`⚡ Progress: ${Math.min(i + batchSize, filteredEvents.length)}/${filteredEvents.length} events processed`)
            await new Promise(resolve => setTimeout(resolve, 200))  // Slightly longer delay
          }
        }

        // Update the last sync timestamp for this integration
        const { error: updateError } = await supabaseClient
          .from('project_integrations')
          .update({ last_sync: new Date().toISOString() })
          .eq('project_id', integration.project_id)
          .eq('platform', 'calendly')

        if (updateError) {
          console.error('❌ Error updating last sync:', updateError)
        }
    }

    console.log('\n🎉 === FINAL SYNC RESULTS ===')
    console.log('🎯 Gaps found:', totalGaps)
    console.log('📊 Events synced:', totalEvents)
    console.log('🏢 Projects processed:', totalProjects)
    console.log('⏰ Completed at:', new Date().toISOString())

    return new Response(JSON.stringify({
      success: true,
      gaps: totalGaps,
      events: totalEvents,
      projects: totalProjects,
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
