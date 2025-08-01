import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalendlyEvent {
  uri: string;
  name: string;
  meeting_notes_plain?: string;
  meeting_notes_html?: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type?: string;
    location?: string;
  };
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
  event_memberships: Array<{
    user: string;
    user_email?: string;
    user_name?: string;
  }>;
  event_guests: Array<{
    email: string;
    display_name?: string;
    created_at: string;
    updated_at: string;
  }>;
  cancellation?: {
    canceled_by: string;
    reason?: string;
    canceler_type: string;
    created_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, startDate, endDate } = await req.json();

    if (!projectId || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: projectId, startDate, endDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project integrations for Calendly
    const { data: integrations, error: integrationsError } = await supabase
      .from('project_integrations')
      .select('platform, is_connected')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .single();

    if (integrationsError || !integrations?.is_connected) {
      return new Response(
        JSON.stringify({ error: 'Calendly integration not found or not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Calendly access token from integration data
    const { data: integrationData, error: dataError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .single();

    if (dataError || !integrationData?.data?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Calendly access token not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = integrationData.data.access_token;

    // Get user URI first
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to get Calendly user:', await userResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Calendly' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const userUri = userData.resource.uri;

    // Fetch scheduled events (including cancelled ones) from Calendly for the date range
    const eventsUrl = new URL('https://api.calendly.com/scheduled_events');
    eventsUrl.searchParams.set('user', userUri);
    eventsUrl.searchParams.set('min_start_time', startDate);
    eventsUrl.searchParams.set('max_start_time', endDate);
    eventsUrl.searchParams.set('status', 'canceled'); // Only get cancelled events
    eventsUrl.searchParams.set('count', '100');

    console.log('Fetching cancelled events from Calendly:', eventsUrl.toString());

    const eventsResponse = await fetch(eventsUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventsResponse.ok) {
      console.error('Failed to fetch Calendly events:', await eventsResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events from Calendly' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventsData = await eventsResponse.json();
    const cancelledEvents = eventsData.collection || [];

    console.log(`Found ${cancelledEvents.length} cancelled events from Calendly`);

    // Group cancelled events by cancellation date
    const eventsByDate: Record<string, CalendlyEvent[]> = {};
    
    for (const event of cancelledEvents) {
      if (event.cancellation?.created_at) {
        // Use the cancellation date, not the scheduled date
        const cancellationDate = new Date(event.cancellation.created_at);
        const dateKey = cancellationDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      }
    }

    // Calculate daily counts
    const dailyCounts: Record<string, number> = {};
    for (const [date, events] of Object.entries(eventsByDate)) {
      dailyCounts[date] = events.length;
    }

    const totalCancelled = cancelledEvents.length;

    console.log('Calendly cancelled events summary:', {
      total: totalCancelled,
      dailyCounts,
      dateRange: { start: startDate, end: endDate }
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalCancelled,
        dailyCounts,
        eventsByDate,
        events: cancelledEvents,
        source: 'calendly_direct'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching Calendly cancelled events:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});