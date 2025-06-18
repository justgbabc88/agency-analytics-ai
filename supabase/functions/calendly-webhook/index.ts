
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
}

interface CalendlyWebhookEvent {
  created_at: string;
  created_by: string;
  event: string;
  payload: {
    event: string;
    event_type: {
      uri: string;
      name: string;
    };
    invitee: {
      uri: string;
      name: string;
      email: string;
      created_at: string;
      updated_at: string;
      cancel_url: string;
      reschedule_url: string;
    };
    event_start_time: string;
    event_end_time: string;
    questions_and_answers: any[];
    routing_form_submission: any;
    new_invitee: any;
    old_invitee: any;
    scheduled_event: {
      uri: string;
      name: string;
      status: string;
      start_time: string;
      end_time: string;
      event_type: string;
      location: any;
      invitees_counter: {
        total: number;
        active: number;
        limit: number;
      };
      created_at: string;
      updated_at: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get webhook signature for verification
    const signature = req.headers.get('calendly-webhook-signature');
    const webhookSecret = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY');
    
    const body = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
      
      const signatureBytes = new Uint8Array(
        signature.split('').map(char => char.charCodeAt(0))
      );
      
      const isValid = await crypto.subtle.verify(
        'HMAC',
        key,
        signatureBytes,
        encoder.encode(body)
      );
      
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
    }

    const webhookData: CalendlyWebhookEvent = JSON.parse(body);
    
    console.log('📞 Received Calendly webhook:', {
      event: webhookData.event,
      timestamp: webhookData.created_at,
      eventType: webhookData.payload?.event_type?.name,
      inviteeEmail: webhookData.payload?.invitee?.email
    });

    // Extract event information
    const scheduledEvent = webhookData.payload?.scheduled_event;
    const eventType = webhookData.payload?.event_type;
    const invitee = webhookData.payload?.invitee;
    
    if (!scheduledEvent || !eventType) {
      console.error('Missing required event data');
      return new Response('Missing event data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Find which project this event belongs to by checking event type mappings
    const { data: mappings, error: mappingError } = await supabase
      .from('calendly_event_mappings')
      .select('project_id')
      .eq('calendly_event_type_id', eventType.uri)
      .eq('is_active', true);

    if (mappingError) {
      console.error('Error finding project mapping:', mappingError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!mappings || mappings.length === 0) {
      console.log('No active project mappings found for event type:', eventType.uri);
      return new Response('No mappings found', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Process for each mapped project
    for (const mapping of mappings) {
      const projectId = mapping.project_id;
      
      // Determine event status based on webhook event type
      let status = 'scheduled';
      if (webhookData.event === 'invitee.canceled') {
        status = 'cancelled';
      } else if (webhookData.event === 'invitee.created') {
        status = 'active';
      }

      // Check if event already exists to prevent duplicates
      const { data: existingEvent } = await supabase
        .from('calendly_events')
        .select('id, status')
        .eq('calendly_event_id', scheduledEvent.uri)
        .eq('project_id', projectId)
        .maybeSingle();

      const eventData = {
        project_id: projectId,
        calendly_event_id: scheduledEvent.uri,
        calendly_event_type_id: eventType.uri,
        event_type_name: eventType.name,
        scheduled_at: scheduledEvent.start_time,
        status: status,
        invitee_name: invitee?.name || null,
        invitee_email: invitee?.email || null,
        updated_at: new Date().toISOString()
      };

      if (existingEvent) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('calendly_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) {
          console.error('Error updating event:', updateError);
        } else {
          console.log('✅ Updated existing event:', scheduledEvent.uri);
        }
      } else {
        // Create new event
        const { error: insertError } = await supabase
          .from('calendly_events')
          .insert({
            ...eventData,
            created_at: invitee?.created_at || webhookData.created_at
          });

        if (insertError) {
          console.error('Error inserting event:', insertError);
        } else {
          console.log('✅ Created new event:', scheduledEvent.uri);
        }
      }
    }

    // Trigger a background sync to check for any gaps
    const syncResponse = await supabase.functions.invoke('calendly-sync-gaps', {
      body: { 
        triggerReason: 'webhook',
        eventTypeUri: eventType.uri 
      }
    });

    if (syncResponse.error) {
      console.error('Background sync trigger failed:', syncResponse.error);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: mappings.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
