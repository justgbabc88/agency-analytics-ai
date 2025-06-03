
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
    console.log('=== REQUEST START ===')
    console.log('Method:', req.method)
    console.log('URL:', url.toString())
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Check if this is a webhook request
    if (url.pathname.includes('/webhook') || req.headers.get('calendly-webhook')) {
      return await handleWebhook(req, supabaseClient)
    }

    // Handle OAuth callback from URL parameters FIRST
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    
    if (code && state) {
      console.log('=== OAUTH CALLBACK DETECTED ===')
      console.log('Code:', code.substring(0, 10) + '...')
      console.log('State (projectId):', state)
      return await handleCallback(code, state, supabaseClient)
    }

    // Handle JSON requests
    const requestBody = await req.text()
    console.log('Request body:', requestBody)
    
    if (!requestBody) {
      throw new Error('No request body provided')
    }

    const { action, projectId, eventTypeId } = JSON.parse(requestBody)
    console.log('=== JSON REQUEST ===')
    console.log('Action:', action)
    console.log('ProjectId:', projectId)

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(projectId)
      
      case 'get_event_types':
        return await getEventTypes(projectId, supabaseClient)
      
      case 'save_event_mapping':
        return await saveEventMapping(projectId, eventTypeId, supabaseClient)
      
      default:
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error) {
    console.error('=== CALENDLY OAUTH ERROR ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function getAuthUrl(projectId: string) {
  console.log('=== GET AUTH URL ===')
  console.log('Project ID:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  if (!clientId) {
    throw new Error('CALENDLY_CLIENT_ID not configured')
  }
  
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`
  console.log('Redirect URI:', redirectUri)
  
  const authUrl = `https://auth.calendly.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=default&` +
    `state=${projectId}`

  console.log('Generated auth URL')
  console.log('✅ AUTH URL SUCCESS')

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleCallback(code: string, projectId: string, supabaseClient: any) {
  console.log('=== CALLBACK START ===')
  console.log('Project ID:', projectId)
  console.log('Authorization code received:', !!code)
  
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
    // Step 1: Exchange code for access token
    console.log('=== STEP 1: TOKEN EXCHANGE ===')
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
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response OK:', tokenResponse.ok)

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData)
      throw new Error(tokenData.error_description || `Token exchange failed: ${tokenResponse.status}`)
    }

    if (!tokenData.access_token) {
      console.error('❌ No access token in response:', tokenData)
      throw new Error('No access token received from Calendly')
    }

    console.log('✅ Access token received')

    // Step 2: Test the token immediately
    console.log('=== STEP 2: TOKEN VALIDATION ===')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('❌ Token validation failed:', userResponse.status, errorText)
      throw new Error(`Invalid token received: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    console.log('✅ Token validation successful')
    console.log('User name:', userData.resource?.name || 'Unknown')

    // Step 3: Store integration record
    console.log('=== STEP 3: STORE INTEGRATION ===')
    
    // First, delete any existing integration to ensure clean state
    const { error: deleteError } = await supabaseClient
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
    
    if (deleteError) {
      console.warn('Warning deleting existing integration:', deleteError.message)
    }

    // Create new integration record
    const integrationData = {
      project_id: projectId,
      platform: 'calendly',
      is_connected: true,
      last_sync: new Date().toISOString(),
    }

    const { data: integrationResult, error: integrationError } = await supabaseClient
      .from('project_integrations')
      .insert(integrationData)
      .select()

    if (integrationError) {
      console.error('❌ Integration storage error:', integrationError)
      throw new Error(`Failed to store integration: ${integrationError.message}`)
    }
    
    console.log('✅ Integration record stored')

    // Step 4: Store token data
    console.log('=== STEP 4: STORE TOKEN DATA ===')
    
    // Delete existing token data
    const { error: deleteTokenError } = await supabaseClient
      .from('project_integration_data')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
    
    if (deleteTokenError) {
      console.warn('Warning deleting existing token data:', deleteTokenError.message)
    }

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

    const { data: tokenResult, error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .insert(tokenStorageData)
      .select()

    if (tokenError) {
      console.error('❌ Token storage error:', tokenError)
      throw new Error(`Failed to store token data: ${tokenError.message}`)
    }
    
    console.log('✅ Token data stored')

    // Step 5: Immediate verification
    console.log('=== STEP 5: VERIFICATION ===')
    
    // Wait a moment for database consistency
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const { data: verifyIntegration, error: verifyIntegrationError } = await supabaseClient
      .from('project_integrations')
      .select('*')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .maybeSingle()

    const { data: verifyToken, error: verifyTokenError } = await supabaseClient
      .from('project_integration_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('platform', 'calendly')
      .maybeSingle()

    console.log('Integration verification:', {
      found: !!verifyIntegration,
      connected: verifyIntegration?.is_connected,
      error: verifyIntegrationError?.message
    })

    console.log('Token verification:', {
      found: !!verifyToken,
      hasAccessToken: !!(verifyToken?.data?.access_token),
      error: verifyTokenError?.message
    })

    if (!verifyIntegration || !verifyToken) {
      throw new Error('Storage verification failed - data not found after insert')
    }

    console.log('✅ CALLBACK COMPLETE - ALL STEPS SUCCESSFUL')

    // Return success page
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendly Connected</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            max-width: 400px; 
            background: white; 
            color: #333;
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
          }
          .success { color: #22c55e; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
          .check { font-size: 48px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; line-height: 1.6; }
          .info { font-size: 14px; color: #888; }
          .countdown { font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="check">✅</div>
          <div class="success">Calendly Connected Successfully!</div>
          <div class="message">
            Your Calendly account has been connected to project:<br>
            <strong>${projectId}</strong>
          </div>
          <div class="info">
            This window will close automatically in <span class="countdown" id="countdown">5</span> seconds.<br>
            You can now return to your dashboard.
          </div>
        </div>
        <script>
          let countdown = 5;
          const countdownEl = document.getElementById('countdown');
          
          const timer = setInterval(() => {
            countdown--;
            countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
              clearInterval(timer);
              window.close();
            }
          }, 1000);
          
          // Try to communicate with parent window
          try {
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'calendly_connected', 
                projectId: '${projectId}',
                success: true 
              }, '*');
            }
          } catch (e) {
            console.log('Could not communicate with parent window');
          }
          
          // Also try to close immediately if it's a popup
          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.log('Could not auto-close window');
            }
          }, 2000);
        </script>
      </body>
      </html>
    `

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('❌ CALLBACK ERROR:', error.message)
    console.error('Error stack:', error.stack)
    
    // Return detailed error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container { 
            max-width: 500px; 
            background: white; 
            color: #333;
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
          }
          .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
          .cross { font-size: 48px; margin-bottom: 20px; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .code { font-family: monospace; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cross">❌</div>
          <div class="error">Connection Failed</div>
          <p><strong>Error:</strong> ${error.message}</p>
          <div class="details">
            <strong>Debug Information:</strong><br>
            <div class="code">
              Project ID: ${projectId}<br>
              Timestamp: ${new Date().toISOString()}<br>
              Error Type: ${error.constructor.name}
            </div>
          </div>
          <p>Please try connecting again or contact support if the issue persists.</p>
          <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px;">Close Window</button>
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
  console.log('Project ID:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  // Step 1: Check if integration exists
  console.log('=== STEP 1: CHECK INTEGRATION ===')
  const { data: integration, error: integrationError } = await supabaseClient
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  console.log('Integration check:', {
    found: !!integration,
    connected: integration?.is_connected,
    error: integrationError?.message
  })

  if (integrationError) {
    console.error('❌ Integration query error:', integrationError)
    throw new Error(`Database error: ${integrationError.message}`)
  }

  if (!integration) {
    console.error('❌ No integration found')
    throw new Error('No Calendly integration found for this project. Please connect your Calendly account first.')
  }

  if (!integration.is_connected) {
    console.error('❌ Integration not connected')
    throw new Error('Calendly integration exists but is not connected. Please reconnect your account.')
  }

  // Step 2: Get token data
  console.log('=== STEP 2: GET TOKEN DATA ===')
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  console.log('Token data check:', {
    found: !!tokenData,
    hasData: !!(tokenData?.data),
    hasAccessToken: !!(tokenData?.data?.access_token),
    syncedAt: tokenData?.synced_at,
    error: tokenError?.message
  })

  if (tokenError) {
    console.error('❌ Token query error:', tokenError)
    throw new Error(`Database error retrieving token: ${tokenError.message}`)
  }

  if (!tokenData || !tokenData.data || !tokenData.data.access_token) {
    console.error('❌ Invalid token data structure')
    throw new Error('Invalid Calendly token data. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token
  console.log('✅ Access token found, length:', accessToken.length)

  // Step 3: Test token with user info call
  console.log('=== STEP 3: VALIDATE TOKEN ===')
  const testResponse = await fetch('https://api.calendly.com/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('Token validation response:', {
    status: testResponse.status,
    ok: testResponse.ok
  })

  if (!testResponse.ok) {
    const errorText = await testResponse.text()
    console.error('❌ Token validation failed:', testResponse.status, errorText)
    
    if (testResponse.status === 401) {
      // Token is expired or invalid, mark integration as disconnected
      await supabaseClient
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
      
      throw new Error('Calendly token has expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Token validation failed: ${testResponse.status} ${testResponse.statusText}`)
  }

  console.log('✅ Token validation successful')

  // Step 4: Fetch event types
  console.log('=== STEP 4: FETCH EVENT TYPES ===')
  const eventTypesResponse = await fetch('https://api.calendly.com/event_types', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  console.log('Event types API response:', {
    status: eventTypesResponse.status,
    ok: eventTypesResponse.ok
  })

  if (!eventTypesResponse.ok) {
    const errorText = await eventTypesResponse.text()
    console.error('❌ Event types API error:', eventTypesResponse.status, errorText)
    
    if (eventTypesResponse.status === 401) {
      await supabaseClient
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
      
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch event types: ${eventTypesResponse.status} ${eventTypesResponse.statusText}`)
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
  console.log('=== SAVE EVENT MAPPING ===')
  console.log('Project:', projectId, 'Event:', eventTypeId)
  
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
      console.log('Could not fetch event type details:', error.message)
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
    console.error('❌ Error saving event mapping:', error)
    throw error
  }

  console.log('✅ Event mapping saved successfully')

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

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
