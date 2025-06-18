
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { triggerReason, eventTypeUri, projectId: specificProjectId, debugMode = true } = await req.json();
    
    console.log('🔍 ENHANCED GAP DETECTION - Starting comprehensive sync:', { 
      triggerReason, 
      eventTypeUri, 
      specificProjectId,
      timestamp: new Date().toISOString()
    });

    // Get all active project integrations for Calendly
    const { data: integrations, error: integrationsError } = await supabase
      .from('project_integrations')
      .select('project_id')
      .eq('platform', 'calendly')
      .eq('is_connected', true);

    if (integrationsError) {
      console.error('❌ Integration fetch error:', integrationsError);
      throw integrationsError;
    }

    console.log('📊 Found integrations:', integrations?.length || 0);

    let totalSynced = 0;
    let totalGapsFound = 0;
    let debugInfo = [];

    // If a specific project was provided, filter to just that one
    const projectsToSync = specificProjectId 
      ? integrations?.filter(i => i.project_id === specificProjectId) || []
      : integrations || [];

    console.log(`🎯 Processing ${projectsToSync.length} projects for sync`);

    // Process each connected project
    for (const integration of projectsToSync) {
      const projectId = integration.project_id;
      console.log(`\n🔄 === PROCESSING PROJECT: ${projectId} ===`);
      
      // Get Calendly access token for this project
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'get_access_token', 
          projectId 
        }
      });

      if (tokenError || !tokenData?.access_token) {
        console.error('❌ No access token for project:', projectId, tokenError);
        debugInfo.push({
          projectId,
          error: 'No access token available',
          details: tokenError
        });
        continue;
      }

      console.log('✅ Access token retrieved for project:', projectId);
      console.log('👤 User URI:', tokenData.user_uri);

      // Get active event type mappings for this project
      const { data: mappings, error: mappingsError } = await supabase
        .from('calendly_event_mappings')
        .select('calendly_event_type_id, event_type_name')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (mappingsError) {
        console.error('❌ Mappings fetch error:', mappingsError);
        continue;
      }

      if (!mappings?.length) {
        console.log('⚠️ No active event type mappings for project:', projectId);
        debugInfo.push({
          projectId,
          warning: 'No active event type mappings found'
        });
        continue;
      }

      console.log('📋 Active event type mappings:', mappings.length);
      mappings.forEach(mapping => {
        console.log(`  - ${mapping.event_type_name}: ${mapping.calendly_event_type_id}`);
      });

      // Extended sync window - look back 48 hours to catch recent events
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      // For debugging, let's also try the last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const syncFromDate = debugMode ? sevenDaysAgo : fortyEightHoursAgo;

      console.log('📅 Sync date range:');
      console.log(`  From: ${syncFromDate.toISOString()}`);
      console.log(`  To: ${now.toISOString()}`);
      console.log(`  Hours back: ${Math.round((now.getTime() - syncFromDate.getTime()) / (1000 * 60 * 60))}`);

      // Fetch events from Calendly API with extended time range
      const calendlyUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(tokenData.user_uri)}&min_start_time=${syncFromDate.toISOString()}&max_start_time=${now.toISOString()}&count=100&sort=start_time:desc`;
      console.log('🌐 Calendly API URL:', calendlyUrl);

      const calendlyResponse = await fetch(calendlyUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!calendlyResponse.ok) {
        const errorText = await calendlyResponse.text();
        console.error('❌ Calendly API error:', calendlyResponse.status, errorText);
        debugInfo.push({
          projectId,
          error: 'Calendly API error',
          status: calendlyResponse.status,
          details: errorText
        });
        continue;
      }

      const calendlyData = await calendlyResponse.json();
      const calendlyEvents = calendlyData.collection || [];

      console.log(`📊 Calendly API Response Summary:`);
      console.log(`  Total events found: ${calendlyEvents.length}`);
      console.log(`  Pagination info:`, calendlyData.pagination || 'No pagination');

      // Log details of each event found
      if (calendlyEvents.length > 0) {
        console.log('\n📝 All events from Calendly API:');
        calendlyEvents.forEach((event, index) => {
          const startTime = new Date(event.start_time);
          const createdTime = new Date(event.created_at);
          console.log(`  ${index + 1}. Event: ${event.uri}`);
          console.log(`     Type: ${event.event_type}`);
          console.log(`     Start: ${startTime.toISOString()} (${startTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST)`);
          console.log(`     Created: ${createdTime.toISOString()} (${createdTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST)`);
          console.log(`     Status: ${event.status}`);
        });
      }

      // Filter events that match our tracked event types
      const trackedEventTypeIds = mappings.map(m => m.calendly_event_type_id);
      console.log('\n🎯 Tracked event type IDs:', trackedEventTypeIds);

      const relevantEvents = calendlyEvents.filter(event => {
        const isTracked = trackedEventTypeIds.includes(event.event_type);
        if (!isTracked) {
          console.log(`⏭️ Skipping untracked event type: ${event.event_type}`);
        }
        return isTracked;
      });

      console.log(`✅ ${relevantEvents.length} events match tracked event types`);

      // Get existing events from our database for comparison
      const { data: existingEvents, error: existingError } = await supabase
        .from('calendly_events')
        .select('calendly_event_id, created_at, scheduled_at')
        .eq('project_id', projectId)
        .gte('created_at', syncFromDate.toISOString());

      if (existingError) {
        console.error('❌ Error fetching existing events:', existingError);
        continue;
      }

      console.log(`\n📄 Database events in date range: ${existingEvents?.length || 0}`);
      if (existingEvents?.length > 0) {
        existingEvents.forEach((event, index) => {
          const createdTime = new Date(event.created_at);
          console.log(`  ${index + 1}. DB Event: ${event.calendly_event_id}`);
          console.log(`     Created: ${createdTime.toISOString()} (${createdTime.toLocaleString('en-US', { timeZone: 'America/Denver' })} MST)`);
        });
      }

      const existingEventIds = new Set(existingEvents?.map(e => e.calendly_event_id) || []);

      // Find gaps (events in Calendly but not in our database)
      const missingEvents = relevantEvents.filter(event => {
        const isMissing = !existingEventIds.has(event.uri);
        if (isMissing) {
          console.log(`🔍 Found missing event: ${event.uri}`);
        }
        return isMissing;
      });

      totalGapsFound += missingEvents.length;

      console.log(`\n🎯 SYNC SUMMARY FOR PROJECT ${projectId}:`);
      console.log(`  Missing events found: ${missingEvents.length}`);
      console.log(`  Events to sync: ${missingEvents.length}`);

      if (missingEvents.length > 0) {
        console.log(`\n🔄 Syncing ${missingEvents.length} missing events...`);

        // Insert missing events using upsert to handle duplicates
        for (const event of missingEvents) {
          const eventTypeMapping = mappings.find(m => m.calendly_event_type_id === event.event_type);
          
          console.log(`\n📝 Processing event: ${event.uri}`);
          
          // Try to extract invitee information from the event
          let inviteeName = null;
          let inviteeEmail = null;
          
          // Fetch event details if we have invitee info
          if (event.event_memberships && event.event_memberships.length > 0) {
            try {
              const detailResponse = await fetch(event.uri, {
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (detailResponse.ok) {
                const eventDetail = await detailResponse.json();
                if (eventDetail.resource?.event_memberships?.[0]) {
                  const membership = eventDetail.resource.event_memberships[0];
                  inviteeName = membership.user?.name;
                  inviteeEmail = membership.user?.email;
                  console.log(`  👤 Invitee: ${inviteeName} (${inviteeEmail})`);
                }
              }
            } catch (error) {
              console.warn('⚠️ Could not fetch event details:', error);
            }
          }
          
          const eventData = {
            project_id: projectId,
            calendly_event_id: event.uri,
            calendly_event_type_id: event.event_type,
            event_type_name: eventTypeMapping?.event_type_name || 'Unknown',
            scheduled_at: event.start_time,
            status: event.status || 'active',
            invitee_name: inviteeName,
            invitee_email: inviteeEmail,
            created_at: event.created_at,
            updated_at: new Date().toISOString()
          };

          console.log(`  💾 Inserting event data:`, {
            calendly_event_id: eventData.calendly_event_id,
            event_type_name: eventData.event_type_name,
            scheduled_at: eventData.scheduled_at,
            created_at: eventData.created_at,
            status: eventData.status
          });

          // Use upsert to handle potential duplicates
          const { error: insertError } = await supabase
            .from('calendly_events')
            .upsert(eventData, {
              onConflict: 'calendly_event_id',
              ignoreDuplicates: false
            });

          if (insertError) {
            console.error('❌ Error inserting missing event:', insertError);
            debugInfo.push({
              projectId,
              eventId: event.uri,
              error: 'Insert failed',
              details: insertError
            });
          } else {
            totalSynced++;
            console.log('✅ Successfully synced event:', event.uri);
          }
        }
      } else {
        console.log('✅ No missing events found - database is up to date');
      }

      // Update last sync timestamp
      await supabase
        .from('project_integrations')
        .update({ last_sync: now.toISOString() })
        .eq('project_id', projectId)
        .eq('platform', 'calendly');

      console.log(`✅ Updated last sync timestamp for project: ${projectId}`);
    }

    const result = {
      success: true,
      gapsFound: totalGapsFound,
      eventsSynced: totalSynced,
      projectsProcessed: projectsToSync.length,
      debugInfo: debugMode ? debugInfo : undefined,
      timestamp: new Date().toISOString()
    };

    console.log(`\n🎉 === FINAL SYNC RESULTS ===`);
    console.log(`🎯 Gaps found: ${totalGapsFound}`);
    console.log(`📊 Events synced: ${totalSynced}`); 
    console.log(`🏢 Projects processed: ${projectsToSync.length}`);
    console.log(`⏰ Completed at: ${result.timestamp}`);

    if (debugInfo.length > 0) {
      console.log(`\n🐛 Debug information collected:`, debugInfo);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Gap sync critical error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
