import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZohoOAuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'refresh_token' | 'disconnect' | 'get_modules' | 'get_records'
  code?: string
  projectId?: string
  refreshToken?: string
  accessToken?: string
  module?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const clientId = Deno.env.get('ZOHO_CLIENT_ID')
    const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET')
    const redirectUri = Deno.env.get('ZOHO_REDIRECT_URI')

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Zoho OAuth credentials not configured')
    }

    // Handle GET requests (OAuth callbacks from Zoho)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      const state = url.searchParams.get('state')

      console.log('Received OAuth callback:', { code: !!code, error, state })

      if (error) {
        // Return an HTML page that will close the popup with error
        return new Response(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'ZOHO_OAUTH_ERROR',
                    error: '${error}'
                  }, window.location.origin);
                  window.close();
                } else {
                  window.location.href = '/integrations?zoho_error=${encodeURIComponent(error)}';
                }
              </script>
              <p>Authorization failed. Redirecting...</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        })
      }

      if (code && state) {
        // Return an HTML page that will close the popup with success
        return new Response(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'ZOHO_OAUTH_SUCCESS',
                    code: '${code}',
                    state: '${state}'
                  }, window.location.origin);
                  window.close();
                } else {
                  window.location.href = '/integrations?zoho_code=${encodeURIComponent(code)}&zoho_state=${encodeURIComponent(state)}';
                }
              </script>
              <p>Authorization successful. Redirecting...</p>
            </body>
          </html>
        `, {
          headers: { 'Content-Type': 'text/html' }
        })
      }

      throw new Error('Missing authorization code or state')
    }

    // Handle POST requests (API calls from the frontend)
    const { action, code, projectId, refreshToken, accessToken, module }: ZohoOAuthRequest = await req.json()

    console.log(`Zoho OAuth action: ${action}`)

    switch (action) {
      case 'get_auth_url':
        return handleGetAuthUrl(clientId, redirectUri, projectId!)
      case 'exchange_code':
        return await handleExchangeCode(code!, clientId, clientSecret, redirectUri, projectId!, supabase)
      case 'refresh_token':
        return await handleRefreshToken(refreshToken!, clientId, clientSecret, supabase)
      case 'disconnect':
        return await handleDisconnect(projectId!, supabase)
      case 'get_modules':
        return await handleGetModules(accessToken!)
      case 'get_records':
        return await handleGetRecords(accessToken!, module!)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }

  } catch (error) {
    console.error('Zoho OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function handleGetAuthUrl(clientId: string, redirectUri: string, projectId: string) {
  const scopes = [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.ALL',
    'ZohoCRM.users.READ'
  ].join(',')
  
  const state = btoa(JSON.stringify({ projectId }))
  
  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?` +
    `scope=${encodeURIComponent(scopes)}&` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${encodeURIComponent(state)}`

  console.log('Generated Zoho auth URL')

  return new Response(
    JSON.stringify({ authUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleExchangeCode(
  code: string, 
  clientId: string, 
  clientSecret: string, 
  redirectUri: string, 
  projectId: string,
  supabase: any
) {
  console.log('Exchanging code for access token')
  
  const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    console.error('Token exchange failed:', error)
    throw new Error('Failed to exchange code for access token')
  }

  const tokens = await tokenResponse.json()
  
  // Get user info
  const userResponse = await fetch(`https://www.zohoapis.com/crm/v2/users?type=CurrentUser`, {
    headers: { 'Authorization': `Zoho-oauthtoken ${tokens.access_token}` }
  })
  
  let userData = { email: 'unknown', full_name: 'Unknown User' }
  if (userResponse.ok) {
    const userResult = await userResponse.json()
    userData = userResult.users?.[0] || userData
  }

  // Get organization info
  const orgResponse = await fetch(`https://www.zohoapis.com/crm/v2/org`, {
    headers: { 'Authorization': `Zoho-oauthtoken ${tokens.access_token}` }
  })
  
  let orgData = { company_name: 'Unknown Organization' }
  if (orgResponse.ok) {
    const orgResult = await orgResponse.json()
    orgData = orgResult.org?.[0] || orgData
  }

  // Store integration data
  const integrationData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type,
    expires_in: tokens.expires_in,
    api_domain: tokens.api_domain || 'https://www.zohoapis.com',
    user_email: userData.email,
    user_name: userData.full_name,
    organization_name: orgData.company_name,
    connected_at: new Date().toISOString()
  }

  const { error: upsertError } = await supabase
    .from('project_integration_data')
    .upsert({
      project_id: projectId,
      platform: 'zoho_crm',
      data: integrationData,
      synced_at: new Date().toISOString()
    })

  if (upsertError) {
    console.error('Failed to store integration data:', upsertError)
    throw new Error('Failed to store integration data')
  }

  // Update integration status
  const { error: integrationError } = await supabase
    .from('project_integrations')
    .upsert({
      project_id: projectId,
      platform: 'zoho_crm',
      is_connected: true,
      last_sync: new Date().toISOString()
    })

  if (integrationError) {
    console.error('Failed to update integration status:', integrationError)
    throw new Error('Failed to update integration status')
  }

  console.log('Successfully connected to Zoho CRM')

  return new Response(
    JSON.stringify({
      success: true,
      user_email: userData.email,
      user_name: userData.full_name,
      organization_name: orgData.company_name
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleRefreshToken(refreshToken: string, clientId: string, clientSecret: string, supabase: any) {
  console.log('Refreshing access token')
  
  const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!refreshResponse.ok) {
    const error = await refreshResponse.text()
    console.error('Token refresh failed:', error)
    throw new Error('Failed to refresh token')
  }

  const tokens = await refreshResponse.json()
  console.log('Token refresh successful')
  
  return new Response(
    JSON.stringify({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleDisconnect(projectId: string, supabase: any) {
  console.log('Disconnecting Zoho CRM')
  
  // Remove integration data
  const { error: dataError } = await supabase
    .from('project_integration_data')
    .delete()
    .eq('project_id', projectId)
    .eq('platform', 'zoho_crm')

  if (dataError) {
    console.error('Failed to remove integration data:', dataError)
  }

  // Update integration status
  const { error: integrationError } = await supabase
    .from('project_integrations')
    .update({
      is_connected: false,
      last_sync: null
    })
    .eq('project_id', projectId)
    .eq('platform', 'zoho_crm')

  if (integrationError) {
    console.error('Failed to update integration status:', integrationError)
    throw new Error('Failed to update integration status')
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetModules(accessToken: string) {
  console.log('Fetching Zoho CRM modules')
  
  const modulesResponse = await fetch('https://www.zohoapis.com/crm/v2/settings/modules', {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  })

  if (!modulesResponse.ok) {
    const error = await modulesResponse.text()
    console.error('Failed to fetch modules:', error)
    throw new Error('Failed to fetch CRM modules')
  }

  const modulesData = await modulesResponse.json()
  
  return new Response(
    JSON.stringify({ modules: modulesData.modules || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetRecords(accessToken: string, module: string) {
  console.log(`Fetching records from ${module} module`)
  
  const recordsResponse = await fetch(`https://www.zohoapis.com/crm/v2/${module}?per_page=200`, {
    headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
  })

  if (!recordsResponse.ok) {
    const error = await recordsResponse.text()
    console.error('Failed to fetch records:', error)
    throw new Error(`Failed to fetch ${module} records`)
  }

  const recordsData = await recordsResponse.json()
  
  return new Response(
    JSON.stringify({ 
      records: recordsData.data || [],
      info: recordsData.info || {}
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}