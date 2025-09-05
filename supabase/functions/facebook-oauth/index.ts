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
  projectId?: string
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

    console.log(`Facebook OAuth action: ${action}, projectId: ${projectId}`)

    switch (action) {
      case 'initiate':
        return handleInitiateAuth(permission_level || 'basic')
      case 'exchange':
        if (!projectId) {
          throw new Error('projectId is required for token exchange')
        }
        return await handleExchangeCode(code!, projectId, supabase)
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

async function handleExchangeCode(code: string, projectId: string, supabase: any) {
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

  // Store the tokens in project_integration_data table
  const tokenPayload = {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    user_id: userData.id,
    user_name: userData.name,
    user_email: userData.email,
    permissions: grantedPermissions,
    expires_in: tokenData.expires_in,
    oauth_completed_at: new Date().toISOString()
  }

  try {
    console.log(`💾 Storing Facebook OAuth tokens for project ${projectId}`)
    
    // Get existing data to preserve any previous sync data
    const { data: existingData } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'facebook')
      .maybeSingle()

    // Merge with existing data if it exists
    let mergedData = tokenPayload
    if (existingData?.data) {
      const existing = existingData.data as any
      mergedData = {
        ...existing, // Preserve existing sync data
        ...tokenPayload // Override with new OAuth tokens
      }
      console.log('🔄 Merged new tokens with existing sync data')
    }

    const { error: storeError } = await supabase
      .from('project_integration_data')
      .upsert({
        project_id: projectId,
        platform: 'facebook',
        data: mergedData,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,platform'
      })

    if (storeError) {
      console.error('❌ Failed to store tokens in database:', storeError)
      throw new Error('Failed to store authentication tokens')
    }

    // Update project integration status
    const { error: integrationError } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        platform: 'facebook',
        is_connected: true,
        last_sync: new Date().toISOString()
      }, {
        onConflict: 'project_id,platform'
      })

    if (integrationError) {
      console.error('❌ Failed to update integration status:', integrationError)
      // Don't throw here, tokens are stored, this is secondary
    }

    console.log('✅ OAuth tokens stored successfully in database')
  } catch (error) {
    console.error('❌ Database operation failed:', error)
    throw new Error('Failed to store authentication data')
  }

  // Return minimal data to client - they should use database for future operations
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Facebook connected successfully',
      // Return only what's needed for immediate UI feedback
      access_token: tokenData.access_token, // Still needed for immediate ad account fetching
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