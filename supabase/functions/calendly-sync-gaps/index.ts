
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

    const { triggerReason, eventTypeUri } = await req.json();
    
    console.log('🔄 Starting gap detection sync:', { triggerReason, eventTypeUri });

    // Get all active project integrations for Calendly
    const { data: integrations, error: integrationsError } = await supabase
      .from('project_integrations')
      .select('project_id')
      .eq('platform', 'calendly')
      .eq('is_connected', true);

    if (integrationsError) {
      throw integrationsError;
    }

    let totalSynced = 0;
    let totalGapsFound = 0;

    // Process each connected project
    for (const integration of integrations || []) {
      const projectId = integration.project_id;
      
      // Get Calendly access token for this project
      const { data: tokenData } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'get_access_token', 
          projectId 
        }
      });

      if (!tokenData?.access_token) {
        console.log('No access token found for project:', projectId);
        continue;
      }

      // Get active event type mappings for this project
      const { data: mappings, error: mappingsError } = await supabase
        .from('calendly_event_mappings')
        .select('calendly_event_type_id, event_type_name')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (mappingsError || !mappings?.length) {
        console.log('No active mappings for project:', projectId);
        continue;
      }

      // Get the most recent event to determine sync window
      const { data: latestEvent } = await supabase
        .from('calendly_events')
        .select('created_at, scheduled_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine sync window (last 7 days or since latest event)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const syncFromDate = latestEvent 
        ? new Date(Math.min(new Date(latestEvent.created_at).getTime(), sevenDaysAgo.getTime()))
        : sevenDaysAgo;

      console.log('Syncing events for project:', projectId, 'from:', syncFromDate.toISOString());

      // Fetch events from Calendly API
      const calendlyResponse = await fetch(
        `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(tokenData.user_uri)}&min_start_time=${syncFromDate.toISOString()}&max_start_time=${now.toISOString()}&count=100&sort=start_time:desc`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!calendlyResponse.ok) {
        console.error('Calendly API error:', await calendlyResponse.text());
        continue;
      }

      const calendlyData = await calendlyResponse.json();
      const calendlyEvents = calendlyData.collection || [];

      console.log(`Found ${calendlyEvents.length} events from Calendly API for project ${projectId}`);

      // Filter events that match our tracked event types
      const trackedEventTypeIds = mappings.map(m => m.calendly_event_type_id);
      const relevantEvents = calendlyEvents.filter(event => 
        trackedEventTypeIds.includes(event.event_type)
      );

      console.log(`${relevantEvents.length} events match tracked event types`);

      // Get existing events from our database for comparison
      const { data: existingEvents, error: existingError } = await supabase
        .from('calendly_events')
        .select('calendly_event_id')
        .eq('project_id', projectId)
        .gte('created_at', syncFromDate.toISOString());

      if (existingError) {
        console.error('Error fetching existing events:', existingError);
        continue;
      }

      const existingEventIds = new Set(existingEvents?.map(e => e.calendly_event_id) || []);

      // Find gaps (events in Calendly but not in our database)
      const missingEvents = relevantEvents.filter(event => 
        !existingEventIds.has(event.uri)
      );

      totalGapsFound += missingEvents.length;

      if (missingEvents.length > 0) {
        console.log(`Found ${missingEvents.length} missing events for project ${projectId}`);

        // Insert missing events
        for (const event of missingEvents) {
          const eventTypeMapping = mappings.find(m => m.calendly_event_type_id === event.event_type);
          
          const eventData = {
            project_id: projectId,
            calendly_event_id: event.uri,
            calendly_event_type_id: event.event_type,
            event_type_name: eventTypeMapping?.event_type_name || 'Unknown',
            scheduled_at: event.start_time,
            status: event.status || 'active',
            invitee_name: event.event_memberships?.[0]?.user_name || null,
            invitee_email: event.event_memberships?.[0]?.user_email || null,
            created_at: event.created_at,
            updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('calendly_events')
            .insert(eventData);

          if (insertError) {
            console.error('Error inserting missing event:', insertError);
          } else {
            totalSynced++;
            console.log('✅ Synced missing event:', event.uri);
          }
        }
      }

      // Update last sync timestamp
      await supabase
        .from('project_integrations')
        .update({ last_sync: now.toISOString() })
        .eq('project_id', projectId)
        .eq('platform', 'calendly');
    }

    console.log(`🎯 Gap sync complete: ${totalGapsFound} gaps found, ${totalSynced} events synced`);

    return new Response(JSON.stringify({
      success: true,
      gapsFound: totalGapsFound,
      eventsSynced: totalSynced,
      projectsProcessed: integrations?.length || 0
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Gap sync error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
