
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
    console.log('=== CALENDLY OAUTH REQUEST ===')
    console.log('Method:', req.method)
    console.log('URL:', url.toString())
    
    // Handle OAuth callback - simplified approach
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    
    if (code && state) {
      console.log('=== OAUTH CALLBACK ===')
      return await handleOAuthCallback(code, state, supabaseClient)
    }

    // Handle JSON API requests
    const requestBody = await req.text()
    if (!requestBody) {
      throw new Error('No request body provided')
    }

    const { action, projectId } = JSON.parse(requestBody)
    console.log('Action:', action, 'ProjectId:', projectId)

    switch (action) {
      case 'get_auth_url':
        return await getAuthUrl(projectId)
      
      case 'get_event_types':
        return await getEventTypes(projectId, supabaseClient)
      
      case 'disconnect':
        return await disconnectCalendly(projectId, supabaseClient)
      
      default:
        throw new Error(`Invalid action: ${action}`)
    }
  } catch (error) {
    console.error('=== ERROR ===', error.message)
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
  console.log('=== GENERATING AUTH URL ===')
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  if (!clientId) {
    throw new Error('CALENDLY_CLIENT_ID not configured')
  }
  
  // Use a simpler redirect approach
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`
  
  const authUrl = `https://auth.calendly.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=default&` +
    `state=${projectId}`

  console.log('Auth URL generated successfully')

  return new Response(
    JSON.stringify({ auth_url: authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleOAuthCallback(code: string, projectId: string, supabaseClient: any) {
  console.log('=== PROCESSING OAUTH CALLBACK ===')
  console.log('Project ID:', projectId)
  
  const clientId = Deno.env.get('CALENDLY_CLIENT_ID')
  const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET')
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-oauth`

  if (!clientId || !clientSecret) {
    throw new Error('Calendly OAuth credentials not configured')
  }

  try {
    // Exchange code for token
    console.log('Exchanging code for token...')
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

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token received successfully')

    // Test the token by getting user info
    console.log('Testing token with user info request...')
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Token validation failed:', userResponse.status)
      throw new Error(`Invalid token: ${userResponse.status}`)
    }

    const userData = await userResponse.json()
    console.log('Token validated successfully')

    // Store everything in one transaction
    console.log('Storing integration data...')
    
    // Delete existing records first
    await supabaseClient
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    await supabaseClient
      .from('project_integration_data')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Insert new integration record
    const { error: integrationError } = await supabaseClient
      .from('project_integrations')
      .insert({
        project_id: projectId,
        platform: 'calendly',
        is_connected: true,
        last_sync: new Date().toISOString(),
      })

    if (integrationError) {
      console.error('Integration insert failed:', integrationError)
      throw new Error(`Failed to store integration: ${integrationError.message}`)
    }

    // Insert token data
    const { error: tokenError } = await supabaseClient
      .from('project_integration_data')
      .insert({
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
      })

    if (tokenError) {
      console.error('Token insert failed:', tokenError)
      throw new Error(`Failed to store token: ${tokenError.message}`)
    }

    console.log('=== OAUTH CALLBACK SUCCESS ===')

    // Return a success page that closes itself
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Calendly Connected</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 60px 20px; 
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
            border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
          }
          .success { color: #10b981; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
          .check { font-size: 48px; margin-bottom: 20px; }
          .message { color: #6b7280; margin-bottom: 20px; line-height: 1.6; }
          .info { font-size: 14px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="check">✅</div>
          <div class="success">Successfully Connected!</div>
          <div class="message">
            Your Calendly account has been connected.<br>
            You can now close this window and return to your dashboard.
          </div>
          <div class="info">
            This window will close automatically in a few seconds.
          </div>
        </div>
        <script>
          // Notify parent window of success
          try {
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'calendly_connected', 
                projectId: '${projectId}',
                success: true 
              }, '*');
            }
          } catch (e) {
            console.log('Could not notify parent window');
          }
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `

    return new Response(successHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('OAuth callback error:', error)
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            text-align: center; 
            padding: 60px 20px; 
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
            border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.2); 
          }
          .error { color: #ef4444; font-size: 24px; margin-bottom: 20px; font-weight: 600; }
          .cross { font-size: 48px; margin-bottom: 20px; }
          button { 
            background: #ef4444; 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            cursor: pointer; 
            margin-top: 20px;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="cross">❌</div>
          <div class="error">Connection Failed</div>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please close this window and try connecting again.</p>
          <button onclick="window.close()">Close Window</button>
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
  console.log('=== GET EVENT TYPES ===')
  console.log('Project ID:', projectId)
  
  if (!projectId) {
    throw new Error('Project ID is required')
  }
  
  // Check integration exists and is connected
  const { data: integration, error: integrationError } = await supabaseClient
    .from('project_integrations')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .eq('is_connected', true)
    .maybeSingle()

  if (integrationError) {
    console.error('Integration query error:', integrationError)
    throw new Error(`Database error: ${integrationError.message}`)
  }

  if (!integration) {
    console.error('No connected integration found')
    throw new Error('No Calendly integration found for this project. Please connect your Calendly account first.')
  }

  // Get token data
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('project_integration_data')
    .select('data')
    .eq('project_id', projectId)
    .eq('platform', 'calendly')
    .maybeSingle()

  if (tokenError || !tokenData?.data?.access_token) {
    console.error('Token error:', tokenError)
    throw new Error('Invalid token data. Please reconnect your Calendly account.')
  }

  const accessToken = tokenData.data.access_token
  console.log('Token found, fetching event types...')

  // Fetch event types
  const eventTypesResponse = await fetch('https://api.calendly.com/event_types', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!eventTypesResponse.ok) {
    console.error('Event types API error:', eventTypesResponse.status)
    
    if (eventTypesResponse.status === 401) {
      // Mark as disconnected
      await supabaseClient
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
      
      throw new Error('Calendly authorization expired. Please reconnect your Calendly account.')
    }
    
    throw new Error(`Failed to fetch event types: ${eventTypesResponse.status}`)
  }

  const eventTypesData = await eventTypesResponse.json()
  const eventTypes = eventTypesData.collection || []
  
  console.log('Successfully retrieved', eventTypes.length, 'event types')

  return new Response(
    JSON.stringify({ event_types: eventTypes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function disconnectCalendly(projectId: string, supabaseClient: any) {
  console.log('=== DISCONNECT CALENDLY ===')
  
  try {
    // Delete integration data
    await supabaseClient
      .from('project_integration_data')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Delete integration record
    await supabaseClient
      .from('project_integrations')
      .delete()
      .eq('project_id', projectId)
      .eq('platform', 'calendly')

    // Delete event mappings
    await supabaseClient
      .from('calendly_event_mappings')
      .delete()
      .eq('project_id', projectId)

    console.log('Calendly disconnected successfully')

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Disconnect error:', error)
    throw error
  }
}
