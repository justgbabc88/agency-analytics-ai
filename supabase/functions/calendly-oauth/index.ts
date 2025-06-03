import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const url = new URL(req.url)
    
    // Check if this is a webhook request
    if (url.pathname.includes('/webhook') || req.headers.get('calendly-webhook')) {
      return await handleWebhook(req, supabaseClient)
    }

    const { action, projectId, code, eventTypeId } = await req.json()

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(projectId)
      
      case 'handle_callback':
        return await handleCallback(code, projectId, supabaseClient)
      
      case 'get_event_types':
        return await getEventTypes(projectId, supabaseClient)
      
      case 'save_event_mapping':
        return await saveEventMapping(projectId, eventTypeId, supabaseClient)
      
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('Calendly OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  const signingKey = Deno.env.get('CALENDLY_WEBHOOK_SIGNING_KEY')
  if (!signingKey) {
    console.error('CALENDLY_WEBHOOK_SIGNING_KEY not configured')
    return false
  }

  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(signingKey)
    const payloadData = encoder.encode(payload)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData)
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

async function getAuthUrl(projectId: string) {
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`
  
  const authUrl = `https://auth.calendly.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=default&` +
    `state=${projectId}`

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCallback(code: string, projectId: string, supabaseClient: any) {
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`

  // Exchange code for access token
  const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      code: code,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    throw new Error(tokenData.error_description || 'Failed to get access token')
  }

  // Store the access token securely (you might want to encrypt this)
  const { error: updateError } = await supabaseClient
    .from('project_integrations')
    .upsert({
      project_id: projectId,
      platform: 'calendly',
      is_connected: true,
      last_sync: new Date().toISOString(),
    })

  if (updateError) throw updateError

  // Get user's event types
  const eventTypesResponse = await fetch('https://api.calendly.com/event_types', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
    },
  })

  const eventTypesData = await eventTypesResponse.json()

  return new Response(
    JSON.stringify({ 
      success: true, 
      event_types: eventTypesData.collection || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getEventTypes(projectId: string, supabaseClient: any) {
  // In a real implementation, you'd retrieve the stored access token
  // For now, return mock data
  const mockEventTypes = [
    {
      uri: 'https://api.calendly.com/event_types/AAAAAAAAAAAAAAAA',
      name: 'Strategy Call',
      duration: 30,
      kind: 'solo'
    },
    {
      uri: 'https://api.calendly.com/event_types/BBBBBBBBBBBBBBBB',
      name: 'Discovery Call',
      duration: 45,
      kind: 'solo'
    }
  ]

  return new Response(
    JSON.stringify({ event_types: mockEventTypes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function saveEventMapping(projectId: string, eventTypeId: string, supabaseClient: any) {
  const { error } = await supabaseClient
    .from('calendly_event_mappings')
    .upsert({
      project_id: projectId,
      calendly_event_type_id: eventTypeId,
      event_type_name: 'Strategy Call', // This would come from the event type data
      is_active: true,
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleWebhook(req: Request, supabaseClient: any) {
  try {
    const signature = req.headers.get('calendly-webhook-signature')
    if (!signature) {
      console.error('Missing webhook signature')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const payloadText = await req.text()
    
    // Verify the webhook signature
    const isValidSignature = await verifyWebhookSignature(payloadText, signature)
    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const payload = JSON.parse(payloadText)
    console.log('Verified webhook payload:', payload)
    
    if (payload.event === 'invitee.created') {
      const event = payload.payload
      
      // Find the project mapping for this event type
      const { data: mapping } = await supabaseClient
        .from('calendly_event_mappings')
        .select('project_id')
        .eq('calendly_event_type_id', event.event_type.uri)
        .eq('is_active', true)
        .single()

      if (mapping) {
        // Store the scheduled event
        const { error } = await supabaseClient
          .from('calendly_events')
          .insert({
            project_id: mapping.project_id,
            calendly_event_id: event.uri,
            calendly_event_type_id: event.event_type.uri,
            event_type_name: event.event_type.name,
            invitee_name: event.name,
            invitee_email: event.email,
            scheduled_at: event.start_time,
            status: 'scheduled',
          })

        if (error) {
          console.error('Error storing Calendly event:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to store event' }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        console.log('Successfully stored Calendly event for project:', mapping.project_id)
      } else {
        console.log('No active mapping found for event type:', event.event_type.uri)
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}
