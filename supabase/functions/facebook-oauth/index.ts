
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FacebookOAuthRequest {
  action: 'initiate' | 'exchange' | 'get_ad_accounts' | 'upgrade_permissions' | 'test_api'
  code?: string
  access_token?: string
  permission_level?: 'basic' | 'ads'
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

    const { action, code, access_token, permission_level, projectId }: FacebookOAuthRequest = await req.json()

    console.log(`Facebook OAuth action: ${action}`)

    switch (action) {
      case 'initiate':
        return handleInitiateAuth(permission_level || 'basic')
      case 'exchange':
        return await handleExchangeCode(code!)
      case 'test_api':
        return await handleTestApiCall(access_token!)
      case 'upgrade_permissions':
        return handleInitiateAuth('ads')
      case 'get_ad_accounts':
        return await handleGetAdAccounts(access_token!)
      default:
        throw new Error(`Unsupported action: ${action}`)
    }

  } catch (error) {
    console.error('Facebook OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function handleInitiateAuth(permissionLevel: 'basic' | 'ads' = 'basic') {
  const clientId = Deno.env.get('FACEBOOK_APP_ID')
  const redirectUri = Deno.env.get('FACEBOOK_REDIRECT_URI')
  
  if (!clientId || !redirectUri) {
    throw new Error('Facebook app credentials not configured')
  }

  // Start with basic permissions that don't require approval
  const basicScopes = ['email', 'public_profile']
  // Advanced ads permissions - only request these after basic connection works
  const adsScopes = ['ads_read', 'ads_management', 'business_management']
  
  const scopes = permissionLevel === 'basic' ? basicScopes : [...basicScopes, ...adsScopes]
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes.join(','))}&` +
    `response_type=code&` +
    `state=${crypto.randomUUID()}`

  console.log(`Generated Facebook auth URL for ${permissionLevel} permissions`)

  return new Response(
    JSON.stringify({ authUrl, permissionLevel }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleExchangeCode(code: string) {
  const clientId = Deno.env.get('FACEBOOK_APP_ID')
  const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET')
  const redirectUri = Deno.env.get('FACEBOOK_REDIRECT_URI')
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Facebook app credentials not configured')
  }

  const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
    `client_id=${clientId}&` +
    `client_secret=${clientSecret}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `code=${code}`

  console.log('Exchanging code for access token')

  const response = await fetch(tokenUrl, {
    method: 'POST'
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Token exchange failed:', error)
    throw new Error('Failed to exchange code for access token')
  }

  const tokenData = await response.json()
  
  // Get user info with basic permissions
  const userResponse = await fetch(
    `https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}&fields=id,name,email`
  )
  
  const userData = await userResponse.json()

  // Check what permissions we actually have
  const permissionsResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/permissions?access_token=${tokenData.access_token}`
  )
  
  const permissionsData = await permissionsResponse.json()
  const grantedPermissions = permissionsData.data?.filter((p: any) => p.status === 'granted').map((p: any) => p.permission) || []

  console.log('Successfully exchanged code for access token with permissions:', grantedPermissions)

  return new Response(
    JSON.stringify({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      user_id: userData.id,
      user_name: userData.name,
      user_email: userData.email,
      permissions: grantedPermissions
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleTestApiCall(accessToken: string) {
  console.log('Making test API call to Facebook')

  try {
    // Make a simple test call to verify the token works
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name`
    )

    if (!response.ok) {
      throw new Error('Test API call failed')
    }

    const data = await response.json()
    console.log('Test API call successful')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test API call successful',
        data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Test API call failed:', error)
    throw new Error('Test API call failed')
  }
}

async function handleGetAdAccounts(accessToken: string) {
  console.log('Fetching ad accounts from Facebook')

  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${accessToken}&fields=id,name,account_status,currency,timezone_name`
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to fetch ad accounts:', error)
    throw new Error('Failed to fetch ad accounts')
  }

  const data = await response.json()

  console.log(`Found ${data.data?.length || 0} ad accounts`)

  return new Response(
    JSON.stringify({
      adAccounts: data.data || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
