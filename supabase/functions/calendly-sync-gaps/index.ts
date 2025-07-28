

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

    const body = req.method === 'POST' ? await req.json() : {};
    const { triggerReason, eventTypeUri, specificProjectId, startDate, endDate } = body;
    
    console.log('🔍 ENHANCED GAP DETECTION - Starting comprehensive sync:', {
      triggerReason,
      eventTypeUri,
      specificProjectId,
      startDate,
      endDate,
      timestamp: new Date().toISOString()
    });

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

      // Use configurable date range with smart defaults
      const now = new Date()
      
      // Use provided dates or intelligent defaults based on trigger reason
      let syncFrom, syncTo;
      
      if (startDate && endDate) {
        syncFrom = new Date(startDate);
        syncTo = new Date(endDate);
        console.log('📅 Using provided date range');
      } else if (triggerReason === 'incremental_sync') {
        // Incremental sync: smaller, recent window
        syncFrom = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)); // 14 days ago
        syncTo = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now
        console.log('📅 Using incremental sync date range (14 days back, 7 forward)');
      } else {
        // Default/manual sync: comprehensive range
        syncFrom = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
        syncTo = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
        console.log('📅 Using default sync date range (90 days back, 30 forward)');
      }
      console.log('📅 Final sync date range:')
      console.log('  From:', syncFrom.toISOString())
      console.log('  To:', syncTo.toISOString())
      console.log('  Days covered:', Math.ceil((syncTo.getTime() - syncFrom.getTime()) / (24 * 60 * 60 * 1000)))

      // Use pagination to get all events (Calendly API has a limit of 100 events per request)
      let allEvents = []
      
      // Define enhanced function to fetch events by status with improved chunking
      async function fetchEventsByStatus(eventsList, orgUri, fromDate, toDate, accessToken, status) {
        let nextPageToken = null
        let pageCount = 0
        const maxPages = 100 // Reasonable limit for 10,000 events
        let consecutiveErrors = 0
        const maxConsecutiveErrors = 3
        
        console.log(`🔄 Fetching ${status.toUpperCase()} events from Calendly with enhanced chunking`)
        
        do {
          pageCount++
          let calendlyUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&min_start_time=${fromDate.toISOString()}&max_start_time=${toDate.toISOString()}&count=100&status=${status}`
          
          if (nextPageToken) {
            calendlyUrl += `&page_token=${nextPageToken}`
          }
          
          console.log(`🌐 ${status} Events - Page ${pageCount}:`, calendlyUrl)

          try {
            // Enhanced rate limiting with exponential backoff
            const baseDelay = pageCount === 1 ? 0 : 300;
            const retryMultiplier = Math.min(consecutiveErrors, 3);
            const delay = baseDelay + (retryMultiplier * 500);
            
            if (delay > 0) {
              console.log(`⏳ Rate limiting: waiting ${delay}ms (errors: ${consecutiveErrors})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            const eventsResponse = await fetch(calendlyUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })

            if (!eventsResponse.ok) {
              const errorText = await eventsResponse.text()
              
              // Enhanced rate limit handling with Retry-After header support
              if (eventsResponse.status === 429) {
                const retryAfter = eventsResponse.headers.get('Retry-After')
                const retryAfterMs = eventsResponse.headers.get('Retry-After-Ms')
                
                let waitTime = 60000; // Default 60 seconds
                
                if (retryAfterMs) {
                  waitTime = parseInt(retryAfterMs);
                } else if (retryAfter) {
                  waitTime = parseInt(retryAfter) * 1000;
                }
                
                console.log(`⏰ Rate limited for ${status} events. Waiting ${waitTime/1000} seconds`);
                
                // Add exponential backoff for rate limiting
                await new Promise(resolve => setTimeout(resolve, waitTime));
                consecutiveErrors++;
                
                if (consecutiveErrors >= maxConsecutiveErrors) {
                  console.error(`❌ Too many consecutive rate limit errors for ${status}, skipping remaining pages`);
                  break;
                }
                
                pageCount--; // Retry the same page
                continue;
              }
              
              console.error(`❌ Calendly API error (${status}): ${eventsResponse.status} ${errorText}`);
              consecutiveErrors++;
              
              // Add delay even for non-rate-limit errors to be more conservative
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error(`❌ Too many consecutive errors for ${status}, stopping pagination`);
                break;
              }
              
              continue; // Try next page on non-rate-limit errors
            }

            // Reset error counter on successful request
            consecutiveErrors = 0;

            const eventsData = await eventsResponse.json()
            const events = eventsData.collection || []
            
            console.log(`📊 ${status} events from page ${pageCount}:`, events.length)
            
            // Enhanced deduplication check before adding
            const newEvents = events.filter(event => 
              !eventsList.some(existing => existing.uri === event.uri)
            );
            
            console.log(`📊 New ${status} events after deduplication:`, newEvents.length);
            
            // Add events to our collection
            eventsList.push(...newEvents)
            
            // Check if there's a next page
            nextPageToken = eventsData.pagination?.next_page_token
            console.log(`🔄 ${status} next page token:`, nextPageToken ? 'present' : 'none')
            
            // Smart chunking: reduce delay if getting fewer events (approaching end)
            if (nextPageToken && events.length < 50) {
              console.log(`⚡ Approaching end of ${status} data, reducing delays`);
              await new Promise(resolve => setTimeout(resolve, 100));
            } else if (nextPageToken) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
          } catch (fetchError) {
            console.error(`❌ Error fetching ${status} events from Calendly:`, fetchError)
            consecutiveErrors++;
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              console.error(`❌ Too many consecutive fetch errors for ${status}, stopping`);
              break;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } while (nextPageToken && pageCount < maxPages && consecutiveErrors < maxConsecutiveErrors)
        
        console.log(`📋 ${status} events fetching completed: ${eventsList.length} total events, ${pageCount} pages processed`)
        return eventsList;
      }
      // Comprehensive status collection with all Calendly event states
      const eventStatuses = ['active', 'canceled', 'cancelled']; // Note: Calendly uses both spellings
      
      // Always include 'completed' status for comprehensive sync
      eventStatuses.push('completed');

      console.log('🔄 Fetching events for statuses:', eventStatuses);

      // Fetch events for each status to ensure comprehensive coverage
      for (const status of eventStatuses) {
        try {
          console.log(`🔄 Processing status: ${status}`);
          // Add delay between different status fetches to respect rate limits
          if (status !== eventStatuses[0]) {
            console.log('⏱️ Adding 2 second delay between status fetches...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          console.log(`\n=== FETCHING ${status.toUpperCase()} EVENTS ===`);
          await fetchEventsByStatus(allEvents, organizationUri, syncFrom, syncTo, tokenData.access_token, status);
          
          // Log progress and add delay between different status fetches
          console.log(`📊 Total events collected so far: ${allEvents.length}`);
          
          // Longer delay between status types to be extra respectful
          if (eventStatuses.indexOf(status) < eventStatuses.length - 1) {
            console.log('⏸️ Waiting 2 seconds before next status type...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (statusError) {
          console.error(`❌ Error fetching ${status} events:`, statusError);
          // Continue with other statuses even if one fails
        }
      }
      
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

      // Enhanced deduplication with comprehensive tracking
      const uniqueEvents = [];
      const seenEventIds = new Set();
      const duplicateCount = allEvents.length;
      
      for (const event of allEvents) {
        if (!seenEventIds.has(event.uri)) {
          seenEventIds.add(event.uri);
          uniqueEvents.push(event);
        }
      }
      
      console.log(`🔄 Deduplication complete: ${duplicateCount} total → ${uniqueEvents.length} unique (${duplicateCount - uniqueEvents.length} duplicates removed)`);
      allEvents = uniqueEvents;

      console.log('📊 Starting database upsert process...')
      
      // Process events in smaller batches for better performance and error handling
      const batchSize = 50;
      let processedCount = 0;
      let createdCount = 0;
      let updatedCount = 0;
      
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allEvents.length/batchSize)} (${batch.length} events)`);
        
        for (const event of batch) {
          try {
            totalEvents++
            
            // Enhanced status normalization with comprehensive mapping
            let normalizedStatus = event.status;
            const statusMapping = {
              'canceled': 'cancelled',
              'cancelled': 'cancelled', 
              'active': 'active',
              'completed': 'completed',
              'no_show': 'cancelled' // Map no-show to cancelled for consistency
            };
            
            normalizedStatus = statusMapping[normalizedStatus] || normalizedStatus;
            
            const eventData = {
              project_id: integration.project_id,
              calendly_event_id: event.uri,
              calendly_event_type_id: event.event_type,
              event_type_name: 'Unknown', // Will be updated based on mapping
              scheduled_at: event.start_time,
              status: normalizedStatus,
              invitee_name: null,
              invitee_email: null,
              updated_at: new Date().toISOString()
            }

            // Find the corresponding event type name from our mappings
            const mapping = mappings.find(m => m.calendly_event_type_id === event.event_type)
            if (mapping) {
              eventData.event_type_name = mapping.event_type_name
            } else {
              console.log(`⚠️ No mapping found for event type: ${event.event_type}`)
            }

            // Enhanced duplicate detection: check if event already exists
            const { data: existingEvent, error: existingError } = await supabaseClient
              .from('calendly_events')
              .select('id, status, updated_at')
              .eq('calendly_event_id', event.uri)
              .eq('project_id', integration.project_id)
              .maybeSingle()

            if (existingError) {
              console.error('❌ Error checking existing event:', existingError)
              continue
            }

            if (existingEvent) {
              // Enhanced update logic: only update if status has changed or data is newer
              const needsUpdate = existingEvent.status !== normalizedStatus ||
                                 new Date(event.updated_at || event.created_at) > new Date(existingEvent.updated_at);
              
              if (needsUpdate) {
                console.log(`🔄 Updating existing event: ${event.uri} (${existingEvent.status} → ${normalizedStatus})`);
                
                const { error: updateError } = await supabaseClient
                  .from('calendly_events')
                  .update(eventData)
                  .eq('id', existingEvent.id)

                if (updateError) {
                  console.error('❌ Error updating event:', updateError)
                } else {
                  updatedCount++;
                  processedCount++;
                }
              } else {
                console.log(`⏭️ Skipping update for unchanged event: ${event.uri}`);
                processedCount++;
              }
            } else {
              // Create new event
              console.log(`➕ Creating new event: ${event.uri} (${normalizedStatus})`);
              
              const { error: insertError } = await supabaseClient
                .from('calendly_events')
                .insert({
                  ...eventData,
                  created_at: event.created_at || new Date().toISOString()
                })

              if (insertError) {
                // Handle potential duplicate key conflicts gracefully
                if (insertError.message?.includes('duplicate key') || insertError.message?.includes('calendly_event_id')) {
                  console.log(`⚠️ Duplicate event insert attempted (race condition): ${event.uri}`)
                } else {
                  console.error('❌ Error inserting event:', insertError)
                }
              } else {
                createdCount++;
                processedCount++;
              }
            }
          } catch (eventError) {
            console.error('❌ Error processing individual event:', eventError)
          }
        }
        
        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < allEvents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`📊 Project ${integration.project_id} processing complete:`)
      console.log(`  - Total events found: ${allEvents.length}`)
      console.log(`  - Events processed: ${processedCount}`)
      console.log(`  - New events created: ${createdCount}`)
      console.log(`  - Existing events updated: ${updatedCount}`)
      
      // Update project integration stats
      await supabaseClient
        .from('project_integrations')
        .update({ 
          last_sync: new Date().toISOString(),
          total_events_synced: (await supabaseClient
            .from('calendly_events')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', integration.project_id)
          ).count || 0
        })
        .eq('project_id', integration.project_id)
        .eq('platform', 'calendly');

      // Log sync completion to tracking table
      await supabaseClient.rpc('log_calendly_sync', {
        p_project_id: integration.project_id,
        p_sync_type: triggerReason || 'manual',
        p_sync_status: 'completed',
        p_events_processed: processedCount,
        p_events_created: createdCount,
        p_events_updated: updatedCount,
        p_sync_range_start: syncFrom.toISOString(),
        p_sync_range_end: syncTo.toISOString()
      });
      
      // Note: totalCreated and totalUpdated would be accumulated here if tracking across projects
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

