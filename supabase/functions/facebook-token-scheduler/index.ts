import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🕐 Starting scheduled Facebook token refresh...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await refreshAllTokens(supabase)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Token refresh completed',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Scheduled token refresh error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function refreshAllTokens(supabase: any) {
  console.log('🔄 Starting background token refresh for all Facebook integrations...')

  try {
    // Get all Facebook integrations that might need refresh
    const { data: integrations, error } = await supabase
      .from('project_integration_data')
      .select('project_id, data, synced_at')
      .eq('platform', 'facebook')

    if (error || !integrations) {
      console.error('❌ Failed to fetch Facebook integrations:', error)
      return { processed: 0, errors: 0 }
    }

    console.log(`📊 Found ${integrations.length} Facebook integrations to check`)

    let processed = 0
    let errors = 0
    let refreshed = 0

    for (const integration of integrations) {
      try {
        const projectId = integration.project_id
        const data = integration.data as any
        
        // Skip if no access token
        if (!data.access_token) {
          console.log(`⏭️ Skipping project ${projectId} - no access token`)
          continue
        }

        processed++

        // Check if token needs refresh based on various criteria
        const needsRefresh = await shouldRefreshToken(data)
        
        if (!needsRefresh) {
          console.log(`⏭️ Skipping project ${projectId} - token doesn't need refresh`)
          continue
        }

        console.log(`🔄 Refreshing token for project ${projectId}`)
        
        // Validate current token first
        const isValid = await validateToken(data.access_token)
        
        if (isValid && !data.is_long_lived) {
          // Try to upgrade short-lived to long-lived token
          const longLivedToken = await exchangeForLongLivedToken(data.access_token)
          
          if (longLivedToken) {
            await updateTokenData(supabase, projectId, data, longLivedToken, true)
            refreshed++
            console.log(`✅ Upgraded to long-lived token for project ${projectId}`)
          }
        } else if (!isValid) {
          // Token is invalid - log for manual intervention
          console.log(`⚠️ Invalid token for project ${projectId} - manual re-auth required`)
          
          await logTokenIssue(supabase, projectId, 'invalid_token')
          errors++
        }
        
        // Small delay between projects to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        console.error(`❌ Error processing project ${integration.project_id}:`, error)
        errors++
      }
    }

    console.log(`✅ Token refresh completed: ${processed} processed, ${refreshed} refreshed, ${errors} errors`)
    return { processed, refreshed, errors }
    
  } catch (error) {
    console.error('❌ Background token refresh failed:', error)
    throw error
  }
}

async function shouldRefreshToken(data: any): Promise<boolean> {
  // Check if it's not a long-lived token
  if (!data.is_long_lived) {
    return true
  }

  // Check if token was obtained/refreshed more than 30 days ago
  const tokenAge = getTokenAge(data)
  if (tokenAge > 30) {
    console.log(`🕐 Token is ${tokenAge} days old, considering refresh`)
    return true
  }

  // Check if token is close to expiry (within 7 days)
  if (data.expires_in) {
    const tokenObtainedAt = new Date(data.token_obtained_at || data.oauth_completed_at)
    const expiryDate = new Date(tokenObtainedAt.getTime() + (data.expires_in * 1000))
    const daysToExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    if (daysToExpiry <= 7) {
      console.log(`⏰ Token expires in ${daysToExpiry} days, needs refresh`)
      return true
    }
  }

  return false
}

function getTokenAge(data: any): number {
  const tokenDate = new Date(data.token_refreshed_at || data.token_obtained_at || data.oauth_completed_at)
  const daysDiff = Math.floor((Date.now() - tokenDate.getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff
}

async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id`,
      { method: 'GET' }
    )
    
    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return !data.error
  } catch (error) {
    console.error('❌ Token validation error:', error)
    return false
  }
}

async function exchangeForLongLivedToken(shortLivedToken: string) {
  const clientId = Deno.env.get('FACEBOOK_APP_ID')
  const clientSecret = Deno.env.get('FACEBOOK_APP_SECRET')
  
  if (!clientId || !clientSecret) {
    console.warn('Facebook app credentials not configured')
    return null
  }

  try {
    const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${clientId}&` +
      `client_secret=${clientSecret}&` +
      `fb_exchange_token=${shortLivedToken}`

    const response = await fetch(exchangeUrl, { method: 'GET' })

    if (!response.ok) {
      return null
    }

    const tokenData = await response.json()
    
    if (tokenData.error) {
      return null
    }

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

async function updateTokenData(supabase: any, projectId: string, currentData: any, newTokenData: any, isLongLived: boolean) {
  const updatedData = {
    ...currentData,
    access_token: newTokenData.access_token,
    token_type: newTokenData.token_type,
    expires_in: newTokenData.expires_in,
    is_long_lived: isLongLived,
    token_refreshed_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('project_integration_data')
    .update({
      data: updatedData,
      synced_at: new Date().toISOString()
    })
    .eq('project_id', projectId)
    .eq('platform', 'facebook')

  if (error) {
    console.error(`❌ Failed to update token for project ${projectId}:`, error)
    throw error
  }

  // Update integration status
  await supabase
    .from('project_integrations')
    .update({
      last_sync: new Date().toISOString(),
      is_connected: true
    })
    .eq('project_id', projectId)
    .eq('platform', 'facebook')
}

async function logTokenIssue(supabase: any, projectId: string, issueType: string) {
  try {
    // You could create a token_issues table to track problems
    console.log(`📝 Logging token issue for project ${projectId}: ${issueType}`)
    
    // For now, just update the integration status to indicate an issue
    await supabase
      .from('project_integrations')
      .update({
        is_connected: false,
        last_sync: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('platform', 'facebook')
      
  } catch (error) {
    console.error('Failed to log token issue:', error)
  }
}