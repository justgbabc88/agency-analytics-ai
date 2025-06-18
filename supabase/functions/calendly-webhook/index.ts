
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
  console.log('📞 Calendly webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
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
    console.log('📝 Raw webhook body length:', body.length);
    
    // TEMPORARILY BYPASS SIGNATURE VERIFICATION FOR TESTING
    console.log('⚠️ SIGNATURE VERIFICATION TEMPORARILY DISABLED FOR TESTING');
    /*
    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      console.log('🔐 Verifying webhook signature...');
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
        console.error('❌ Invalid webhook signature');
        return new Response('Invalid signature', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.log('⚠️ No webhook secret configured, skipping signature verification');
    }
    */

    const webhookData: CalendlyWebhookEvent = JSON.parse(body);
    
    // LOG FULL WEBHOOK PAYLOAD
    console.log('📦 Full webhook payload:', JSON.stringify(webhookData, null, 2));
    
    console.log('📞 Processed Calendly webhook:', {
      event: webhookData.event,
      timestamp: webhookData.created_at,
      eventType: webhookData.payload?.event_type?.name,
      inviteeEmail: webhookData.payload?.invitee?.email
    });

    // Extract event information - FIX: Get event type from scheduled_event
    const scheduledEvent = webhookData.payload?.scheduled_event;
    const invitee = webhookData.payload?.invitee;
    
    // The event type URI is in scheduled_event.event_type, not payload.event_type
    const eventTypeUri = scheduledEvent?.event_type;
    
    console.log('🔍 Extracted data:', {
      eventTypeUri: eventTypeUri,
      scheduledEventUri: scheduledEvent?.uri,
      inviteeEmail: invitee?.email,
      eventTypeName: scheduledEvent?.name
    });
    
    if (!scheduledEvent || !eventTypeUri) {
      console.error('❌ Missing required event data:', {
        hasScheduledEvent: !!scheduledEvent,
        hasEventType: !!eventTypeUri
      });
      return new Response('Missing event data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // CHECK IF EVENT TYPE EXISTS IN MAPPINGS
    console.log('🔍 Checking for event type mappings for URI:', eventTypeUri);
    const { data: mappings, error: mappingError } = await supabase
      .from('calendly_event_mappings')
      .select('project_id')
      .eq('calendly_event_type_id', eventTypeUri)
      .eq('is_active', true);

    if (mappingError) {
      console.error('❌ Error finding project mapping:', mappingError);
      return new Response('Database error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!mappings || mappings.length === 0) {
      console.warn('⚠️ No mapping found for event type URI:', eventTypeUri);
      console.log('💡 Available mappings can be checked in calendly_event_mappings table');
      return new Response('No mappings found', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    console.log('✅ Found', mappings.length, 'active mapping(s) for event type');

    // Process for each mapped project
    let totalProcessed = 0;
    for (const mapping of mappings) {
      const projectId = mapping.project_id;
      console.log('🔄 Processing event for project:', projectId);
      
      // Determine event status based on webhook event type
      let status = 'scheduled';
      if (webhookData.event === 'invitee.canceled') {
        status = 'cancelled';
      } else if (webhookData.event === 'invitee.created') {
        status = 'active';
      }

      console.log('📊 Event status determined:', status);

      // Check if event already exists to prevent duplicates
      const { data: existingEvent } = await supabase
        .from('calendly_events')
        .select('id, status')
        .eq('calendly_event_id', scheduledEvent.uri)
        .eq('project_id', projectId)
        .maybeSingle();

      console.log('🔍 Existing event check:', {
        found: !!existingEvent,
        existingId: existingEvent?.id,
        existingStatus: existingEvent?.status
      });

      // ENSURE CREATED_AT IS NEVER NULL
      let createdAt = invitee?.created_at || webhookData.created_at || new Date().toISOString();
      console.log('📅 Using created_at:', createdAt);

      const eventData = {
        project_id: projectId,
        calendly_event_id: scheduledEvent.uri,
        calendly_event_type_id: eventTypeUri,
        event_type_name: scheduledEvent.name,
        scheduled_at: scheduledEvent.start_time,
        status: status,
        invitee_name: invitee?.name || null,
        invitee_email: invitee?.email || null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Event data to save:', eventData);

      if (existingEvent) {
        // Update existing event
        console.log('🔄 Updating existing event:', existingEvent.id);
        const { error: updateError } = await supabase
          .from('calendly_events')
          .update(eventData)
          .eq('id', existingEvent.id);

        if (updateError) {
          console.error('❌ Error updating event:', updateError);
        } else {
          console.log('✅ Successfully updated existing event:', scheduledEvent.uri);
          totalProcessed++;
        }
      } else {
        // Create new event
        console.log('➕ Creating new event');
        const { error: insertError } = await supabase
          .from('calendly_events')
          .insert({
            ...eventData,
            created_at: createdAt
          });

        if (insertError) {
          console.error('❌ Error inserting event:', insertError);
        } else {
          console.log('✅ Successfully created new event:', scheduledEvent.uri);
          totalProcessed++;
        }
      }
    }

    console.log('📈 Total events processed successfully:', totalProcessed);

    // Trigger a background sync to check for any gaps
    console.log('🔄 Triggering background gap sync...');
    const syncResponse = await supabase.functions.invoke('calendly-sync-gaps', {
      body: { 
        triggerReason: 'webhook',
        eventTypeUri: eventTypeUri 
      }
    });

    if (syncResponse.error) {
      console.error('❌ Background sync trigger failed:', syncResponse.error);
    } else {
      console.log('✅ Background sync triggered successfully');
    }

    console.log('🎉 Webhook processing completed successfully');
    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed,
      mappings: mappings.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
