import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRefreshRequest {
  projectId: string
  forceRefresh?: boolean
}

interface FacebookTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
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

    const { projectId, forceRefresh = false }: TokenRefreshRequest = await req.json()

    if (!projectId) {
      throw new Error('projectId is required')
    }

    console.log(`🔄 Facebook token refresh requested for project ${projectId}${forceRefresh ? ' (forced)' : ''}`)

    // Get current token data
    const { data: tokenData, error: fetchError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', 'facebook')
      .maybeSingle()

    if (fetchError || !tokenData?.data) {
      throw new Error('No Facebook integration found for project')
    }

    const currentData = tokenData.data as any
    const currentToken = currentData.access_token

    if (!currentToken) {
      throw new Error('No access token found in integration data')
    }

    // Check if token is still valid (unless forced refresh)
    if (!forceRefresh) {
      const tokenValid = await validateToken(currentToken)
      if (tokenValid) {
        console.log('✅ Current token is still valid, no refresh needed')
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Token is still valid',
            token_refreshed: false,
            access_token: currentToken
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Attempt to get a long-lived token
    console.log('🔄 Attempting to exchange for long-lived token...')
    const refreshedTokenData = await exchangeForLongLivedToken(currentToken)

    if (!refreshedTokenData) {
      throw new Error('Failed to refresh token - manual re-authentication may be required')
    }

    // Update stored data with new token
    const updatedData = {
      ...currentData,
      access_token: refreshedTokenData.access_token,
      token_type: refreshedTokenData.token_type,
      expires_in: refreshedTokenData.expires_in,
      token_refreshed_at: new Date().toISOString(),
      // Mark as long-lived token if expires_in is long (60 days)
      is_long_lived: refreshedTokenData.expires_in && refreshedTokenData.expires_in > 86400 * 30
    }

    const { error: updateError } = await supabase
      .from('project_integration_data')
      .update({
        data: updatedData,
        synced_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('platform', 'facebook')

    if (updateError) {
      console.error('❌ Failed to update refreshed token:', updateError)
      throw new Error('Failed to store refreshed token')
    }

    // Update last sync in integrations table
    await supabase
      .from('project_integrations')
      .update({
        last_sync: new Date().toISOString(),
        is_connected: true
      })
      .eq('project_id', projectId)
      .eq('platform', 'facebook')

    console.log('✅ Token refreshed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refreshed successfully',
        token_refreshed: true,
        access_token: refreshedTokenData.access_token,
        expires_in: refreshedTokenData.expires_in,
        is_long_lived: updatedData.is_long_lived
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Token refresh error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        requires_reauth: error.message.includes('manual re-authentication')
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id`
    )
    
    if (!response.ok) {
      console.log('🔍 Token validation failed - token appears invalid')
      return false
    }

    const data = await response.json()
    if (data.error) {
      console.log('🔍 Token validation failed:', data.error.message)
      return false
    }

    console.log('✅ Token validation successful')
    return true
  } catch (error) {
    console.error('❌ Token validation error:', error)
    return false
  }
}

async function exchangeForLongLivedToken(shortLivedToken: string): Promise<FacebookTokenResponse | null> {
  const clientId = Deno.env.get('FACEBOOK_APP_ID')
  const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET')
  
  if (!clientId || !clientSecret) {
    throw new Error('Facebook app credentials not configured')
  }

  try {
    const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${shortLivedToken}`

    console.log('🔄 Exchanging short-lived token for long-lived token')

    const response = await fetch(exchangeUrl, {
      method: 'GET'
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Long-lived token exchange failed:', errorText)
      return null
    }

    const tokenData = await response.json()
    
    if (tokenData.error) {
      console.error('❌ Long-lived token exchange error:', tokenData.error)
      return null
    }

    console.log(`✅ Successfully obtained long-lived token (expires in ${tokenData.expires_in} seconds)`)
    
    return {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in
    }

  } catch (error) {
    console.error('❌ Long-lived token exchange error:', error)
    return null
  }
}

// Background function to check and refresh tokens for all projects
export async function refreshAllTokens() {
  console.log('🔄 Starting background token refresh for all Facebook integrations...')
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Get all Facebook integrations
    const { data: integrations, error } = await supabase
      .from('project_integration_data')
      .select('project_id, data')
      .eq('platform', 'facebook')

    if (error || !integrations) {
      console.error('❌ Failed to fetch Facebook integrations:', error)
      return
    }

    console.log(`📊 Found ${integrations.length} Facebook integrations to check`)

    for (const integration of integrations) {
      try {
        const projectId = integration.project_id
        const data = integration.data as any
        
        // Skip if no access token
        if (!data.access_token) {
          console.log(`⏭️ Skipping project ${projectId} - no access token`)
          continue
        }

        // Check if token was refreshed recently (within last 24 hours)
        const lastRefresh = data.token_refreshed_at ? new Date(data.token_refreshed_at) : null
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        if (lastRefresh && lastRefresh > dayAgo) {
          console.log(`⏭️ Skipping project ${projectId} - token refreshed recently`)
          continue
        }

        // Check if it's a long-lived token that doesn't need refresh yet
        if (data.is_long_lived && data.expires_in && data.expires_in > 86400 * 7) {
          console.log(`⏭️ Skipping project ${projectId} - long-lived token still valid`)
          continue
        }

        console.log(`🔄 Checking token for project ${projectId}`)
        
        // Validate current token
        const isValid = await validateToken(data.access_token)
        
        if (!isValid) {
          console.log(`🔄 Refreshing token for project ${projectId}`)
          
          // Attempt refresh
          const refreshedToken = await exchangeForLongLivedToken(data.access_token)
          
          if (refreshedToken) {
            // Update with refreshed token
            const updatedData = {
              ...data,
              access_token: refreshedToken.access_token,
              token_type: refreshedToken.token_type,
              expires_in: refreshedToken.expires_in,
              token_refreshed_at: new Date().toISOString(),
              is_long_lived: refreshedToken.expires_in && refreshedToken.expires_in > 86400 * 30
            }

            await supabase
              .from('project_integration_data')
              .update({
                data: updatedData,
                synced_at: new Date().toISOString()
              })
              .eq('project_id', projectId)
              .eq('platform', 'facebook')

            console.log(`✅ Token refreshed for project ${projectId}`)
          } else {
            console.log(`⚠️ Token refresh failed for project ${projectId} - may need manual re-auth`)
          }
        } else {
          console.log(`✅ Token still valid for project ${projectId}`)
        }
        
        // Small delay between projects to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Error processing project ${integration.project_id}:`, error)
      }
    }

    console.log('✅ Background token refresh completed')
    
  } catch (error) {
    console.error('❌ Background token refresh failed:', error)
  }
}