
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

    // Handle OAuth callback from URL parameters
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    
    if (code && state) {
      console.log('OAuth callback received:', { code: code.substring(0, 10) + '...', state })
      return await handleCallback(code, state, supabaseClient)
    }

    // Handle JSON requests
    const requestBody = await req.text()
    console.log('Request body:', requestBody)
    
    if (!requestBody) {
      throw new Error('No request body provided')
    }

    const { action, projectId, eventTypeId } = JSON.parse(requestBody)

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(projectId)
      
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

  console.log('Generated auth URL for project:', projectId)

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCallback(code: string, projectId: string, supabaseClient: any) {
  console.log('Handling callback for project:', projectId)
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`

  try {
    // Exchange code for access token
    console.log('Exchanging code for access token...')
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
    console.log('Token response status:', tokenResponse.ok)
    console.log('Token data received:', { 
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      throw new Error(tokenData.error_description || 'Failed to get access token')
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData)
      throw new Error('No access token received from Calendly')
    }

    // First, update or create the project integration record
    console.log('Updating project_integrations table...')
    const { error: integrationError } = await supabaseClient
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        platform: 'calendly',
        is_connected: true,
        last_sync: new Date().toISOString(),
      }, {
        onConflict: 'project_id,platform'
      })

    if (integrationError) {
      console.error('Error updating project_integrations:', integrationError)
      throw integrationError
    }

    // Then, store the access token securely in project_integration_data
    console.log('Storing token data...')
    const { error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .upsert({
        project_id: projectId,
        platform: 'calendly',
        data: { 
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
          scope: 'default'
        },
        synced_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,platform'
      })

    if (tokenError) {
      console.error('Error storing token data:', tokenError)
      throw tokenError
    }

    console.log('Successfully stored tokens for project:', projectId)

    // Verify the token works by getting user info
    console.log('Testing access token...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('Token verification successful, user:', userData.resource?.name || 'Unknown')
    } else {
      console.log('Token verification failed:', userResponse.status, await userResponse.text())
    }

    // Return success page that closes the popup
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendly Connected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #22c55e; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="success">✓ Calendly Connected Successfully!</div>
        <p>You can now close this window.</p>
        <script>
          // Auto-close after 2 seconds
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Callback handling error:', error)
    throw error
  }
}

async function getEventTypes(projectId: string, supabaseClient: any) {
  console.log('Getting event types for project:', projectId)
  
  // Get the stored access token
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  console.log('Token data query result:', { 
    hasData: !!tokenData, 
    error: tokenError,
    dataKeys: tokenData?.data ? Object.keys(tokenData.data) : []
  })

  if (tokenError) {
    console.error('Database error retrieving token:', tokenError)
    throw new Error('Database error retrieving Calendly integration data')
  }

  if (!tokenData || !tokenData.data) {
    console.error('No token data found for project:', projectId)
    throw new Error('No Calendly integration found for this project. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token

  if (!accessToken) {
    console.error('No access token in stored data:', tokenData.data)
    throw new Error('Invalid Calendly integration data. Please reconnect your Calendly account.')
  }

  console.log('Making API call to Calendly with stored token...')

  // Make actual API call to Calendly
  const eventTypesResponse = await fetch('https://api.calendly.com/event_types', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('Calendly API response status:', eventTypesResponse.status)

  if (!eventTypesResponse.ok) {
    const errorText = await eventTypesResponse.text()
    console.error('Calendly API error:', eventTypesResponse.status, errorText)
    
    if (eventTypesResponse.status === 401) {
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch event types: ${eventTypesResponse.statusText}`)
  }

  const eventTypesData = await eventTypesResponse.json()
  console.log('Event types retrieved:', eventTypesData.collection?.length || 0)

  return new Response(
    JSON.stringify({ event_types: eventTypesData.collection || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function saveEventMapping(projectId: string, eventTypeId: string, supabaseClient: any) {
  // Get event type details first
  const { data: tokenData } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .single()

  let eventTypeName = 'Unknown Event'

  if (tokenData?.data?.access_token) {
    try {
      const eventTypeResponse = await fetch(eventTypeId, {
        headers: {
          'Authorization': `Bearer ${tokenData.data.access_token}`,
        },
      })
      
      if (eventTypeResponse.ok) {
        const eventTypeData = await eventTypeResponse.json()
        eventTypeName = eventTypeData.resource?.name || eventTypeName
      }
    } catch (error) {
      console.log('Could not fetch event type details:', error)
    }
  }

  const { error } = await supabaseClient
    .from('calendly_event_mappings')
    .upsert({
      project_id: projectId,
      calendly_event_type_id: eventTypeId,
      event_type_name: eventTypeName,
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
