
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const { projectId, code, state } = await req.json().catch(() => ({}))

    const clientId = Deno.env.get('CLICKFUNNELS_CLIENT_ID')
    const clientSecret = Deno.env.get('CLICKFUNNELS_CLIENT_SECRET')
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/clickfunnels-oauth`

    if (!clientId || !clientSecret) {
      throw new Error('ClickFunnels OAuth credentials not configured')
    }

    switch (action) {
      case 'get_auth_url':
        const authUrl = `https://app.clickfunnels.com/oauth/authorize?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=funnel:read funnel:write&` +
          `state=${projectId}`

        return new Response(
          JSON.stringify({ auth_url: authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'exchange_code':
        if (!code || !state) {
          throw new Error('Missing code or state parameter')
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://app.clickfunnels.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange code for token')
        }

        const tokenData = await tokenResponse.json()
        
        // Store the access token securely in the project integration
        const { error: updateError } = await supabase
          .from('project_integrations')
          .upsert({
            project_id: state, // state contains the project ID
            platform: 'clickfunnels',
            is_connected: true,
            last_sync: new Date().toISOString()
          })

        if (updateError) {
          throw updateError
        }

        // Store the token data securely (you might want to encrypt this)
        const { error: dataError } = await supabase
          .from('project_integration_data')
          .upsert({
            project_id: state,
            platform: 'clickfunnels_oauth',
            data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: Date.now() + (tokenData.expires_in * 1000),
              token_type: tokenData.token_type
            },
            synced_at: new Date().toISOString()
          })

        if (dataError) {
          throw dataError
        }

        return new Response(
          JSON.stringify({ success: true, message: 'ClickFunnels connected successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'get_funnels':
        if (!projectId) {
          throw new Error('Project ID is required')
        }

        // Get the stored access token
        const { data: tokenData, error: tokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'clickfunnels_oauth')
          .single()

        if (tokenError || !tokenData) {
          throw new Error('ClickFunnels not connected for this project')
        }

        const accessToken = tokenData.data.access_token

        // Fetch funnels from ClickFunnels API
        const funnelsResponse = await fetch('https://app.clickfunnels.com/api/v2/funnels', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!funnelsResponse.ok) {
          throw new Error('Failed to fetch funnels from ClickFunnels')
        }

        const funnelsData = await funnelsResponse.json()

        return new Response(
          JSON.stringify({ funnels: funnelsData.funnels || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'sync_funnel_data':
        const { funnelId } = await req.json()
        
        if (!projectId || !funnelId) {
          throw new Error('Project ID and Funnel ID are required')
        }

        // Get the stored access token
        const { data: syncTokenData, error: syncTokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'clickfunnels_oauth')
          .single()

        if (syncTokenError || !syncTokenData) {
          throw new Error('ClickFunnels not connected for this project')
        }

        const syncAccessToken = syncTokenData.data.access_token

        // Fetch funnel details and stats
        const [funnelResponse, statsResponse] = await Promise.all([
          fetch(`https://app.clickfunnels.com/api/v2/funnels/${funnelId}`, {
            headers: {
              'Authorization': `Bearer ${syncAccessToken}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`https://app.clickfunnels.com/api/v2/funnels/${funnelId}/stats`, {
            headers: {
              'Authorization': `Bearer ${syncAccessToken}`,
              'Content-Type': 'application/json'
            }
          })
        ])

        if (!funnelResponse.ok || !statsResponse.ok) {
          throw new Error('Failed to fetch funnel data from ClickFunnels')
        }

        const funnelData = await funnelResponse.json()
        const statsData = await statsResponse.json()

        // Store the synced data
        const { error: syncError } = await supabase
          .from('project_integration_data')
          .upsert({
            project_id: projectId,
            platform: 'clickfunnels',
            data: {
              funnel: funnelData,
              stats: statsData,
              funnel_id: funnelId,
              synced_at: new Date().toISOString()
            },
            synced_at: new Date().toISOString()
          })

        if (syncError) {
          throw syncError
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            funnel: funnelData,
            stats: statsData 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('ClickFunnels OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
