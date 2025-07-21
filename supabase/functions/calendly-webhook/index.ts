
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
    event_type?: {
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
    event_start_time?: string;
    event_end_time?: string;
    questions_and_answers: any[];
    routing_form_submission: any;
    new_invitee: any;
    old_invitee: any;
    scheduled_event: {
      uri: string;
      name?: string;
      status?: string;
      start_time?: string;
      end_time?: string;
      event_type?: string;
      location?: any;
      invitees_counter?: {
        total: number;
        active: number;
        limit: number;
      };
      created_at?: string;
      updated_at?: string;
    };
  };
}

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// Enhanced signature verification with better error handling
async function verifyWebhookSignature(rawBody: string, signature: string, signingKey: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Extract timestamp and signature from header format: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const signaturePart = parts.find(p => p.startsWith('v1='));
    
    if (!timestampPart || !signaturePart) {
      console.error('❌ Invalid signature format:', signature);
      return false;
    }
    
    const timestamp = timestampPart.split('=')[1];
    const v1Signature = signaturePart.split('=')[1];
    
    // Create the signed payload: timestamp.body
    const signedPayload = `${timestamp}.${rawBody}`;
    console.log('🔐 Verifying signature for payload length:', signedPayload.length);
    
    const expectedSigBytes = hexToUint8Array(v1Signature);
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      expectedSigBytes,
      encoder.encode(signedPayload)
    );
    
    console.log('🔐 Signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Helper function to fetch Calendly event with retry logic
async function fetchCalendlyEventWithRetry(eventId: string, accessToken: string, maxRetries = 3): Promise<any> {
  const calendlyApiUrl = `https://api.calendly.com/scheduled_events/${eventId}`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Calling Calendly API (attempt ${attempt}/${maxRetries}):`, calendlyApiUrl);

      const calendlyResponse = await fetch(calendlyApiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!calendlyResponse.ok) {
        const errorText = await calendlyResponse.text();
        console.error(`❌ Calendly API call failed (attempt ${attempt}):`, calendlyResponse.status, errorText);
        
        if (calendlyResponse.status === 404) {
          console.warn('⚠️ Event not found, skipping gracefully');
          return null;
        }
        
        // Retry on server errors (5xx) or rate limiting (429)
        if (attempt < maxRetries && (calendlyResponse.status >= 500 || calendlyResponse.status === 429)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw new Error(`Calendly API error: ${calendlyResponse.status}`);
      }

      const fullEventData = await calendlyResponse.json();
      console.log('✅ Successfully fetched full event data from Calendly API');
      return fullEventData;
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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

    // 1. Capture raw body FIRST - this must be the very first read of the stream
    const rawBody = await req.text();
    
    console.log('📝 Raw webhook body length:', rawBody.length);
    console.log('🔥 RAW Calendly Body preview:', rawBody.substring(0, 200) + '...');
    
    // 2. Extract the signature from the 'calendly-webhook-signature' header
    const signatureHeader = req.headers.get('calendly-webhook-signature');
    
    if (!signatureHeader) {
      console.error('❌ Missing signature header');
      return new Response('Missing signature', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('🔍 Signature header format:', signatureHeader);

    // 3. Parse webhook data to get organization info
    const webhookData: CalendlyWebhookEvent = JSON.parse(rawBody);
    
    console.log('📞 Processed Calendly webhook:', {
      event: webhookData.event,
      timestamp: webhookData.created_at,
      scheduledEventUri: webhookData.payload?.scheduled_event?.uri
    });

    // Extract basic event information
    const scheduledEvent = webhookData.payload?.scheduled_event;
    const invitee = webhookData.payload?.invitee;
    
    if (!scheduledEvent?.uri) {
      console.error('❌ Missing scheduled event URI');
      return new Response('Missing scheduled event URI', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('🔍 Scheduled event URI:', scheduledEvent.uri);

    // Extract event ID from URI for API call
    const eventId = scheduledEvent.uri.split('/').pop();

    // 4. Find the correct signing key and access token
    const { data: integrationData, error: integrationError } = await supabase
      .from('project_integration_data')
      .select('data, project_id')
      .eq('platform', 'calendly')
      .order('synced_at', { ascending: false });

    if (integrationError || !integrationData || integrationData.length === 0) {
      console.error('❌ No Calendly integrations found:', integrationError);
      return new Response('No Calendly integrations found', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Try to verify signature with each integration's signing key
    let validIntegration = null;
    let accessToken = null;

    for (const integration of integrationData) {
      if (integration.data.signing_key) {
        console.log('🔐 Trying signature verification for project:', integration.project_id);
        
        const isValid = await verifyWebhookSignature(rawBody, signatureHeader, integration.data.signing_key);
        
        if (isValid) {
          console.log('✅ Webhook signature verified successfully with project:', integration.project_id);
          validIntegration = integration;
          accessToken = integration.data.access_token;
          break;
        }
      }
    }

    // Fallback to global signing key if no project-specific key worked
    if (!validIntegration) {
      console.log('🔄 Falling back to global signing key');
      const globalSigningKey = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY');
      
      if (globalSigningKey) {
        const isValid = await verifyWebhookSignature(rawBody, signatureHeader, globalSigningKey);
        
        if (isValid) {
          console.log('✅ Webhook signature verified with global signing key');
          // Use the first available access token for API calls
          accessToken = integrationData[0]?.data?.access_token;
          validIntegration = integrationData[0];
        } else {
          console.error('❌ Invalid webhook signature (global key)');
          return new Response('Invalid signature', { 
            status: 401, 
            headers: corsHeaders 
          });
        }
      } else {
        console.error('❌ No signing key available');
        return new Response('No signing key available', { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // FETCH FULL EVENT DETAILS FROM CALENDLY API
    console.log('🌐 Fetching full event details from Calendly API...');
    
    if (!accessToken) {
      console.error('❌ No access token available for API call');
      return new Response('No access token available', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    let fullEventData;
    try {
      fullEventData = await fetchCalendlyEventWithRetry(eventId!, accessToken);
    } catch (error) {
      console.error('❌ Failed to fetch event details after retries:', error);
      return new Response('Failed to fetch event details', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!fullEventData) {
      console.warn('⚠️ Event not found, skipping gracefully');
      return new Response('Event not found', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Extract the complete event information
    const eventResource = fullEventData.resource;
    const eventTypeUri = eventResource.event_type;
    const eventStartTime = eventResource.start_time;
    const eventEndTime = eventResource.end_time;
    const eventStatus = eventResource.status;
    
    console.log('🔍 Extracted from API:', {
      eventTypeUri: eventTypeUri,
      eventStartTime: eventStartTime,
      eventEndTime: eventEndTime,
      eventStatus: eventStatus,
      inviteeEmail: invitee?.email
    });
    
    if (!eventTypeUri) {
      console.error('❌ Missing event type URI from API response');
      return new Response('Missing event type URI', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // CHECK IF EVENT TYPE EXISTS IN MAPPINGS
    console.log('🔍 Checking for event type mappings for URI:', eventTypeUri);
    const { data: mappings, error: mappingError } = await supabase
      .from('calendly_event_mappings')
      .select('project_id, event_type_name')
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

      // Skip if event is already canceled and webhook is not about cancellation
      if (existingEvent && existingEvent.status === 'canceled' && status !== 'cancelled') {
        console.log('⏭️ Skipping update - event already canceled in DB, not overriding with:', status);
        continue;
      }

      // ENSURE CREATED_AT IS NEVER NULL
      let createdAt = invitee?.created_at || webhookData.created_at || new Date().toISOString();
      console.log('📅 Using created_at:', createdAt);

      const eventData = {
        project_id: projectId,
        calendly_event_id: scheduledEvent.uri,
        calendly_event_type_id: eventTypeUri,
        event_type_name: mapping.event_type_name,
        scheduled_at: eventStartTime,
        status: status,
        invitee_name: invitee?.name || null,
        invitee_email: invitee?.email || null,
        updated_at: new Date().toISOString()
      };

      console.log('💾 Event data to save:', eventData);

      try {
        if (existingEvent) {
          // Update existing event
          console.log('🔄 Updating existing event:', existingEvent.id, 'Status:', existingEvent.status, '→', status);
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
            // Handle duplicate key constraint gracefully
            if (insertError.message?.includes('duplicate key') || insertError.message?.includes('calendly_event_id')) {
              console.log('⚠️ Skipping duplicate insert for event:', scheduledEvent.uri);
            } else {
              console.error('❌ Error inserting event:', insertError);
            }
          } else {
            console.log('✅ Successfully created new event:', scheduledEvent.uri);
            totalProcessed++;
          }
        }
      } catch (error) {
        console.error('❌ Unexpected error during event save:', error);
      }
    }

    console.log('📈 Total events processed successfully:', totalProcessed);

    // Trigger a background sync to check for any gaps
    console.log('🔄 Triggering background gap sync...');
    try {
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
    } catch (error) {
      console.error('❌ Background sync error:', error);
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
