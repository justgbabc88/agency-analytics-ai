
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FacebookOAuthRequest {
  action: 'initiate' | 'exchange' | 'get_ad_accounts'
  code?: string
  access_token?: string
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

    const { action, code, access_token }: FacebookOAuthRequest = await req.json()

    console.log(`Facebook OAuth action: ${action}`)

    switch (action) {
      case 'initiate':
        return handleInitiateAuth()
      case 'exchange':
        return await handleExchangeCode(code!)
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

function handleInitiateAuth() {
  const clientId = Deno.env.get('FACEBOOK_APP_ID')
  const redirectUri = Deno.env.get('FACEBOOK_REDIRECT_URI')
  
  if (!clientId || !redirectUri) {
    throw new Error('Facebook app credentials not configured')
  }

  const scopes = ['ads_read', 'ads_management', 'business_management'].join(',')
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}&` +
    `response_type=code&` +
    `state=${crypto.randomUUID()}`

  console.log('Generated Facebook auth URL')

  return new Response(
    JSON.stringify({ authUrl }),
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
  
  // Get user info
  const userResponse = await fetch(
    `https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}&fields=id,name,email`
  )
  
  const userData = await userResponse.json()

  console.log('Successfully exchanged code for access token')

  return new Response(
    JSON.stringify({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      user_id: userData.id,
      user_name: userData.name,
      user_email: userData.email
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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
