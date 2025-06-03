
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
    console.log('Parsed action:', action, 'projectId:', projectId)

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
  console.log('Generating auth URL for project:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  if (!clientId) {
    throw new Error('CALENDLY_CLIENT_ID not configured')
  }
  
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
  console.log('=== CALLBACK START ===')
  console.log('Handling callback for project:', projectId)
  console.log('Code received:', code ? 'YES' : 'NO')
  
  if (!projectId) {
    throw new Error('Missing project ID in callback')
  }
  
  if (!code) {
    throw new Error('Missing authorization code in callback')
  }
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`

  if (!clientId || !clientSecret) {
    throw new Error('Calendly OAuth credentials not configured')
  }

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
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.ok)
    console.log('Token data structure:', Object.keys(tokenData || {}))

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData)
      throw new Error(tokenData.error_description || `Token exchange failed: ${tokenResponse.status}`)
    }

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData)
      throw new Error('No access token received from Calendly')
    }

    console.log('✅ Token received successfully')

    // Test the token immediately
    console.log('Testing access token...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('Token test failed:', userResponse.status, errorText)
      throw new Error(`Invalid token received: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    console.log('✅ Token verification successful, user:', userData.resource?.name || 'Unknown')

    // Store the integration record first
    console.log('=== STORING INTEGRATION RECORD ===')
    const integrationData = {
      project_id: projectId,
      platform: 'calendly',
      is_connected: true,
      last_sync: new Date().toISOString(),
    }
    console.log('Integration data to store:', integrationData)

    const { data: integrationResult, error: integrationError } = await supabaseClient
      .from('project_integrations')
      .upsert(integrationData, {
        onConflict: 'project_id,platform'
      })
      .select()

    if (integrationError) {
      console.error('❌ Error storing integration:', integrationError)
      throw new Error(`Failed to store integration: ${integrationError.message}`)
    }
    console.log('✅ Integration stored:', integrationResult)

    // Store the token data
    console.log('=== STORING TOKEN DATA ===')
    const tokenStorageData = {
      project_id: projectId,
      platform: 'calendly',
      data: { 
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        scope: tokenData.scope || 'default',
        user_info: userData.resource
      },
      synced_at: new Date().toISOString(),
    }
    console.log('Token storage data (without sensitive fields):', {
      ...tokenStorageData,
      data: { ...tokenStorageData.data, access_token: '[REDACTED]', refresh_token: '[REDACTED]' }
    })

    const { data: tokenResult, error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .upsert(tokenStorageData, {
        onConflict: 'project_id,platform'
      })
      .select()

    if (tokenError) {
      console.error('❌ Error storing token data:', tokenError)
      throw new Error(`Failed to store token data: ${tokenError.message}`)
    }
    console.log('✅ Token data stored:', tokenResult ? 'SUCCESS' : 'NO RESULT')

    // Verify storage by immediately reading back
    console.log('=== VERIFYING STORAGE ===')
    const { data: verifyData, error: verifyError } = await supabaseClient
      .from('project_integration_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .maybeSingle()

    if (verifyError) {
      console.error('❌ Verification error:', verifyError)
    } else if (verifyData) {
      console.log('✅ Verification successful - data exists with access_token:', !!verifyData.data?.access_token)
    } else {
      console.error('❌ Verification failed - no data found')
    }

    console.log('=== CALLBACK SUCCESS ===')

    // Return success page
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendly Connected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .success { color: #22c55e; font-size: 24px; margin-bottom: 20px; }
          .check { font-size: 48px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .info { font-size: 14px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="check">✅</div>
          <div class="success">Calendly Connected Successfully!</div>
          <div class="message">Project: ${projectId}</div>
          <div class="info">You can now close this window and return to your dashboard.</div>
        </div>
        <script>
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
          
          // Also try to close immediately in case popup allows it
          try {
            window.opener?.postMessage({ type: 'calendly_connected', projectId: '${projectId}' }, '*');
          } catch (e) {
            console.log('Could not post message to opener');
          }
        </script>
      </body>
      </html>
    `

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('❌ Callback handling error:', error)
    
    // Return error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; }
          .cross { font-size: 48px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cross">❌</div>
          <div class="error">Connection Failed</div>
          <p>${error.message}</p>
          <p>Please try again or contact support.</p>
        </div>
      </body>
      </html>
    `
    
    return new Response(errorHtml, {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })
  }
}

async function getEventTypes(projectId: string, supabaseClient: any) {
  console.log('=== GET EVENT TYPES START ===')
  console.log('Getting event types for project:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  // Get the stored access token with detailed logging
  console.log('Querying project_integration_data...')
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  console.log('Token query result:')
  console.log('- Error:', tokenError)
  console.log('- Has data:', !!tokenData)
  console.log('- Data keys:', tokenData ? Object.keys(tokenData) : [])
  console.log('- Has data.data:', !!(tokenData?.data))
  console.log('- Data.data keys:', tokenData?.data ? Object.keys(tokenData.data) : [])
  console.log('- Has access_token:', !!(tokenData?.data?.access_token))

  if (tokenError) {
    console.error('❌ Database error retrieving token:', tokenError)
    throw new Error(`Database error: ${tokenError.message}`)
  }

  if (!tokenData) {
    console.error('❌ No integration data found for project:', projectId)
    
    // Check if integration exists at all
    const { data: integrationCheck } = await supabaseClient
      .from('project_integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .maybeSingle()
    
    console.log('Integration check result:', integrationCheck)
    
    throw new Error('No Calendly integration found for this project. Please connect your Calendly account first.')
  }

  if (!tokenData.data || !tokenData.data.access_token) {
    console.error('❌ Invalid token data structure:', {
      hasData: !!tokenData.data,
      dataKeys: tokenData.data ? Object.keys(tokenData.data) : []
    })
    throw new Error('Invalid Calendly integration data. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token
  console.log('✅ Access token found, length:', accessToken.length)

  // Test the token before using it
  console.log('Testing token with user info call...')
  const testResponse = await fetch('https://api.calendly.com/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!testResponse.ok) {
    const errorText = await testResponse.text()
    console.error('❌ Token test failed:', testResponse.status, errorText)
    
    if (testResponse.status === 401) {
      throw new Error('Calendly token has expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Token validation failed: ${testResponse.statusText}`)
  }

  console.log('✅ Token test successful')

  // Make actual API call to get event types
  console.log('Fetching event types from Calendly API...')
  const eventTypesResponse = await fetch('https://api.calendly.com/event_types', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('Event types API response status:', eventTypesResponse.status)

  if (!eventTypesResponse.ok) {
    const errorText = await eventTypesResponse.text()
    console.error('❌ Event types API error:', eventTypesResponse.status, errorText)
    
    if (eventTypesResponse.status === 401) {
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch event types: ${eventTypesResponse.statusText}`)
  }

  const eventTypesData = await eventTypesResponse.json()
  const eventTypes = eventTypesData.collection || []
  console.log('✅ Event types retrieved:', eventTypes.length)
  console.log('=== GET EVENT TYPES SUCCESS ===')

  return new Response(
    JSON.stringify({ event_types: eventTypes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function saveEventMapping(projectId: string, eventTypeId: string, supabaseClient: any) {
  console.log('Saving event mapping for project:', projectId, 'event:', eventTypeId)
  
  if (!projectId || !eventTypeId) {
    throw new Error('Project ID and Event Type ID are required')
  }

  // Get event type details first
  const { data: tokenData } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

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
    }, {
      onConflict: 'project_id,calendly_event_type_id'
    })

  if (error) {
    console.error('Error saving event mapping:', error)
    throw error
  }

  console.log('✅ Event mapping saved successfully')

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
        .maybeSingle()

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
