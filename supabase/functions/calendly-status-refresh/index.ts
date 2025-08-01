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

    const { project_id } = await req.json();

    console.log('🔄 Status refresh started for project:', project_id);

    // Get access token for this project
    const { data: tokenData, error: tokenError } = await supabaseClient.functions.invoke('calendly-oauth', {
      body: { action: 'get_access_token', projectId: project_id, code: 'refresh' }
    });

    if (tokenError || !tokenData?.access_token) {
      console.error('❌ Failed to get access token for status refresh');
      return new Response(
        JSON.stringify({ error: 'Access token unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get events that need status refresh (past active events)
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const { data: eventsToRefresh, error: eventsError } = await supabaseClient
      .from('calendly_events')
      .select('id, calendly_event_id, scheduled_at, status')
      .eq('project_id', project_id)
      .eq('status', 'active')
      .lt('scheduled_at', now.toISOString())
      .gte('scheduled_at', threeDaysAgo.toISOString());

    if (!eventsToRefresh?.length) {
      console.log('📊 No events requiring status refresh');
      return new Response(
        JSON.stringify({ message: 'No events need status refresh', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Refreshing status for ${eventsToRefresh.length} events`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process events in smaller batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < eventsToRefresh.length; i += batchSize) {
      const batch = eventsToRefresh.slice(i, i + batchSize);
      
      for (const event of batch) {
        try {
          // Extract event ID from the full URI
          const eventId = event.calendly_event_id.split('/').pop();
          
          // Fetch current status from Calendly
          const calendlyResponse = await fetch(`https://api.calendly.com/scheduled_events/${eventId}`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          if (calendlyResponse.ok) {
            const calendlyData = await calendlyResponse.json();
            const currentStatus = calendlyData.resource.status;
            
            // Normalize status
            let normalizedStatus = currentStatus;
            if (normalizedStatus === 'canceled') {
              normalizedStatus = 'cancelled';
            }

            // Update if status has changed
            if (normalizedStatus !== event.status) {
              console.log(`📊 Updating event ${event.calendly_event_id}: ${event.status} → ${normalizedStatus}`);
              
              const updateData: any = { 
                status: normalizedStatus,
                updated_at: new Date().toISOString()
              };
              
              // Set cancelled_at timestamp when event becomes cancelled
              if (normalizedStatus === 'cancelled' && event.status !== 'cancelled') {
                updateData.cancelled_at = new Date().toISOString();
              }
              
              const { error: updateError } = await supabaseClient
                .from('calendly_events')
                .update(updateData)
                .eq('id', event.id);

              if (updateError) {
                console.error('❌ Failed to update event status:', updateError);
                errorCount++;
              } else {
                updatedCount++;
              }
            }
          } else if (calendlyResponse.status === 404) {
            console.log(`⚠️ Event not found in Calendly, marking as cancelled: ${event.calendly_event_id}`);
            
            // Event was deleted from Calendly, mark as cancelled
            const updateData: any = { 
              status: 'cancelled',
              updated_at: new Date().toISOString()
            };
            
            // Set cancelled_at if not already set
            if (event.status !== 'cancelled') {
              updateData.cancelled_at = new Date().toISOString();
            }
            
            const { error: updateError } = await supabaseClient
              .from('calendly_events')
              .update(updateData)
              .eq('id', event.id);

            if (!updateError) {
              updatedCount++;
            }
          } else {
            console.error(`❌ Calendly API error for event ${event.calendly_event_id}:`, calendlyResponse.status);
            errorCount++;
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Error refreshing status for event ${event.calendly_event_id}:`, error);
          errorCount++;
        }
      }

      // Delay between batches
      if (i + batchSize < eventsToRefresh.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Status refresh completed: ${updatedCount} updated, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Status refresh completed',
        stats: {
          events_checked: eventsToRefresh.length,
          events_updated: updatedCount,
          errors: errorCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Status refresh error:', error);
    return new Response(
      JSON.stringify({ error: 'Status refresh failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})