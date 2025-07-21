
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
    
    console.log('🔍 COMPREHENSIVE SYNC - Starting enhanced sync with debugging:', {
      triggerReason,
      eventTypeUri,
      specificProjectId,
      userTimezone: userTimezone || 'UTC',
      timestamp: new Date().toISOString()
    })

    let totalGaps = 0
    let totalEvents = 0
    let totalProjects = 0
    let syncStats = {
      activeEventsFetched: 0,
      completedEventsFetched: 0,
      canceledEventsFetched: 0,
      totalApiCalls: 0,
      totalPagesProcessed: 0,
      eventsProcessed: 0,
      eventsInserted: 0,
      eventsUpdated: 0
    }

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
        projects: 0,
        syncStats
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

      // Get user info and organization
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

      // Auto-create mappings for all event types
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
      console.log(`📋 Found ${eventTypesData.collection.length} event types in Calendly:`)
      eventTypesData.collection.forEach((et: any) => {
        console.log(`  - ${et.name} (${et.uri})`)
      })
      
      // Auto-create mappings for any missing event types
      let propertyAdvantageCallTypes = []
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
            
            // Track Property Advantage Call variations
            if (eventType.name.toLowerCase().includes('property advantage call')) {
              propertyAdvantageCallTypes.push(eventType)
            }
          }
        }
      }

      console.log(`🎯 Found ${propertyAdvantageCallTypes.length} "Property Advantage Call" event types:`)
      propertyAdvantageCallTypes.forEach((et: any) => {
        console.log(`  - ${et.name} (${et.uri})`)
      })

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

      // ENHANCED: Use much broader date range to capture all events
      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
      const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000))
      
      // Convert timezone-aware dates to UTC for Calendly API
      const userTimezoneDayStart = new Date(ninetyDaysAgo.toLocaleDateString('en-CA', { timeZone: effectiveTimezone }) + 'T00:00:00')
      const userTimezoneDayEnd = new Date(oneYearFromNow.toLocaleDateString('en-CA', { timeZone: effectiveTimezone }) + 'T23:59:59')
      
      const tzOffset = userTimezoneDayStart.getTimezoneOffset() * 60 * 1000
      const syncFrom = new Date(userTimezoneDayStart.getTime() + tzOffset)
      const syncTo = new Date(userTimezoneDayEnd.getTime() + tzOffset)

      console.log('📅 COMPREHENSIVE SYNC - Enhanced date range:')
      console.log('  User timezone:', effectiveTimezone)
      console.log('  From (UTC):', syncFrom.toISOString())
      console.log('  To (UTC):', syncTo.toISOString())
      console.log('  From (User TZ):', syncFrom.toLocaleString('en-US', { timeZone: effectiveTimezone }))
      console.log('  To (User TZ):', syncTo.toLocaleString('en-US', { timeZone: effectiveTimezone }))

      // Enhanced pagination function with comprehensive logging
      let allEvents = []
      
      async function fetchEventsByStatusEnhanced(eventsList: any[], orgUri: string, fromDate: Date, toDate: Date, accessToken: string, status: string) {
        let nextPageToken = null
        let pageCount = 0
        const maxPages = 200 // Increased from 100
        let eventsInThisStatus = 0
        
        console.log(`\n🔄 === FETCHING ${status.toUpperCase()} EVENTS ===`)
        
        do {
          pageCount++
          syncStats.totalApiCalls++
          let calendlyUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&min_start_time=${fromDate.toISOString()}&max_start_time=${toDate.toISOString()}&count=100&status=${status}`
          
          if (nextPageToken) {
            calendlyUrl += `&page_token=${nextPageToken}`
          }
          
          console.log(`🌐 ${status} Events - API Call ${syncStats.totalApiCalls}, Page ${pageCount}:`)
          console.log(`  URL: ${calendlyUrl}`)

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
                await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
                continue // Retry the same page
              }
              
              console.error(`❌ Calendly API error (${status}): ${eventsResponse.status} ${errorText}`)
              break
            }

            const eventsData = await eventsResponse.json()
            const events = eventsData.collection || []
            
            console.log(`📊 ${status} events from page ${pageCount}: ${events.length}`)
            
            // Log sample events for debugging
            if (events.length > 0) {
              console.log(`📋 Sample ${status} events on page ${pageCount}:`)
              events.slice(0, 3).forEach((event: any, index: number) => {
                console.log(`  ${index + 1}. ${event.name || 'unnamed'} - Created: ${event.created_at} - Scheduled: ${event.start_time}`)
              })
            }
            
            eventsList.push(...events)
            eventsInThisStatus += events.length
            syncStats.totalPagesProcessed++
            
            nextPageToken = eventsData.pagination?.next_page_token
            console.log(`🔄 ${status} next page token:`, nextPageToken ? 'Present' : 'None')
            
            if (nextPageToken) {
              // Add delay between requests to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          } catch (fetchError) {
            console.error(`❌ Error fetching ${status} events from Calendly:`, fetchError)
            break
          }
          
        } while (nextPageToken && pageCount < maxPages)
        
        console.log(`🏁 ${status.toUpperCase()} FETCH COMPLETE:`)
        console.log(`  Pages processed: ${pageCount}`)
        console.log(`  Events fetched: ${eventsInThisStatus}`)
        
        // Update stats
        if (status === 'active') syncStats.activeEventsFetched = eventsInThisStatus
        if (status === 'completed') syncStats.completedEventsFetched = eventsInThisStatus
        if (status === 'canceled') syncStats.canceledEventsFetched = eventsInThisStatus
        
        return eventsInThisStatus
      }
      
      // Fetch all event statuses with enhanced logging
      console.log('\n🚀 Starting comprehensive event fetch...')
      await fetchEventsByStatusEnhanced(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'active')
      await fetchEventsByStatusEnhanced(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'completed')
      await fetchEventsByStatusEnhanced(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, 'canceled')
      
      console.log(`\n📊 === FETCH SUMMARY ===`)
      console.log(`Total events collected: ${allEvents.length}`)
      console.log(`Active events: ${syncStats.activeEventsFetched}`)
      console.log(`Completed events: ${syncStats.completedEventsFetched}`)
      console.log(`Canceled events: ${syncStats.canceledEventsFetched}`)
      console.log(`Total API calls made: ${syncStats.totalApiCalls}`)
      console.log(`Total pages processed: ${syncStats.totalPagesProcessed}`)

      // Analyze events by creation date for recent days
      const recentDays = ['2025-07-16', '2025-07-17', '2025-07-18', '2025-07-19', '2025-07-20', '2025-07-21']
      console.log('\n📅 === CREATION DATE ANALYSIS ===')
      
      for (const date of recentDays) {
        const eventsCreatedOnDate = allEvents.filter(event => {
          if (!event.created_at) return false
          const createdDate = new Date(event.created_at)
          const dateInUserTz = createdDate.toLocaleDateString('en-CA', { timeZone: effectiveTimezone })
          return dateInUserTz === date
        })
        
        const propertyAdvantageCreatedOnDate = eventsCreatedOnDate.filter(event => 
          event.name && event.name.toLowerCase().includes('property advantage call')
        )
        
        console.log(`${date} (AEST): ${eventsCreatedOnDate.length} total events created, ${propertyAdvantageCreatedOnDate.length} Property Advantage Call events`)
        
        if (propertyAdvantageCreatedOnDate.length > 0) {
          const statusBreakdown = propertyAdvantageCreatedOnDate.reduce((acc: any, event: any) => {
            acc[event.status] = (acc[event.status] || 0) + 1
            return acc
          }, {})
          console.log(`  Status breakdown:`, statusBreakdown)
        }
      }

      // Create set of active event type IDs for filtering
      const activeEventTypeIds = new Set(mappings.map(m => m.calendly_event_type_id))
      console.log('\n🎯 Active event type IDs for filtering:', Array.from(activeEventTypeIds))

      // Filter events based on event type
      const filteredEvents = allEvents.filter(event => {
        const eventTypeUri = event.event_type
        const isMatched = activeEventTypeIds.has(eventTypeUri)
        
        if (!isMatched) {
          // Only log first few mismatches to avoid spam
          if (Math.random() < 0.1) { // Log 10% of mismatches
            console.log(`🔍 Skipping event: ${event.name || 'unnamed'} - type: ${eventTypeUri}`)
          }
        }
        
        return isMatched
      })
      
      console.log(`\n🎯 === FILTERING RESULTS ===`)
      console.log(`Events matching active mappings: ${filteredEvents.length}`)
      console.log(`Events filtered out: ${allEvents.length - filteredEvents.length}`)

      // Process each filtered event with enhanced tracking
      let newEventsCount = 0
      let updatedEventsCount = 0
      
      for (const event of filteredEvents) {
        try {
          syncStats.eventsProcessed++
          
          // Check if event already exists
          const { data: existingEvent, error: checkError } = await supabaseClient
            .from('calendly_events')
            .select('id, status, updated_at')
            .eq('calendly_event_id', event.uri)
            .eq('project_id', integration.project_id)
            .maybeSingle()

          if (checkError) {
            console.error('❌ Error checking existing event:', checkError)
            continue
          }

          let isNewEvent = !existingEvent
          let statusChanged = existingEvent && existingEvent.status !== event.status
          
          if (existingEvent) {
            if (statusChanged) {
              console.log(`🔄 Event status changed: ${event.uri} ${existingEvent.status} → ${event.status}`)
            }
          } else {
            console.log(`➕ New event to insert: ${event.uri} Status: ${event.status}`)
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

          // Get the event type URI and name
          const eventTypeUri = event.event_type
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
          if (isNewEvent) {
            newEventsCount++
            syncStats.eventsInserted++
          } else {
            updatedEventsCount++
            syncStats.eventsUpdated++
          }
          
          const actionText = isNewEvent ? 'Inserted new' : 'Updated existing'
          
          // Only log every 10th event to avoid spam, but log all Property Advantage Call events
          if (eventTypeName.toLowerCase().includes('property advantage call') || syncStats.eventsProcessed % 10 === 0) {
            console.log(`✅ ${actionText} event:`, {
              id: event.uri,
              name: eventTypeName,
              status: event.status,
              scheduled_at: event.start_time,
              created_at: createdAt,
              created_in_user_tz: new Date(createdAt).toLocaleString('en-US', { timeZone: effectiveTimezone })
            })
          }

        } catch (eventError) {
          console.error('❌ Error processing individual event:', eventError)
          continue
        }
      }

      console.log(`\n📊 === PROJECT PROCESSING COMPLETE ===`)
      console.log(`New events inserted: ${newEventsCount}`)
      console.log(`Existing events updated: ${updatedEventsCount}`)
      console.log(`Total events processed: ${syncStats.eventsProcessed}`)

      // Update the last sync timestamp
      const { error: updateError } = await supabaseClient
        .from('project_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('project_id', integration.project_id)
        .eq('platform', 'calendly')

      if (updateError) {
        console.error('❌ Error updating last sync:', updateError)
      }

      // Final verification: Check database counts for recent dates
      console.log('\n🔍 === DATABASE VERIFICATION ===')
      for (const date of recentDays.slice(-3)) { // Check last 3 days
        const { count: dbCount } = await supabaseClient
          .from('calendly_events')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', integration.project_id)
          .eq('event_type_name', 'Property Advantage Call')
          .gte('created_at', `${date}T00:00:00.000Z`)
          .lte('created_at', `${date}T23:59:59.999Z`)

        console.log(`Database count for ${date}: ${dbCount || 0} Property Advantage Call events`)
      }
    }

    console.log('\n🎉 === COMPREHENSIVE SYNC RESULTS ===')
    console.log('🎯 Gaps found:', totalGaps)
    console.log('📊 Events synced:', totalEvents)
    console.log('🏢 Projects processed:', totalProjects)
    console.log('🌍 Timezone used:', userTimezone || 'UTC')
    console.log('⏰ Completed at:', new Date().toISOString())
    console.log('\n📈 === DETAILED SYNC STATISTICS ===')
    console.log(`Active events fetched: ${syncStats.activeEventsFetched}`)
    console.log(`Completed events fetched: ${syncStats.completedEventsFetched}`)
    console.log(`Canceled events fetched: ${syncStats.canceledEventsFetched}`)
    console.log(`Total API calls made: ${syncStats.totalApiCalls}`)
    console.log(`Total pages processed: ${syncStats.totalPagesProcessed}`)
    console.log(`Events processed: ${syncStats.eventsProcessed}`)
    console.log(`Events inserted: ${syncStats.eventsInserted}`)
    console.log(`Events updated: ${syncStats.eventsUpdated}`)

    return new Response(JSON.stringify({
      success: true,
      gaps: totalGaps,
      events: totalEvents,
      projects: totalProjects,
      timezone: userTimezone || 'UTC',
      timestamp: new Date().toISOString(),
      syncStats
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
